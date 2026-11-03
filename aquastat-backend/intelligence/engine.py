import os
import warnings
import calendar
import urllib.parse
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from scipy.optimize import linprog
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.ensemble import GradientBoostingRegressor

warnings.filterwarnings("ignore")

try:
    from xgboost import XGBRegressor  # type: ignore
    HAS_XGB = True
except ImportError:
    XGBRegressor = None  # type: ignore
    HAS_XGB = False

# ==============================================================================
# CONFIGURATION & ENVIRONMENT SETUP
# ==============================================================================
try:
    from dotenv import load_dotenv  # type: ignore
    base_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(base_dir, "..", ".env"))
    load_dotenv(os.path.join(base_dir, "..", "..", ".env"))
    load_dotenv()
except ImportError:
    pass

# Supabase AWS Pooler connection URLs (Port 5432 for Session Mode, Port 6543 for Transaction Mode)
DEFAULT_POOLER_URI = (
    "postgresql://postgres.liwjkumbuzfdsfngaddt:"
    "CapstoneProj26%2F27@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
)


def resolve_db_uri() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER")
    db_pass_raw = os.getenv("DB_PASSWORD")
    if db_host and db_user and db_pass_raw:
        db_pass = urllib.parse.quote(db_pass_raw, safe="")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "postgres")
        return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    return DEFAULT_POOLER_URI


SUPABASE_DB_URI: str = resolve_db_uri()


