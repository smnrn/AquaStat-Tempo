/**
 * @file src/types/api.ts
 * @description Shared, strictly-typed interfaces for all API request/response
 * shapes used across the AquaStat backend.
 *
 * Having a single source of truth for these types ensures the frontend contract
 * is consistent and compiler-enforced.
 */

// ─── Generic API Response Envelope ───────────────────────────────────────────

/**
 * Standard success envelope for all AquaStat API responses.
 * The frontend should always expect this shape.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  /** ISO-8601 timestamp of when the response was generated */
  timestamp: string;
  /** API version (e.g. "v1") */
  version: string;
  data: T;
  /** Optional pagination metadata */
  pagination?: PaginationMeta;
}

/**
 * Standard error envelope returned on 4xx / 5xx responses.
 */
export interface ApiErrorResponse {
  success: false;
  timestamp: string;
  version: string;
  error: {
    code: string;
    message: string;
    /** Field-level validation errors (from express-validator) */
    details?: ValidationErrorDetail[];
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

/** Common query parameters for list endpoints */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  /** ISO-8601 date string — filter records from this date */
  dateFrom?: string;
  /** ISO-8601 date string — filter records up to this date */
  dateTo?: string;
  /** Generic search term */
  search?: string;
  /** Column name to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

// ─── Billing DataMart ─────────────────────────────────────────────────────────

export interface BillingRecord {
  billingId: string;
  customerId: string;
  customerName: string;
  billingPeriodStart: string; // ISO-8601
  billingPeriodEnd: string;   // ISO-8601
  /** Volume billed in cubic metres */
  volumeBilledM3: number;
  /** Amount in local currency */
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: BillingStatus;
  dueDate: string;
  paidDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BillingStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'cancelled'
  // DB rows may come back capitalised — accept both forms
  | 'Pending'
  | 'Paid'
  | 'Overdue'
  | 'Disputed'
  | 'Cancelled';

export interface CreateBillingPayload {
  customerId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  volumeBilledM3: number;
  amountDue: number;
  currency: string;
  dueDate: string;
}

export interface BillingSummary {
  /** Total number of billing records in the period */
  totalRecords: number;
  /** Alias used by the service (same as totalRecords) */
  totalVolumeBilledM3?: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  /** Outstanding balance — available under both key names */
  totalOutstanding?: number;
  totalOutstandingBalance?: number;
  collectionRatePercentage?: number;
  currency?: string;
  statusBreakdown?: Partial<Record<string, number>>;
}

// ─── Consumption DataMart ──────────────────────────────────────────────────────

export interface ConsumptionRecord {
  consumptionId: string;
  meterId: string;
  customerId: string;
  /** ISO-8601 timestamp of the reading */
  readingTimestamp: string;
  /** Cumulative meter reading in cubic metres */
  meterReadingM3: number;
  /** Consumption delta since last reading in cubic metres */
  consumptionDeltaM3: number;
  zoneId: string;
  /** Flag raised when the reading appears anomalous */
  isAnomaly: boolean;
  anomalyScore: number | null;
  createdAt: string;
}

export interface CreateConsumptionPayload {
  meterId: string;
  customerId: string;
  readingTimestamp: string;
  meterReadingM3: number;
  zoneId: string;
}

export interface ConsumptionAggregates {
  zoneId: string;
  totalConsumptionM3: number;
  avgDailyConsumptionM3: number;
  /** Alias accepted by the service (same as avgDailyConsumptionM3) */
  avgConsumptionM3?: number;
  peakConsumptionM3: number;
  /** Minimum consumption — extra field returned by the service */
  minConsumptionM3?: number;
  anomalyCount: number;
  /** Extra count field returned by the service */
  readingCount?: number;
  periodStart: string;
  periodEnd: string;
}

// ─── Production DataMart ───────────────────────────────────────────────────────

export interface ProductionRecord {
  productionId: string;
  facilityId: string;
  facilityName: string;
  /** ISO-8601 timestamp */
  recordedAt: string;
  /** Total water produced in cubic metres */
  volumeProducedM3: number;
  /** Non-revenue water in cubic metres */
  nrwVolumeM3: number;
  /** Non-revenue water percentage */
  nrwPercentage: number;
  /** Operational efficiency (0–1) */
  efficiency: number;
  /** Energy consumed in kWh */
  energyConsumptionKwh: number;
  status: ProductionStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductionStatus = 'operational' | 'maintenance' | 'offline';

export interface CreateProductionPayload {
  facilityId: string;
  recordedAt: string;
  volumeProducedM3: number;
  nrwVolumeM3: number;
  energyConsumptionKwh: number;
  status: ProductionStatus;
}

export interface ProductionSummary {
  /** Number of distinct facilities (or total DB records when queried as such) */
  totalFacilities?: number;
  /** Raw record count returned by the summary query */
  totalRecords?: number;
  totalVolumeProducedM3: number;
  avgEfficiency: number;
  totalNrwM3?: number;
  /** Alias used by production.service */
  totalNrwVolumeM3?: number;
  avgNrwPercentage: number;
  totalEnergyKwh?: number;
  /** Alias used by production.service */
  totalEnergyConsumptionKwh?: number;
}

// ─── Analytics & Constellation Schema Types ──────────────────────────────────

/** Descriptive analytics result aggregating billing per service zone */
export interface ZoneBillingAnalytics {
  serviceZone: string;
  totalBilledAccounts: number;
  totalBilledVolumeM3: number;
  totalRevenueAmount: number;
  totalArrearsAmount: number;
  avgRevenuePerM3: number;
}

/** Pump station operational monitoring & capacity utilization */
export interface PumpMonitoringAnalytics {
  pumpId: number;
  stationCode: string;
  stationName: string;
  maintenanceStatus: string;
  ratedCapacityM3Day: number;
  reportingDays: number;
  totalWaterProducedM3: number;
  totalPowerConsumedKwh: number;
  totalOperatingHours: number;
  specificEnergyKwhPerM3: number;
  capacityUtilizationPct: number;
}

/** Non-Revenue Water (NRW) calculation & water balance evaluation */
export interface NonRevenueWaterAnalytics {
  serviceZone: string;
  barangayName: string;
  totalProducedVolumeM3: number;
  totalBilledVolumeM3: number;
  nrwVolumeM3: number;
  nrwPercentage: number;
  nrwHealthStatus: 'Normal Range' | 'Elevated Loss' | 'Critical Loss Alert' | 'No Production Data';
}

/** Machine Learning Forecast and Shortage Alert Record */
export interface MLForecastAnalytics {
  forecastFactId: string;
  timeId: number;
  serviceZone: string;
  modelName: string;
  algorithmName: string;
  predictedDemandM3: number;
  predictedShortageM3: number;
  confidenceLowerM3: number | null;
  confidenceUpperM3: number | null;
  isAlertTriggered: boolean;
  createdAt: string;
}
