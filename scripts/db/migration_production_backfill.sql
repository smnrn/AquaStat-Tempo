-- ============================================================================
-- 0. PREPARE CONSTRAINTS, COLUMNS, AND 2026 DIM_TIME (SAFE VARCHAR(4) FORMAT)
-- ============================================================================
ALTER TABLE public.fact_production 
DROP CONSTRAINT IF EXISTS fact_production_operating_hours_check;

ALTER TABLE public.fact_production 
ADD COLUMN IF NOT EXISTS reported_monthly_capacity_m3 NUMERIC(12,2) DEFAULT 0.00;

-- Dynamically clones the exact string format of 2025 rows in dim_time for 2026
-- so VARCHAR(4) columns (like billmonth_code = '2601' or '0126') never overflow!
INSERT INTO public.dim_time (
    time_id, full_date, billmonth_code, year_month,
    day_of_month, day_name, day_of_week,
    month_number, month_name, quarter, year, season, is_peak_season
)
SELECT 
    time_id + 10000 AS time_id,
    (full_date + INTERVAL '1 year')::DATE AS full_date,
    LEFT(REPLACE(billmonth_code, '25', '26'), 4) AS billmonth_code,
    REPLACE(year_month, '2025', '2026') AS year_month,
    day_of_month,
    LEFT(TO_CHAR((full_date + INTERVAL '1 year')::DATE, 'FMDay'), GREATEST(CHAR_LENGTH(day_name), 3)) AS day_name,
    EXTRACT(ISODOW FROM (full_date + INTERVAL '1 year')::DATE)::INT AS day_of_week,
    month_number,
    month_name,
    quarter,
    2026 AS year,
    season,
    is_peak_season
FROM public.dim_time
WHERE year = 2025 AND (time_id % 100) = 0
ON CONFLICT (time_id) DO NOTHING;

TRUNCATE TABLE public.bridge_source_zone CASCADE;
INSERT INTO public.bridge_source_zone (source_id, location_id, allocation_weight)
SELECT s.source_id, l.location_id, 
    CASE 
        WHEN s.source_code = 'PMP-01' AND l.zone_code = '018' THEN 1.00 
        WHEN s.source_code = 'PMP-03' AND l.zone_code = '009' THEN 1.00 
        WHEN s.source_code = 'PMP-08' AND l.zone_code = '016' THEN 1.00 
        WHEN s.source_code = 'PMP-09' AND l.zone_code = '008' THEN 1.00 
        WHEN s.source_type = 'Spring' AND l.zone_code IN ('001','002','003','004','021') THEN 0.33
        WHEN s.source_code IN ('PMP-02','PMP-05','PMP-06','PMP-07') AND l.zone_code NOT IN ('018','009','016','008') THEN 0.25
        ELSE 0.00 
    END AS allocation_weight
FROM public.dim_water_source s
CROSS JOIN public.dim_location l
WHERE CASE 
        WHEN s.source_code = 'PMP-01' AND l.zone_code = '018' THEN 1.00
        WHEN s.source_code = 'PMP-03' AND l.zone_code = '009' THEN 1.00
        WHEN s.source_code = 'PMP-08' AND l.zone_code = '016' THEN 1.00
        WHEN s.source_code = 'PMP-09' AND l.zone_code = '008' THEN 1.00
        WHEN s.source_type = 'Spring' AND l.zone_code IN ('001','002','003','004','021') THEN 0.33
        WHEN s.source_code IN ('PMP-02','PMP-05','PMP-06','PMP-07') AND l.zone_code NOT IN ('018','009','016','008') THEN 0.25
        ELSE 0.00 
      END > 0;

