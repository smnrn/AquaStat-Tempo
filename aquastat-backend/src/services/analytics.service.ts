/**
 * @file src/services/analytics.service.ts
 * @description Analytical data-access layer for the AquaStat Constellation Schema.
 *
 * Implements high-performance OLAP queries for:
 *  1. Descriptive Billing Analytics (Zone-level revenue & consumption)
 *  2. System Monitoring (Pump station capacity & specific energy)
 *  3. Non-Revenue Water (NRW) Multi-Fact Water Balance Calculation
 */

import { query } from '../database/pool';
import {
  ZoneBillingAnalytics,
  PumpMonitoringAnalytics,
  NonRevenueWaterAnalytics,
} from '../types/api';
import { logger } from '../utils/logger';

// ─── Query 1: Descriptive Billing Analytics ──────────────────────────────────

/**
 * Descriptive Analytics (Billing Service):
 * Aggregates total billed volume, revenue, and arrears per service zone
 * for a specific billing month and year.
 *
 * @param month Calendar month number (1 - 12)
 * @param year  Four-digit calendar year (e.g., 2026)
 */
export async function getZoneBillingAnalytics(
  month: number,
  year: number
): Promise<ZoneBillingAnalytics[]> {
  const sql = `
    /**
     * Descriptive Analytics: Zone Billing & Revenue Aggregation
     *
     * Parameter Mapping:
     *   $1: Month Number (INTEGER, e.g., 8 for August)
     *   $2: Year (INTEGER, e.g., 2026)
     *
     * Execution Strategy & Join Logic:
     *   1. Index Scan on dim_time (year, month_number) to identify matching time_id surrogate keys.
     *   2. Hash/Merge Join with fact_billing on time_id.
     *   3. Join with conformed dim_location on location_id to aggregate by service_zone.
     *   4. Compute SUM and COUNT aggregations with COALESCE to guarantee non-null numeric outputs.
     */
    SELECT
        dl.service_zone,
        COUNT(DISTINCT fb.customer_id)::INT                      AS total_billed_accounts,
        COALESCE(SUM(fb.billed_volume_m3), 0.00)::FLOAT          AS total_billed_volume_m3,
        COALESCE(SUM(fb.revenue_amount), 0.00)::FLOAT            AS total_revenue_amount,
        COALESCE(SUM(fb.arrears_amount), 0.00)::FLOAT            AS total_arrears_amount,
        COALESCE(
            ROUND(SUM(fb.revenue_amount) / NULLIF(SUM(fb.billed_volume_m3), 0), 2),
            0.00
        )::FLOAT                                                 AS avg_revenue_per_m3
    FROM fact_billing fb
    -- JOIN Logic: Connect fact records to the conformed temporal dimension
    JOIN dim_time dt 
        ON fb.time_id = dt.time_id
    -- JOIN Logic: Connect fact records to the conformed geospatial dimension
    JOIN dim_location dl 
        ON fb.location_id = dl.location_id
    WHERE 
        dt.month_number = $1
        AND dt.year = $2
    GROUP BY 
        dl.service_zone
    ORDER BY 
        total_revenue_amount DESC;
  `;

  logger.info('[AnalyticsService] Fetching zone billing analytics', { month, year });
  const result = await query<{
    service_zone: string;
    total_billed_accounts: number;
    total_billed_volume_m3: number;
    total_revenue_amount: number;
    total_arrears_amount: number;
    avg_revenue_per_m3: number;
  }>(sql, [month, year]);

  return result.rows.map((row) => ({
    serviceZone: row.service_zone,
    totalBilledAccounts: row.total_billed_accounts,
    totalBilledVolumeM3: row.total_billed_volume_m3,
    totalRevenueAmount: row.total_revenue_amount,
    totalArrearsAmount: row.total_arrears_amount,
    avgRevenuePerM3: row.avg_revenue_per_m3,
  }));
}

// ─── Query 2: System Monitoring (Production Service) ─────────────────────────

/**
 * System Monitoring (Production Service):
 * Retrieves the total water produced, power consumed, operating hours,
 * and capacity utilization for each pump station over a date range.
 *
 * @param startDate Start date in 'YYYY-MM-DD' format
 * @param endDate   End date in 'YYYY-MM-DD' format
 */
