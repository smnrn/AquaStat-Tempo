"""
=============================================================================
aquastat/intelligence/main.py
FastAPI Microservice — AquaStat Three-Tier Analytics Engine
=============================================================================
Provides REST endpoints for:
  • Tier 2 Predictive Forecasting: SARIMAX, Multivariate LSTM, Prophet, XGBoost
  • Tier 3 Prescriptive Analytics: Linear Programming (LP), MCDA (TOPSIS), FP-Growth
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
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure both workspace root and intelligence package directory are on sys.path
_INTELLIGENCE_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _INTELLIGENCE_DIR.parent
for _p in [str(_BACKEND_DIR), str(_INTELLIGENCE_DIR)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

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
import tensorflow as tf
from tensorflow.keras.models import load_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aquastat.ml_engine")

MODEL_SARIMAX = "SARIMAX"
MODEL_MULTIVARIATE_LSTM = "Multivariate LSTM"
MODEL_META_PROPHET = "Meta Prophet"
MODEL_XGBOOST = "XGBoost Regressor"

# Global Model Registry

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

    # 2. LSTM
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

    # 3. Prophet
    MODELS["prophet"] = ProphetDemandModel()
    dummy_demand = pd.Series([6400 + i * 5 for i in range(100)])
    dummy_exog = pd.DataFrame({"temp": [30.0]*100, "rain": [2.0]*100})
    MODELS["prophet"].fit(dummy_demand, dummy_exog)

    # 4. XGBoost
    MODELS["xgboost"] = XGBoostDemandModel()
    MODELS["xgboost"].fit(dummy_demand, dummy_exog)

    logger.info("All 4 predictive & prescriptive engines online and ready.")
    yield
    logger.info("Shutting down AquaStat Analytics Engine...")
    MODELS.clear()

# App and Middleware

app = FastAPI(
    title="AquaStat Decision Support Intelligence Engine",
    description="Three-Tier Predictive & Prescriptive Analytics Microservice for TCWD",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# ──────────────────────────────────────────────────────────────────────────────

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

# ──────────────────────────────────────────────────────────────────────────────
# PREDICTIVE ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

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

# Prescriptive Endpoints (LP, MCDA, FP-Growth)

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
        from pipeline import run_ml_pipeline
    except ImportError:
        from intelligence.pipeline import run_ml_pipeline
    try:
        run_ml_pipeline()
        return {"status": "success", "message": "ML inference pipeline executed successfully."}
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
        "models_active": [MODEL_SARIMAX, MODEL_MULTIVARIATE_LSTM, MODEL_META_PROPHET, MODEL_XGBOOST],
        "prescriptive_modules": ["Linear Programming (LP)", "MCDA (TOPSIS)", "FP-Growth Mining"]
    }

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {
        "status": "healthy",
        "service": "AquaStat Three-Tier Analytics Engine",
        "models_active": [MODEL_SARIMAX, MODEL_MULTIVARIATE_LSTM, MODEL_META_PROPHET, MODEL_XGBOOST],
        "prescriptive_modules": ["Linear Programming (LP)", "MCDA (TOPSIS)", "FP-Growth Mining"]
    }
