/**
 * @file src/app/services/analyticsApi.ts
 * @description Frontend API client layer for AquaStat-Tempo.
 * Communicates with backend endpoints (/api/v1/...) backed by Supabase datamarts.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  timestamp?: string;
}

export interface WaterBalanceRecord {
  timeId: number;
  year: number;
  monthNumber: number;
  monthName: string;
  seasonName: string;
  systemInputVolumeM3: number;
  billedAuthorizedConsumptionM3: number;
  unbilledAuthorizedConsumptionM3: number;
  apparentLossesM3: number;
  realLossesPhysicalM3: number;
  nrwVolumeM3: number;
  nrwPercentage: number;
  revenueWaterM3: number;
  financialImpactPhp: number;
  dataQualityConfidenceScore: number;
}

export interface NrwZonalRecord {
  locationId: number;
  zoneCode: string;
  serviceZoneName: string;
  barangayName: string;
  year: number;
  monthNumber: number;
  producedVolumeM3: number;
  billedVolumeM3: number;
  nrwVolumeM3: number;
  nrwPercentage: number;
  exceedsLwuaThreshold: boolean;
  priorityRank: number;
  activeConnectionsCount: number;
  customersInArrearsCount: number;
  collectionEfficiencyPct: number;
  estimatedFinancialLossPhp: number;
  totalRevenuePhp: number;
  trend: number[];
}

export interface SourceSupplyRecord {
  sourceId: number;
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  barangayLocation: string;
  hardwareNameplateM3Day: number;
  reportedMonthlyCapacityM3: number;
  producedVolumeM3: number;
  capacityUtilizationPct: number;
  operatingHours: number;
  powerConsumedKwh: number;
  powerCostPhp: number;
  energyEfficiencyKwhPerM3: number;
  totalDynamicHeadMeters: number;
  status: string;
}

export interface ForecastRecord {
  targetTimeId: number;
  targetMonth: string;
  sarima: number;
  lstm: number;
  prophet: number;
  xgboost: number;
  ensemble: number;
  ciLowerM3: number;
  ciUpperM3: number;
}

export interface WeatherCorrelationData {
  summary: {
    totalRecords: number;
    startDate: string;
    endDate: string;
    pearsonR: number;
    rSquared: number;
    regressionEquation: string;
    avgTempCelsius: number;
    annualRainfallMm: number;
  };
  temperatureScatter: Array<{
    date: string;
    tempCelsius: number;
    dailyDemandM3: number;
    heatIndexCelsius: number;
    condition: string;
  }>;
  rainfallDualAxis: Array<{
    month: string;
    rainfallMm: number;
    nrwPercentage: number;
    extremeRainDays: number;
    dominantCondition: string;
  }>;
}

const API_BASE = '/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to retrieve data');
  }
  return json.data;
}

export const analyticsApi = {
  getWaterBalance: (year?: number) =>
    fetchJson<WaterBalanceRecord[]>(`/water-balance${year ? `?year=${year}` : ''}`),

  getNrwZonal: () =>
    fetchJson<NrwZonalRecord[]>('/nrw-zonal'),

  getSourceSupply: () =>
    fetchJson<SourceSupplyRecord[]>('/source-supply'),

  getPumpOptimization: () =>
    fetchJson<any>('/pump-optimization'),

  getForecast: () =>
    fetchJson<{
      championModel: string;
      forecastSeries: ForecastRecord[];
      modelBenchmarks: Record<string, any>;
    }>('/forecast'),

  getWeatherCorrelation: () =>
    fetchJson<WeatherCorrelationData>('/weather-correlation'),

  getDashboard: (refresh = false) =>
    fetchJson<any>(`/dashboard${refresh ? '?refresh=true' : ''}`),
};

