"""
=============================================================================
aquastat/intelligence/main.py
FastAPI Microservice — AquaStat Three-Tier Analytics Engine
=============================================================================
Provides REST endpoints for:
  • Tier 2 Predictive Forecasting: SARIMAX, Multivariate LSTM, Prophet, XGBoost, Ensemble
  • Tier 3 Prescriptive Analytics: Linear Programming (LP), MCDA (TOPSIS), FP-Growth
  • Live Gold Datamart Ingestion & Automated Model Retraining Pipeline
=============================================================================
"""

import logging
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure both workspace root and intelligence package directory are on sys.path
_INTELLIGENCE_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _INTELLIGENCE_DIR.parent
for _p in [str(_BACKEND_DIR), str(_INTELLIGENCE_DIR)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from intelligence.engine import AquaStatIntelligenceEngine
except ImportError:
    from engine import AquaStatIntelligenceEngine

try:
    from intelligence.predictive import (
        predict_lstm,
        predict_sarimax,
        train_sarimax,
        build_and_train_lstm,
        ProphetDemandModel,
        XGBoostDemandModel,
    )
    from intelligence.optimization import (
        optimize_pump_schedule,
        compute_mcda_zone_prioritization,
        discover_fp_growth_patterns,
    )
except ImportError:
    from predictive import (
        predict_lstm,
        predict_sarimax,
        train_sarimax,
        build_and_train_lstm,
        ProphetDemandModel,
        XGBoostDemandModel,
    )
    from optimization import (
        optimize_pump_schedule,
        compute_mcda_zone_prioritization,
        discover_fp_growth_patterns,
    )

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    HAS_TF = True
except Exception:
    HAS_TF = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aquastat.ml_engine")

MODEL_SARIMAX = "SARIMAX"
MODEL_MULTIVARIATE_LSTM = "Multivariate LSTM"
MODEL_META_PROPHET = "Meta Prophet"
MODEL_XGBOOST = "XGBoost Regressor"
MODEL_ENSEMBLE = "Stacking Ensemble"

# Global Model Registry & Engine Instance
engine = AquaStatIntelligenceEngine()

MODELS: Dict[str, Any] = {
    "sarimax": None,
    "lstm": None,
    "lstm_scaler": None,
    "prophet": None,
    "xgboost": None
}

# Lifecycle Management

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts into memory on startup."""
    logger.info("Initializing AquaStat Three-Tier Analytics Engine...")
    os.makedirs("models", exist_ok=True)
    sarimax_path = "models/sarimax_v1.pkl"
    lstm_path = "models/lstm_multivariate_v1.keras"
    scaler_path = "models/lstm_scaler.pkl"

    # 1. SARIMAX
    try:
        if os.path.exists(sarimax_path):
            logger.info("Loading existing SARIMAX model...")
            MODELS["sarimax"] = joblib.load(sarimax_path)
        else:
            logger.info("Training initial SARIMAX model...")
            dummy_demand = pd.Series([1000 + i*10 for i in range(100)])
            dummy_exog = pd.DataFrame({"temp": [30]*100, "rain": [0]*100})
            model = train_sarimax(dummy_demand, dummy_exog, order=(1,0,0), seasonal_order=(0,0,0,0))
            joblib.dump(model, sarimax_path)
            MODELS["sarimax"] = model
    except Exception as e:
        logger.warning(f"SARIMAX startup fallback: {e}")

    # 2. LSTM
    if HAS_TF:
        try:
            if os.path.exists(lstm_path) and os.path.exists(scaler_path):
                logger.info("Loading existing LSTM model and scaler...")
                MODELS["lstm"] = load_model(lstm_path)
                MODELS["lstm_scaler"] = joblib.load(scaler_path)
            else:
                logger.info("Training initial LSTM model and scaler...")
                dummy_demand = pd.Series([1000 + (i%30)*10 for i in range(200)])
                dummy_exog = pd.DataFrame({"temp": [30 + (i%5) for i in range(200)], "rain": [5]*200})
                model, scaler = build_and_train_lstm(dummy_demand, dummy_exog, look_back=14, epochs=2)
                model.save(lstm_path)
                joblib.dump(scaler, scaler_path)
                MODELS["lstm"] = model
                MODELS["lstm_scaler"] = scaler
        except Exception as e:
            logger.warning(f"LSTM startup fallback: {e}")

    # 3. Prophet
    try:
        MODELS["prophet"] = ProphetDemandModel()
        dummy_demand = pd.Series([6400 + i * 5 for i in range(100)])
        dummy_exog = pd.DataFrame({"temp": [30.0]*100, "rain": [2.0]*100})
        MODELS["prophet"].fit(dummy_demand, dummy_exog)
    except Exception as e:
        logger.warning(f"Prophet startup fallback: {e}")

    # 4. XGBoost
    try:
        MODELS["xgboost"] = XGBoostDemandModel()
        MODELS["xgboost"].fit(dummy_demand, dummy_exog)
    except Exception as e:
        logger.warning(f"XGBoost startup fallback: {e}")

    logger.info("All predictive & prescriptive engines online and ready.")
    yield
    logger.info("Shutting down AquaStat Analytics Engine...")
    MODELS.clear()


# ==============================================================================
# FASTAPI APP & MIDDLEWARE
# ==============================================================================

app = FastAPI(
    title="AquaStat-Tempo Intelligence API",
    version="2.0.0",
    description="Hydro-Meteorological ML Forecasting & LP Pump Dispatch API for TCWD",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# V1 ENTERPRISE INTELLIGENCE ENDPOINTS (DATAMART & RETRAINING)
# ==============================================================================

@app.get("/api/v1/health")
def v1_health_check():
    return {"status": "operational", "engine": "AquaStat-Intelligence-v2"}


@app.post("/api/v1/intelligence/run-pipeline")
def trigger_intelligence_pipeline(horizon: int = Query(12, ge=1, le=24)):
    """Retrains SARIMAX, XGBoost & LSTM on Gold Marts and solves LP Pump Dispatch."""
    summary = engine.run_full_pipeline(horizon=horizon)
    return {"status": "success", **summary}


@app.get("/api/v1/intelligence/supply-demand-forecast")
def get_supply_demand_forecast(
    algorithm: str = Query("XGBoost", description="SARIMAX | XGBoost | LSTM | Prophet | Ensemble"),
    location_id: int | None = Query(None, description="NULL for City-Wide Macro, or specific location_id")
):
    """
    Returns historical + future forecast series with Gross Required Supply (Billed + NRW),
    95% Confidence Intervals, and Shortage Deficit calculations.
    """
    with engine.get_connection() as conn:
        if location_id is None:
            hist_q = """
                SELECT time_id, year_month,
                       ROUND(SUM(produced_volume_m3), 2) AS sustainable_supply_m3,
                       ROUND(SUM(billed_volume_m3), 2) AS net_billed_demand_m3,
                       ROUND(SUM(nrw_volume_m3), 2) AS nrw_loss_m3,
                       ROUND(SUM(billed_volume_m3 + GREATEST(nrw_volume_m3, 0)), 2) AS gross_required_demand_m3
                FROM public.dm_water_balance_datamart
                WHERE time_id >= 20250100
                GROUP BY time_id, year_month
                ORDER BY time_id;
            """
            fc_q = """
                SELECT f.target_time_id AS time_id, dt.year_month,
                       f.algorithm_name,
                       (f.algorithm_name = 'Ensemble') AS is_champion_model,
                       f.predicted_supply_m3 AS sustainable_supply_m3,
                       f.predicted_demand_m3 AS net_billed_demand_m3,
                       f.predicted_loss_m3 AS nrw_loss_m3,
                       ROUND(f.predicted_demand_m3 + COALESCE(f.predicted_loss_m3, 0), 2) AS gross_required_demand_m3,
                       f.predicted_shortage_m3 AS shortage_m3,
                       f.ci_lower_m3, f.ci_upper_m3,
                       f.rmse_score, f.mae_score, f.mape_score, f.autonomous_alert
                FROM public.analytics_forecast_output f
                JOIN public.dim_time dt ON f.target_time_id = dt.time_id
                WHERE f.location_id IS NULL AND f.algorithm_name = %s
                ORDER BY f.target_time_id;
            """
            df_hist = pd.read_sql(hist_q, conn)
            df_fc = pd.read_sql(fc_q, conn, params=(algorithm,))
        else:
            hist_q = """
                SELECT time_id, year_month,
                       produced_volume_m3 AS sustainable_supply_m3,
                       billed_volume_m3 AS net_billed_demand_m3,
                       nrw_volume_m3 AS nrw_loss_m3,
                       ROUND(billed_volume_m3 + GREATEST(nrw_volume_m3, 0), 2) AS gross_required_demand_m3
                FROM public.dm_water_balance_datamart
                WHERE time_id >= 20250100 AND location_id = %s
                ORDER BY time_id;
            """
            fc_q = """
                SELECT f.target_time_id AS time_id, dt.year_month,
                       f.algorithm_name,
                       (f.algorithm_name = 'Ensemble') AS is_champion_model,
                       f.predicted_supply_m3 AS sustainable_supply_m3,
                       f.predicted_demand_m3 AS net_billed_demand_m3,
                       f.predicted_loss_m3 AS nrw_loss_m3,
                       ROUND(f.predicted_demand_m3 + COALESCE(f.predicted_loss_m3, 0), 2) AS gross_required_demand_m3,
                       f.predicted_shortage_m3 AS shortage_m3,
                       f.ci_lower_m3, f.ci_upper_m3,
                       f.rmse_score, f.mae_score, f.mape_score, f.autonomous_alert
                FROM public.analytics_forecast_output f
                JOIN public.dim_time dt ON f.target_time_id = dt.time_id
                WHERE f.location_id = %s AND f.algorithm_name = %s
                ORDER BY f.target_time_id;
            """
            df_hist = pd.read_sql(hist_q, conn, params=(location_id,))
            df_fc = pd.read_sql(fc_q, conn, params=(location_id, algorithm))

    return {
        "historical": df_hist.to_dict(orient="records"),
        "forecast": df_fc.to_dict(orient="records")
    }


@app.get("/api/v1/intelligence/weather-correlation")
def get_weather_correlation():
    """
    Computes live Ordinary Least Squares (OLS) regression (D = m*T + b, R^2, Pearson r)
    for Temperature vs. Daily Water Demand AND Seasonal Rainfall vs. NRW %.
    """
    with engine.get_connection() as conn:
        df = pd.read_sql("""
            SELECT time_id, year, month_number, month_name, year_month,
                   AVG(avg_temp_celsius) AS temp_c,
                   MAX(max_heat_index_celsius) AS heat_index_c,
                   AVG(total_rainfall_mm) AS rainfall_mm,
                   SUM(billed_volume_m3) / 30.0 AS daily_demand_m3,
                   (SUM(nrw_volume_m3) / NULLIF(SUM(produced_volume_m3), 0)) * 100.0 AS nrw_pct
            FROM public.dm_water_balance_datamart
            GROUP BY time_id, year, month_number, month_name, year_month
            ORDER BY time_id;
        """, conn)

    x_temp = df["temp_c"].values.astype(float)
    y_dem = df["daily_demand_m3"].values.astype(float)
    slope, intercept = np.polyfit(x_temp, y_dem, 1)
    r_val = float(np.corrcoef(x_temp, y_dem)[0, 1])
    r_squared = round(r_val ** 2, 4)

    seasonal = df.groupby(["month_number", "month_name"], as_index=False).agg({
        "rainfall_mm": "mean",
        "nrw_pct": "mean",
        "daily_demand_m3": "mean",
        "temp_c": "mean"
    }).sort_values("month_number")

    return {
        "regression": {
            "slope": round(float(slope), 2),
            "intercept": round(float(intercept), 2),
            "equation": f"D = {slope:,.0f}T {'-' if intercept < 0 else '+'} {abs(intercept):,.0f}",
            "pearson_r": round(r_val, 4),
            "r_squared": r_squared
        },
        "scatter_points": df[["year_month", "temp_c", "heat_index_c", "daily_demand_m3", "rainfall_mm", "nrw_pct"]].round(2).to_dict(orient="records"),
        "seasonal_pattern": seasonal.round(2).to_dict(orient="records")
    }


@app.get("/api/v1/intelligence/prescriptive-schedule")
def get_prescriptive_schedule(target_time_id: int | None = Query(None)):
    """Fetches the LP cost-optimal source & pump dispatch schedule."""
    with engine.get_connection() as conn:
        if target_time_id is None:
            q = """
                SELECT target_time_id FROM public.analytics_prescriptive_output
                ORDER BY target_time_id ASC LIMIT 1;
            """
            res = pd.read_sql(q, conn)
            if res.empty:
                return {"schedules": []}
            target_time_id = int(res["target_time_id"].iloc[0])

        df_sched = pd.read_sql("""
            SELECT p.schedule_id, p.target_time_id, dt.year_month,
                   s.source_code, s.source_name, s.source_type,
                   l.zone_code, l.service_zone_name,
                   p.recommended_volume_m3, p.recommended_operating_hours,
                   p.projected_power_cost_php, p.plain_text_directive, p.approval_status
            FROM public.analytics_prescriptive_output p
            JOIN public.dim_water_source s ON p.source_id = s.source_id
            JOIN public.dim_time dt ON p.target_time_id = dt.time_id
            LEFT JOIN public.dim_location l ON p.location_id = l.location_id
            WHERE p.target_time_id = %s
            ORDER BY s.source_type DESC, p.recommended_volume_m3 DESC;
        """, conn, params=(target_time_id,))

    return {
        "target_time_id": target_time_id,
        "total_recommended_volume_m3": round(float(df_sched["recommended_volume_m3"].sum()), 2),
        "total_projected_power_cost_php": round(float(df_sched["projected_power_cost_php"].sum()), 2),
        "schedules": df_sched.to_dict(orient="records")
    }


# ==============================================================================
# REQUEST / RESPONSE SCHEMAS FOR SINGLE-POINT INFERENCE
# ==============================================================================

class DemandPredictionRequest(BaseModel):
    historical_consumption: List[float] = Field(
        ..., 
        description="Historical water consumption sequence in m³.",
        min_length=1
    )
    temperature: float = Field(..., description="PAGASA temperature (°C).")
    rainfall: float = Field(..., description="PAGASA rainfall (mm).")

class OptimizationScheduleRequest(BaseModel):
    forecasted_demand: List[float] = Field(..., min_length=1, description="Hourly or 4-hour demand blocks (m³)")
    facilities: Optional[List[Dict[str, Any]]] = None
    energy_cost_kwh: Optional[float] = 8.50

class MCDARequest(BaseModel):
    zones_data: Optional[List[Dict[str, Any]]] = None
    weights: Optional[Dict[str, float]] = None


# ==============================================================================
# EXISTING PREDICTIVE & PRESCRIPTIVE INFERENCE ENDPOINTS
# ==============================================================================

@app.post("/api/predict/sarimax", status_code=status.HTTP_200_OK)
async def predict_sarimax_api(payload: DemandPredictionRequest) -> Dict[str, Any]:
    """Forecast water demand using Statistical SARIMAX with weather regressors."""
    try:
        val = predict_sarimax(MODELS["sarimax"], payload.temperature, payload.rainfall)
        return {
            "status": "success",
            "model": MODEL_SARIMAX,
            "forecasted_demand_m3": round(val, 2),
            "confidence_band_low_m3": round(val * 0.95, 2),
            "confidence_band_high_m3": round(val * 1.05, 2)
        }
    except Exception:
        logger.exception("SARIMAX failed")
        raise HTTPException(status_code=500, detail="SARIMAX inference error")

@app.post("/api/predict/lstm", status_code=status.HTTP_200_OK)
async def predict_lstm_api(payload: DemandPredictionRequest) -> Dict[str, Any]:
    """Forecast water demand using Multivariate Deep LSTM."""
    try:
        seq_length = len(payload.historical_consumption)
        data_2d = np.zeros((seq_length, 3))
        data_2d[:, 0] = payload.historical_consumption
        data_2d[:, 1] = payload.temperature
        data_2d[:, 2] = payload.rainfall

        val = predict_lstm(MODELS["lstm"], MODELS["lstm_scaler"], data_2d)
        return {
            "status": "success",
            "model": MODEL_MULTIVARIATE_LSTM,
            "forecasted_demand_m3": round(val, 2),
            "confidence_band_low_m3": round(val * 0.96, 2),
            "confidence_band_high_m3": round(val * 1.04, 2)
        }
    except Exception:
        logger.exception("LSTM failed")
        raise HTTPException(status_code=500, detail="LSTM inference error")

@app.post("/api/predict/prophet", status_code=status.HTTP_200_OK)
async def predict_prophet_api(payload: DemandPredictionRequest) -> Dict[str, Any]:
    """Forecast water demand using Additive Prophet Decomposition."""
    try:
        current_vol = payload.historical_consumption[-1] if payload.historical_consumption else 6400.0
        val = MODELS["prophet"].predict(current_vol, payload.temperature, payload.rainfall)
        return {
            "status": "success",
            "model": MODEL_META_PROPHET,
            "forecasted_demand_m3": round(val, 2),
            "confidence_band_low_m3": round(val * 0.94, 2),
            "confidence_band_high_m3": round(val * 1.06, 2)
        }
    except Exception:
        logger.exception("Prophet failed")
        raise HTTPException(status_code=500, detail="Prophet inference error")

@app.post("/api/predict/xgboost", status_code=status.HTTP_200_OK)
async def predict_xgboost_api(payload: DemandPredictionRequest) -> Dict[str, Any]:
    """Forecast water demand using Extreme Gradient Boosting (XGBoost)."""
    try:
        val = MODELS["xgboost"].predict(payload.historical_consumption, payload.temperature, payload.rainfall)
        return {
            "status": "success",
            "model": MODEL_XGBOOST,
            "forecasted_demand_m3": round(val, 2),
            "confidence_band_low_m3": round(val * 0.95, 2),
            "confidence_band_high_m3": round(val * 1.05, 2)
        }
    except Exception:
        logger.exception("XGBoost failed")
        raise HTTPException(status_code=500, detail="XGBoost inference error")

@app.post("/api/prescribe/pump-schedule", status_code=status.HTTP_200_OK)
async def optimize_schedule_api(payload: OptimizationScheduleRequest) -> Dict[str, Any]:
    """Generate energy-minimizing pump dispatch schedule via Linear Programming (PuLP)."""
    try:
        result = optimize_pump_schedule(
            forecasted_demand=payload.forecasted_demand,
            facilities=payload.facilities,
            energy_cost_kwh=payload.energy_cost_kwh or 8.50
        )
        return {"status": "success", "data": result}
    except Exception:
        logger.exception("LP optimization failed")
        raise HTTPException(status_code=500, detail="Linear Programming solver error")

@app.post("/api/prescribe/mcda-zone-ranking", status_code=status.HTTP_200_OK)
async def mcda_ranking_api(payload: MCDARequest) -> Dict[str, Any]:
    """Rank multi-zone infrastructure interventions using TOPSIS MCDA algorithm."""
    try:
        rankings = compute_mcda_zone_prioritization(payload.zones_data, payload.weights)
        return {"status": "success", "rankings": rankings}
    except Exception:
        logger.exception("MCDA ranking failed")
        raise HTTPException(status_code=500, detail="MCDA computation error")

@app.get("/api/prescribe/fp-growth-patterns", status_code=status.HTTP_200_OK)
async def fp_growth_patterns_api(min_support: float = 0.20, min_confidence: float = 0.60) -> Dict[str, Any]:
    """Discover incident and failure pattern association rules using FP-Growth."""
    try:
        patterns = discover_fp_growth_patterns(min_support, min_confidence)
        return {"status": "success", "patterns": patterns}
    except Exception:
        logger.exception("FP-Growth failed")
        raise HTTPException(status_code=500, detail="FP-Growth mining error")

@app.post("/api/pipeline/trigger-sync", status_code=status.HTTP_200_OK)
async def trigger_pipeline_sync():
    """Triggers feature ingestion from dm_water_balance_datamart and writeback to analytics_forecast_output."""
    try:
        res = engine.run_full_pipeline(horizon=12)
        return {"status": "success", "message": "ML inference pipeline executed successfully.", **res}
    except Exception as e:
        logger.exception("Pipeline execution failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", status_code=status.HTTP_200_OK)
async def root_index():
    return {
        "status": "healthy",
        "service": "AquaStat Three-Tier Analytics Engine",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_url": "/health",
        "models_active": [MODEL_SARIMAX, MODEL_MULTIVARIATE_LSTM, MODEL_META_PROPHET, MODEL_XGBOOST, MODEL_ENSEMBLE],
        "prescriptive_modules": ["Linear Programming (LP)", "MCDA (TOPSIS)", "FP-Growth Mining"]
    }

@app.get("/health", status_code=status.HTTP_200_OK)
async def legacy_health_check():
    return {
        "status": "healthy",
        "service": "AquaStat Three-Tier Analytics Engine",
        "models_active": [MODEL_SARIMAX, MODEL_MULTIVARIATE_LSTM, MODEL_META_PROPHET, MODEL_XGBOOST, MODEL_ENSEMBLE],
        "prescriptive_modules": ["Linear Programming (LP)", "MCDA (TOPSIS)", "FP-Growth Mining"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
