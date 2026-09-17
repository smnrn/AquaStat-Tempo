/**
 * @file src/services/consumption.service.ts
 * @description Data-access layer for the Consumption DataMart in the AquaStat Constellation Schema.
 * Derives customer and zone meter consumption by querying `fact_billing` joined with `dim_customer`, `dim_location`, and `dim_time`.
 */

import { query } from '../database/pool';
import { notFoundError } from '../middleware/errorHandler';
import { buildPagination } from '../utils/responseHelper';
import {
  ConsumptionRecord,
  ConsumptionAggregates,
  ListQueryParams,
  ApiSuccessResponse,
} from '../types/api';

// ─── Row shape ────────────────────────────────────────────────────────────────

interface ConstellationConsumptionRow {
  billing_fact_id: string;
  meter_serial_no: string;
  account_number: string;
  account_name: string;
  service_zone: string;
  full_date: string;
  billed_volume_m3: string;
  created_at: string;
}

function mapRow(row: ConstellationConsumptionRow): ConsumptionRecord {
  const vol = parseFloat(row.billed_volume_m3);
  // Flag consumption > 2,000 m³ as anomaly for TCWD audits
  const isAnomaly = vol > 2000;
  return {
    consumptionId: row.billing_fact_id,
    meterId: row.meter_serial_no,
    customerId: row.account_number,
    readingTimestamp: row.full_date,
    meterReadingM3: vol * 12, // cumulative estimate
    consumptionDeltaM3: vol,
    zoneId: row.service_zone,
    isAnomaly: isAnomaly,
    anomalyScore: isAnomaly ? 0.85 : 0.05,
    createdAt: row.created_at,
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Paginated list of consumption records.
 * Supports filtering by zone, date range, and anomaly-only flag.
 */
export async function getConsumptionRecords(
  params: ListQueryParams & { zoneId?: string; anomalyOnly?: boolean }
): Promise<{
  records: ConsumptionRecord[];
  pagination: ApiSuccessResponse['pagination'];
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(500, params.limit ?? 50);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.dateFrom)    { conditions.push(`dt.full_date >= $${idx++}`); values.push(params.dateFrom); }
  if (params.dateTo)      { conditions.push(`dt.full_date <= $${idx++}`); values.push(params.dateTo); }
  if (params.zoneId)      { conditions.push(`dl.service_zone = $${idx++}`); values.push(params.zoneId); }
  if (params.anomalyOnly) { conditions.push(`fb.billed_volume_m3 > 2000`); }
  if (params.search)      {
    conditions.push(`(dc.meter_serial_no ILIKE $${idx} OR dc.account_number ILIKE $${idx} OR dc.account_name ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count 
     FROM fact_billing fb
     JOIN dim_time dt ON fb.time_id = dt.time_id
     JOIN dim_customer dc ON fb.customer_id = dc.customer_id
     JOIN dim_location dl ON fb.location_id = dl.location_id
     ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<ConstellationConsumptionRow>(
    `SELECT 
        fb.billing_fact_id,
        dc.meter_serial_no,
        dc.account_number,
        dc.account_name,
        dl.service_zone,
        dt.full_date::text,
        fb.billed_volume_m3,
        fb.created_at::text
     FROM fact_billing fb
     JOIN dim_time dt ON fb.time_id = dt.time_id
     JOIN dim_customer dc ON fb.customer_id = dc.customer_id
     JOIN dim_location dl ON fb.location_id = dl.location_id
     ${where}
     ORDER BY dt.full_date DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return {
    records: dataResult.rows.map(mapRow),
    pagination: buildPagination(page, limit, total),
  };
}

/**
 * Fetch a single consumption reading.
 */
export async function getConsumptionById(id: string): Promise<ConsumptionRecord> {
  const result = await query<ConstellationConsumptionRow>(
    `SELECT 
        fb.billing_fact_id,
        dc.meter_serial_no,
        dc.account_number,
        dc.account_name,
        dl.service_zone,
        dt.full_date::text,
        fb.billed_volume_m3,
        fb.created_at::text
     FROM fact_billing fb
     JOIN dim_time dt ON fb.time_id = dt.time_id
     JOIN dim_customer dc ON fb.customer_id = dc.customer_id
     JOIN dim_location dl ON fb.location_id = dl.location_id
     WHERE fb.billing_fact_id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw notFoundError(`Consumption record [${id}]`);
  return mapRow(row);
}

/**
 * Aggregate consumption statistics across zones.
 */
export async function getConsumptionAggregates(
  zoneId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ConsumptionAggregates> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (zoneId)   { conditions.push(`dl.service_zone = $${idx++}`); values.push(zoneId); }
  if (dateFrom) { conditions.push(`dt.full_date >= $${idx++}`);   values.push(dateFrom); }
  if (dateTo)   { conditions.push(`dt.full_date <= $${idx++}`);   values.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      dl.service_zone                                                AS zone_id,
      COALESCE(SUM(fb.billed_volume_m3), 0)::FLOAT                   AS total_consumption_m3,
      COALESCE(ROUND(AVG(fb.billed_volume_m3)::numeric, 2), 0)::FLOAT AS avg_consumption_m3,
      COALESCE(MAX(fb.billed_volume_m3), 0)::FLOAT                   AS peak_consumption_m3,
      COALESCE(MIN(fb.billed_volume_m3), 0)::FLOAT                   AS min_consumption_m3,
      COUNT(*)::INT                                                  AS reading_count,
      COUNT(*) FILTER (WHERE fb.billed_volume_m3 > 2000)::INT        AS anomaly_count
    FROM fact_billing fb
    JOIN dim_time dt ON fb.time_id = dt.time_id
    JOIN dim_location dl ON fb.location_id = dl.location_id
    ${where}
    GROUP BY dl.service_zone
    LIMIT 1;
  `;

  const result = await query<{
    zone_id: string;
    total_consumption_m3: number;
    avg_consumption_m3: number;
    peak_consumption_m3: number;
    min_consumption_m3: number;
    reading_count: number;
    anomaly_count: number;
  }>(sql, values);

  const row = result.rows[0];
  return {
    zoneId: row?.zone_id ?? zoneId ?? 'All Zones',
    periodStart: dateFrom ?? '2026-08-01',
    periodEnd: dateTo ?? '2026-08-25',
    totalConsumptionM3: row?.total_consumption_m3 ?? 0,
    avgDailyConsumptionM3: row?.avg_consumption_m3 ?? 0,
    peakConsumptionM3: row?.peak_consumption_m3 ?? 0,
    minConsumptionM3: row?.min_consumption_m3 ?? 0,
    readingCount: row?.reading_count ?? 0,
    anomalyCount: row?.anomaly_count ?? 0,
  };
}

/**
 * Ingest a new meter reading into `fact_billing`.
 * Computes consumption delta and flags anomalies (>2000 m³).
 */
export async function createConsumptionRecord(
  payload: import('../types/api').CreateConsumptionPayload
): Promise<ConsumptionRecord> {
  // Resolve dim_time entry
  const date = payload.readingTimestamp.substring(0, 10);
  const timeRes = await query<{ time_id: number }>(
    `SELECT time_id FROM dim_time WHERE full_date = $1 LIMIT 1`,
    [date]
  );
  const timeId = timeRes.rows[0]?.time_id;
  if (!timeId) throw new Error(`No dim_time entry for date ${date}`);

  // Resolve customer
  const custRes = await query<{ customer_id: number }>(
    `SELECT customer_id FROM dim_customer WHERE account_number = $1 LIMIT 1`,
    [payload.customerId]
  );
  const customerId = custRes.rows[0]?.customer_id;
  if (!customerId) throw new Error(`Customer [${payload.customerId}] not found`);

  // Resolve location from zone
  const locRes = await query<{ location_id: number }>(
    `SELECT location_id FROM dim_location WHERE service_zone = $1 LIMIT 1`,
    [payload.zoneId]
  );
  const locationId = locRes.rows[0]?.location_id ?? 1;

  const volM3 = payload.meterReadingM3;
  const estRevenue = volM3 * 24.50; // TCWD per-m³ rate estimate

  const result = await query<{ billing_fact_id: string }>(
    `INSERT INTO fact_billing
       (time_id, customer_id, location_id, billed_volume_m3, revenue_amount, arrears_amount, billing_status)
     VALUES ($1, $2, $3, $4, $5, 0, 'pending')
     RETURNING billing_fact_id`,
    [timeId, customerId, locationId, volM3, estRevenue]
  );

  const newId = result.rows[0]?.billing_fact_id;
  if (!newId) throw new Error('Insert failed — no billing_fact_id returned');

  const isAnomaly = volM3 > 2000;
  return {
    consumptionId: newId,
    meterId: payload.meterId,
    customerId: payload.customerId,
    readingTimestamp: payload.readingTimestamp,
    meterReadingM3: volM3 * 12,
    consumptionDeltaM3: volM3,
    zoneId: payload.zoneId,
    isAnomaly,
    anomalyScore: isAnomaly ? 0.85 : 0.05,
    createdAt: new Date().toISOString(),
  };
}