-- ============================================================================
-- 1. INSERT EXACT RECOVERED MONTHS (APR 2023, APR/JUN/NOV 2025, MAY-SEP 2026)
-- ============================================================================
WITH recovered_exact (
    time_id, source_code, is_extrapolated,
    reported_monthly_capacity_m3, produced_volume_m3, operating_hours, power_consumed_kwh, power_cost_php
) AS (
    VALUES
    -- APRIL 2023 (Recovered from YTD1 2023 sheet: 130,000 m3 Springs + 250,655 m3 Wells = 380,655 m3)
    (20230400, 'SPR-01', false,  50000.00,  45000.00, 720.00,     0.00,      0.00),
    (20230400, 'SPR-02', false,  48000.00,  43000.00, 720.00,     0.00,      0.00),
    (20230400, 'SPR-03', false,  47000.00,  42000.00, 720.00,     0.00,      0.00),
    (20230400, 'PMP-01', false,  53568.00,  34073.00, 429.00, 16036.02, 119459.94),
    (20230400, 'PMP-02', false, 107136.00,  48520.00, 480.00, 22835.16, 170111.12),
    (20230400, 'PMP-03', false,  31104.00,  15521.00, 510.00,  7304.70,  54416.63),
    (20230400, 'PMP-05', false, 107136.00,  97464.00, 593.00, 45869.92, 341708.78),
    (20230400, 'PMP-06', false, 107136.00,  42540.00, 594.00, 20020.76, 149145.24),
    (20230400, 'PMP-08', false,  25920.00,  12537.00, 420.00,  5900.34,  43954.72),

    -- APRIL 2025 (Reconciled to April 2025 MDS: 128,700 m3 Gravity + 273,368 m3 Pumped = 402,068 m3)
    (20250400, 'SPR-01', true,   45000.00,  37000.00, 720.00,     0.00,      0.00),
    (20250400, 'SPR-02', true,   50000.00,  48100.00, 720.00,     0.00,      0.00),
    (20250400, 'SPR-03', true,   48000.00,  43600.00, 720.00,     0.00,      0.00),
    (20250400, 'PMP-01', true,   39000.00,  34222.90, 687.56, 11428.01,  94701.85),
    (20250400, 'PMP-02', true,   52000.00,  51072.09, 516.82, 17054.23, 141328.11),
    (20250400, 'PMP-03', true,   39000.00,  17762.99, 720.00,  5931.53,  49154.22),
    (20250400, 'PMP-05', true,  104000.00, 102418.85, 692.51, 34200.18, 283415.22),
    (20250400, 'PMP-06', true,  104000.00,  59201.69, 604.17, 19768.92, 163824.28),
    (20250400, 'PMP-08', true,   25920.00,   8689.48, 435.94,  2901.13,  24049.00),

    -- JUNE 2025 (Reconciled to June 2025 MDS: 127,800 m3 Gravity + 273,499 m3 Pumped = 401,299 m3)
    (20250600, 'SPR-01', true,   50000.00,  42072.49, 720.00,     0.00,      0.00),
    (20250600, 'SPR-02', true,   55000.00,  44967.38, 720.00,     0.00,      0.00),
    (20250600, 'SPR-03', true,   52000.00,  40760.13, 720.00,     0.00,      0.00),
    (20250600, 'PMP-01', true,   39000.00,  39175.91, 720.00, 13583.25, 111142.82),
    (20250600, 'PMP-02', true,   52000.00,  48512.49, 552.94, 16820.51, 137631.95),
    (20250600, 'PMP-03', true,   39000.00,  17597.57, 720.00,  6101.53,  49924.96),
    (20250600, 'PMP-05', true,  104000.00,  95143.85, 655.38, 32988.78, 269927.51),
    (20250600, 'PMP-06', true,  104000.00,  64442.81, 633.45, 22343.96, 182826.58),
    (20250600, 'PMP-08', true,   25920.00,   8626.37, 450.23,  2990.97,  24480.30),

    -- NOVEMBER 2025 (Exact from Production Report 2025.xlsx sheet 'Nov.25')
    (20251100, 'SPR-01', false,  80000.00,  79000.00, 720.00,     0.00,      0.00),
    (20251100, 'SPR-02', false, 100000.00,  98000.00, 720.00,     0.00,      0.00),
    (20251100, 'SPR-03', false,  95000.00,  93500.00, 720.00,     0.00,      0.00),
    (20251100, 'PMP-01', false,  21625.00,  21663.00, 720.00,  9326.86,  85387.58),
    (20251100, 'PMP-02', false,  52000.00,   2462.00, 465.00,  1059.99,   9704.31),
    (20251100, 'PMP-03', false,  16500.00,  15710.00, 720.00,  6763.84,  61923.16),
    (20251100, 'PMP-05', false, 104000.00,  81640.00, 681.00, 35149.49, 321795.44),
    (20251100, 'PMP-06', false, 104000.00,  53079.00, 675.00, 22852.86, 209218.29),
    (20251100, 'PMP-08', false,  14075.00,   9229.00, 476.00,  3973.49,  36377.72),

    -- MAY–SEPTEMBER 2026 (Exact from FOI Roaring Monthly Production.pdf)
    (20260500, 'SPR-01', false,  77760.00,  77760.00, 720.00,     0.00,      0.00),
    (20260500, 'SPR-02', false,  95904.00,  95904.00, 720.00,     0.00,      0.00),
    (20260500, 'SPR-03', false,  60600.00,  16195.50, 720.00,     0.00,      0.00),
    (20260500, 'PMP-01', false,  47995.00,  47995.00, 720.00, 18785.24, 168270.47),
    (20260500, 'PMP-02', false,  89985.00,  73000.00, 709.12, 28572.20, 255938.00),
    (20260500, 'PMP-03', false,  16080.00,  16080.00, 498.73,  6293.71,  56376.48),
    (20260500, 'PMP-05', false,  95000.00,   8949.00,  75.68,  3502.64,  31375.19),
    (20260500, 'PMP-06', false,  95000.00,  79466.00, 508.99, 31102.99, 278607.80),
    (20260500, 'PMP-07', false,  24334.00,  24017.00, 510.23,  9400.25,  84203.60),
    (20260500, 'PMP-08', false,   9900.00,   9900.00, 720.00,  3874.86,  34709.40),
    (20260500, 'PMP-09', false,  18500.00,  17797.00, 700.41,  6965.75,  62396.28),

    (20260600, 'SPR-01', false,  77760.00,  75252.00, 720.00,     0.00,      0.00),
    (20260600, 'SPR-02', false,  95904.00,  92810.00, 720.00,     0.00,      0.00),
    (20260600, 'SPR-03', false,  60600.00,  16108.50, 720.00,     0.00,      0.00),
    (20260600, 'PMP-01', false,  47995.00,  35980.00, 539.76, 14082.57, 126145.88),
    (20260600, 'PMP-02', false,  89985.00,  71670.00, 696.20, 28051.64, 251275.02),
    (20260600, 'PMP-03', false,  16202.00,  16202.00, 502.52,  6341.46,  56804.21),
    (20260600, 'PMP-05', false,  95000.00,   8558.00,  72.37,  3349.60,  30004.35),
    (20260600, 'PMP-06', false,  95000.00,  78453.00, 502.51, 30706.50, 275056.22),
    (20260600, 'PMP-07', false,  25072.00,  25072.00, 532.64,  9813.18,  87902.43),
    (20260600, 'PMP-08', false,   9900.00,   9415.00, 684.73,  3685.03,  33008.99),
    (20260600, 'PMP-09', false,  18500.00,  16888.00, 664.63,  6609.96,  59209.33),

    (20260700, 'SPR-01', false,  60500.00,  37505.00, 720.00,     0.00,      0.00),
    (20260700, 'SPR-02', false,  75000.00,  47952.00, 720.00,     0.00,      0.00),
    (20260700, 'SPR-03', false,  60600.00,  16897.50, 720.00,     0.00,      0.00),
    (20260700, 'PMP-01', false,  47995.00,  35048.00, 525.78, 13717.79, 122878.29),
    (20260700, 'PMP-02', false,  89985.00,  73540.00, 714.36, 28783.56, 257831.24),
    (20260700, 'PMP-03', false,  16723.00,  16723.00, 518.68,  6545.38,  58630.84),
    (20260700, 'PMP-05', false,  95000.00,  84580.00, 715.26, 33104.61, 296537.48),
    (20260700, 'PMP-06', false,  95000.00,  84565.00, 541.65, 33098.74, 296484.89),
    (20260700, 'PMP-07', false,  27687.00,  27687.00, 588.20, 10836.69,  97070.62),
    (20260700, 'PMP-08', false,   9900.00,   9524.00, 692.65,  3727.69,  33391.14),
    (20260700, 'PMP-09', false,  18500.00,  14335.00, 564.16,  5610.72,  50258.51),

    (20260800, 'SPR-01', false,  60500.00,  38820.00, 720.00,     0.00,      0.00),
    (20260800, 'SPR-02', false,  75000.00,  49550.40, 720.00,     0.00,      0.00),
    (20260800, 'SPR-03', false,  60600.00,  17062.50, 720.00,     0.00,      0.00),
    (20260800, 'PMP-01', false,  47995.00,  40740.00, 611.16, 15945.64, 142834.44),
    (20260800, 'PMP-02', false,  89985.00,  69430.00, 674.44, 27174.90, 243421.58),
    (20260800, 'PMP-03', false,  16723.00,  16075.00, 498.58,  6291.76,  56358.95),
    (20260800, 'PMP-05', false,  95000.00,  84890.00, 717.89, 33225.95, 297624.34),
    (20260800, 'PMP-06', false,  95000.00,  84565.00, 541.65, 33098.74, 296484.89),
    (20260800, 'PMP-07', false,  33891.00,  33701.00, 715.96, 13190.57, 118155.71),
    (20260800, 'PMP-08', false,   9900.00,   9138.00, 664.58,  3576.61,  32037.83),
    (20260800, 'PMP-09', false,  18500.00,  11513.00, 453.10,  4506.19,  40364.58),

    (20260900, 'SPR-01', false,  60500.00,  33870.00, 720.00,     0.00,      0.00),
    (20260900, 'SPR-02', false,  75000.00,  49550.40, 720.00,     0.00,      0.00),
    (20260900, 'SPR-03', false,  60600.00,  16677.00, 720.00,     0.00,      0.00),
    (20260900, 'PMP-01', false,  47995.00,  22023.00, 330.38,  8619.80,  77212.64),
    (20260900, 'PMP-02', false,  89985.00,  69700.00, 677.06, 27280.58, 244368.20),
    (20260900, 'PMP-03', false,  16723.00,  15531.00, 481.71,  6078.83,  54451.69),
    (20260900, 'PMP-05', false,  95000.00,  82970.00, 701.65, 32474.46, 290892.82),
    (20260900, 'PMP-06', false,  95000.00,  83946.24, 537.69, 32856.56, 294315.52),
    (20260900, 'PMP-07', false,  33891.00,  33891.00, 720.00, 13264.94, 118821.85),
    (20260900, 'PMP-08', false,   9900.00,   9643.00, 701.31,  3774.27,  33808.36),
    (20260900, 'PMP-09', false,  18500.00,  11724.00, 461.40,  4588.77,  41104.34)
)
INSERT INTO public.fact_production (
    time_id, source_id, granularity, is_extrapolated,
    reported_monthly_capacity_m3, produced_volume_m3, operating_hours, power_consumed_kwh, power_cost_php
)
SELECT 
    r.time_id, dws.source_id, 'Monthly', r.is_extrapolated,
    r.reported_monthly_capacity_m3, r.produced_volume_m3, LEAST(r.operating_hours, 744.00), r.power_consumed_kwh, r.power_cost_php