export async function getPumpMonitoringAnalytics(
  startDate: string,
  endDate: string
): Promise<PumpMonitoringAnalytics[]> {
  const sql = `
    /**
     * System Monitoring: Pump Station Production & Energy Intensity
     *
     * Parameter Mapping:
     *   $1: Start Date (DATE, e.g., '2026-08-01')
     *   $2: End Date   (DATE, e.g., '2026-08-25')
     *
     * Execution Strategy & Join Logic:
     *   1. Range scan on dim_time.full_date between $1 and $2.
     *   2. Inner join with fact_production on time_id.
     *   3. Join with dim_pump_station on pump_id to pull name, maintenance status, and rated capacity.
     *   4. Compute derived OLAP KPIs:
     *      - Specific Energy Intensity (kWh/m3)
     *      - Capacity Utilization % = (Produced Volume / (Rated Daily Capacity * Operating Days)) * 100
     */
    SELECT
        dps.pump_id,
        dps.station_code,
        dps.station_name,
        dps.maintenance_status,
        dps.rated_capacity_m3_day::FLOAT                        AS rated_capacity_m3_day,
        COUNT(DISTINCT dt.full_date)::INT                       AS reporting_days,
        COALESCE(SUM(fp.produced_volume_m3), 0.00)::FLOAT       AS total_water_produced_m3,
        COALESCE(SUM(fp.power_consumed_kwh), 0.00)::FLOAT       AS total_power_consumed_kwh,
        COALESCE(SUM(fp.operating_hours), 0.00)::FLOAT          AS total_operating_hours,
        -- Specific Energy: kWh consumed per m3 of water produced
        COALESCE(
            ROUND(SUM(fp.power_consumed_kwh) / NULLIF(SUM(fp.produced_volume_m3), 0), 4),
            0.0000
        )::FLOAT                                                AS specific_energy_kwh_per_m3,
        -- Operational Capacity Utilization Percentage
        COALESCE(
            ROUND(
                (SUM(fp.produced_volume_m3) / 
                NULLIF(dps.rated_capacity_m3_day * COUNT(DISTINCT dt.full_date), 0)) * 100, 
                2
            ),
            0.00
        )::FLOAT                                                AS capacity_utilization_pct
    FROM dim_pump_station dps
    -- JOIN Logic: Link pump asset catalog to operational production fact logs
    JOIN fact_production fp 
        ON dps.pump_id = fp.pump_id
    -- JOIN Logic: Link to conformed temporal dimension for continuous date slicing
    JOIN dim_time dt 
        ON fp.time_id = dt.time_id
    WHERE 
        dt.full_date BETWEEN $1 AND $2
    GROUP BY 
        dps.pump_id,
        dps.station_code,
        dps.station_name,
        dps.maintenance_status,
        dps.rated_capacity_m3_day
    ORDER BY 
        total_water_produced_m3 DESC;
  `;

  logger.info('[AnalyticsService] Fetching pump station monitoring', { startDate, endDate });
  const result = await query<{
    pump_id: number;
    station_code: string;
    station_name: string;
    maintenance_status: string;
    rated_capacity_m3_day: number;
    reporting_days: number;
    total_water_produced_m3: number;
    total_power_consumed_kwh: number;
    total_operating_hours: number;
    specific_energy_kwh_per_m3: number;
    capacity_utilization_pct: number;
  }>(sql, [startDate, endDate]);

  return result.rows.map((row) => ({
    pumpId: row.pump_id,
    stationCode: row.station_code,
    stationName: row.station_name,
    maintenanceStatus: row.maintenance_status,
    ratedCapacityM3Day: row.rated_capacity_m3_day,
    reportingDays: row.reporting_days,
    totalWaterProducedM3: row.total_water_produced_m3,
    totalPowerConsumedKwh: row.total_power_consumed_kwh,
    totalOperatingHours: row.total_operating_hours,
    specificEnergyKwhPerM3: row.specific_energy_kwh_per_m3,
    capacityUtilizationPct: row.capacity_utilization_pct,
  }));
}

// ─── Query 3: Non-Revenue Water (NRW) Multi-Fact Calculation ─────────────────

/**
 * Non-Revenue Water (NRW) Calculation:
 * Evaluates the physical and commercial water loss across a specific service zone
 * by joining independent aggregates from FACT_PRODUCTION and FACT_BILLING.
 *
 * @param serviceZone Name of the target service zone
 * @param startDate   Start date in 'YYYY-MM-DD' format
 * @param endDate     End date in 'YYYY-MM-DD' format
 */
