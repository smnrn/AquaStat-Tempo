"""
=============================================================================
aquastat/etl/loader.py
Stage 4 — Data Loading into PostgreSQL via SQLAlchemy
=============================================================================
Responsibilities:
  • Define SQLAlchemy ORM models that mirror the `production` and `billing`
    tables declared in migrate.ts.
  • Provide robust upsert (INSERT … ON CONFLICT DO UPDATE) logic that is safe
    to run idempotently (re-running the pipeline will not create duplicates).
  • Chunk large DataFrames into batches before loading to avoid memory spikes
    and overly large single transactions.
  • Emit structured log messages for observability and audit trails.

Dependency: SQLAlchemy ≥ 2.0 (Core + ORM)
  pip install sqlalchemy psycopg2-binary python-dotenv
=============================================================================
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, insert as pg_insert
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import QueuePool

# Load .env so this module can be invoked standalone (e.g., from a cron job)
_backend_env = Path(__file__).resolve().parent.parent / ".env"
if _backend_env.exists():
    load_dotenv(dotenv_path=_backend_env, encoding="utf-8")
else:
    load_dotenv(encoding="utf-8")

logger = logging.getLogger("aquastat.etl.loader")

# ------------------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------------------

_DB_HOST     = os.getenv("DB_HOST",     "localhost")
_DB_PORT     = os.getenv("DB_PORT",     "5432")
_DB_NAME     = os.getenv("DB_NAME",     "aquastat_db")
_DB_USER     = os.getenv("DB_USER",     "aquastat_user")
_DB_PASSWORD = os.getenv("DB_PASSWORD", "")
_DB_SSL      = os.getenv("DB_SSL",      "false").lower() == "true"

# Pool sizing — mirrors DB_POOL_MIN / DB_POOL_MAX from .env
_POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

# How many rows to INSERT per database transaction (avoids huge single commits)
CHUNK_SIZE = int(os.getenv("ETL_CHUNK_SIZE", "500"))


# ──────────────────────────────────────────────────────────────────────────────
# ENGINE FACTORY
# ──────────────────────────────────────────────────────────────────────────────

def build_engine(echo_sql: bool = False) -> Engine:
    """
    Construct and return a SQLAlchemy Engine connected to the AquaStat
    PostgreSQL database.

    Connection parameters are read from environment variables so that secrets
    never appear in source code.

    Parameters
    ----------
    echo_sql : bool
        Set to True to log every SQL statement emitted (useful for debugging,
        noisy in production).

    Returns
    -------
    sqlalchemy.engine.Engine
    """
    ssl_args: dict = {}
    if _DB_SSL:
        # For cloud-hosted databases (e.g., Supabase, RDS) that require SSL
        ssl_args = {"connect_args": {"sslmode": "require"}}

    connection_url = (
        f"postgresql+psycopg2://{_DB_USER}:{_DB_PASSWORD}"
        f"@{_DB_HOST}:{_DB_PORT}/{_DB_NAME}"
    )

    engine = create_engine(
        connection_url,
        poolclass    = QueuePool,
        pool_size    = _POOL_MIN,
        max_overflow = _POOL_MAX - _POOL_MIN,
        pool_pre_ping= True,   # test connections before checkout (handle stale sockets)
        echo         = echo_sql,
        **ssl_args,
    )

    logger.info(
        "SQLAlchemy engine created for %s@%s:%s/%s (SSL=%s).",
        _DB_USER, _DB_HOST, _DB_PORT, _DB_NAME, _DB_SSL,
    )
    return engine


# ──────────────────────────────────────────────────────────────────────────────
# TABLE DEFINITIONS  (SQLAlchemy Core — mirrors migrate.ts DDL)
# ──────────────────────────────────────────────────────────────────────────────

metadata = MetaData()

# ─── production table ────────────────────────────────────────────────────────
production_table = Table(
    "production",
    metadata,
    Column("production_id",          UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("facility_id",            String(64),   nullable=False),
    Column("facility_name",          String(255),  nullable=False),
    Column("recorded_at",            DateTime(timezone=True), nullable=False),
    Column("volume_produced_m3",     Numeric(14, 4), nullable=False),
    Column("nrw_volume_m3",          Numeric(12, 4), nullable=False, default=0),
    Column("nrw_percentage",         Numeric(5, 2),  nullable=False, default=0),
    Column("efficiency",             Numeric(5, 4),  nullable=False, default=0),
    Column("energy_consumption_kwh", Numeric(12, 4), nullable=False, default=0),
    Column("status",                 String(20),   nullable=False, default="operational"),
    Column("created_at",             DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
    Column("updated_at",             DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
)

# ─── billing table ────────────────────────────────────────────────────────────
billing_table = Table(
    "billing",
    metadata,
    Column("billing_id",            UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("customer_id",           UUID(as_uuid=True), nullable=False),
    Column("customer_name",         String(255),  nullable=False),
    Column("billing_period_start",  Date(),       nullable=False),
    Column("billing_period_end",    Date(),       nullable=False),
    Column("volume_billed_m3",      Numeric(12, 4), nullable=False),
    Column("amount_due",            Numeric(14, 2), nullable=False),
    Column("amount_paid",           Numeric(14, 2), nullable=False, default=0),
    Column("currency",              String(3),    nullable=False, default="PHP"),
    Column("status",                String(20),   nullable=False, default="pending"),
    Column("due_date",              Date(),       nullable=False),
    Column("paid_date",             Date(),       nullable=True),
    Column("created_at",            DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
    Column("updated_at",            DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
)


# ------------------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------------------

def _replace_nan_with_none(records: list) -> list:
    """
    Replace all float NaN / np.nan values in a list of dicts with Python None.
    PostgreSQL psycopg2 driver cannot bind NaN directly to NUMERIC columns.
    """
    cleaned = []
    for row in records:
        cleaned.append({
            k: (None if (isinstance(v, float) and np.isnan(v)) else v)
            for k, v in row.items()
        })
    return cleaned


def _prepare_production_records(df: pd.DataFrame) -> list:
    """
    Convert a production DataFrame into a list of dicts aligned to the
    `production` table schema.  Adds a fresh UUID if production_id is absent.
    """
    work_df = df.copy()
    if "recorded_at" not in work_df.columns and "date" in work_df.columns:
        work_df["recorded_at"] = work_df["date"]

    required = {
        "facility_id", "recorded_at", "volume_produced_m3",
    }
    missing = required - set(work_df.columns)
    if missing:
        raise ValueError(
            f"Production DataFrame is missing required columns: {missing}"
        )

    records = []
    now = datetime.now(timezone.utc)

    for _, row in work_df.iterrows():
        fac_id = str(row["facility_id"]).strip().upper()
        fac_name = str(row.get("facility_name") or f"Facility {fac_id}").strip()
        record = {
            # Use existing UUID if available (idempotent re-runs), else generate new
            "production_id":          row.get("production_id") or uuid.uuid4(),
            "facility_id":            fac_id,
            "facility_name":          fac_name,
            "recorded_at":            pd.to_datetime(row["recorded_at"]),
            "volume_produced_m3":     float(row["volume_produced_m3"]),
            "nrw_volume_m3":          float(row.get("nrw_volume_m3") or 0),
            "nrw_percentage":         float(row.get("nrw_percentage") or 0),
            "efficiency":             float(row.get("efficiency") or 0),
            "energy_consumption_kwh": float(row.get("energy_consumption_kwh") or 0),
            "status":                 str(row.get("status") or "operational").lower(),
            "created_at":             now,
            "updated_at":             now,
        }
        records.append(record)

    return _replace_nan_with_none(records)


def _prepare_billing_records(df: pd.DataFrame) -> list:
    """
    Convert a billing DataFrame into a list of dicts aligned to the
    `billing` table schema.
    """
    work_df = df.copy()
    if "billing_period_start" not in work_df.columns and "date" in work_df.columns:
        work_df["billing_period_start"] = work_df["date"]
    if "billing_period_end" not in work_df.columns and "date" in work_df.columns:
        work_df["billing_period_end"] = work_df["date"]
    if "due_date" not in work_df.columns and "date" in work_df.columns:
        work_df["due_date"] = work_df["date"]

    required = {
        "volume_billed_m3", "amount_due",
    }
    missing = required - set(work_df.columns)
    if missing:
        raise ValueError(
            f"Billing DataFrame is missing required columns: {missing}"
        )

    records = []
    now = datetime.now(timezone.utc)

    for _, row in work_df.iterrows():
        # customer_id must be a UUID; coerce string UUIDs or generate new ones
        raw_cid = row.get("customer_id")
        if raw_cid and pd.notna(raw_cid):
            try:
                customer_id = uuid.UUID(str(raw_cid))
            except (ValueError, AttributeError):
                customer_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_cid))
        else:
            customer_id = uuid.uuid5(uuid.NAMESPACE_DNS, "TCWD-AGGREGATE-CUSTOMER")

        cust_name = str(row.get("customer_name") or "TCWD Service Zone Consumer").strip()
        period_start = pd.to_datetime(row.get("billing_period_start") or now).date()
        period_end = pd.to_datetime(row.get("billing_period_end") or period_start).date()
        due_date = pd.to_datetime(row.get("due_date") or period_end).date()

        record = {
            "billing_id":            row.get("billing_id") or uuid.uuid4(),
            "customer_id":           customer_id,
            "customer_name":         cust_name,
            "billing_period_start":  period_start,
            "billing_period_end":    period_end,
            "volume_billed_m3":      float(row["volume_billed_m3"]),
            "amount_due":            float(row["amount_due"]),
            "amount_paid":           float(row.get("amount_paid") or 0),
            "currency":              str(row.get("currency") or "PHP").strip().upper(),
            "status":                str(row.get("status") or "pending").lower(),
            "due_date":              due_date,
            "paid_date":             (
                pd.to_datetime(row["paid_date"]).date()
                if pd.notna(row.get("paid_date")) else None
            ),
            "created_at":            now,
            "updated_at":            now,
        }
        records.append(record)

    return _replace_nan_with_none(records)



# ──────────────────────────────────────────────────────────────────────────────
# CORE UPSERT LOGIC
# ──────────────────────────────────────────────────────────────────────────────

def _upsert_chunk(
    engine: Engine,
    table: Table,
    records: list,
    conflict_cols: list,
    update_cols: list,
) -> int:
    """
    Execute a PostgreSQL UPSERT (INSERT … ON CONFLICT DO UPDATE) for a single
    chunk of records.

    Parameters
    ----------
    engine        : Engine        — SQLAlchemy engine
    table         : Table         — target SQLAlchemy Table object
    records       : list[dict]    — records to upsert
    conflict_cols : list[str]     — columns that define the unique conflict target
    update_cols   : list[str]     — columns to update on conflict (typically all
                                    non-key, non-created_at columns)

    Returns
    -------
    int  — number of rows affected.
    """
    stmt = pg_insert(table).values(records)

    # Build the SET clause for the ON CONFLICT DO UPDATE branch
    update_set = {col: stmt.excluded[col] for col in update_cols}
    # Always refresh updated_at on every upsert
    update_set["updated_at"] = stmt.excluded["updated_at"]

    upsert_stmt = stmt.on_conflict_do_update(
        index_elements=conflict_cols,
        set_=update_set,
    )

    with engine.begin() as conn:
        result = conn.execute(upsert_stmt)
        return result.rowcount


def _load_dataframe(
    df: pd.DataFrame,
    engine: Engine,
    table: Table,
    prepare_fn,
    conflict_cols: list,
    update_cols: list,
    chunk_size: int = CHUNK_SIZE,
    label: str = "",
) -> None:
    """
    Generic chunked loader: prepares records, splits into chunks, and upserts.

    Parameters
    ----------
    df            : pd.DataFrame   — source data
    engine        : Engine         — SQLAlchemy engine
    table         : Table          — target table
    prepare_fn    : callable       — function to convert df → list[dict]
    conflict_cols : list[str]      — upsert conflict target columns
    update_cols   : list[str]      — columns to refresh on conflict
    chunk_size    : int            — rows per transaction
    label         : str            — human-readable label for logging
    """
    if df.empty:
        logger.warning("[%s] Empty DataFrame — nothing to load.", label)
        return

    logger.info("[%s] Preparing %d rows for database load.", label, len(df))

    try:
        records = prepare_fn(df)
    except ValueError as exc:
        logger.exception("[%s] Record preparation failed: %s", label, exc)
        raise

    total_rows   = len(records)
    loaded_rows  = 0
    failed_chunks= 0

    # Iterate over chunks to keep each transaction manageable
    for chunk_start in range(0, total_rows, chunk_size):
        chunk = records[chunk_start: chunk_start + chunk_size]
        chunk_num = chunk_start // chunk_size + 1

        try:
            affected = _upsert_chunk(engine, table, chunk, conflict_cols, update_cols)
            loaded_rows += len(chunk)
            logger.info(
                "[%s] Chunk %d: %d row(s) upserted (%d affected by DB).",
                label, chunk_num, len(chunk), affected,
            )
        except SQLAlchemyError as exc:
            failed_chunks += 1
            logger.exception(
                "[%s] Chunk %d failed: %s — skipping this chunk.",
                label, chunk_num, exc,
            )

    logger.info(
        "[%s] Load complete: %d/%d row(s) loaded, %d chunk(s) failed.",
        label, loaded_rows, total_rows, failed_chunks,
    )

    if failed_chunks > 0:
        raise RuntimeError(
            f"[{label}] {failed_chunks} chunk(s) failed during load. "
            "Review the logs above for details."
        )


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ──────────────────────────────────────────────────────────────────────────────

def load_production(
    df: pd.DataFrame,
    engine: Optional[Engine] = None,
    chunk_size: int = CHUNK_SIZE,
) -> None:
    """
    Upsert a clean production DataFrame into the `production` PostgreSQL table.

    Conflict resolution: if a record with the same (facility_id, recorded_at)
    already exists, all mutable fields are updated.  The primary key
    production_id and created_at are preserved from the existing row.

    Parameters
    ----------
    df         : pd.DataFrame          — clean production data (from Stage 1/2)
    engine     : Engine | None         — SQLAlchemy engine; built from env if None
    chunk_size : int                   — rows per transaction (default: 500)
    """
    eng = engine or build_engine()

    # The natural business key for production records
    conflict_cols = ["facility_id", "recorded_at"]

    # All mutable data columns (exclude PKs and created_at)
    update_cols = [
        "facility_name",
        "volume_produced_m3",
        "nrw_volume_m3",
        "nrw_percentage",
        "efficiency",
        "energy_consumption_kwh",
        "status",
    ]

    _load_dataframe(
        df         = df,
        engine     = eng,
        table      = production_table,
        prepare_fn = _prepare_production_records,
        conflict_cols = conflict_cols,
        update_cols   = update_cols,
        chunk_size    = chunk_size,
        label         = "FACT_PRODUCTION",
    )


def load_billing(
    df: pd.DataFrame,
    engine: Optional[Engine] = None,
    chunk_size: int = CHUNK_SIZE,
) -> None:
    """
    Upsert a clean billing DataFrame into the `billing` PostgreSQL table.

    Conflict resolution: if a record with the same (customer_id, billing_period_start,
    billing_period_end) exists, mutable fields (amounts, status, paid_date) are updated.

    Parameters
    ----------
    df         : pd.DataFrame          — clean billing data (from Stage 1)
    engine     : Engine | None         — SQLAlchemy engine; built from env if None
    chunk_size : int                   — rows per transaction (default: 500)
    """
    eng = engine or build_engine()

    # The natural business key for billing records
    conflict_cols = ["customer_id", "billing_period_start", "billing_period_end"]

    # All mutable data columns
    update_cols = [
        "customer_name",
        "volume_billed_m3",
        "amount_due",
        "amount_paid",
        "currency",
        "status",
        "due_date",
        "paid_date",
    ]

    _load_dataframe(
        df         = df,
        engine     = eng,
        table      = billing_table,
        prepare_fn = _prepare_billing_records,
        conflict_cols = conflict_cols,
        update_cols   = update_cols,
        chunk_size    = chunk_size,
        label         = "FACT_BILLING",
    )


def verify_load(engine: Optional[Engine] = None) -> dict:
    """
    Post-load verification: query row counts and the latest record timestamps
    from both fact tables to confirm data was written successfully.

    Parameters
    ----------
    engine : Engine | None  — SQLAlchemy engine; built from env if None

    Returns
    -------
    dict  — summary statistics per table.
    """
    eng = engine or build_engine()
    summary = {}

    with eng.connect() as conn:
        for table_name, ts_col in (("production", "recorded_at"), ("billing", "billing_period_start")):
            try:
                row_count = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table_name}")
                ).scalar()
                latest = conn.execute(
                    text(f"SELECT MAX({ts_col}) FROM {table_name}")
                ).scalar()
                summary[table_name] = {"row_count": row_count, "latest_record": latest}
                logger.info(
                    "Verification — %s: %d rows, latest %s = %s.",
                    table_name, row_count, ts_col, latest,
                )
            except SQLAlchemyError as exc:
                logger.exception("Verification failed for table '%s': %s", table_name, exc)
                summary[table_name] = {"error": str(exc)}

    return summary
