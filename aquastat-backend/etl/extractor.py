"""
=============================================================================
aquastat/etl/extractor.py
Stage 1 — Data Extraction & Cleansing
=============================================================================
Responsibilities:
  • Ingest raw billing records  (CSV or Excel, 2017-2025)
  • Ingest raw bulk-water production records (CSV or Excel, 2017-2025)
  • Apply robust cleansing:
      - Parse & coerce data types (dates, numerics, categoricals)
      - Handle missing values with context-aware strategies
      - Remove exact and near-duplicate rows
      - Enforce domain business rules (non-negative volumes, valid statuses, etc.)
      - Normalise string columns (strip, title-case, etc.)
  • Return clean DataFrames ready for Stage 2 (extrapolation)
=============================================================================
"""

import logging
from pathlib import Path
from typing import List, Optional

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Module-level logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("aquastat.etl.extractor")


# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

VALID_BILLING_STATUSES    = {"pending", "paid", "overdue", "disputed", "cancelled"}
VALID_PRODUCTION_STATUSES = {"operational", "maintenance", "offline"}

BILLING_VOLUME_MAX_M3    = 5_000_000
PRODUCTION_VOLUME_MAX_M3 = 50_000_000

DATA_START_YEAR = 2017
DATA_END_YEAR   = 2025


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _coerce_numeric(series: pd.Series, col_name: str) -> pd.Series:
    """Convert to float64; log a warning for any values that cannot be parsed."""
    original_dtype = series.dtype
    coerced = pd.to_numeric(series, errors="coerce")
    n_failed = int(coerced.isna().sum() - series.isna().sum())
    if n_failed > 0:
        logger.warning(
            "Column '%s': %d value(s) could not be coerced to numeric "
            "(original dtype: %s) — set to NaN.",
            col_name, n_failed, original_dtype,
        )
    return coerced


def _coerce_date(series: pd.Series, col_name: str, dayfirst: bool = False) -> pd.Series:
    """
    Parse heterogeneous date strings into datetime64[ns].
    Handles 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD-Mon-YYYY', ISO 8601, etc.
    """
    parsed = pd.to_datetime(series, errors="coerce", dayfirst=dayfirst)
    n_failed = int(parsed.isna().sum() - series.isna().sum())
    if n_failed > 0:
        logger.warning(
            "Column '%s': %d date value(s) could not be parsed — set to NaT.",
            col_name, n_failed,
        )
    return parsed


def _normalise_string(series: pd.Series) -> pd.Series:
    """Strip whitespace, collapse internal spaces, and apply Title Case."""
    return (
        series.astype(str)
              .str.strip()
              .str.replace(r"\s+", " ", regex=True)
              .str.title()
    )


def _flag_out_of_range_dates(
    df: pd.DataFrame,
    date_col: str,
    start_year: int = DATA_START_YEAR,
    end_year: int   = DATA_END_YEAR,
) -> pd.DataFrame:
    """
    Add a boolean '<date_col>_out_of_range' column to flag records whose
    date falls outside the expected 2017-2025 window.  Records are retained
    so analysts can review them rather than silently discarding data.
    """
    flag_col = f"{date_col}_out_of_range"
    in_range = df[date_col].dt.year.between(start_year, end_year)
    df[flag_col] = ~in_range
    n_flagged = int(df[flag_col].sum())
    if n_flagged:
        logger.warning(
            "Column '%s': %d record(s) outside %d–%d flagged.",
            date_col, n_flagged, start_year, end_year,
        )
    return df


def _read_file(filepath: Path, sheet_name: Optional[str] = None) -> pd.DataFrame:
    """
    Read a CSV or Excel file.
    All columns are read as str first; type coercion is done explicitly later.
    Empty strings and common null tokens are replaced with genuine NaN.
    """
    suffix = filepath.suffix.lower()
    logger.info("Reading source file: %s", filepath)

    if suffix == ".csv":
        df = pd.read_csv(filepath, dtype=str, keep_default_na=False)
    elif suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(
            filepath,
            sheet_name=sheet_name or 0,
            dtype=str,
            keep_default_na=False,
        )
    else:
        raise ValueError(
            f"Unsupported file extension '{suffix}'. Expected .csv, .xlsx, or .xls."
        )

    # Normalise empty / null tokens to real NaN
    null_tokens = {"", "N/A", "NA", "None", "null", "NULL", "NaN", "nan", "#N/A"}
    df = df.replace({t: np.nan for t in null_tokens})
    logger.info("  → Loaded %d rows × %d columns.", len(df), len(df.columns))
    return df


