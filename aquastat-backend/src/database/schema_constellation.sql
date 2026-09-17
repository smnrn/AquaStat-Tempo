-- ============================================================================
-- AQUASTAT ENTERPRISE CONSTELLATION SCHEMA (POSTGRESQL 14+)
-- Decision Support System for Water Utilities (OLAP Data Warehouse)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONFORMED DIMENSIONS
-- ----------------------------------------------------------------------------

-- DIM_TIME: Conformed temporal dimension for time-series aggregation & slicing
CREATE TABLE IF NOT EXISTS dim_time (
    time_id             INT          PRIMARY KEY, -- YYYYMMDD surrogate integer key (e.g. 20260825)
    full_date           DATE         NOT NULL UNIQUE,
    day_of_month        SMALLINT     NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    day_name            VARCHAR(10)  NOT NULL, -- 'Monday', 'Tuesday', etc.
    day_of_week         SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    month_number        SMALLINT     NOT NULL CHECK (month_number BETWEEN 1 AND 12),
    month_name          VARCHAR(15)  NOT NULL, -- 'August', etc.
    quarter             SMALLINT     NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    year                SMALLINT     NOT NULL CHECK (year >= 2000),
    season              VARCHAR(20)  NOT NULL CHECK (season IN ('Dry Season', 'Wet Season', 'Amihan', 'Habagat')),
    is_weekend          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_holiday          BOOLEAN      NOT NULL DEFAULT FALSE
);

-- DIM_LOCATION: Conformed geospatial and administrative zone dimension
CREATE TABLE IF NOT EXISTS dim_location (
    location_id         INT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_zone        VARCHAR(100) NOT NULL, -- e.g., 'Zone 1 - Tabaco Center'
    barangay_name       VARCHAR(100) NOT NULL, -- Barangay level administrative unit in Tabaco City
    city_municipality   VARCHAR(100) NOT NULL DEFAULT 'Tabaco City',
    province            VARCHAR(100) NOT NULL DEFAULT 'Albay',
    population_density  NUMERIC(10,2) NOT NULL CHECK (population_density >= 0), -- persons / km²
    elevation_meters    NUMERIC(6,2),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zone_barangay UNIQUE (service_zone, barangay_name)
);

ALTER TABLE dim_location ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT 'Albay';
ALTER TABLE dim_location ALTER COLUMN city_municipality SET DEFAULT 'Tabaco City';

-- ----------------------------------------------------------------------------
-- 2. DOMAIN-SPECIFIC DIMENSIONS
-- ----------------------------------------------------------------------------

-- DIM_WEATHER: Meteorological variables influencing water consumption and recharge
CREATE TABLE IF NOT EXISTS dim_weather (
    weather_id          INT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recorded_date       DATE         NOT NULL,
    temperature_celsius NUMERIC(5,2) NOT NULL CHECK (temperature_celsius BETWEEN -10 AND 60),
    rainfall_mm         NUMERIC(8,2) NOT NULL CHECK (rainfall_mm >= 0),
    humidity_pct        NUMERIC(5,2) CHECK (humidity_pct BETWEEN 0 AND 100),
    pagasa_condition    VARCHAR(50)  NOT NULL CHECK (
        pagasa_condition IN (
            'Sunny', 'Clear', 'Partly Cloudy', 'Cloudy', 
            'Light Rain', 'Moderate Rain', 'Heavy Rain', 
            'Torrential Rain', 'Tropical Depression', 'Typhoon'
        )
    ),
    heat_index_celsius  NUMERIC(5,2)
);

-- DIM_PUMP_STATION: Asset catalog & engineering operational parameters
CREATE TABLE IF NOT EXISTS dim_pump_station (
    pump_id             INT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_code        VARCHAR(50)  NOT NULL UNIQUE, -- e.g., 'PS-NORTH-01'
    station_name        VARCHAR(150) NOT NULL,
    rated_capacity_m3_day NUMERIC(12,2) NOT NULL CHECK (rated_capacity_m3_day > 0),
    maintenance_status  VARCHAR(30)  NOT NULL DEFAULT 'Operational' CHECK (
        maintenance_status IN ('Operational', 'Under Maintenance', 'Standby', 'Decommissioned', 'Critical')
    ),
    pump_type           VARCHAR(50)  DEFAULT 'Centrifugal Submersible',
    commission_date     DATE,
    last_serviced_date  DATE
);

