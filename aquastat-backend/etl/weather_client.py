"""
=============================================================================
aquastat/etl/weather_client.py
Stage 3 — External API Integration: PAGASA Meteorological Data
=============================================================================
Responsibilities:
  • Fetch historical and real-time temperature & rainfall from the PAGASA API.
  • Handle rate limiting, retries with exponential back-off, and HTTP errors.
  • Transform the raw API response into a clean, typed DataFrame.
  • Merge the weather data with the daily operational dataset to produce the
    external regressor matrix required by the ML forecasting models.

PAGASA API Notes:
  The Philippine Atmospheric, Geophysical and Astronomical Services
  Administration (PAGASA) exposes weather data via a REST API.
  Authentication is via a Bearer token obtained from the developer portal:
      https://developer.pagasa.dost.gov.ph/

  This client targets the following endpoints:
    • GET /climate/observations/daily
        → Historical daily weather observations by station.
    • GET /climate/observations/latest
        → Latest real-time station reading.

  Environment variables required:
    PAGASA_API_BASE_URL   — base URL of the PAGASA API
    PAGASA_API_KEY        — your API key / Bearer token
=============================================================================
"""

import logging
import os
import time
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger("aquastat.etl.weather_client")

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION  (pulled from environment so secrets never live in source code)
# ──────────────────────────────────────────────────────────────────────────────

PAGASA_API_BASE_URL: str = os.getenv(
    "PAGASA_API_BASE_URL", "https://api.pagasa.dost.gov.ph/api/v1"
)
PAGASA_API_KEY: str = os.getenv("PAGASA_API_KEY", "")

# Endpoints
_ENDPOINT_HISTORICAL = "/climate/observations/daily"
_ENDPOINT_REALTIME   = "/climate/observations/latest"

# Retry / back-off settings
_MAX_RETRIES      = 5
_BACKOFF_FACTOR   = 1.5   # seconds between retries (multiplied exponentially)
_RETRY_ON_STATUSES = {429, 500, 502, 503, 504}

# Request timeout (seconds)
_REQUEST_TIMEOUT  = 30

# Batch size: max days requested per API call (avoid 413 / URL-length issues)
_BATCH_DAYS       = 30


# ──────────────────────────────────────────────────────────────────────────────
# HTTP SESSION  (shared across all requests in this process)
# ──────────────────────────────────────────────────────────────────────────────