# ──────────────────────────────────────────────────────────────────────────────
# COLUMN ALIAS MAPS  (raw source column → canonical internal name)
# Add new aliases here as additional source files are onboarded.
# ──────────────────────────────────────────────────────────────────────────────

BILLING_COLUMN_MAP = {
    # customer / account
    "cust_id":               "customer_id",
    "account_no":            "customer_id",
    "accountno":             "customer_id",
    "customer_name":         "customer_name",
    "cust_name":             "customer_name",
    "name":                  "customer_name",
    # billing period
    "period_start":          "billing_period_start",
    "start_date":            "billing_period_start",
    "billing_from":          "billing_period_start",
    "period_end":            "billing_period_end",
    "end_date":              "billing_period_end",
    "billing_to":            "billing_period_end",
    # volume
    "volume_m3":             "volume_billed_m3",
    "billed_volume":         "volume_billed_m3",
    "consumption_m3":        "volume_billed_m3",
    # financials
    "amount_due":            "amount_due",
    "bill_amount":           "amount_due",
    "total_due":             "amount_due",
    "amount_paid":           "amount_paid",
    "payment":               "amount_paid",
    "currency":              "currency",
    # status & dates
    "status":                "status",
    "billing_status":        "status",
    "due_date":              "due_date",
    "paid_date":             "paid_date",
    "payment_date":          "paid_date",
}

PRODUCTION_COLUMN_MAP = {
    "facility_id":               "facility_id",
    "plant_id":                  "facility_id",
    "source_id":                 "facility_id",
    "facility_name":             "facility_name",
    "plant_name":                "facility_name",
    "source_name":               "facility_name",
    "recorded_at":               "recorded_at",
    "record_date":               "recorded_at",
    "date":                      "recorded_at",
    "volume_produced_m3":        "volume_produced_m3",
    "production_m3":             "volume_produced_m3",
    "produced_m3":               "volume_produced_m3",
    "nrw_volume_m3":             "nrw_volume_m3",
    "nrw_m3":                    "nrw_volume_m3",
    "non_revenue_water":         "nrw_volume_m3",
    "nrw_percentage":            "nrw_percentage",
    "nrw_pct":                   "nrw_percentage",
    "nrw_percent":               "nrw_percentage",
    "efficiency":                "efficiency",
    "eff":                       "efficiency",
    "energy_kwh":                "energy_consumption_kwh",
    "energy_consumption_kwh":    "energy_consumption_kwh",
    "kwh":                       "energy_consumption_kwh",
    "status":                    "status",
}