export async function calculateServiceZoneNRW(
  serviceZone: string,
  startDate: string,
  endDate: string
): Promise<NonRevenueWaterAnalytics[]> {
  const sql = `
    /**
     * Non-Revenue Water (NRW) Multi-Fact Water Balance Calculation
     *
     * Parameter Mapping:
     *   $1: Service Zone Name (VARCHAR, e.g., 'Zone 1 - North District')
     *   $2: Start Date (DATE, e.g., '2026-08-01')
     *   $3: End Date   (DATE, e.g., '2026-08-31')
     *
     * Constellation Schema Join Strategy:
     *   - Since FACT_PRODUCTION (pump grain) and FACT_BILLING (customer grain) have different
     *     dimensional granularities, we PRE-AGGREGATE each fact table inside CTEs first.
     *   - Joining the CTEs on the conformed location_id eliminates Cartesian duplication.
     */
    WITH zone_production AS (
        -- Step 1: Pre-aggregate production volume per location
        SELECT
            fp.location_id,
            SUM(fp.produced_volume_m3) AS total_produced_m3
        FROM fact_production fp
        JOIN dim_time dt ON fp.time_id = dt.time_id
        JOIN dim_location dl ON fp.location_id = dl.location_id
        WHERE 
            dl.service_zone = $1
            AND dt.full_date BETWEEN $2 AND $3
        GROUP BY 
            fp.location_id
    ),
    zone_billing AS (
        -- Step 2: Pre-aggregate billed volume per location
        SELECT
            fb.location_id,
            SUM(fb.billed_volume_m3)  AS total_billed_m3,
            SUM(fb.revenue_amount)    AS total_revenue
        FROM fact_billing fb
        JOIN dim_time dt ON fb.time_id = dt.time_id
        JOIN dim_location dl ON fb.location_id = dl.location_id
        WHERE 
            dl.service_zone = $1
            AND dt.full_date BETWEEN $2 AND $3
        GROUP BY 
            fb.location_id
    )
    -- Step 3: Combine pre-aggregated CTEs on conformed dim_location
    SELECT
        dl.service_zone,
        dl.barangay_name,
        COALESCE(zp.total_produced_m3, 0.00)::FLOAT      AS total_produced_volume_m3,
        COALESCE(zb.total_billed_m3, 0.00)::FLOAT        AS total_billed_volume_m3,
        -- NRW Volume = Produced Volume - Billed Volume
        (COALESCE(zp.total_produced_m3, 0.00) - COALESCE(zb.total_billed_m3, 0.00))::FLOAT 
            AS nrw_volume_m3,
        -- NRW % = (NRW Volume / Produced Volume) * 100
        COALESCE(
            ROUND(
                ((COALESCE(zp.total_produced_m3, 0.00) - COALESCE(zb.total_billed_m3, 0.00)) / 
                NULLIF(zp.total_produced_m3, 0)) * 100, 
                2
            ),
            0.00
        )::FLOAT                                         AS nrw_percentage,
        -- Operational Health Category based on IWA / LWUA benchmarks
        CASE 
            WHEN zp.total_produced_m3 IS NULL OR zp.total_produced_m3 = 0 THEN 'No Production Data'
            WHEN ((zp.total_produced_m3 - COALESCE(zb.total_billed_m3, 0.00)) / zp.total_produced_m3) * 100 > 30.00 THEN 'Critical Loss Alert'
            WHEN ((zp.total_produced_m3 - COALESCE(zb.total_billed_m3, 0.00)) / zp.total_produced_m3) * 100 > 20.00 THEN 'Elevated Loss'
            ELSE 'Normal Range'
        END                                              AS nrw_health_status
    FROM dim_location dl
    LEFT JOIN zone_production zp ON dl.location_id = zp.location_id
    LEFT JOIN zone_billing zb    ON dl.location_id = zb.location_id
    WHERE 
        dl.service_zone = $1
    ORDER BY 
        nrw_volume_m3 DESC;
  `;

  logger.info('[AnalyticsService] Calculating zone NRW water balance', { serviceZone, startDate, endDate });
  const result = await query<{
    service_zone: string;
    barangay_name: string;
    total_produced_volume_m3: number;
    total_billed_volume_m3: number;
    nrw_volume_m3: number;
    nrw_percentage: number;
    nrw_health_status: 'Normal Range' | 'Elevated Loss' | 'Critical Loss Alert' | 'No Production Data';
  }>(sql, [serviceZone, startDate, endDate]);

  return result.rows.map((row) => ({
    serviceZone: row.service_zone,
    barangayName: row.barangay_name,
    totalProducedVolumeM3: row.total_produced_volume_m3,
    totalBilledVolumeM3: row.total_billed_volume_m3,
    nrwVolumeM3: row.nrw_volume_m3,
    nrwPercentage: row.nrw_percentage,
    nrwHealthStatus: row.nrw_health_status,
  }));
}