FROM recovered_exact r
JOIN public.dim_water_source dws ON r.source_code = dws.source_code
ON CONFLICT (time_id, source_id, granularity) DO UPDATE SET
    is_extrapolated = EXCLUDED.is_extrapolated,
    reported_monthly_capacity_m3 = EXCLUDED.reported_monthly_capacity_m3,
    produced_volume_m3 = EXCLUDED.produced_volume_m3,
    operating_hours = EXCLUDED.operating_hours,
    power_consumed_kwh = EXCLUDED.power_consumed_kwh,
    power_cost_php = EXCLUDED.power_cost_php;

-- ============================================================================
-- 2. BACKFILL MAY–DECEMBER 2023 (20230500–20231200) FROM REF_MDS_MONTHLY
-- ============================================================================
WITH shares_2024 AS (
    SELECT 
        (fp.time_id % 10000) / 100 AS month_number,
        fp.source_id,
        dws.source_type,
        fp.reported_monthly_capacity_m3 / NULLIF(SUM(fp.reported_monthly_capacity_m3) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS cap_share,
        fp.produced_volume_m3 / NULLIF(SUM(fp.produced_volume_m3) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS prod_share,
        fp.operating_hours / NULLIF(SUM(fp.operating_hours) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS hrs_share
    FROM public.fact_production fp
    JOIN public.dim_water_source dws ON fp.source_id = dws.source_id
    WHERE fp.time_id BETWEEN 20240500 AND 20241200
      AND fp.granularity = 'Monthly'
)
INSERT INTO public.fact_production (
    time_id, source_id, granularity, is_extrapolated,
    reported_monthly_capacity_m3, produced_volume_m3, operating_hours, power_consumed_kwh, power_cost_php
)
SELECT 
    m.time_id,
    s24.source_id,
    'Monthly' AS granularity,
    true AS is_extrapolated,
    ROUND(CASE WHEN s24.source_type = 'Spring' THEN m.springs_rated_cap_m3 * s24.cap_share ELSE m.wells_rated_cap_m3 * s24.cap_share END, 2),
    ROUND(CASE WHEN s24.source_type = 'Spring' THEN m.gravity_produced_m3 * s24.prod_share ELSE m.pumped_produced_m3 * s24.prod_share END, 2),
    LEAST(ROUND(CASE WHEN s24.source_type = 'Spring' THEN 720.00 ELSE m.pumping_hours * s24.hrs_share END, 2), 744.00),
    ROUND(CASE WHEN s24.source_type = 'Spring' THEN 0.00 ELSE m.power_kwh * s24.prod_share END, 2),
    ROUND(CASE WHEN s24.source_type = 'Spring' THEN 0.00 ELSE m.power_cost_php * s24.prod_share END, 2)
FROM public.ref_mds_monthly m
JOIN shares_2024 s24 ON m.month_number = s24.month_number
WHERE m.year = 2023 AND m.month_number BETWEEN 5 AND 12
ON CONFLICT (time_id, source_id, granularity) DO UPDATE SET
    is_extrapolated = EXCLUDED.is_extrapolated,
    reported_monthly_capacity_m3 = EXCLUDED.reported_monthly_capacity_m3,
    produced_volume_m3 = EXCLUDED.produced_volume_m3,
    operating_hours = EXCLUDED.operating_hours,
    power_consumed_kwh = EXCLUDED.power_consumed_kwh,
    power_cost_php = EXCLUDED.power_cost_php;

-- ============================================================================
-- 3. BACKFILL 2017–2020 (20170100–20201200) FROM REF_MDS_MONTHLY
-- ============================================================================
WITH shares_2021 AS (
    SELECT 
        (fp.time_id % 10000) / 100 AS month_number,
        fp.source_id,
        dws.source_type,
        fp.reported_monthly_capacity_m3 / NULLIF(SUM(fp.reported_monthly_capacity_m3) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS cap_share,
        fp.produced_volume_m3 / NULLIF(SUM(fp.produced_volume_m3) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS prod_share,
        fp.operating_hours / NULLIF(SUM(fp.operating_hours) OVER (PARTITION BY fp.time_id, dws.source_type), 0) AS hrs_share
    FROM public.fact_production fp
    JOIN public.dim_water_source dws ON fp.source_id = dws.source_id
    WHERE fp.time_id BETWEEN 20210100 AND 20211200
      AND fp.granularity = 'Monthly'
)
INSERT INTO public.fact_production (
    time_id, source_id, granularity, is_extrapolated,
    reported_monthly_capacity_m3, produced_volume_m3, operating_hours, power_consumed_kwh, power_cost_php
)
SELECT 
    m.time_id,
    s21.source_id,
    'Monthly' AS granularity,
    true AS is_extrapolated,
    ROUND(CASE WHEN s21.source_type = 'Spring' THEN m.springs_rated_cap_m3 * s21.cap_share ELSE m.wells_rated_cap_m3 * s21.cap_share END, 2),
    ROUND(CASE WHEN s21.source_type = 'Spring' THEN m.gravity_produced_m3 * s21.prod_share ELSE m.pumped_produced_m3 * s21.prod_share END, 2),
    LEAST(ROUND(CASE WHEN s21.source_type = 'Spring' THEN 720.00 ELSE m.pumping_hours * s21.hrs_share END, 2), 744.00),
    ROUND(CASE WHEN s21.source_type = 'Spring' THEN 0.00 ELSE m.power_kwh * s21.prod_share END, 2),
    ROUND(CASE WHEN s21.source_type = 'Spring' THEN 0.00 ELSE m.power_cost_php * s21.prod_share END, 2)
FROM public.ref_mds_monthly m
JOIN shares_2021 s21 ON m.month_number = s21.month_number
WHERE m.year BETWEEN 2017 AND 2020
ON CONFLICT (time_id, source_id, granularity) DO UPDATE SET
    is_extrapolated = EXCLUDED.is_extrapolated,
    reported_monthly_capacity_m3 = EXCLUDED.reported_monthly_capacity_m3,
    produced_volume_m3 = EXCLUDED.produced_volume_m3,
    operating_hours = EXCLUDED.operating_hours,
    power_consumed_kwh = EXCLUDED.power_consumed_kwh,
    power_cost_php = EXCLUDED.power_cost_php;

-- ============================================================================
-- 4. RECOMPUTE ZONAL NRW & REFRESH DATA MART
-- ============================================================================
WITH zonal_monthly_billing AS (
    SELECT fb.billing_period_time_id AS time_id, fb.location_id,
        COUNT(DISTINCT fb.customer_id) AS zone_active_conns, SUM(fb.billed_volume_m3) AS zone_billed_m3,
        SUM(fb.bill_amount_php) AS zone_billed_php, SUM(SUM(fb.billed_volume_m3)) OVER (PARTITION BY fb.billing_period_time_id) AS total_billed_m3_in_month
    FROM public.fact_billing fb GROUP BY fb.billing_period_time_id, fb.location_id
),
zone_supply AS (
    SELECT fp.time_id, bsz.location_id,
        ROUND(SUM(CASE WHEN s.source_type = 'Spring' THEN fp.produced_volume_m3 * bsz.allocation_weight ELSE 0 END), 2) AS gravity_m3,
        ROUND(SUM(CASE WHEN s.source_type = 'Pumping Station' THEN fp.produced_volume_m3 * bsz.allocation_weight ELSE 0 END), 2) AS pumped_m3,
        ROUND(SUM(fp.produced_volume_m3 * bsz.allocation_weight), 2) AS total_produced_m3
    FROM public.fact_production fp
    JOIN public.dim_water_source s ON fp.source_id = s.source_id
    JOIN public.bridge_source_zone bsz ON fp.source_id = bsz.source_id
    WHERE fp.granularity = 'Monthly' GROUP BY fp.time_id, bsz.location_id
)
INSERT INTO public.fact_nrw (
    time_id, location_id, granularity,
    gravity_produced_m3, pumped_produced_m3, produced_volume_m3,
    billed_volume_m3, nrw_volume_m3, nrw_percentage,
    active_connections_count, estimated_financial_loss_php
)
SELECT zd.time_id, zd.location_id, 'Monthly',
    COALESCE(zs.gravity_m3, 0.00), COALESCE(zs.pumped_m3, 0.00), COALESCE(zs.total_produced_m3, 0.00),
    ROUND(zd.zone_billed_m3, 2),
    -- NRW can be negative when billing data exceeds recorded production (e.g. backfilled years); floor at 0
    GREATEST(ROUND(COALESCE(zs.total_produced_m3, 0.00) - zd.zone_billed_m3, 2), 0.00),
    GREATEST(ROUND(((COALESCE(zs.total_produced_m3, 0.00) - zd.zone_billed_m3) / NULLIF(zs.total_produced_m3, 0)) * 100, 2), 0.00),
    zd.zone_active_conns,
    GREATEST(ROUND((COALESCE(zs.total_produced_m3, 0.00) - zd.zone_billed_m3) * COALESCE(zd.zone_billed_php / NULLIF(zd.zone_billed_m3, 0), 25.40), 2), 0.00)
FROM zonal_monthly_billing zd
JOIN zone_supply zs ON zd.time_id = zs.time_id AND zd.location_id = zs.location_id
ON CONFLICT (time_id, location_id, granularity) DO UPDATE SET
    gravity_produced_m3 = EXCLUDED.gravity_produced_m3,
    pumped_produced_m3 = EXCLUDED.pumped_produced_m3,
    produced_volume_m3 = EXCLUDED.produced_volume_m3,
    billed_volume_m3 = EXCLUDED.billed_volume_m3,
    nrw_volume_m3 = EXCLUDED.nrw_volume_m3,
    nrw_percentage = EXCLUDED.nrw_percentage,
    active_connections_count = EXCLUDED.active_connections_count,
    estimated_financial_loss_php = EXCLUDED.estimated_financial_loss_php;

REFRESH MATERIALIZED VIEW CONCURRENTLY public.dm_water_balance_datamart;