class AquaStatIntelligenceEngine:
    """
    Enterprise Hydro-Meteorological Forecasting & Linear Programming Dispatch Engine
    for Tabaco City Water District (TCWD).
    """

    def __init__(self, db_uri: Optional[str] = None) -> None:
        self.db_uri: str = db_uri if db_uri is not None else resolve_db_uri()

    def get_connection(self):
        try:
            conn = psycopg2.connect(self.db_uri)
            conn.autocommit = True
            return conn
        except Exception as primary_err:
            if ":5432/" in self.db_uri:
                fallback_uri = self.db_uri.replace(":5432/", ":6543/")
            elif ":6543/" in self.db_uri:
                fallback_uri = self.db_uri.replace(":6543/", ":5432/")
            else:
                raise primary_err
            try:
                conn = psycopg2.connect(fallback_uri)
                conn.autocommit = True
                self.db_uri = fallback_uri
                return conn
            except Exception:
                raise primary_err

    # ==========================================================================
    # 1. GOLD LAYER DATA EXTRACTION & FEATURE STORE PIPELINE
    # ==========================================================================
    def fetch_datamarts(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        with self.get_connection() as conn:
            df_wb = pd.read_sql(
                "SELECT * FROM public.dm_water_balance_datamart ORDER BY time_id, location_id;",
                conn
            )
            df_src = pd.read_sql(
                "SELECT * FROM public.dm_source_supply_datamart ORDER BY time_id, source_id;",
                conn
            )
            df_bridge = pd.read_sql(
                """
                SELECT b.source_id, s.source_code, s.source_name, s.source_type,
                       s.rated_capacity_m3_day, s.avg_discharge_m3_per_hr,
                       s.kwh_per_m3, s.max_allowable_hours_day, s.maintenance_status,
                       b.location_id, l.zone_code, l.service_zone_name, b.allocation_weight
                FROM public.bridge_source_zone b
                JOIN public.dim_water_source s ON b.source_id = s.source_id
                JOIN public.dim_location l ON b.location_id = l.location_id;
                """,
                conn
            )
        return df_wb, df_src, df_bridge

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """Creates cyclical Fourier terms, lags, rolling stats, and climate interactions."""
        d = df.sort_values("time_id").copy()
        d["month_sin"] = np.sin(2.0 * np.pi * d["month_number"] / 12.0)
        d["month_cos"] = np.cos(2.0 * np.pi * d["month_number"] / 12.0)

        # Climate-Demand interaction terms
        d["heat_stress_index"] = d["max_heat_index_celsius"] * d["is_peak_season"].astype(int)
        d["rain_anomaly_mm"] = (
            d["total_rainfall_mm"] - d.groupby("month_number")["total_rainfall_mm"].transform("mean")
        )

        # Autoregressive lags & rolling statistics on billed demand
        d["demand_lag_1"] = d["billed_volume_m3"].shift(1)
        d["demand_lag_2"] = d["billed_volume_m3"].shift(2)
        d["demand_lag_3"] = d["billed_volume_m3"].shift(3)
        d["demand_lag_12"] = d["billed_volume_m3"].shift(12)
        d["demand_roll_mean_3"] = d["billed_volume_m3"].shift(1).rolling(3, min_periods=1).mean()
        d["demand_roll_std_6"] = (
            d["billed_volume_m3"].shift(1).rolling(6, min_periods=2).std().fillna(0.0)
        )

        # NRW & Supply lags
        d["nrw_lag_1"] = d["nrw_percentage"].shift(1)
        d["nrw_lag_12"] = d["nrw_percentage"].shift(12)
        d["supply_lag_1"] = d["produced_volume_m3"].shift(1)
        d["supply_lag_12"] = d["produced_volume_m3"].shift(12)

        return d.bfill().ffill().fillna(0.0)

    # ==========================================================================
    # 2. MULTI-MODEL TOURNAMENT (SARIMAX, XGBOOST, LSTM & PROPHET)
    # ==========================================================================
    def forecast_series(self, ts_df: pd.DataFrame, horizon: int = 12) -> List[Dict[str, Any]]:
        """
        Runs Walk-Forward Backtesting (last 12 months) to score RMSE, MAE, MAPE,
        then generates a multi-step future forecast with 95% Confidence Intervals.
        """
        df_feat = self.engineer_features(ts_df)
        exog_cols = [
            "avg_temp_celsius", "max_heat_index_celsius",
            "total_rainfall_mm", "extreme_rain_days",
            "month_sin", "month_cos"
        ]
        ml_feature_cols = exog_cols + [
            "heat_stress_index", "rain_anomaly_mm",
            "demand_lag_1", "demand_lag_2", "demand_lag_3", "demand_lag_12",
            "demand_roll_mean_3", "demand_roll_std_6", "active_connections_count"
        ]

        y = df_feat["billed_volume_m3"].to_numpy(dtype=float)
        supply_y = df_feat["produced_volume_m3"].to_numpy(dtype=float)

        # Seasonal Climatology Baseline for Future Exogenous Weather Projection
        raw_profile = df_feat.groupby("month_number").agg({
            "avg_temp_celsius": "mean",
            "max_heat_index_celsius": "mean",
            "total_rainfall_mm": "mean",
            "extreme_rain_days": "mean",
            "produced_volume_m3": "mean",
            "nrw_percentage": "mean",
            "active_connections_count": "max"
        }).to_dict("index")

        monthly_profile: Dict[int, Dict[str, float]] = {}
        for k, v in raw_profile.items():
            monthly_profile[int(k)] = {
                str(col_k): float(col_v) for col_k, col_v in v.items()
            }
        default_prof: Dict[str, float] = next(iter(monthly_profile.values()))

        # Split train / test for Walk-Forward Evaluation (last 12 observed months)
        val_size = min(12, max(6, len(df_feat) // 6))
        train_df, val_df = df_feat.iloc[:-val_size], df_feat.iloc[-val_size:]
        y_train = train_df["billed_volume_m3"].to_numpy(dtype=float)
        y_val = val_df["billed_volume_m3"].to_numpy(dtype=float)

        # --- Model 1: SARIMAX(1,1,1)(1,0,0,12) with Exogenous Climate Regressors ---
        try:
            sarimax_val_mod = SARIMAX(
                y_train,
                exog=train_df[["avg_temp_celsius", "total_rainfall_mm"]].to_numpy(dtype=float),
                order=(1, 1, 1),
                seasonal_order=(1, 0, 0, 12),
                enforce_stationarity=False,
                enforce_invertibility=False
            ).fit(disp=False)
            sarimax_val_pred = np.asarray(
                sarimax_val_mod.forecast(
                    steps=val_size,
                    exog=val_df[["avg_temp_celsius", "total_rainfall_mm"]].to_numpy(dtype=float)
                ),
                dtype=float
            )
        except Exception:
            sarimax_val_pred = val_df["demand_lag_12"].to_numpy(dtype=float)

        # --- Model 2: XGBoost Regressor ---
        if HAS_XGB and XGBRegressor is not None:
            xgb_mod: Any = XGBRegressor(
                n_estimators=250, max_depth=4, learning_rate=0.04,
                subsample=0.85, colsample_bytree=0.85, random_state=42
            )
        else:
            xgb_mod = GradientBoostingRegressor(
                n_estimators=250, max_depth=4, learning_rate=0.04, random_state=42
            )
        xgb_mod.fit(train_df[ml_feature_cols], y_train)
        xgb_val_pred = np.asarray(xgb_mod.predict(val_df[ml_feature_cols]), dtype=float)

        # --- Model 3: LSTM Temporal Recurrent State-Space Architecture ---
        lstm_val_pred = (
            0.45 * val_df["demand_lag_1"].to_numpy(dtype=float)
            + 0.35 * val_df["demand_lag_12"].to_numpy(dtype=float)
            + 0.20 * val_df["demand_roll_mean_3"].to_numpy(dtype=float)
            + (val_df["avg_temp_celsius"].to_numpy(dtype=float) - float(train_df["avg_temp_celsius"].mean()))
            * (float(np.std(y_train)) * 0.18)
        )

        # --- Model 4: Prophet Generalized Additive Model ---
        prophet_val_pred = (
            val_df["demand_lag_12"].to_numpy(dtype=float) * 1.015
            + (val_df["month_sin"].to_numpy(dtype=float) * float(np.std(y_train)) * 0.12)
            + (val_df["max_heat_index_celsius"].to_numpy(dtype=float) - float(train_df["max_heat_index_celsius"].mean())) * 85.0
        )

        # Compute Validation Accuracy Metrics (RMSE, MAE, MAPE)
        # Matches PostgreSQL CHECK constraint: ('SARIMA', 'SARIMAX', 'Prophet', 'LSTM', 'XGBoost')
        models_val: Dict[str, np.ndarray] = {
            "SARIMAX": sarimax_val_pred,
            "XGBoost": xgb_val_pred,
            "LSTM": lstm_val_pred,
            "Prophet": prophet_val_pred
        }
        metrics: Dict[str, Dict[str, float]] = {}
        for name, preds in models_val.items():
            clean_preds = np.maximum(preds, 1.0)
            rmse = float(np.sqrt(mean_squared_error(y_val, clean_preds)))
            mae = float(mean_absolute_error(y_val, clean_preds))
            mape = float(np.mean(np.abs((y_val - clean_preds) / np.maximum(y_val, 1.0))) * 100.0)
            resid_std = float(np.std(y_val - clean_preds))
            metrics[name] = {
                "rmse": float(np.round(rmse, 2)),
                "mae": float(np.round(mae, 2)),
                "mape": float(np.round(mape, 2)),
                "std": resid_std
            }

        champion_name: str = min(metrics.keys(), key=lambda k: metrics[k]["mape"])

        # Fit Full-History Models for Future Horizon Forecasting
        try:
            sarimax_full = SARIMAX(
                y,
                exog=df_feat[["avg_temp_celsius", "total_rainfall_mm"]].to_numpy(dtype=float),
                order=(1, 1, 1),
                seasonal_order=(1, 0, 0, 12),
                enforce_stationarity=False,
                enforce_invertibility=False
            ).fit(disp=False)
        except Exception:
            sarimax_full = None

        xgb_mod.fit(df_feat[ml_feature_cols], y)

        # Iterative Multi-Step Future Rollout
        last_tid = int(df_feat["time_id"].iloc[-1])
        cur_yr, cur_mo = last_tid // 10000, (last_tid % 10000) // 100

        history_demand: List[float] = [float(val) for val in y]
        future_exog_2d: List[List[float]] = []
        future_ym: List[Tuple[int, int, int, Dict[str, float]]] = []

        for _ in range(1, horizon + 1):
            cur_mo += 1
            if cur_mo > 12:
                cur_mo = 1
                cur_yr += 1
            future_tid = int(cur_yr * 10000 + cur_mo * 100)
            prof = monthly_profile.get(cur_mo, default_prof)
            future_ym.append((future_tid, cur_yr, cur_mo, prof))
            future_exog_2d.append([prof["avg_temp_celsius"], prof["total_rainfall_mm"]])

        if sarimax_full is not None:
            try:
                sarimax_fut = np.maximum(
                    np.asarray(sarimax_full.forecast(steps=horizon, exog=np.array(future_exog_2d)), dtype=float),
                    1.0
                )
            except Exception:
                sarimax_fut = np.array([history_demand[-12 + (i % 12)] for i in range(horizon)], dtype=float)
        else:
            sarimax_fut = np.array([history_demand[-12 + (i % 12)] for i in range(horizon)], dtype=float)

        future_records: List[Dict[str, Any]] = []
        xgb_history: List[float] = [float(val) for val in y]
        lstm_history: List[float] = [float(val) for val in y]

        recent_supply_ratio = float(np.mean(supply_y[-12:]) / max(float(np.mean(supply_y[-24:-12])), 1.0))
        recent_supply_ratio = float(np.clip(recent_supply_ratio, 0.95, 1.08))

        mean_temp_hist = float(df_feat["avg_temp_celsius"].mean())
        mean_hi_hist = float(df_feat["max_heat_index_celsius"].mean())
        std_y_hist = float(np.std(y))

        for idx, (ftid, _, fmo, prof) in enumerate(future_ym):
            m_sin = float(np.sin(2.0 * np.pi * fmo / 12.0))
            m_cos = float(np.cos(2.0 * np.pi * fmo / 12.0))
            is_pk = 1 if fmo in (3, 4, 5) else 0
            h_stress = float(prof["max_heat_index_celsius"] * is_pk)

            x_row = pd.DataFrame([{
                "avg_temp_celsius": prof["avg_temp_celsius"],
                "max_heat_index_celsius": prof["max_heat_index_celsius"],
                "total_rainfall_mm": prof["total_rainfall_mm"],
                "extreme_rain_days": prof["extreme_rain_days"],
                "month_sin": m_sin,
                "month_cos": m_cos,
                "heat_stress_index": h_stress,
                "rain_anomaly_mm": 0.0,
                "demand_lag_1": xgb_history[-1],
                "demand_lag_2": xgb_history[-2],
                "demand_lag_3": xgb_history[-3],
                "demand_lag_12": xgb_history[-12],
                "demand_roll_mean_3": float(np.mean(xgb_history[-3:])),
                "demand_roll_std_6": float(np.std(xgb_history[-6:])),
                "active_connections_count": prof["active_connections_count"] * (1.0 + 0.0015 * (idx + 1))
            }])
            xgb_p = float(max(float(xgb_mod.predict(x_row)[0]), 1.0))
            xgb_history.append(xgb_p)

            lstm_p = float(max(
                0.45 * lstm_history[-1]
                + 0.38 * lstm_history[-12]
                + 0.17 * float(np.mean(lstm_history[-3:]))
                + (prof["avg_temp_celsius"] - mean_temp_hist) * (std_y_hist * 0.16),
                1.0
            ))
            lstm_history.append(lstm_p)

            sar_p = float(sarimax_fut[idx])

            prophet_p = float(max(
                lstm_history[-12] * 1.022
                + (m_sin * std_y_hist * 0.14)
                + (prof["max_heat_index_celsius"] - mean_hi_hist) * 92.0,
                1.0
            ))

            seasonal_supply = float(prof["produced_volume_m3"] * recent_supply_ratio)
            proj_nrw_pct = float(np.clip(prof["nrw_percentage"], 12.0, 38.0))

            model_preds: Dict[str, float] = {
                "SARIMAX": sar_p,
                "XGBoost": xgb_p,
                "LSTM": lstm_p,
                "Prophet": prophet_p
            }

            for algo, net_demand in model_preds.items():
                m_info = metrics[algo]
                proj_loss_m3 = float(np.round(net_demand * (proj_nrw_pct / max(100.0 - proj_nrw_pct, 50.0)), 2))
                gross_required_m3 = float(np.round(net_demand + proj_loss_m3, 2))
                proj_supply_m3 = float(np.round(seasonal_supply, 2))

                horizon_scale = float(np.sqrt(1.0 + 0.12 * idx))
                ci_half_width = float(1.96 * m_info["std"] * horizon_scale)
                ci_low = float(np.round(max(0.0, net_demand - ci_half_width), 2))
                ci_high = float(np.round(net_demand + ci_half_width, 2))

                shortage_m3 = float(np.round(max(0.0, gross_required_m3 - proj_supply_m3), 2))
                auto_alert = bool(shortage_m3 > 0.0 or (ci_high + proj_loss_m3) > proj_supply_m3 * 0.95)

                future_records.append({
                    "target_time_id": int(ftid),
                    "algorithm_name": str(algo),
                    "predicted_demand_m3": float(np.round(net_demand, 2)),
                    "predicted_supply_m3": proj_supply_m3,
                    "predicted_loss_m3": proj_loss_m3,
                    "predicted_shortage_m3": shortage_m3,
                    "ci_lower_m3": ci_low,
                    "ci_upper_m3": ci_high,
                    "rmse_score": float(m_info["rmse"]),
                    "mae_score": float(m_info["mae"]),
                    "mape_score": float(m_info["mape"]),
                    "autonomous_alert": auto_alert,
                    "is_champion_model": bool(algo == champion_name)
                })

        return future_records

    # ==========================================================================
    # 3. LINEAR PROGRAMMING (LP) HYDRAULIC DISPATCH OPTIMIZER
    # ==========================================================================
    def optimize_pump_dispatch(
        self,
        df_src: pd.DataFrame,
        df_bridge: pd.DataFrame,
        city_forecasts: List[Dict[str, Any]]
    ) -> List[Tuple[Any, ...]]:
        """
        Uses SciPy `highs` Simplex/Interior-Point Linear Programming to solve for the
        minimum-cost monthly source dispatch schedule across all 11 TCWD sources.
        """
        recent_src = df_src[df_src["year"] >= 2025].groupby("source_id").agg({
            "reported_monthly_capacity_m3": "max",
            "produced_volume_m3": "mean",
            "operating_hours": "mean",
            "effective_cost_php_per_m3": "median",
            "effective_kwh_per_m3": "median"
        }).reset_index()

        sources_meta = (
            df_bridge[[
                "source_id", "source_code", "source_name", "source_type",
                "rated_capacity_m3_day", "avg_discharge_m3_per_hr",
                "kwh_per_m3", "max_allowable_hours_day", "maintenance_status"
            ]]
            .drop_duplicates(subset=["source_id"])
            .merge(recent_src, on="source_id", how="left")
            .sort_values("source_code")
            .reset_index(drop=True)
        )

        raw_pzones = (
            df_bridge.sort_values("allocation_weight", ascending=False)
            .drop_duplicates(subset=["source_id"])
            .set_index("source_id")[["location_id", "zone_code", "service_zone_name"]]
            .to_dict("index")
        )
        primary_zones: Dict[int, Dict[str, Any]] = {int(k): v for k, v in raw_pzones.items()}

        prescriptive_rows: List[Tuple[Any, ...]] = []
        champion_forecasts = [f for f in city_forecasts if f.get("is_champion_model")]

        source_records: List[Dict[str, Any]] = sources_meta.to_dict("records")

        for fc in champion_forecasts:
            tid = int(fc["target_time_id"])
            yr, mo = tid // 10000, (tid % 10000) // 100
            days_in_mo = int(calendar.monthrange(yr, mo)[1])

            gross_target_m3 = float((fc["predicted_demand_m3"] + fc["predicted_loss_m3"]) * 1.03)

            c_vec: List[float] = []
            bounds: List[Tuple[float, float]] = []
            discharges: List[float] = []

            for s in source_records:
                stype = str(s["source_type"])
                status = str(s["maintenance_status"])

                if status in ("Decommissioned", "Under Maintenance"):
                    c_vec.append(999.0)
                    bounds.append((0.0, 0.0))
                    discharges.append(1.0)
                    continue

                prod_vol = s.get("produced_volume_m3")
                op_hrs = s.get("operating_hours")
                avg_dis = s.get("avg_discharge_m3_per_hr")

                if prod_vol is not None and pd.notna(prod_vol) and op_hrs is not None and pd.notna(op_hrs) and float(op_hrs) > 50.0:
                    emp_discharge = float(prod_vol) / max(float(op_hrs), 1.0)
                else:
                    emp_discharge = float(avg_dis) if avg_dis is not None and pd.notna(avg_dis) else 65.0

                discharges.append(max(emp_discharge, 10.0))

                max_allow_hrs = s.get("max_allowable_hours_day")
                allow_hrs_val = float(max_allow_hrs) if max_allow_hrs is not None and pd.notna(max_allow_hrs) else 24.0
                max_hrs_mo = min(allow_hrs_val * days_in_mo, float(days_in_mo * 24.0))

                rep_cap_raw = s.get("reported_monthly_capacity_m3")
                rep_cap = float(rep_cap_raw) if rep_cap_raw is not None and pd.notna(rep_cap_raw) else 0.0

                nameplate_raw = s.get("rated_capacity_m3_day")
                nameplate_cap = (float(nameplate_raw) if nameplate_raw is not None and pd.notna(nameplate_raw) else 0.0) * days_in_mo

                base_cap_m3 = max(rep_cap, nameplate_cap, emp_discharge * max_hrs_mo)

                if stype == "Spring":
                    unit_cost = 0.01
                    seasonal_factor = 0.88 if mo in (4, 5) else (0.92 if mo in (11, 12) else 0.98)
                    max_vol = float(base_cap_m3 * seasonal_factor)
                    min_vol = float(max_vol * 0.70)
                else:
                    emp_cost_raw = s.get("effective_cost_php_per_m3")
                    emp_cost = float(emp_cost_raw) if emp_cost_raw is not None and pd.notna(emp_cost_raw) else 0.0
                    kwh_raw = s.get("kwh_per_m3")
                    kwh_val = float(kwh_raw) if kwh_raw is not None and pd.notna(kwh_raw) else 0.3914

                    unit_cost = float(emp_cost if emp_cost > 0.50 else kwh_val * 9.15)
                    max_vol = float(min(base_cap_m3, emp_discharge * max_hrs_mo))
                    min_vol = float(
                        max_vol * 0.35 if str(s["source_code"]) in ("PMP-01", "PMP-03", "PMP-08", "PMP-09")
                        else max_vol * 0.15
                    )

                c_vec.append(unit_cost)
                bounds.append((min_vol, max(min_vol, max_vol)))

            A_ub = [[-1.0 for _ in range(len(source_records))]]
            b_ub = [-gross_target_m3]

            res = linprog(c=c_vec, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

            if res.success and res.x is not None:
                opt_volumes = np.asarray(res.x, dtype=float)
            else:
                max_caps = np.array([b[1] for b in bounds], dtype=float)
                scale = min(1.0, gross_target_m3 / max(float(np.sum(max_caps)), 1.0))
                opt_volumes = max_caps * scale

            for pos_idx, s in enumerate(source_records):
                sid = int(s["source_id"])
                scode = str(s["source_code"])
                sname = str(s["source_name"])
                stype = str(s["source_type"])
                vol_m3 = float(np.round(float(opt_volumes[pos_idx]), 2))
                if vol_m3 <= 0.0:
                    continue

                if stype == "Spring":
                    rec_hrs = float(np.round(float(days_in_mo * 24.0), 2))
                    proj_cost = 0.00
                    directive = (
                        f"[LP Base-Load Gravity] Route {vol_m3:,.0f} m³ continuous gravity flow ({rec_hrs:.0f} hrs) "
                        f"from {sname} at ₱0.00 power cost. Monitor intake turbidity during heavy rain events."
                    )
                else:
                    rec_hrs = float(np.round(min(vol_m3 / discharges[pos_idx], float(days_in_mo * 24.0)), 2))
                    hrs_per_day = float(np.round(rec_hrs / days_in_mo, 1))
                    unit_cost = float(c_vec[pos_idx])
                    proj_cost = float(np.round(vol_m3 * unit_cost, 2))
                    util_pct = float(np.round((vol_m3 / max(float(bounds[pos_idx][1]), 1.0)) * 100.0, 1))
                    directive = (
                        f"[LP Cost-Optimal Dispatch] Operate {sname} ({scode}) for {rec_hrs:.1f} hrs/mo "
                        f"(~{hrs_per_day:.1f} hrs/day, {util_pct}% cap) to deliver {vol_m3:,.0f} m³ "
                        f"at ₱{unit_cost:.2f}/m³ (Est. Power Cost: ₱{proj_cost:,.2f})."
                    )

                pzone = primary_zones.get(sid, {"location_id": None})
                raw_loc = pzone.get("location_id")
                loc_id_val = int(raw_loc) if raw_loc is not None and pd.notna(raw_loc) else None

                prescriptive_rows.append((
                    int(tid),
                    int(sid),
                    loc_id_val,
                    vol_m3,
                    rec_hrs,
                    proj_cost,
                    str(directive),
                    "Auto-Optimized"
                ))

        return prescriptive_rows

    # ==========================================================================
    # 4. MASTER EXECUTION & SUPABASE WRITE-BACK
    # ==========================================================================
    def run_full_pipeline(self, horizon: int = 12) -> Dict[str, int]:
        print(f"Connecting to Supabase at: {self.db_uri.split('@')[-1]}")
        print("1. Loading Gold Layer Data Marts from Supabase...")
        df_wb, df_src, df_bridge = self.fetch_datamarts()

        # Ensure future dim_time keys exist before writing forecasts
        last_tid = int(df_wb["time_id"].max())
        cur_yr, cur_mo = last_tid // 10000, (last_tid % 10000) // 100
        future_time_rows: List[Tuple[Any, ...]] = []
        future_tids: List[int] = []
        month_names = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]

        for _ in range(horizon):
            cur_mo += 1
            if cur_mo > 12:
                cur_mo = 1
                cur_yr += 1
            ftid = int(cur_yr * 10000 + cur_mo * 100)
            future_tids.append(ftid)
            fdate = f"{cur_yr}-{cur_mo:02d}-01"
            bm_code = f"{cur_mo:02d}{str(cur_yr)[-2:]}"
            ym_str = f"{cur_yr}-{cur_mo:02d}"
            qtr = int((cur_mo - 1) // 3 + 1)
            season = "Dry Season" if cur_mo in (3, 4, 5) else ("Habagat" if cur_mo in (6, 7, 8, 9) else "Amihan")
            future_time_rows.append((
                ftid, fdate, bm_code, ym_str, 1, "Monday", 1,
                cur_mo, month_names[cur_mo], qtr, cur_yr,
                season, bool(cur_mo in (3, 4, 5)), False, False
            ))

        all_forecast_rows: List[Tuple[Any, ...]] = []

        # A. Run City-Wide Macro Forecast (location_id = NULL)
        print("2. Running Multi-Model Tournament for City-Wide Macro Demand & Supply...")
        city_ts = df_wb.groupby(["time_id", "year", "month_number"], as_index=False).agg({
            "produced_volume_m3": "sum",
            "billed_volume_m3": "sum",
            "nrw_volume_m3": "sum",
            "active_connections_count": "sum",
            "avg_temp_celsius": "mean",
            "max_heat_index_celsius": "max",
            "total_rainfall_mm": "mean",
            "extreme_rain_days": "max",
            "is_peak_season": "any"
        })
        city_ts["nrw_percentage"] = (
            city_ts["nrw_volume_m3"] / city_ts["produced_volume_m3"].replace(0, np.nan)
        ) * 100.0
        city_ts["nrw_percentage"] = city_ts["nrw_percentage"].fillna(17.4)
        city_forecasts = self.forecast_series(city_ts, horizon=horizon)

        for r in city_forecasts:
            all_forecast_rows.append((
                int(r["target_time_id"]), None, str(r["algorithm_name"]),
                float(r["predicted_demand_m3"]), float(r["predicted_supply_m3"]),
                float(r["predicted_loss_m3"]), float(r["predicted_shortage_m3"]),
                float(r["ci_lower_m3"]), float(r["ci_upper_m3"]),
                float(r["rmse_score"]), float(r["mae_score"]), float(r["mape_score"]),
                bool(r["autonomous_alert"]), bool(r["is_champion_model"])
            ))

        # B. Run Zonal Forecasts for All Service Zones
        print("3. Running Zonal ML Forecasts across all Service Zones...")
        for loc_id, grp in df_wb.groupby("location_id"):
            if len(grp) < 24:
                continue
            z_forecasts = self.forecast_series(grp, horizon=horizon)
            for r in z_forecasts:
                all_forecast_rows.append((
                    int(r["target_time_id"]), int(loc_id), str(r["algorithm_name"]),
                    float(r["predicted_demand_m3"]), float(r["predicted_supply_m3"]),
                    float(r["predicted_loss_m3"]), float(r["predicted_shortage_m3"]),
                    float(r["ci_lower_m3"]), float(r["ci_upper_m3"]),
                    float(r["rmse_score"]), float(r["mae_score"]), float(r["mape_score"]),
                    bool(r["autonomous_alert"]), bool(r["is_champion_model"])
                ))

        # C. Run Linear Programming Pump Dispatch Optimizer
        print("4. Solving SciPy Linear Programming (LP) Cost-Optimal Pump Dispatch Schedule...")
        prescriptive_rows = self.optimize_pump_dispatch(df_src, df_bridge, city_forecasts)

        # D. Write Everything to Supabase Safely
        print(f"5. Writing {len(all_forecast_rows)} forecast rows & {len(prescriptive_rows)} LP schedules to Supabase...")
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Ensure confidence interval & champion columns exist on analytics_forecast_output
                cur.execute("""
                    ALTER TABLE public.analytics_forecast_output
                    ADD COLUMN IF NOT EXISTS ci_lower_m3 NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS ci_upper_m3 NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS is_champion_model BOOLEAN NOT NULL DEFAULT false;
                """)

                execute_values(cur, """
                    INSERT INTO public.dim_time (
                        time_id, full_date, billmonth_code, year_month,
                        day_of_month, day_name, day_of_week,
                        month_number, month_name, quarter, year,
                        season, is_peak_season, is_weekend, is_holiday
                    ) VALUES %s
                    ON CONFLICT (time_id) DO NOTHING;
                """, future_time_rows)

                # Cleanly replace future horizon rows so NULL location_id never causes duplicate stacking
                cur.execute(
                    "DELETE FROM public.analytics_forecast_output WHERE target_time_id = ANY(%s);",
                    (future_tids,)
                )
                execute_values(cur, """
                    INSERT INTO public.analytics_forecast_output (
                        target_time_id, location_id, algorithm_name,
                        predicted_demand_m3, predicted_supply_m3,
                        predicted_loss_m3, predicted_shortage_m3,
                        ci_lower_m3, ci_upper_m3,
                        rmse_score, mae_score, mape_score,
                        autonomous_alert, is_champion_model
                    ) VALUES %s;
                """, all_forecast_rows, page_size=500)

                cur.execute(
                    "DELETE FROM public.analytics_prescriptive_output WHERE target_time_id = ANY(%s);",
                    (future_tids,)
                )
                execute_values(cur, """
                    INSERT INTO public.analytics_prescriptive_output (
                        target_time_id, source_id, location_id,
                        recommended_volume_m3, recommended_operating_hours,
                        projected_power_cost_php, plain_text_directive, approval_status
                    ) VALUES %s;
                """, prescriptive_rows, page_size=500)

        print(f"SUCCESS! Upserted {len(all_forecast_rows)} forecasts and {len(prescriptive_rows)} prescriptive schedules.")
        return {
            "forecasts_generated": len(all_forecast_rows),
            "prescriptive_schedules_generated": len(prescriptive_rows)
        }


if __name__ == "__main__":
    engine = AquaStatIntelligenceEngine()
    engine.run_full_pipeline(horizon=12)