-- DIM_CUSTOMER: Consumer profiles, tariff tiers, and connection lifecycles
CREATE TABLE IF NOT EXISTS dim_customer (
    customer_id         INT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_number      VARCHAR(64)  NOT NULL UNIQUE,
    account_name        VARCHAR(255) NOT NULL,
    account_type        VARCHAR(30)  NOT NULL CHECK (
        account_type IN ('Residential', 'Commercial', 'Industrial', 'Institutional', 'Government', 'Semi-Commercial')
    ),
    connection_status   VARCHAR(30)  NOT NULL DEFAULT 'Active' CHECK (
        connection_status IN ('Active', 'Suspended', 'Disconnected', 'Pending Installation')
    ),
    meter_serial_no     VARCHAR(64)  NOT NULL,
    tariff_group        VARCHAR(20)  NOT NULL DEFAULT 'R-1',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE dim_customer DROP CONSTRAINT IF EXISTS dim_customer_account_type_check;
ALTER TABLE dim_customer ADD CONSTRAINT dim_customer_account_type_check CHECK (
    account_type IN ('Residential', 'Commercial', 'Industrial', 'Institutional', 'Government', 'Semi-Commercial')
);

-- DIM_ML_MODEL: Registry of ML forecasting algorithms and evaluated drift metrics
CREATE TABLE IF NOT EXISTS dim_ml_model (
    model_id            INT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_code          VARCHAR(50)  NOT NULL UNIQUE, -- e.g., 'XGB-DEMAND-V1'
    model_name          VARCHAR(150) NOT NULL,
    algorithm_name      VARCHAR(100) NOT NULL, -- e.g., 'XGBoost Regressor', 'LSTM Neural Net'
    model_version       VARCHAR(20)  NOT NULL,
    current_rmse_score  NUMERIC(10,4) NOT NULL CHECK (current_rmse_score >= 0),
    mape_score          NUMERIC(6,4) CHECK (mape_score >= 0),
    trained_at          TIMESTAMPTZ  NOT NULL,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 3. FACT TABLES
-- ----------------------------------------------------------------------------

-- FACT_PRODUCTION: Tracks volumetric output and energy efficiency across pump stations
CREATE TABLE IF NOT EXISTS fact_production (
    production_fact_id  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    time_id             INT          NOT NULL REFERENCES dim_time(time_id) ON DELETE RESTRICT,
    location_id         INT          NOT NULL REFERENCES dim_location(location_id) ON DELETE RESTRICT,
    pump_id             INT          NOT NULL REFERENCES dim_pump_station(pump_id) ON DELETE RESTRICT,
    weather_id          INT          REFERENCES dim_weather(weather_id) ON DELETE SET NULL,
    produced_volume_m3  NUMERIC(14,4) NOT NULL CHECK (produced_volume_m3 >= 0),
    power_consumed_kwh  NUMERIC(12,4) NOT NULL CHECK (power_consumed_kwh >= 0),
    operating_hours     NUMERIC(5,2) NOT NULL CHECK (operating_hours BETWEEN 0.00 AND 24.00),
    recorded_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- FACT_BILLING: Tracks commercial revenue, volumetric sales, and customer arrears
CREATE TABLE IF NOT EXISTS fact_billing (
    billing_fact_id     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    time_id             INT          NOT NULL REFERENCES dim_time(time_id) ON DELETE RESTRICT,
    location_id         INT          NOT NULL REFERENCES dim_location(location_id) ON DELETE RESTRICT,
    customer_id         INT          NOT NULL REFERENCES dim_customer(customer_id) ON DELETE RESTRICT,
    billed_volume_m3    NUMERIC(12,4) NOT NULL CHECK (billed_volume_m3 >= 0),
    revenue_amount      NUMERIC(14,2) NOT NULL CHECK (revenue_amount >= 0),
    arrears_amount      NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (arrears_amount >= 0),
    billing_status      VARCHAR(20)  NOT NULL DEFAULT 'Billed' CHECK (
        billing_status IN ('Billed', 'Paid', 'Partial', 'Overdue', 'Disputed', 'Written Off')
    ),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- FACT_ML_FORECAST: Stores machine learning projections and predicted deficits
CREATE TABLE IF NOT EXISTS fact_ml_forecast (
    forecast_fact_id      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    time_id               INT          NOT NULL REFERENCES dim_time(time_id) ON DELETE RESTRICT,
    location_id           INT          NOT NULL REFERENCES dim_location(location_id) ON DELETE RESTRICT,
    model_id              INT          NOT NULL REFERENCES dim_ml_model(model_id) ON DELETE RESTRICT,
    predicted_demand_m3   NUMERIC(14,4) NOT NULL CHECK (predicted_demand_m3 >= 0),
    predicted_shortage_m3 NUMERIC(14,4) NOT NULL DEFAULT 0.00 CHECK (predicted_shortage_m3 >= 0),
    confidence_interval_low NUMERIC(14,4),
    confidence_interval_high NUMERIC(14,4),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. OLAP COMPOSITE & FOREIGN KEY INDEXES
-- ----------------------------------------------------------------------------

-- FACT_PRODUCTION Indexes
CREATE INDEX IF NOT EXISTS idx_fprod_time_loc      ON fact_production (time_id, location_id);
CREATE INDEX IF NOT EXISTS idx_fprod_pump_time     ON fact_production (pump_id, time_id);
CREATE INDEX IF NOT EXISTS idx_fprod_location      ON fact_production (location_id);
CREATE INDEX IF NOT EXISTS idx_fprod_weather       ON fact_production (weather_id);

-- FACT_BILLING Indexes
CREATE INDEX IF NOT EXISTS idx_fbill_time_loc      ON fact_billing (time_id, location_id);
CREATE INDEX IF NOT EXISTS idx_fbill_customer      ON fact_billing (customer_id);
CREATE INDEX IF NOT EXISTS idx_fbill_loc_time      ON fact_billing (location_id, time_id);

-- FACT_ML_FORECAST Indexes
CREATE INDEX IF NOT EXISTS idx_ffor_time_loc       ON fact_ml_forecast (time_id, location_id);
CREATE INDEX IF NOT EXISTS idx_ffor_model          ON fact_ml_forecast (model_id);

-- Dimension Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_dtime_month_year    ON dim_time (year, month_number);
CREATE INDEX IF NOT EXISTS idx_dtime_date          ON dim_time (full_date);
CREATE INDEX IF NOT EXISTS idx_dloc_service_zone   ON dim_location (service_zone);
