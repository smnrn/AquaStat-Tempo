/**
 * @file src/services/dashboard.service.ts
 * @description Comprehensive dashboard data service that queries Supabase
 * to return real TCWD data for all dashboard screens.
 *
 * Replaces the hardcoded dummy data in the frontend with live data from:
 *   - fact_billing (1.7M+ records)
 *   - dim_location (21 zones)
 *   - dim_customer (21K+ accounts)
 *   - ref_mds_monthly (108 monthly records, 2017–2025)
 *   - ref_mds_annual_summary (9 annual records)
 *   - fact_nrw (108 NRW records)
 */

import { query } from '../database/pool';
import { logger } from '../utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert billmonth code (e.g. "1225") to readable format ("Dec '25") */
function formatBillmonth(bm: string): string {
  const monthNum = parseInt(bm.substring(0, 2), 10);
  const yearSuffix = bm.substring(2);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[monthNum - 1]} '${yearSuffix}`;
}

/** Convert MMYY billmonth to full year number */
function billmonthYear(bm: string): number {
  return parseInt(bm.substring(2), 10) + 2000;
}

/** Convert MMYY billmonth to month number */
function billmonthMonth(bm: string): number {
  return parseInt(bm.substring(0, 2), 10);
}

// ─── Zone Summary (replaces ZONES constant) ──────────────────────────────────

interface ZoneSummary {
  id: number;
  name: string;
  consumption: number;
  nrw: number;
  accounts: number;
  population: number;
  status: 'normal' | 'warning' | 'critical';
  trend: number[];
}

export async function getZoneSummary(): Promise<ZoneSummary[]> {
  logger.info('[DashboardService] Fetching zone summary...');

  // Get latest billmonth
  const bmRes = await query<{ billmonth: string }>(
    'SELECT MAX(billmonth) AS billmonth FROM fact_billing;'
  );
  const latestBm = bmRes.rows[0]?.billmonth;
  if (!latestBm) return [];

  // Get last 6 billmonths for trend sparklines
  const bmsRes = await query<{ billmonth: string }>(
    'SELECT DISTINCT billmonth FROM fact_billing ORDER BY billmonth DESC LIMIT 6;'
  );
  const last6Bms = bmsRes.rows.map((r) => r.billmonth).reverse();

  // Zone billing aggregates for latest month
  const zoneRes = await query<{
    location_id: number;
    service_zone_name: string;
    accounts: string;
    consumption: string;
  }>(
    `SELECT
       l.location_id,
       l.service_zone_name,
       COUNT(DISTINCT b.customer_id)::text AS accounts,
       ROUND(SUM(b.billed_volume_m3))::text AS consumption
     FROM fact_billing b
     JOIN dim_location l ON b.location_id = l.location_id
     WHERE b.billmonth = $1
       AND l.is_virtual_zone = false
     GROUP BY l.location_id, l.service_zone_name
     ORDER BY l.location_id;`,
    [latestBm]
  );

  // Trend data for each zone over last 6 months
  const trendRes = await query<{
    location_id: number;
    billmonth: string;
    consumption: string;
  }>(
    `SELECT
       l.location_id,
       b.billmonth,
       ROUND(SUM(b.billed_volume_m3))::text AS consumption
     FROM fact_billing b
     JOIN dim_location l ON b.location_id = l.location_id
     WHERE b.billmonth = ANY($1)
       AND l.is_virtual_zone = false
     GROUP BY l.location_id, b.billmonth
     ORDER BY l.location_id, b.billmonth;`,
    [last6Bms]
  );

  // Build trend map: location_id → [consumption values for last 6 months]
  const trendMap = new Map<number, number[]>();
  for (const row of trendRes.rows) {
    if (!trendMap.has(row.location_id)) trendMap.set(row.location_id, []);
    trendMap.get(row.location_id)!.push(Math.round(parseFloat(row.consumption)));
  }

  // Get system NRW for the latest month from ref_mds_monthly
  const bmMonth = billmonthMonth(latestBm);
  const bmYear = billmonthYear(latestBm);
  const nrwRes = await query<{ nrw_percentage: string }>(
    `SELECT nrw_percentage::text
     FROM ref_mds_monthly
     WHERE year = $1 AND month_number = $2
     LIMIT 1;`,
    [bmYear, bmMonth]
  );
  const systemNrw = nrwRes.rows[0]
    ? parseFloat(nrwRes.rows[0].nrw_percentage)
    : 20.0;

  // Try to get per-zone NRW from fact_nrw
  const zoneNrwRes = await query<{
    location_id: number;
    nrw_percentage: string;
  }>(
    `SELECT location_id, nrw_percentage::text
     FROM fact_nrw
     WHERE time_id = (SELECT MAX(time_id) FROM fact_nrw WHERE location_id IS NOT NULL)
       AND location_id IS NOT NULL;`
  );
  const zoneNrwMap = new Map<number, number>();
  for (const row of zoneNrwRes.rows) {
    zoneNrwMap.set(row.location_id, parseFloat(row.nrw_percentage));
  }

  // Assemble zone objects
  return zoneRes.rows.map((z) => {
    const consumption = Math.round(parseFloat(z.consumption));
    const accounts = parseInt(z.accounts, 10);
    const nrw = zoneNrwMap.get(z.location_id) ?? systemNrw;
    const status: 'normal' | 'warning' | 'critical' =
      nrw >= 25 ? 'critical' : nrw >= 20 ? 'warning' : 'normal';

    return {
      id: z.location_id,
      name: z.service_zone_name.replace(/^Zone 0/, 'Zone '),
      consumption,
      nrw: Math.round(nrw * 10) / 10,
      accounts,
      population: Math.round(accounts * 4.2), // estimated population from account count
      status,
      trend: trendMap.get(z.location_id) ?? [consumption],
    };
  });
}