def _rename_columns(df: pd.DataFrame, column_map: dict) -> pd.DataFrame:
    """Lower-case & strip all headers, then apply the alias map."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df.rename(columns=column_map)


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 1-A — BILLING EXTRACTOR
# ──────────────────────────────────────────────────────────────────────────────

def extract_billing(
    filepaths: List[Path],
    sheet_name: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load, concatenate, and cleanse billing records from one or more files.

    Parameters
    ----------
    filepaths  : list[Path]  — source CSV/Excel paths.
    sheet_name : str | None  — Excel sheet name (defaults to first sheet).

    Returns
    -------
    pd.DataFrame  — clean, typed DataFrame aligned to the `billing` DB table.
    """
    if not filepaths:
        raise ValueError("No billing source files provided.")

    # ── Load and concatenate all source files ───────────────────────────────
    frames = [_rename_columns(_read_file(Path(fp), sheet_name), BILLING_COLUMN_MAP)
              for fp in filepaths]
    df = pd.concat(frames, ignore_index=True)
    original_count = len(df)
    logger.info(
        "Billing: concatenated %d rows from %d file(s).", original_count, len(filepaths)
    )

    # ── Remove exact duplicate rows ─────────────────────────────────────────
    df.drop_duplicates(inplace=True)
    logger.info("Billing: %d exact duplicate rows removed.", original_count - len(df))

    # ── Coerce date columns ─────────────────────────────────────────────────
    for col in ("billing_period_start", "billing_period_end", "due_date", "paid_date"):
        if col in df.columns:
            df[col] = _coerce_date(df[col], col)

    # ── Coerce numeric columns ──────────────────────────────────────────────
    for col in ("volume_billed_m3", "amount_due", "amount_paid"):
        if col in df.columns:
            df[col] = _coerce_numeric(df[col], col)

    # ── Normalise string / categorical columns ──────────────────────────────
    if "customer_name" in df.columns:
        df["customer_name"] = _normalise_string(df["customer_name"])
    if "currency" in df.columns:
        df["currency"] = df["currency"].str.strip().str.upper().fillna("PHP")
    if "status" in df.columns:
        df["status"] = df["status"].str.strip().str.lower().fillna("pending")

    # ── Domain validation: enforce DB CHECK constraints ─────────────────────

    # Non-negative volumes & amounts
    for col in ("volume_billed_m3", "amount_due", "amount_paid"):
        if col in df.columns:
            mask = df[col] < 0
            if mask.any():
                logger.warning("Billing: %d negative '%s' value(s) → NaN.", mask.sum(), col)
                df.loc[mask, col] = np.nan

    # Cap implausibly large billed volumes (likely sensor/transcription errors)
    if "volume_billed_m3" in df.columns:
        mask = df["volume_billed_m3"] > BILLING_VOLUME_MAX_M3
        if mask.any():
            logger.warning(
                "Billing: %d volume_billed_m3 > %.0f m³ — set to NaN.",
                mask.sum(), BILLING_VOLUME_MAX_M3,
            )
            df.loc[mask, "volume_billed_m3"] = np.nan

    # Coerce invalid statuses to 'pending'
    if "status" in df.columns:
        mask = ~df["status"].isin(VALID_BILLING_STATUSES)
        if mask.any():
            logger.warning(
                "Billing: %d invalid status value(s) defaulted to 'pending'.", mask.sum()
            )
            df.loc[mask, "status"] = "pending"

    # Swap inverted billing period dates
    if {"billing_period_start", "billing_period_end"}.issubset(df.columns):
        mask = df["billing_period_end"] < df["billing_period_start"]
        if mask.any():
            logger.warning(
                "Billing: %d inverted period dates detected — swapping.", mask.sum()
            )
            df.loc[mask, ["billing_period_start", "billing_period_end"]] = (
                df.loc[mask, ["billing_period_end", "billing_period_start"]].values
            )

    # ── Flag dates outside the expected 2017-2025 window ───────────────────
    if "billing_period_start" in df.columns:
        df = _flag_out_of_range_dates(df, "billing_period_start")

    # ── Drop rows missing all critical identity columns ─────────────────────
    critical = [c for c in ("customer_id", "billing_period_start") if c in df.columns]
    before   = len(df)
    df.dropna(subset=critical, how="all", inplace=True)
    logger.info(
        "Billing: %d row(s) dropped (all critical identity columns null).", before - len(df)
    )

    # amount_paid defaults to 0 (not yet collected) when absent
    if "amount_paid" in df.columns:
        df["amount_paid"] = df["amount_paid"].fillna(0.0)

    # ── Near-duplicate deduplication: same customer + same period ───────────
    biz_key = [c for c in ("customer_id", "billing_period_start", "billing_period_end")
               if c in df.columns]
    if biz_key:
        before = len(df)
        df.sort_values("billing_period_start", ascending=False, inplace=True)
        df.drop_duplicates(subset=biz_key, keep="first", inplace=True)
        logger.info(
            "Billing: %d near-duplicate (same business key) row(s) removed.", before - len(df)
        )

    df.reset_index(drop=True, inplace=True)
    logger.info("Billing extraction complete — %d clean rows.", len(df))
    return df


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 1-B — PRODUCTION EXTRACTOR
# ──────────────────────────────────────────────────────────────────────────────

