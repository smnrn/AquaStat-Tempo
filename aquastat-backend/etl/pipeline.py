"""
=============================================================================
aquastat/etl/pipeline.py
Pipeline Orchestrator — AquaStat ETL
=============================================================================
Wires all four stages together into a single callable pipeline:

  Stage 1  → extractor.py      (ingest + cleanse CSV/Excel)
  Stage 2  → extrapolator.py   (monthly → daily disaggregation)
  Stage 3  → weather_client.py (fetch & merge PAGASA weather)
  Stage 4  → loader.py         (upsert into PostgreSQL)

Usage (CLI):
  python -m etl.pipeline \
      --billing-files  data/billing_2017_2025.csv \
      --production-files data/production_2017_2025.xlsx \
      --stations NAIA SCIENCE_GARDEN \
      --start-date 2017-01-01 \
      --end-date 2025-12-31

Usage (Python):
  from etl.pipeline import run_pipeline
  run_pipeline(
      billing_files=["data/billing.csv"],
      production_files=["data/production.xlsx"],
      weather_stations=["NAIA"],
      weather_start="2017-01-01",
      weather_end="2025-12-31",
  )
=============================================================================
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import List, Optional

from etl.extractor      import extract_billing, extract_production
from etl.extrapolator   import extrapolate_billing_to_daily, extrapolate_production_to_daily
from etl.loader         import build_engine, load_billing, load_production, verify_load
from etl.weather_client import fetch_historical_weather, merge_weather_with_operational

# ──────────────────────────────────────────────────────────────────────────────
# LOGGING SETUP
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt = "%Y-%m-%dT%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("aquastat.etl.pipeline")


# Orchestrator

def run_pipeline(
    billing_files:     List[str],
    production_files:  List[str],
    weather_stations:  Optional[List[str]] = None,
    weather_start:     Optional[str]       = None,
    weather_end:       Optional[str]       = None,
    chunk_size:        int                 = 500,
    skip_weather:      bool                = False,
) -> None:
    """
    Execute the full AquaStat ETL pipeline end-to-end.

    Parameters
    ----------
    billing_files    : list[str]   — paths to raw billing CSV/Excel files
    production_files : list[str]   — paths to raw production CSV/Excel files
    weather_stations : list[str]   — PAGASA station IDs for weather fetch
    weather_start    : str         — ISO date, start of weather window
    weather_end      : str         — ISO date, end of weather window
    chunk_size       : int         — DB upsert batch size (default 500)
    skip_weather     : bool        — skip weather fetch/merge (useful for dry runs)
    """
    logger.info("═" * 70)
    logger.info("AquaStat ETL Pipeline — START")
    logger.info("═" * 70)

    engine = build_engine()

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 1 — Extraction & Cleansing
    # ──────────────────────────────────────────────────────────────────────
    logger.info("▶  Stage 1: Data Extraction & Cleansing")

    billing_df    = extract_billing([Path(f) for f in billing_files])
    production_df = extract_production([Path(f) for f in production_files])

    logger.info(
        "   Billing: %d clean records | Production: %d clean records",
        len(billing_df), len(production_df),
    )

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 2 — Feature Engineering & Extrapolation
    # ──────────────────────────────────────────────────────────────────────
    logger.info("▶  Stage 2: Monthly → Daily Extrapolation")

    daily_production = extrapolate_production_to_daily(production_df)
    daily_billing    = extrapolate_billing_to_daily(billing_df)

    logger.info(
        "   Daily production: %d rows | Daily billing: %d rows",
        len(daily_production), len(daily_billing),
    )

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 3 — Weather API Integration
    # ──────────────────────────────────────────────────────────────────────
    if skip_weather:
        logger.info("▶  Stage 3: Weather fetch skipped (--skip-weather flag set).")
        enriched_production = daily_production
    else:
        logger.info("▶  Stage 3: Fetching PAGASA weather data")

        stations = weather_stations or ["NAIA"]
        w_start  = weather_start    or "2017-01-01"
        w_end    = weather_end      or "2025-12-31"

        weather_df = fetch_historical_weather(stations, w_start, w_end)

        # Merge weather into daily production (primary operational table)
        enriched_production = merge_weather_with_operational(
            daily_production, weather_df,
            operational_date_col = "date",
            weather_date_col     = "obs_date",
        )
        logger.info(
            "   Enriched production: %d rows with weather regressors.", len(enriched_production)
        )

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 4 — Load to PostgreSQL
    # ──────────────────────────────────────────────────────────────────────
    logger.info("▶  Stage 4: Loading to PostgreSQL")

    load_production(enriched_production, engine=engine, chunk_size=chunk_size)
    load_billing(daily_billing,          engine=engine, chunk_size=chunk_size)

    # ──────────────────────────────────────────────────────────────────────
    # POST-LOAD VERIFICATION
    # ──────────────────────────────────────────────────────────────────────
    logger.info("▶  Post-load verification")
    summary = verify_load(engine)
    for table, stats in summary.items():
        logger.info("   %s → %s", table, stats)

    logger.info("═" * 70)
    logger.info("AquaStat ETL Pipeline — COMPLETE")
    logger.info("═" * 70)


# ──────────────────────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ──────────────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="AquaStat ETL Pipeline — ingest, transform, and load water utility data."
    )
    parser.add_argument(
        "--billing-files", nargs="+", required=True,
        help="Path(s) to raw billing CSV/Excel file(s).",
    )
    parser.add_argument(
        "--production-files", nargs="+", required=True,
        help="Path(s) to raw production CSV/Excel file(s).",
    )
    parser.add_argument(
        "--stations", nargs="*", default=["NAIA"],
        help="PAGASA station IDs for weather fetch (default: NAIA).",
    )
    parser.add_argument(
        "--start-date", default="2017-01-01",
        help="Start date for weather fetch (ISO format, default: 2017-01-01).",
    )
    parser.add_argument(
        "--end-date", default="2025-12-31",
        help="End date for weather fetch (ISO format, default: 2025-12-31).",
    )
    parser.add_argument(
        "--chunk-size", type=int, default=500,
        help="Database upsert batch size (default: 500).",
    )
    parser.add_argument(
        "--skip-weather", action="store_true",
        help="Skip the PAGASA weather fetch step.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    run_pipeline(
        billing_files    = args.billing_files,
        production_files = args.production_files,
        weather_stations = args.stations,
        weather_start    = args.start_date,
        weather_end      = args.end_date,
        chunk_size       = args.chunk_size,
        skip_weather     = args.skip_weather,
    )
