/**
 * @file src/services/billing.service.ts
 * @description Data-access layer for Billing in the AquaStat Constellation Schema.
 * Queries `fact_billing` joined with `dim_time`, `dim_customer`, and `dim_location`.
 */

import { query } from '../database/pool';
import { notFoundError } from '../middleware/errorHandler';
import { buildPagination } from '../utils/responseHelper';
import {
  BillingRecord,
  BillingSummary,
  BillingStatus,
  ListQueryParams,
  ApiSuccessResponse,
} from '../types/api';

// ─── Row shape returned by PostgreSQL Constellation Schema ───────────────────

interface ConstellationBillingRow {
  billing_fact_id: string;
  customer_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  service_zone: string;
  barangay_name: string;
  full_date: string;
  billed_volume_m3: string;
  revenue_amount: string;
  arrears_amount: string;
  billing_status: BillingStatus;
  created_at: string;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRow(row: ConstellationBillingRow): BillingRecord {
  return {
    billingId: row.billing_fact_id,
    customerId: row.account_number,
    customerName: row.account_name,
    billingPeriodStart: row.full_date,
    billingPeriodEnd: row.full_date,
    volumeBilledM3: parseFloat(row.billed_volume_m3),
    amountDue: parseFloat(row.revenue_amount),
    amountPaid: parseFloat(row.revenue_amount) - parseFloat(row.arrears_amount),
    currency: 'PHP',
    status: row.billing_status,
    dueDate: row.full_date,
    paidDate: row.billing_status === 'Paid' ? row.full_date : null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of billing records from `fact_billing`.
 */
export async function getBillingRecords(params: ListQueryParams): Promise<{
  records: BillingRecord[];
  pagination: ApiSuccessResponse['pagination'];
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.dateFrom) {
    conditions.push(`dt.full_date >= $${idx++}`);
    values.push(params.dateFrom);
  }
  if (params.dateTo) {
    conditions.push(`dt.full_date <= $${idx++}`);
    values.push(params.dateTo);
  }
  if (params.search) {
    conditions.push(`(dc.account_name ILIKE $${idx} OR dc.account_number ILIKE $${idx} OR dl.service_zone ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSortCols: Record<string, string> = {
    createdAt: 'fb.created_at',
    amountDue: 'fb.revenue_amount',
    dueDate: 'dt.full_date',
    billingPeriodStart: 'dt.full_date',
  };
  const orderCol = allowedSortCols[params.sortBy ?? ''] ?? 'fb.billing_fact_id';
  const orderDir = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Count total
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

  // Fetch data
  const dataResult = await query<ConstellationBillingRow>(
    `SELECT 
        fb.billing_fact_id,
        fb.customer_id::text,
        dc.account_number,
        dc.account_name,
        dc.account_type,
        dl.service_zone,
        dl.barangay_name,
        dt.full_date::text,
        fb.billed_volume_m3,
        fb.revenue_amount,
        fb.arrears_amount,
        fb.billing_status,
        fb.created_at::text
     FROM fact_billing fb
     JOIN dim_time dt ON fb.time_id = dt.time_id
     JOIN dim_customer dc ON fb.customer_id = dc.customer_id
     JOIN dim_location dl ON fb.location_id = dl.location_id
     ${where}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return {
    records: dataResult.rows.map(mapRow),
    pagination: buildPagination(page, limit, total),
  };
}

/**
 * Fetch a single billing record by its fact ID.
 */
export async function getBillingById(billingId: string): Promise<BillingRecord> {
  const result = await query<ConstellationBillingRow>(
    `SELECT 
        fb.billing_fact_id,
        fb.customer_id::text,
        dc.account_number,
        dc.account_name,
        dc.account_type,
        dl.service_zone,
        dl.barangay_name,
        dt.full_date::text,
        fb.billed_volume_m3,
        fb.revenue_amount,
        fb.arrears_amount,
        fb.billing_status,
        fb.created_at::text
     FROM fact_billing fb
     JOIN dim_time dt ON fb.time_id = dt.time_id
     JOIN dim_customer dc ON fb.customer_id = dc.customer_id
     JOIN dim_location dl ON fb.location_id = dl.location_id
     WHERE fb.billing_fact_id = $1`,
    [billingId]
  );
  const row = result.rows[0];
  if (!row) throw notFoundError(`Billing record [${billingId}]`);
  return mapRow(row);
}

/**
 * Aggregate summary stats for the Billing DataMart.
 */
export async function getBillingSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<BillingSummary> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (dateFrom) { conditions.push(`dt.full_date >= $${idx++}`); values.push(dateFrom); }
  if (dateTo)   { conditions.push(`dt.full_date <= $${idx++}`); values.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      COUNT(*)::INT                                             AS total_records,
      COALESCE(SUM(fb.billed_volume_m3), 0)::FLOAT              AS total_volume_billed_m3,
      COALESCE(SUM(fb.revenue_amount), 0)::FLOAT                AS total_amount_due,
      COALESCE(SUM(fb.revenue_amount - fb.arrears_amount), 0)::FLOAT AS total_amount_paid,
      COALESCE(SUM(fb.arrears_amount), 0)::FLOAT                AS total_outstanding_balance,
      COALESCE(
        ROUND(
          (SUM(fb.revenue_amount - fb.arrears_amount) / NULLIF(SUM(fb.revenue_amount), 0) * 100)::numeric, 
          2
        ), 0.00
      )::FLOAT AS collection_rate_percentage
    FROM fact_billing fb
    JOIN dim_time dt ON fb.time_id = dt.time_id
    ${where};
  `;

  const result = await query<{
    total_records: number;
    total_volume_billed_m3: number;
    total_amount_due: number;
    total_amount_paid: number;
    total_outstanding_balance: number;
    collection_rate_percentage: number;
  }>(sql, values);

  const row = result.rows[0];
  return {
    totalRecords: row?.total_records ?? 0,
    totalVolumeBilledM3: row?.total_volume_billed_m3 ?? 0,
    totalAmountDue: row?.total_amount_due ?? 0,
    totalAmountPaid: row?.total_amount_paid ?? 0,
    totalOutstandingBalance: row?.total_outstanding_balance ?? 0,
    totalOutstanding: row?.total_outstanding_balance ?? 0,
    collectionRatePercentage: row?.collection_rate_percentage ?? 0,
    currency: 'PHP',
  };
}

/**
 * Insert a new billing record into `fact_billing`.
 * Maps `CreateBillingPayload` fields onto the constellation schema columns.
 */
export async function createBillingRecord(
  payload: import('../types/api').CreateBillingPayload
): Promise<BillingRecord> {
  // Resolve time_id from the billing period start date
  const timeRes = await query<{ time_id: number }>(
    `SELECT time_id FROM dim_time WHERE full_date = $1 LIMIT 1`,
    [payload.billingPeriodStart]
  );
  const timeId = timeRes.rows[0]?.time_id;
  if (!timeId) throw new Error(`No dim_time entry for date ${payload.billingPeriodStart}`);

  // Resolve customer row
  const custRes = await query<{ customer_id: number }>(
    `SELECT customer_id FROM dim_customer WHERE account_number = $1 LIMIT 1`,
    [payload.customerId]
  );
  const customerId = custRes.rows[0]?.customer_id;
  if (!customerId) throw new Error(`Customer [${payload.customerId}] not found`);

  // Default to first location for the customer
  const locRes = await query<{ location_id: number }>(
    `SELECT dl.location_id FROM dim_location dl
     JOIN dim_customer dc ON dc.customer_id = $1
     LIMIT 1`,
    [customerId]
  );
  const locationId = locRes.rows[0]?.location_id ?? 1;

  const result = await query<{ billing_fact_id: string }>(
    `INSERT INTO fact_billing
       (time_id, customer_id, location_id, billed_volume_m3, revenue_amount, arrears_amount, billing_status)
     VALUES ($1, $2, $3, $4, $5, 0, 'pending')
     RETURNING billing_fact_id`,
    [timeId, customerId, locationId, payload.volumeBilledM3, payload.amountDue]
  );

  const newId = result.rows[0]?.billing_fact_id;
  if (!newId) throw new Error('Insert failed — no billing_fact_id returned');
  return getBillingById(newId);
}

/**
 * Patch the `billing_status` (and optionally `paid_date`) of a billing record.
 */
export async function updateBillingStatus(
  billingId: string,
  status: BillingStatus,
  _paidDate?: string
): Promise<BillingRecord> {
  const result = await query<{ billing_fact_id: string }>(
    `UPDATE fact_billing
     SET billing_status = $2
     WHERE billing_fact_id = $1
     RETURNING billing_fact_id`,
    [billingId, status]
  );
  const updated = result.rows[0];
  if (!updated) throw notFoundError(`Billing record [${billingId}]`);
  return getBillingById(billingId);
}