def _build_session() -> requests.Session:
    """
    Create a requests.Session with:
      • Bearer token authentication.
      • Automatic retries on transient HTTP errors (5xx, 429).
      • Connection and read timeouts.
    """
    if not PAGASA_API_KEY:
        logger.warning(
            "PAGASA_API_KEY environment variable is not set. "
            "Requests to the PAGASA API will likely return 401 Unauthorized."
        )

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {PAGASA_API_KEY}",
        "Accept":        "application/json",
        "Content-Type":  "application/json",
    })

    # urllib3 Retry: retries on connection errors and specific HTTP status codes
    retry_strategy = Retry(
        total              = _MAX_RETRIES,
        backoff_factor     = _BACKOFF_FACTOR,
        status_forcelist   = _RETRY_ON_STATUSES,
        allowed_methods    = ["GET"],    # only retry idempotent requests
        raise_on_status    = False,      # we handle errors ourselves
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://",  adapter)

    return session


# Module-level session (lazy-initialised)
_session: Optional[requests.Session] = None


def _get_session() -> requests.Session:
    global _session
    if _session is None:
        _session = _build_session()
    return _session


# ──────────────────────────────────────────────────────────────────────────────
# LOW-LEVEL REQUEST HELPER
# ──────────────────────────────────────────────────────────────────────────────

def _get(endpoint: str, params: dict) -> dict:
    """
    Perform a GET request against the PAGASA API.

    Raises
    ------
    requests.HTTPError    — on 4xx client errors (not retried).
    requests.Timeout      — if the server does not respond in time.
    RuntimeError          — if the response body cannot be parsed as JSON.
    """
    url = f"{PAGASA_API_BASE_URL}{endpoint}"
    logger.debug("GET %s  params=%s", url, params)

    resp = _get_session().get(url, params=params, timeout=_REQUEST_TIMEOUT)

    if resp.status_code == 401:
        raise requests.HTTPError(
            "PAGASA API returned 401 Unauthorized. "
            "Verify that PAGASA_API_KEY is correct and has not expired.",
            response=resp,
        )
    if resp.status_code == 404:
        raise requests.HTTPError(
            f"PAGASA API returned 404 for {url}. "
            "Check the station ID or the date range.",
            response=resp,
        )

    resp.raise_for_status()

    try:
        return resp.json()
    except ValueError as exc:
        raise RuntimeError(
            f"Could not parse PAGASA API response as JSON. "
            f"Response text (first 500 chars): {resp.text[:500]}"
        ) from exc


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE PARSING
# ──────────────────────────────────────────────────────────────────────────────

def _parse_observations(raw_response: dict) -> pd.DataFrame:
    """
    Normalise the PAGASA API JSON response into a flat DataFrame.

    Expected response shape (adjust field names to actual PAGASA API spec):
    {
      "status": "success",
      "data": [
        {
          "station_id":   "NAIA",
          "station_name": "Ninoy Aquino International Airport",
          "date":         "2024-01-15",
          "max_temp_c":   32.4,
          "min_temp_c":   24.1,
          "mean_temp_c":  28.2,
          "rainfall_mm":  12.5,
          "humidity_pct": 85.0,
          "wind_speed_kmh": 14.0
        },
        ...
      ]
    }
    """
    if raw_response.get("status") not in {"success", "ok", "OK", 200, "200"}:
        logger.warning(
            "PAGASA API returned a non-success status: %s", raw_response.get("status")
        )

    records = raw_response.get("data", [])
    if not records:
        logger.warning("PAGASA API returned an empty 'data' array.")
        return pd.DataFrame()

    df = pd.json_normalize(records)

    # ── Rename fields to canonical internal names ───────────────────────────
    rename_map = {
        # Station identifiers
        "station_id":      "station_id",
        "stationId":       "station_id",
        "station_name":    "station_name",
        "stationName":     "station_name",
        # Date
        "date":            "obs_date",
        "observation_date":"obs_date",
        "obsDate":         "obs_date",
        # Temperature
        "max_temp_c":      "temp_max_c",
        "maxTemp":         "temp_max_c",
        "min_temp_c":      "temp_min_c",
        "minTemp":         "temp_min_c",
        "mean_temp_c":     "temp_mean_c",
        "meanTemp":        "temp_mean_c",
        # Rainfall
        "rainfall_mm":     "rainfall_mm",
        "rainfall":        "rainfall_mm",
        "rain_mm":         "rainfall_mm",
        "precipitation_mm":"rainfall_mm",
        # Extras (useful as additional regressors)
        "humidity_pct":    "humidity_pct",
        "relHumidity":     "humidity_pct",
        "wind_speed_kmh":  "wind_speed_kmh",
        "windSpeed":       "wind_speed_kmh",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # ── Type coercion ───────────────────────────────────────────────────────
    if "obs_date" in df.columns:
        df["obs_date"] = pd.to_datetime(df["obs_date"], errors="coerce")

    for col in ("temp_max_c", "temp_min_c", "temp_mean_c", "rainfall_mm",
                "humidity_pct", "wind_speed_kmh"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # ── Derive temp_mean_c if missing but min/max are present ───────────────
    if "temp_mean_c" not in df.columns or df["temp_mean_c"].isna().all():
        if {"temp_max_c", "temp_min_c"}.issubset(df.columns):
            df["temp_mean_c"] = (df["temp_max_c"] + df["temp_min_c"]) / 2.0
            logger.info("temp_mean_c derived as (max + min) / 2.")

    # ── Physical bounds validation ──────────────────────────────────────────
    # Philippines temperature range: ~15°C (Benguet highlands) to ~40°C (lowlands)
    for col in ("temp_max_c", "temp_min_c", "temp_mean_c"):
        if col in df.columns:
            mask = (df[col] < 0) | (df[col] > 50)
            if mask.any():
                logger.warning(
                    "Weather: %d physically implausible '%s' value(s) set to NaN.", mask.sum(), col
                )
                df.loc[mask, col] = np.nan

    # Rainfall must be non-negative
    if "rainfall_mm" in df.columns:
        mask = df["rainfall_mm"] < 0
        if mask.any():
            logger.warning(
                "Weather: %d negative rainfall value(s) set to 0.", mask.sum()
            )
            df.loc[mask, "rainfall_mm"] = 0.0

    return df


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC API — FETCHING
# ──────────────────────────────────────────────────────────────────────────────

def fetch_historical_weather(
    station_ids: List[str],
    start_date: Union[str, date, datetime],
    end_date:   Union[str, date, datetime],
) -> pd.DataFrame:
    """
    Fetch historical daily weather observations for one or more PAGASA stations.

    Requests are batched into 30-day windows to respect API payload limits and
    to improve resilience (a single failing batch doesn't abort the whole fetch).

    Parameters
    ----------
    station_ids : list[str]
        PAGASA station identifiers (e.g., ["NAIA", "SCIENCE_GARDEN", "MACTAN"]).
    start_date  : str | date | datetime
        Inclusive start of the historical window.
    end_date    : str | date | datetime
        Inclusive end of the historical window.

    Returns
    -------
    pd.DataFrame  — daily weather observations with columns:
        station_id, station_name, obs_date, temp_max_c, temp_min_c,
        temp_mean_c, rainfall_mm, humidity_pct, wind_speed_kmh
    """
    start = pd.to_datetime(start_date).date()
    end   = pd.to_datetime(end_date).date()

    if start > end:
        raise ValueError(f"start_date ({start}) must be before or equal to end_date ({end}).")

    logger.info(
        "Fetching historical weather for %d station(s) from %s to %s.",
        len(station_ids), start, end,
    )

    all_frames: List[pd.DataFrame] = []

    for station_id in station_ids:
        logger.info("  Station: %s", station_id)
        batch_start = start

        while batch_start <= end:
            batch_end = min(batch_start + timedelta(days=_BATCH_DAYS - 1), end)
            params = {
                "station_id": station_id,
                "start_date": batch_start.isoformat(),
                "end_date":   batch_end.isoformat(),
            }

            try:
                raw = _get(_ENDPOINT_HISTORICAL, params)
                frame = _parse_observations(raw)
                if not frame.empty:
                    all_frames.append(frame)
            except requests.HTTPError as exc:
                logger.error(
                    "HTTP error fetching weather for station '%s' [%s→%s]: %s",
                    station_id, batch_start, batch_end, exc,
                )
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Unexpected error fetching weather for station '%s' [%s→%s]: %s",
                    station_id, batch_start, batch_end, exc,
                )

            batch_start = batch_end + timedelta(days=1)

    if not all_frames:
        logger.warning("No historical weather data was successfully fetched.")
        return pd.DataFrame()

    weather = pd.concat(all_frames, ignore_index=True)

    # Deduplicate on (station_id, obs_date) — keep last (most recent fetch wins)
    if {"station_id", "obs_date"}.issubset(weather.columns):
        weather = weather.drop_duplicates(subset=["station_id", "obs_date"], keep="last")

    weather.sort_values(["station_id", "obs_date"], inplace=True)
    weather.reset_index(drop=True, inplace=True)

    logger.info(
        "Historical weather fetch complete: %d daily observation(s).", len(weather)
    )
    return weather


def fetch_realtime_weather(station_ids: List[str]) -> pd.DataFrame:
    """
    Fetch the most recent real-time observation for each PAGASA station.

    Parameters
    ----------
    station_ids : list[str]  — PAGASA station identifiers.

    Returns
    -------
    pd.DataFrame  — one row per station with the latest reading.
    """
    logger.info(
        "Fetching real-time weather for %d station(s).", len(station_ids)
    )
    frames: List[pd.DataFrame] = []

    for station_id in station_ids:
        params = {"station_id": station_id}
        try:
            raw   = _get(_ENDPOINT_REALTIME, params)
            frame = _parse_observations(raw)
            if not frame.empty:
                # Latest endpoint returns a single record; tag it with today's date
                if "obs_date" not in frame.columns or frame["obs_date"].isna().all():
                    frame["obs_date"] = pd.Timestamp.today().normalize()
                frames.append(frame)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Error fetching real-time weather for station '%s': %s", station_id, exc
            )

    if not frames:
        logger.warning("No real-time weather data fetched.")
        return pd.DataFrame()

    result = pd.concat(frames, ignore_index=True)
    logger.info("Real-time weather fetch complete: %d station(s).", len(result))
    return result


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC API — MERGING
# ──────────────────────────────────────────────────────────────────────────────

def merge_weather_with_operational(
    operational_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    operational_date_col: str = "date",
    weather_date_col: str     = "obs_date",
    aggregation: str          = "mean",
    fill_method: str          = "interpolate",
) -> pd.DataFrame:
    """
    Left-join daily operational data with daily weather observations.

    If multiple weather stations are provided, their readings are first
    aggregated to a single daily value (mean by default) before merging.

    Parameters
    ----------
    operational_df       : pd.DataFrame  — daily operational data (Stage 2 output)
    weather_df           : pd.DataFrame  — weather observations (Stage 3 output)
    operational_date_col : str           — date column in the operational frame
    weather_date_col     : str           — date column in the weather frame
    aggregation          : str           — how to aggregate multi-station readings
                                           into a single value ('mean', 'max', 'min')
    fill_method          : str           — strategy for missing weather after merge:
                                           'interpolate' (default) | 'ffill' | 'bfill' | 'none'

    Returns
    -------
    pd.DataFrame  — operational data enriched with weather regressors.
    """
    if weather_df.empty:
        logger.warning(
            "Weather DataFrame is empty; returning operational data with NaN weather columns."
        )
        for col in ("temp_max_c", "temp_min_c", "temp_mean_c", "rainfall_mm",
                    "humidity_pct", "wind_speed_kmh"):
            operational_df[col] = np.nan
        return operational_df

    # ── Aggregate multi-station weather to one row per date ─────────────────
    weather_numeric = weather_df.drop(
        columns=["station_id", "station_name"], errors="ignore"
    )
    agg_fn = {"mean": "mean", "max": "max", "min": "min"}.get(aggregation, "mean")
    daily_weather = (
        weather_numeric
        .groupby(weather_date_col)
        .agg(agg_fn)
        .reset_index()
    )
    daily_weather = daily_weather.rename(columns={weather_date_col: operational_date_col})
    daily_weather[operational_date_col] = pd.to_datetime(
        daily_weather[operational_date_col], errors="coerce"
    )

    # ── Left-join on the date column ────────────────────────────────────────
    operational_df[operational_date_col] = pd.to_datetime(
        operational_df[operational_date_col], errors="coerce"
    )
    merged = operational_df.merge(daily_weather, on=operational_date_col, how="left")

    # ── Fill missing weather readings ────────────────────────────────────────
    weather_cols = [
        c for c in ("temp_max_c", "temp_min_c", "temp_mean_c",
                    "rainfall_mm", "humidity_pct", "wind_speed_kmh")
        if c in merged.columns
    ]

    if fill_method == "interpolate":
        # Linear interpolation is the most neutral assumption for meteorological data
        for col in weather_cols:
            merged[col] = merged[col].interpolate(method="linear", limit_direction="both")
    elif fill_method == "ffill":
        merged[weather_cols] = merged[weather_cols].ffill()
    elif fill_method == "bfill":
        merged[weather_cols] = merged[weather_cols].bfill()
    elif fill_method == "none":
        pass  # Leave NaNs as-is; the caller will handle them
    else:
        raise ValueError(
            f"Unknown fill_method '{fill_method}'. "
            "Choose from: 'interpolate', 'ffill', 'bfill', 'none'."
        )

    n_missing = merged[weather_cols].isna().any(axis=1).sum()
    if n_missing > 0:
        logger.warning(
            "%d row(s) still have missing weather values after fill (method='%s').",
            n_missing, fill_method,
        )

    # ── Add derived regressor features useful for water demand modelling ────
    # 1. Is it a dry day? (rainfall < 1 mm is conventionally "dry")
    if "rainfall_mm" in merged.columns:
        merged["is_dry_day"] = (merged["rainfall_mm"] < 1.0).astype(int)

    # 2. Heat index proxy (simplified — useful for demand correlation)
    if {"temp_mean_c", "humidity_pct"}.issubset(merged.columns):
        # Steadman's simplified heat index formula
        T = merged["temp_mean_c"]
        R = merged["humidity_pct"]
        merged["heat_index_c"] = (
            -8.78469475556
            + 1.61139411   * T
            + 2.33854883889 * R
            - 0.14611605   * T * R
            - 0.012308094  * T**2
            - 0.016424828  * R**2
            + 0.002211732  * T**2 * R
            + 0.00072546   * T * R**2
            - 0.000003582  * T**2 * R**2
        ).round(2)

    # 3. 3-day rolling average rainfall (lagged regressor)
    if "rainfall_mm" in merged.columns:
        merged = merged.sort_values(operational_date_col)
        merged["rainfall_3d_avg"] = (
            merged["rainfall_mm"]
            .rolling(window=3, min_periods=1)
            .mean()
            .round(4)
        )

    logger.info(
        "Weather merge complete: %d rows, %d weather/derived columns added.",
        len(merged),
        len(weather_cols) + sum(
            c in merged.columns
            for c in ("is_dry_day", "heat_index_c", "rainfall_3d_avg")
        ),
    )
    return merged