// ─── Annual Trend (replaces ANNUAL_TREND) ─────────────────────────────────────

interface AnnualTrend {
  year: string;
  consumption: number;
  revenue: number;
  nrw: number;
}

export async function getAnnualTrend(): Promise<AnnualTrend[]> {
  logger.info('[DashboardService] Fetching annual trend...');

  const result = await query<{
    year: number;
    ytd_billed_m3: string;
    operating_revenue_ytd_php: string;
    ytd_nrw_pct: string;
  }>(
    `SELECT year, ytd_billed_m3::text, operating_revenue_ytd_php::text, ytd_nrw_pct::text
     FROM ref_mds_annual_summary
     ORDER BY year;`
  );

  return result.rows.map((r) => ({
    year: String(r.year),
    consumption: Math.round(parseFloat(r.ytd_billed_m3)),
    revenue: Math.round(parseFloat(r.operating_revenue_ytd_php)),
    nrw: parseFloat(parseFloat(r.ytd_nrw_pct).toFixed(1)),
  }));
}

// ─── Supply & Demand (replaces SUPPLY_DEMAND) ────────────────────────────────

interface SupplyDemand {
  month: string;
  supply: number;
  demand: number;
}

export async function getSupplyDemand(): Promise<SupplyDemand[]> {
  logger.info('[DashboardService] Fetching supply/demand...');

  const result = await query<{
    year: number;
    month_number: number;
    produced_volume_m3: string;
    billed_volume_m3: string;
  }>(
    `SELECT year, month_number,
            produced_volume_m3::text,
            billed_volume_m3::text
     FROM ref_mds_monthly
     ORDER BY year, month_number;`
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return result.rows.map((r) => ({
    month: `${monthNames[r.month_number - 1]} '${String(r.year).slice(2)}`,
    supply: Math.round(parseFloat(r.produced_volume_m3)),
    demand: Math.round(parseFloat(r.billed_volume_m3)),
  }));
}

// ─── Customer Class (replaces CUSTOMER_CLASS) ─────────────────────────────────

interface CustomerClass {
  name: string;
  value: number;
  revenue: number;
  accounts: number;
  color: string;
}

export async function getCustomerClasses(): Promise<CustomerClass[]> {
  logger.info('[DashboardService] Fetching customer classes...');

  // Get latest billmonth
  const bmRes = await query<{ billmonth: string }>(
    'SELECT MAX(billmonth) AS billmonth FROM fact_billing;'
  );
  const latestBm = bmRes.rows[0]?.billmonth;
  if (!latestBm) return [];

  const result = await query<{
    name: string;
    volume: string;
    revenue: string;
    accounts: string;
  }>(
    `SELECT
       customer_class_snapshot AS name,
       ROUND(SUM(billed_volume_m3))::text AS volume,
       ROUND(SUM(bill_amount_php))::text AS revenue,
       COUNT(DISTINCT customer_id)::text AS accounts
     FROM fact_billing
     WHERE billmonth = $1
     GROUP BY customer_class_snapshot
     ORDER BY SUM(billed_volume_m3) DESC;`,
    [latestBm]
  );

  const colorMap: Record<string, string> = {
    Residential: '#0038A8',
    Commercial: '#0284C7',
    Government: '#10B981',
    'Semi-Commercial': '#F59E0B',
    Industrial: '#8B5CF6',
    Institutional: '#EC4899',
  };

  return result.rows.map((r) => ({
    name: r.name,
    value: Math.round(parseFloat(r.volume)),
    revenue: Math.round(parseFloat(r.revenue)),
    accounts: parseInt(r.accounts, 10),
    color: colorMap[r.name] ?? '#64748B',
  }));
}

// ─── Top Accounts (replaces TOP_ACCOUNTS) ─────────────────────────────────────

interface TopAccount {
  id: string;
  zone: string;
  class: string;
  monthly: number;
  bill: number;
  flag: string;
}

export async function getTopAccounts(): Promise<TopAccount[]> {
  logger.info('[DashboardService] Fetching top accounts...');

  const bmRes = await query<{ billmonth: string }>(
    'SELECT MAX(billmonth) AS billmonth FROM fact_billing;'
  );
  const latestBm = bmRes.rows[0]?.billmonth;
  if (!latestBm) return [];

  const result = await query<{
    account_id: string;
    service_zone_name: string;
    customer_class_snapshot: string;
    monthly: string;
    bill: string;
  }>(
    `SELECT
       c.account_id,
       l.service_zone_name,
       b.customer_class_snapshot,
       ROUND(SUM(b.billed_volume_m3))::text AS monthly,
       ROUND(SUM(b.bill_amount_php))::text AS bill
     FROM fact_billing b
     JOIN dim_customer c ON b.customer_id = c.customer_id
     JOIN dim_location l ON b.location_id = l.location_id
     WHERE b.billmonth = $1
     GROUP BY c.account_id, l.service_zone_name, b.customer_class_snapshot
     ORDER BY SUM(b.billed_volume_m3) DESC
     LIMIT 5;`,
    [latestBm]
  );

  return result.rows.map((r) => ({
    id: r.account_id,
    zone: r.service_zone_name.replace(/^Zone 0/, 'Zone '),
    class: r.customer_class_snapshot,
    monthly: Math.round(parseFloat(r.monthly)),
    bill: Math.round(parseFloat(r.bill)),
    flag: 'High-volume consumer — flag for review',
  }));
}

// ─── Monthly NRW Trend (for NRW charts) ───────────────────────────────────────

interface MonthlyNrw {
  month: string;
  produced: number;
  billed: number;
  nrwVolume: number;
  nrwPct: number;
}

export async function getMonthlyNrw(): Promise<MonthlyNrw[]> {
  logger.info('[DashboardService] Fetching monthly NRW...');

  const result = await query<{
    year: number;
    month_number: number;
    produced_volume_m3: string;
    billed_volume_m3: string;
    nrw_volume_m3: string;
    nrw_percentage: string;
  }>(
    `SELECT year, month_number,
            produced_volume_m3::text,
            billed_volume_m3::text,
            nrw_volume_m3::text,
            nrw_percentage::text
     FROM ref_mds_monthly
     ORDER BY year, month_number;`
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return result.rows.map((r) => ({
    month: `${monthNames[r.month_number - 1]} '${String(r.year).slice(2)}`,
    produced: Math.round(parseFloat(r.produced_volume_m3)),
    billed: Math.round(parseFloat(r.billed_volume_m3)),
    nrwVolume: Math.round(parseFloat(r.nrw_volume_m3)),
    nrwPct: parseFloat(parseFloat(r.nrw_percentage).toFixed(1)),
  }));
}

// ─── KPI Summary (for dashboard header) ───────────────────────────────────────

interface DashboardKPI {
  totalAccounts: number;
  totalConsumption: number;
  totalRevenue: number;
  avgPerAccount: number;
  nrwPct: number;
  latestMonth: string;
  latestYear: number;
  prevMonthAccounts: number;
  prevMonthConsumption: number;
  prevMonthRevenue: number;
}

export async function getDashboardKPI(): Promise<DashboardKPI> {
  logger.info('[DashboardService] Fetching KPIs...');

  // Get two latest months for comparison
  const bmsRes = await query<{ billmonth: string }>(
    'SELECT DISTINCT billmonth FROM fact_billing ORDER BY billmonth DESC LIMIT 2;'
  );
  const latestBm = bmsRes.rows[0]?.billmonth ?? '1225';
  const prevBm = bmsRes.rows[1]?.billmonth ?? latestBm;

  // Latest month aggregates
  const latestRes = await query<{
    accounts: string;
    consumption: string;
    revenue: string;
  }>(
    `SELECT
       COUNT(DISTINCT customer_id)::text AS accounts,
       ROUND(SUM(billed_volume_m3))::text AS consumption,
       ROUND(SUM(bill_amount_php))::text AS revenue
     FROM fact_billing
     WHERE billmonth = $1;`,
    [latestBm]
  );

  // Previous month aggregates
  const prevRes = await query<{
    accounts: string;
    consumption: string;
    revenue: string;
  }>(
    `SELECT
       COUNT(DISTINCT customer_id)::text AS accounts,
       ROUND(SUM(billed_volume_m3))::text AS consumption,
       ROUND(SUM(bill_amount_php))::text AS revenue
     FROM fact_billing
     WHERE billmonth = $1;`,
    [prevBm]
  );

  // NRW for latest month
  const bmMonth = billmonthMonth(latestBm);
  const bmYear = billmonthYear(latestBm);
  const nrwRes = await query<{ nrw_percentage: string }>(
    `SELECT nrw_percentage::text FROM ref_mds_monthly
     WHERE year = $1 AND month_number = $2 LIMIT 1;`,
    [bmYear, bmMonth]
  );

  const accounts = parseInt(latestRes.rows[0]?.accounts ?? '0', 10);
  const consumption = Math.round(parseFloat(latestRes.rows[0]?.consumption ?? '0'));
  const revenue = Math.round(parseFloat(latestRes.rows[0]?.revenue ?? '0'));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    totalAccounts: accounts,
    totalConsumption: consumption,
    totalRevenue: revenue,
    avgPerAccount: accounts > 0 ? Math.round((consumption / accounts) * 10) / 10 : 0,
    nrwPct: nrwRes.rows[0] ? parseFloat(parseFloat(nrwRes.rows[0].nrw_percentage).toFixed(1)) : 0,
    latestMonth: `${monthNames[bmMonth - 1]} ${bmYear}`,
    latestYear: bmYear,
    prevMonthAccounts: parseInt(prevRes.rows[0]?.accounts ?? '0', 10),
    prevMonthConsumption: Math.round(parseFloat(prevRes.rows[0]?.consumption ?? '0')),
    prevMonthRevenue: Math.round(parseFloat(prevRes.rows[0]?.revenue ?? '0')),
  };
}

// ─── Heatmap Data (for descriptive analytics) ─────────────────────────────────

interface HeatmapRow {
  zone: string;
  values: number[];
}

export async function getHeatmapData(): Promise<{ months: string[]; data: HeatmapRow[] }> {
  logger.info('[DashboardService] Fetching heatmap data...');

  // Get last 12 billmonths
  const bmsRes = await query<{ billmonth: string }>(
    'SELECT DISTINCT billmonth FROM fact_billing ORDER BY billmonth DESC LIMIT 12;'
  );
  const months = bmsRes.rows.map((r) => r.billmonth).reverse();
  const monthLabels = months.map(formatBillmonth);

  // Get consumption per zone per month
  const result = await query<{
    service_zone_name: string;
    billmonth: string;
    consumption: string;
  }>(
    `SELECT
       l.service_zone_name,
       b.billmonth,
       ROUND(SUM(b.billed_volume_m3))::text AS consumption
     FROM fact_billing b
     JOIN dim_location l ON b.location_id = l.location_id
     WHERE b.billmonth = ANY($1)
       AND l.is_virtual_zone = false
     GROUP BY l.service_zone_name, b.billmonth
     ORDER BY l.service_zone_name, b.billmonth;`,
    [months]
  );

  // Build map: zone → { billmonth → consumption }
  const zoneMap = new Map<string, Map<string, number>>();
  for (const row of result.rows) {
    if (!zoneMap.has(row.service_zone_name)) {
      zoneMap.set(row.service_zone_name, new Map());
    }
    zoneMap.get(row.service_zone_name)!.set(row.billmonth, Math.round(parseFloat(row.consumption)));
  }

  const data: HeatmapRow[] = [];
  for (const [zone, bmMap] of zoneMap) {
    data.push({
      zone: zone.replace(/^Zone 0/, 'Zone '),
      values: months.map((bm) => bmMap.get(bm) ?? 0),
    });
  }

  return { months: monthLabels, data };
}

// ─── Full Dashboard Payload ───────────────────────────────────────────────────

export interface DashboardPayload {
  kpi: DashboardKPI;
  zones: ZoneSummary[];
  annualTrend: AnnualTrend[];
  supplyDemand: SupplyDemand[];
  customerClasses: CustomerClass[];
  topAccounts: TopAccount[];
  monthlyNrw: MonthlyNrw[];
  heatmap: { months: string[]; data: HeatmapRow[] };
}

let cachedDashboard: { data: DashboardPayload; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getFullDashboard(forceRefresh = false): Promise<DashboardPayload> {
  const now = Date.now();
  if (!forceRefresh && cachedDashboard && (now - cachedDashboard.timestamp < CACHE_TTL_MS)) {
    logger.info('[DashboardService] Returning cached dashboard data');
    return cachedDashboard.data;
  }

  logger.info('[DashboardService] === Loading full dashboard from Supabase ===');

  const [kpi, zones, annualTrend, supplyDemand, customerClasses, topAccounts, monthlyNrw, heatmap] =
    await Promise.all([
      getDashboardKPI(),
      getZoneSummary(),
      getAnnualTrend(),
      getSupplyDemand(),
      getCustomerClasses(),
      getTopAccounts(),
      getMonthlyNrw(),
      getHeatmapData(),
    ]);

  logger.info('[DashboardService] === Full dashboard loaded successfully ===');

  const payload: DashboardPayload = {
    kpi,
    zones,
    annualTrend,
    supplyDemand,
    customerClasses,
    topAccounts,
    monthlyNrw,
    heatmap,
  };

  cachedDashboard = { data: payload, timestamp: now };
  return payload;
}