def extract_production(
    filepaths: List[Path],
    sheet_name: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load, concatenate, and cleanse bulk-water production records.

    Parameters
    ----------
    filepaths  : list[Path]  — source CSV/Excel paths.
    sheet_name : str | None  — Excel sheet name (defaults to first sheet).

    Returns
    -------
    pd.DataFrame  — clean, typed DataFrame aligned to the `production` DB table.
    """
    if not filepaths:
        raise ValueError("No production source files provided.")

    # ── Load and concatenate ────────────────────────────────────────────────
    frames = [_rename_columns(_read_file(Path(fp), sheet_name), PRODUCTION_COLUMN_MAP)
              for fp in filepaths]
    df = pd.concat(frames, ignore_index=True)
    original_count = len(df)
    logger.info(
        "Production: concatenated %d rows from %d file(s).", original_count, len(filepaths)
    )

    # ── Remove exact duplicates ─────────────────────────────────────────────
    df.drop_duplicates(inplace=True)
    logger.info("Production: %d exact duplicates removed.", original_count - len(df))

    # ── Coerce date ─────────────────────────────────────────────────────────
    if "recorded_at" in df.columns:
        df["recorded_at"] = _coerce_date(df["recorded_at"], "recorded_at")

    # ── Coerce numerics ─────────────────────────────────────────────────────
    for col in ("volume_produced_m3", "nrw_volume_m3", "nrw_percentage",
                "efficiency", "energy_consumption_kwh"):
        if col in df.columns:
            df[col] = _coerce_numeric(df[col], col)

    # ── Normalise strings ───────────────────────────────────────────────────
    if "facility_name" in df.columns:
        df["facility_name"] = _normalise_string(df["facility_name"])
    if "facility_id" in df.columns:
        df["facility_id"] = df["facility_id"].str.strip().str.upper()
    if "status" in df.columns:
        df["status"] = df["status"].str.strip().str.lower().fillna("operational")

    # ── Domain validation ───────────────────────────────────────────────────

    # Non-negative volumes
    for col in ("volume_produced_m3", "nrw_volume_m3", "energy_consumption_kwh"):
        if col in df.columns:
            mask = df[col] < 0
            if mask.any():
                logger.warning("Production: %d negative '%s' value(s) → NaN.", mask.sum(), col)
                df.loc[mask, col] = np.nan

    # Cap implausible production volumes
    if "volume_produced_m3" in df.columns:
        mask = df["volume_produced_m3"] > PRODUCTION_VOLUME_MAX_M3
        if mask.any():
            logger.warning(
                "Production: %d volume_produced_m3 > %.0f m³ — set to NaN.",
                mask.sum(), PRODUCTION_VOLUME_MAX_M3,
            )
            df.loc[mask, "volume_produced_m3"] = np.nan

    # NRW percentage must be 0–100
    if "nrw_percentage" in df.columns:
        mask = (df["nrw_percentage"] < 0) | (df["nrw_percentage"] > 100)
        if mask.any():
            logger.warning(
                "Production: %d nrw_percentage outside [0,100] — set to NaN.", mask.sum()
            )
            df.loc[mask, "nrw_percentage"] = np.nan

    # Efficiency must be 0–1
    if "efficiency" in df.columns:
        mask = (df["efficiency"] < 0) | (df["efficiency"] > 1)
        if mask.any():
            logger.warning(
                "Production: %d efficiency outside [0,1] — set to NaN.", mask.sum()
            )
            df.loc[mask, "efficiency"] = np.nan

    # Derive NRW % when both volumes are present but percentage is missing
    if all(c in df.columns for c in ("volume_produced_m3", "nrw_volume_m3", "nrw_percentage")):
        mask = (
            df["nrw_percentage"].isna()
            & df["volume_produced_m3"].notna()
            & df["nrw_volume_m3"].notna()
            & (df["volume_produced_m3"] > 0)
        )
        if mask.any():
            df.loc[mask, "nrw_percentage"] = (
                df.loc[mask, "nrw_volume_m3"] / df.loc[mask, "volume_produced_m3"] * 100
            ).round(4)
            logger.info(
                "Production: NRW percentage derived for %d record(s).", mask.sum()
            )

    # Invalid statuses → default to 'operational'
    if "status" in df.columns:
        mask = ~df["status"].isin(VALID_PRODUCTION_STATUSES)
        if mask.any():
            logger.warning(
                "Production: %d invalid status value(s) defaulted to 'operational'.", mask.sum()
            )
            df.loc[mask, "status"] = "operational"

    # ── Flag out-of-range dates ─────────────────────────────────────────────
    if "recorded_at" in df.columns:
        df = _flag_out_of_range_dates(df, "recorded_at")

    # ── Drop rows missing all critical identity columns ─────────────────────
    critical = [c for c in ("facility_id", "recorded_at") if c in df.columns]
    before   = len(df)
    df.dropna(subset=critical, how="all", inplace=True)
    logger.info(
        "Production: %d row(s) dropped (all critical identity columns null).", before - len(df)
    )

    # Fill numeric defaults per DB schema (mirrors DEFAULT 0 in SQL DDL)
    for col, default in (
        ("nrw_volume_m3",           0.0),
        ("nrw_percentage",          0.0),
        ("efficiency",              0.0),
        ("energy_consumption_kwh",  0.0),
    ):
        if col in df.columns:
            df[col] = df[col].fillna(default)

    # ── Near-duplicate deduplication: same facility + same recorded_at ──────
    biz_key = [c for c in ("facility_id", "recorded_at") if c in df.columns]
    if biz_key:
        before = len(df)
        df.sort_values("recorded_at", ascending=False, inplace=True)
        df.drop_duplicates(subset=biz_key, keep="first", inplace=True)
        logger.info(
            "Production: %d near-duplicate row(s) removed.", before - len(df)
        )

    df.reset_index(drop=True, inplace=True)
    logger.info("Production extraction complete — %d clean rows.", len(df))
    return df
