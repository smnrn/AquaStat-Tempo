"""
=============================================================================
aquastat/etl/extrapolator.py
Stage 2 — Feature Engineering & Monthly-to-Daily Extrapolation
=============================================================================
Problem:
  Raw operational data (production volume, billed volume, NRW, energy) is
  recorded at monthly granularity.  Forecasting models (SARIMA, XGBoost,
  Prophet) require a daily time-series index.

Approach — Seasonal Proportion Disaggregation:
  For each month M we have a total T(M).  We distribute that total across the
  days of M using a seasonal weighting vector derived from the historical data
  itself:

      weight(d) = seasonal_factor(day_of_year(d)) / sum(seasonal_factor for all d in M)

  The seasonal factor for each calendar day-of-year is computed by:
    1. Building a long-run average (LRA) from all historical months.
    2. Computing month averages, then dividing each day's contribution by its
       month average to get a dimensionless "within-month" seasonal index.
    3. Smoothing that index with a 7-day centred rolling window to remove
       noise while preserving the seasonal shape.

  This approach guarantees:
    • The daily values for a month sum exactly to the monthly total (mass conservation).
    • Values respect observed within-month seasonal patterns
      (e.g., higher demand mid-month, production peaks after rain events).
    • Negative values are physically impossible; a floor of 0 is enforced.

Fallback:
  If historical data is insufficient to build seasonal weights (< 12 months),
  the function falls back to uniform disaggregation (equal share per day).
=============================================================================
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger("aquastat.etl.extrapolator")

# Minimum months of history needed to compute meaningful seasonal weights
MIN_HISTORY_MONTHS = 12

# Smoothing window for the seasonal index (days); must be odd for centred rolling
SEASONAL_SMOOTH_WINDOW = 7


# ──────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _build_seasonal_index(
    monthly_df: pd.DataFrame,
    date_col: str,
    value_col: str,
) -> pd.Series:
    """
    Compute a day-of-year seasonal index from historical monthly totals.

    The index is a Series indexed by day-of-year (1–366) representing the
    average relative "share" of the monthly total that falls on each day.
    Values sum to approximately 1.0 within each calendar month.

    Parameters
    ----------
    monthly_df : pd.DataFrame  — historical monthly data
    date_col   : str           — column holding a date that identifies the month
                                 (e.g., the first day of each reporting month)
    value_col  : str           — the numeric column to base the index on

    Returns
    -------
    pd.Series  — seasonal weight indexed by day-of-year (1–366).
    """
    # Work on a copy to avoid mutating the caller's frame
    df = monthly_df[[date_col, value_col]].copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col, value_col])
    df = df[df[value_col] > 0]

    if len(df) < MIN_HISTORY_MONTHS:
        logger.warning(
            "Only %d months of history for '%s'; fewer than %d required. "
            "Falling back to uniform seasonal index.",
            len(df), value_col, MIN_HISTORY_MONTHS,
        )
        # Uniform: each day-of-year has equal weight
        return pd.Series(1.0, index=range(1, 367))

    # Step 1: For each historical month, expand to daily rows
    #         Each day receives 1 / days_in_month of the monthly total.
    expanded_rows = []
    for _, row in df.iterrows():
        month_start = row[date_col].replace(day=1)
        # Generate all calendar days in this month
        days_in_month = pd.date_range(month_start, periods=1, freq="MS").to_period("M")[0].days_in_month
        day_dates = pd.date_range(month_start, periods=days_in_month, freq="D")
        daily_share = row[value_col] / days_in_month
        for d in day_dates:
            expanded_rows.append({"date": d, "daily_value": daily_share})

    expanded = pd.DataFrame(expanded_rows)
    expanded["day_of_year"] = expanded["date"].dt.dayofyear
    expanded["month"]       = expanded["date"].dt.month

    # Step 2: Compute the long-run average daily value for each day-of-year
    doy_avg = expanded.groupby("day_of_year")["daily_value"].mean()

    # Step 3: Normalise within each calendar month so that weights sum to ~1 per month
    #         This converts absolute levels → relative within-month shape.
    month_avg = expanded.groupby("month")["daily_value"].mean()
    month_map  = expanded[["day_of_year", "month"]].drop_duplicates().set_index("day_of_year")["month"]

    seasonal_index = doy_avg.copy()
    for doy, month in month_map.items():
        if doy in seasonal_index.index and month_avg[month] > 0:
            seasonal_index[doy] = seasonal_index[doy] / month_avg[month]

    # Step 4: Smooth with a 7-day centred rolling window to reduce noise
    #         Use min_periods=1 so edge days (1 and 366) are still covered.
    seasonal_index = (
        seasonal_index
        .reindex(range(1, 367))
        .interpolate(method="linear")  # fill any missing DOYs (e.g., day 366 in non-leap years)
        .rolling(window=SEASONAL_SMOOTH_WINDOW, center=True, min_periods=1)
        .mean()
    )

    # Ensure all weights are positive (physical constraint)
    seasonal_index = seasonal_index.clip(lower=1e-6)
    logger.info(
        "Seasonal index for '%s' built from %d months of history.", value_col, len(df)
    )
    return seasonal_index


def _disaggregate_month(
    month_start: pd.Timestamp,
    monthly_total: float,
    seasonal_index: pd.Series,
) -> pd.DataFrame:
    """
    Distribute a single month's total across its calendar days.

    Uses the pre-computed seasonal_index to weight each day proportionally,
    guaranteeing the daily values sum exactly to monthly_total.

    Parameters
    ----------
    month_start    : pd.Timestamp  — first day of the target month
    monthly_total  : float         — the total value to distribute
    seasonal_index : pd.Series     — seasonal weight by day-of-year (1–366)

    Returns
    -------
    pd.DataFrame with columns ['date', 'daily_value']
    """
    month_start = month_start.replace(day=1)
    days_in_month = pd.Period(month_start, freq="M").days_in_month
    day_dates = pd.date_range(month_start, periods=days_in_month, freq="D")

    # Retrieve the weight for each day (fall back to 1.0 if DOY not in index)
    weights = np.array([
        seasonal_index.get(d.dayofyear, 1.0) for d in day_dates
    ], dtype=float)

    weight_sum = weights.sum()
    if weight_sum == 0:
        # Degenerate case: uniform fallback
        weights = np.ones(days_in_month, dtype=float)
        weight_sum = float(days_in_month)

    # Normalise weights → proportions, then scale to monthly total
    proportions = weights / weight_sum
    daily_values = proportions * monthly_total

    # Floor at 0 — negative volumes are physically impossible
    daily_values = np.clip(daily_values, a_min=0.0, a_max=None)

    return pd.DataFrame({"date": day_dates, "daily_value": daily_values})


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ──────────────────────────────────────────────────────────────────────────────

def _disaggregate_rate_column(col_df: pd.DataFrame, col: str) -> pd.DataFrame:
    rows = []
    for _, row in col_df.iterrows():
        days_in_month = pd.Period(row["_month_start"], freq="M").days_in_month
        for d in pd.date_range(row["_month_start"], periods=days_in_month, freq="D"):
            rows.append({"date": d, col: row[col]})
    return pd.DataFrame(rows) if rows else pd.DataFrame(columns=["date", col])


def _disaggregate_volume_column(col_df: pd.DataFrame, col: str) -> pd.DataFrame:
    seasonal_idx = _build_seasonal_index(col_df, "_month_start", col)
    rows = []
    for _, row in col_df.iterrows():
        daily_frame = _disaggregate_month(
            row["_month_start"], row[col], seasonal_idx
        )
        daily_frame = daily_frame.rename(columns={"daily_value": col})
        rows.append(daily_frame)
    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame(columns=["date", col])


def _disaggregate_facility(
    fdf: pd.DataFrame,
    facility: Any,
    facility_col: str,
    value_cols: list,
    rate_cols: set
) -> Optional[pd.DataFrame]:
    facility_daily_frames = []
    for col in value_cols:
        if col not in fdf.columns:
            logger.warning("Column '%s' not found in production data — skipping.", col)
            continue

        col_df = fdf[["_month_start", col]].dropna(subset=[col])
        if col in rate_cols:
            col_daily = _disaggregate_rate_column(col_df, col)
        else:
            col_daily = _disaggregate_volume_column(col_df, col)
        facility_daily_frames.append(col_daily.set_index("date"))

    if not facility_daily_frames:
        return None

    facility_daily = facility_daily_frames[0]
    for frame in facility_daily_frames[1:]:
        facility_daily = facility_daily.join(frame, how="outer")

    facility_daily.reset_index(inplace=True)
    facility_daily[facility_col] = facility

    for meta_col in ("facility_name", "status"):
        if meta_col in fdf.columns:
            last_val = fdf.sort_values("_month_start")[meta_col].dropna()
            facility_daily[meta_col] = last_val.iloc[-1] if len(last_val) > 0 else np.nan

    return facility_daily


def extrapolate_production_to_daily(
    monthly_df: pd.DataFrame,
    date_col: str    = "recorded_at",
    value_cols: Optional[list] = None,
    facility_col: str = "facility_id",
) -> pd.DataFrame:
    """
    Disaggregate monthly production records to a continuous daily time-series.
    """
    if value_cols is None:
        value_cols = [
            "volume_produced_m3",
            "nrw_volume_m3",
            "energy_consumption_kwh",
            "nrw_percentage",
        ]

    rate_cols = {"nrw_percentage", "efficiency"}
    df = monthly_df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df["_month_start"] = df[date_col].dt.to_period("M").dt.to_timestamp()

    facilities = df[facility_col].dropna().unique() if facility_col in df.columns else [None]
    all_daily_frames = []

    for facility in facilities:
        fdf = df[df[facility_col] == facility].copy() if facility is not None else df.copy()
        logger.info(
            "Extrapolating production to daily for facility '%s' (%d monthly records).",
            facility, len(fdf),
        )
        facility_daily = _disaggregate_facility(fdf, facility, facility_col, value_cols, rate_cols)
        if facility_daily is not None:
            all_daily_frames.append(facility_daily)

    if not all_daily_frames:
        logger.error("No daily production data could be generated.")
        return pd.DataFrame()

    result = pd.concat(all_daily_frames, ignore_index=True)
    result.sort_values(["date", facility_col], inplace=True)
    result.reset_index(drop=True, inplace=True)

    logger.info(
        "Production extrapolation complete: %d daily rows across %d facility/facilities.",
        len(result), len(facilities),
    )
    return result


def _disaggregate_billing_group(
    gdf: pd.DataFrame,
    group: Any,
    group_col: Optional[str],
    value_cols: list
) -> Optional[pd.DataFrame]:
    group_daily_frames = []
    for col in value_cols:
        if col not in gdf.columns:
            logger.warning("Column '%s' not found in billing data — skipping.", col)
            continue

        col_df = gdf[["_month_start", col]].dropna(subset=[col])
        col_daily = _disaggregate_volume_column(col_df, col)
        group_daily_frames.append(col_daily.set_index("date"))

    if not group_daily_frames:
        return None

    group_daily = group_daily_frames[0]
    for frame in group_daily_frames[1:]:
        group_daily = group_daily.join(frame, how="outer")

    group_daily.reset_index(inplace=True)
    if group_col:
        group_daily[group_col] = group

    return group_daily


def extrapolate_billing_to_daily(
    monthly_df: pd.DataFrame,
    period_start_col: str  = "billing_period_start",
    period_end_col: str    = "billing_period_end",
    value_cols: Optional[list] = None,
    group_col: Optional[str]   = None,
) -> pd.DataFrame:
    """
    Disaggregate monthly billing totals to a continuous daily time-series.
    """
    if value_cols is None:
        value_cols = ["volume_billed_m3", "amount_due"]

    df = monthly_df.copy()
    df[period_start_col] = pd.to_datetime(df[period_start_col], errors="coerce")
    df["_month_start"]   = df[period_start_col].dt.to_period("M").dt.to_timestamp()

    groups = (
        df[group_col].dropna().unique()
        if group_col and group_col in df.columns
        else [None]
    )

    all_daily_frames = []

    for group in groups:
        gdf = df[df[group_col] == group].copy() if group is not None else df.copy()
        logger.info(
            "Extrapolating billing to daily for group '%s' (%d monthly records).",
            group, len(gdf),
        )
        group_daily = _disaggregate_billing_group(gdf, group, group_col, value_cols)
        if group_daily is not None:
            all_daily_frames.append(group_daily)

    if not all_daily_frames:
        logger.error("No daily billing data could be generated.")
        return pd.DataFrame()

    result = pd.concat(all_daily_frames, ignore_index=True)
    result.sort_values("date", inplace=True)
    result.reset_index(drop=True, inplace=True)

    logger.info("Billing extrapolation complete: %d daily rows.", len(result))
    return result
