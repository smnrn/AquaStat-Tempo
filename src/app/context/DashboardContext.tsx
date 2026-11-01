/**
 * @file src/app/context/DashboardContext.tsx
 * @description Global context providing real Supabase data for the TCWD Dashboard.
 * Includes graceful fallbacks, live sync status, and manual refresh.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";

export type ZoneStatus = "normal" | "warning" | "critical";

export interface ZoneItem {
  id: number;
  name: string;
  consumption: number;
  nrw: number;
  accounts: number;
  population: number;
  status: ZoneStatus;
  trend: number[];
}

export interface AnnualTrendItem {
  year: string;
  consumption: number;
  revenue: number;
  nrw: number;
}

export interface SupplyDemandItem {
  month: string;
  supply: number;
  demand: number;
}

export interface CustomerClassItem {
  name: string;
  value: number;
  revenue: number;
  accounts: number;
  color: string;
}

export interface TopAccountItem {
  id: string;
  zone: string;
  class: string;
  monthly: number;
  bill: number;
  flag: string;
}

export interface MonthlyNrwItem {
  month: string;
  produced: number;
  billed: number;
  nrwVolume: number;
  nrwPct: number;
}

export interface DashboardKPIItem {
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

export interface HeatmapItem {
  zone: string;
  values: number[];
}

// ── DEFAULT FALLBACK DATA (guarantees UI always renders even before fetch) ──

const DEFAULT_ZONES: ZoneItem[] = [
  { id: 1,  name: "Zone 1",  consumption: 18240, nrw: 24.2, accounts: 892,  population: 4120, status: "critical", trend: [14200,15400,16100,16900,17600,18240] },
  { id: 2,  name: "Zone 2",  consumption: 22150, nrw: 27.0, accounts: 1124, population: 5280, status: "critical", trend: [18200,19400,20100,20900,21600,22150] },
  { id: 3,  name: "Zone 3",  consumption: 14320, nrw: 18.4, accounts: 698,  population: 3140, status: "warning",  trend: [13100,13400,13800,14000,14200,14320] },
  { id: 4,  name: "Zone 4",  consumption: 11840, nrw: 14.8, accounts: 582,  population: 2680, status: "normal",   trend: [11200,11400,11500,11600,11720,11840] },
  { id: 5,  name: "Zone 5",  consumption: 9420,  nrw: 16.2, accounts: 461,  population: 2100, status: "warning",  trend: [8800,9000,9100,9200,9320,9420]    },
  { id: 6,  name: "Zone 6",  consumption: 8760,  nrw: 12.4, accounts: 428,  population: 1980, status: "normal",   trend: [8400,8500,8580,8640,8700,8760]    },
  { id: 7,  name: "Zone 7",  consumption: 16480, nrw: 19.8, accounts: 802,  population: 3720, status: "warning",  trend: [14800,15200,15600,15900,16200,16480] },
  { id: 8,  name: "Zone 8",  consumption: 7840,  nrw: 11.2, accounts: 384,  population: 1760, status: "normal",   trend: [7500,7580,7640,7700,7770,7840]    },
  { id: 9,  name: "Zone 9",  consumption: 10240, nrw: 17.6, accounts: 502,  population: 2320, status: "warning",  trend: [9600,9800,9940,10040,10140,10240]  },
  { id: 10, name: "Zone 10", consumption: 6480,  nrw: 10.8, accounts: 318,  population: 1440, status: "normal",   trend: [6200,6280,6340,6400,6440,6480]    },
  { id: 11, name: "Zone 11", consumption: 8920,  nrw: 15.4, accounts: 437,  population: 2020, status: "normal",   trend: [8500,8620,8720,8800,8860,8920]    },
  { id: 12, name: "Zone 12", consumption: 5840,  nrw: 9.8,  accounts: 286,  population: 1320, status: "normal",   trend: [5600,5680,5720,5770,5810,5840]    },
  { id: 13, name: "Zone 13", consumption: 9180,  nrw: 16.8, accounts: 449,  population: 2080, status: "warning",  trend: [8700,8820,8940,9020,9100,9180]    },
  { id: 14, name: "Zone 14", consumption: 7420,  nrw: 13.2, accounts: 363,  population: 1680, status: "normal",   trend: [7100,7180,7260,7320,7380,7420]    },
  { id: 15, name: "Zone 15", consumption: 14840, nrw: 22.3, accounts: 726,  population: 3360, status: "critical", trend: [12800,13200,13600,14000,14400,14840] },
  { id: 16, name: "Zone 16", consumption: 8640,  nrw: 14.6, accounts: 423,  population: 1960, status: "normal",   trend: [8200,8320,8420,8500,8580,8640]    },
  { id: 17, name: "Zone 17", consumption: 10480, nrw: 18.9, accounts: 513,  population: 2380, status: "warning",  trend: [9800,10000,10140,10260,10380,10480] },
  { id: 18, name: "Zone 18", consumption: 6820,  nrw: 11.6, accounts: 334,  population: 1540, status: "normal",   trend: [6500,6580,6640,6700,6760,6820]    },
  { id: 19, name: "Zone 19", consumption: 9640,  nrw: 17.2, accounts: 472,  population: 2180, status: "warning",  trend: [9100,9240,9360,9460,9560,9640]    },
  { id: 20, name: "Zone 20", consumption: 11240, nrw: 20.4, accounts: 550,  population: 2540, status: "critical", trend: [10200,10480,10720,10920,11080,11240] },
  { id: 21, name: "Zone 21", consumption: 10120, nrw: 18.1, accounts: 495,  population: 2280, status: "warning",  trend: [9200,9400,9600,9800,9980,10120] },
];

const DEFAULT_ANNUAL_TREND: AnnualTrendItem[] = [
  { year: "2017", consumption: 168420, revenue: 4218000, nrw: 32.1 },
  { year: "2018", consumption: 172840, revenue: 4445000, nrw: 30.8 },
  { year: "2019", consumption: 178920, revenue: 4602000, nrw: 29.4 },
  { year: "2020", consumption: 165380, revenue: 4224000, nrw: 31.2 },
  { year: "2021", consumption: 171240, revenue: 4398000, nrw: 29.8 },
  { year: "2022", consumption: 180560, revenue: 4702000, nrw: 28.8 },
  { year: "2023", consumption: 187240, revenue: 4891000, nrw: 28.3 },
  { year: "2024", consumption: 190120, revenue: 5042000, nrw: 28.1 },
  { year: "2025", consumption: 193748, revenue: 5249087, nrw: 28.0 },
];

const DEFAULT_CUSTOMER_CLASS: CustomerClassItem[] = [
  { name: "Residential",     value: 112840, revenue: 3482000, accounts: 8240, color: "#0038A8" },
  { name: "Commercial",      value: 10680,  revenue: 621000,  accounts: 680,  color: "#0284C7" },
  { name: "Government",      value: 11200,  revenue: 784000,  accounts: 220,  color: "#10B981" },
  { name: "Semi-Commercial", value: 4779,   revenue: 298000,  accounts: 860,  color: "#F59E0B" },
];

const DEFAULT_TOP_ACCOUNTS: TopAccountItem[] = [
  { id: "ACC-00023", zone: "Zone 2", class: "Government",    monthly: 2840, bill: 168420, flag: "82% above gov avg — Flag for audit" },
  { id: "ACC-00487", zone: "Zone 1", class: "Commercial",    monthly: 2210, bill: 132600, flag: "High-density commercial complex"    },
  { id: "ACC-01094", zone: "Zone 7", class: "Commercial",    monthly: 1980, bill: 118800, flag: "Consistent above-baseline trend"    },
  { id: "ACC-00318", zone: "Zone 15",class: "Residential",   monthly: 1740, bill: 104400, flag: "Suspected sub-metering violation"   },
  { id: "ACC-00762", zone: "Zone 3", class: "Semi-Commercial",monthly:1520, bill: 91200,  flag: "Seasonal irrigation spike"          },
];

const DEFAULT_KPI: DashboardKPIItem = {
  totalAccounts: 19702,
  totalConsumption: 384777,
  totalRevenue: 12768220,
  avgPerAccount: 19.5,
  nrwPct: 17.4,
  latestMonth: "December 2025",
  latestYear: 2025,
  prevMonthAccounts: 18453,
  prevMonthConsumption: 358173,
  prevMonthRevenue: 9633724,
};

const DEFAULT_HEATMAP_MONTHS = ["Oct '24","Nov '24","Dec '24","Jan '25","Feb '25","Mar '25","Apr '25","May '25","Jun '25","Jul '25","Aug '25","Sep '25"];

export interface ForecastDataPoint {
  month: string;
  actual?: number;
  sarima?: number;
  lstm?: number;
  prophet?: number;
  xgboost?: number;
  ensemble?: number;
  ci_low?: number;
  ci_high?: number;
}

export interface ModelMetric {
  name: string;
  rmse: string;
  mape: string;
  mae: string;
  r2: string;
  trainTestSplit: string;
  trainingSamples: number;
  testSamples: number;
  regressors: string[];
  status: string;
  note: string;
  isBest: boolean;
}

export interface SpikePrediction {
  month: string;
  zone: string;
  volume: number;
  spike: number;
  confidence: string;
  risk: ZoneStatus;
  action: string;
}

export interface FeatureImportance {
  feature: string;
  weight: number;
  description: string;
}

export interface PredictiveAnalyticsPayload {
  models: string[];
  recommendedModel: string;
  forecastData: ForecastDataPoint[];
  modelMetrics: Record<string, ModelMetric>;
  spikePredictions: SpikePrediction[];
  featureImportance: FeatureImportance[];
}

const DEFAULT_PREDICTIVE: PredictiveAnalyticsPayload = {
  models: ["Multivariate LSTM", "SARIMA", "Meta Prophet", "XGBoost Regressor", "Ensemble Model"],
  recommendedModel: "Multivariate LSTM",
  forecastData: [
    { month: "Jan '24", actual: 168240 },
    { month: "Apr '24", actual: 174480 },
    { month: "Jul '24", actual: 181920 },
    { month: "Oct '24", actual: 185640 },
    { month: "Jan '25", actual: 175480 },
    { month: "Apr '25", actual: 178420 },
    { month: "Jul '25", actual: 190340 },
    { month: "Sep '25", actual: 193748 },
    { month: "Oct '25", actual: 195200 },
    { month: "Nov '25", actual: 196800 },
    { month: "Dec '25", actual: 197020 },
    { month: "Jan '26", sarima: 198200, lstm: 201800, prophet: 199400, xgboost: 200500, ensemble: 201100, ci_low: 193200, ci_high: 210400 },
    { month: "Feb '26", sarima: 204500, lstm: 210400, prophet: 206100, xgboost: 208900, ensemble: 209800, ci_low: 199800, ci_high: 221000 },
    { month: "Mar '26", sarima: 211000, lstm: 218600, prophet: 213500, xgboost: 216200, ensemble: 217400, ci_low: 207200, ci_high: 230000 },
    { month: "Apr '26", sarima: 214200, lstm: 222800, prophet: 216800, xgboost: 220100, ensemble: 221400, ci_low: 210400, ci_high: 235200 },
    { month: "May '26", sarima: 208900, lstm: 216400, prophet: 211200, xgboost: 214000, ensemble: 215100, ci_low: 204000, ci_high: 228800 },
    { month: "Jun '26", sarima: 202100, lstm: 210800, prophet: 204900, xgboost: 208500, ensemble: 209200, ci_low: 198500, ci_high: 223100 },
  ],
  modelMetrics: {
    "Multivariate LSTM": {
      name: "Multivariate LSTM",
      rmse: "4,521 m³",
      mape: "3.24%",
      mae: "3,876 m³",
      r2: "0.962",
      trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
      trainingSamples: 76,
      testSamples: 32,
      regressors: ["Historical Demand (m³)", "PAGASA Max Temp (°C)", "PAGASA Rainfall (mm)", "Active Connections"],
      status: "Recommended Operational Model",
      note: "Superior capturing of non-linear dry season demand surge (+22% above baseline).",
      isBest: true,
    },
    "SARIMA": {
      name: "SARIMA",
      rmse: "4,890 m³",
      mape: "4.12%",
      mae: "4,120 m³",
      r2: "0.928",
      trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
      trainingSamples: 76,
      testSamples: 32,
      regressors: ["Billed Volume Lag (t-1)", "Seasonal Autoregressive (s=12)", "First-order Differencing (d=1)"],
      status: "Statistical Baseline",
      note: "High seasonal stability; underestimates sudden anomalous heatwaves.",
      isBest: false,
    },
    "Meta Prophet": {
      name: "Meta Prophet",
      rmse: "4,720 m³",
      mape: "3.85%",
      mae: "4,010 m³",
      r2: "0.941",
      trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
      trainingSamples: 76,
      testSamples: 32,
      regressors: ["Piecewise Linear Growth", "Annual Fourier Terms", "PAGASA Weather Regressors"],
      status: "Decomposable Bayesian",
      note: "Robust against missing observations and sudden changepoints.",
      isBest: false,
    },
    "XGBoost Regressor": {
      name: "XGBoost Regressor",
      rmse: "4,610 m³",
      mape: "3.50%",
      mae: "3,940 m³",
      r2: "0.955",
      trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
      trainingSamples: 76,
      testSamples: 32,
      regressors: ["Rolling Demand Lags (t-1..t-6)", "Temperature Index", "Precipitation Deficit"],
      status: "Gradient Boosted Trees",
      note: "Strong feature interaction; used as residual correction tier in hybrid pipeline.",
      isBest: false,
    },
    "Ensemble Model": {
      name: "Ensemble Model",
      rmse: "4,410 m³",
      mape: "3.10%",
      mae: "3,750 m³",
      r2: "0.971",
      trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
      trainingSamples: 76,
      testSamples: 32,
      regressors: ["Stacked Meta-Regressor (SARIMA + LSTM + XGBoost)"],
      status: "Stacking Meta-Learner",
      note: "Combines linear seasonal baseline with deep recurrent non-linear correction.",
      isBest: false,
    },
  },
  spikePredictions: [
    { month: "February 2026", zone: "Zone 1",  volume: 22480, spike: 28.4, confidence: "94.2%", risk: "critical", action: "Initiate off-peak booster pumping; alert TCWD maintenance" },
    { month: "March 2026",    zone: "Zone 15", volume: 19840, spike: 33.7, confidence: "91.8%", risk: "critical", action: "Dry season early rationing protocol; reservoir buffer activation" },
    { month: "April 2026",    zone: "Zone 2",  volume: 24120, spike: 21.6, confidence: "88.4%", risk: "critical", action: "Pressure management at Station 2; meter audit for illegal bypass" },
    { month: "February 2026", zone: "Zone 7",  volume: 17240, spike: 16.8, confidence: "85.1%", risk: "warning",  action: "Monitor commercial high-draw accounts; verify night flow" },
    { month: "March 2026",    zone: "Zone 9",  volume: 12840, spike: 14.2, confidence: "82.6%", risk: "warning",  action: "Pre-emptive valve regulation during afternoon peak" },
    { month: "April 2026",    zone: "Zone 17", volume: 13480, spike: 11.4, confidence: "79.3%", risk: "warning",  action: "Scheduled water tank replenishment schedule" },
    { month: "May 2026",      zone: "Zone 20", volume: 14210, spike: 18.9, confidence: "90.5%", risk: "critical", action: "High elevation distribution priority; activate mobile tanker backup" },
  ],
  featureImportance: [
    { feature: "Historical Consumption (Billed Volume m³)", weight: 46, description: "Autoregressive memory capturing consumption inertia across billing cycles." },
    { feature: "PAGASA Max Temperature (°C)", weight: 28, description: "Strong positive correlation (r = +0.72) driving domestic cooling and garden irrigation." },
    { feature: "PAGASA Rainfall Precipitation (mm)", weight: 16, description: "Negative correlation reducing treated water demand during monsoonal deluges." },
    { feature: "Active Consumer Connections", weight: 10, description: "Demographic expansion indicator reflecting newly energized meters." },
  ],
};

export interface FacilityScheduleBlock {
  blockId: string;
  blockLabel: string;
  tariffPeriod: string;
  tariffRatePhpPerKwh: number;
  currentHours: number;
  optimizedHours: number;
  currentCostPhp: number;
  optimizedCostPhp: number;
  savingsPct: number;
  dispatchedVolumeM3: number;
}

export interface FacilityScheduleRow {
  id: string;
  name: string;
  station: string;
  type: 'Spring (Gravity)' | 'Deep Well (Submersible)';
  capacityM3PerDay: number;
  energyKwhPerM3: number;
  blocks: FacilityScheduleBlock[];
  totalCurrentCostPhp: number;
  totalOptimizedCostPhp: number;
  totalSavingsPhp: number;
}

export interface MCDAZoneRow {
  rank: number;
  zone: string;
  topsisScore: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  nrwPct: number;
  deficitM3: number;
  populationDensity: number;
  pipeAgeYears: number;
  revenueLossPhp: number;
  rationedHours: number;
  recommendedAction: string;
  estimatedRecoveryM3: number;
  tankerPriority: number;
}

export interface FPGrowthRule {
  ruleId: string;
  antecedents: string[];
  consequents: string[];
  support: string;
  confidence: string;
  lift: string;
  insight: string;
}

export interface TariffBlock {
  blockId: string;
  blockName: string;
  timeRange: string;
  ratePhpPerKwh: number;
  classification: 'Off-Peak' | 'Standard' | 'Peak';
  strategyDirective: string;
}

export interface PrescriptiveOptimizationPayload {
  lpProblemSummary: {
    objectiveFunction: string;
    solverEngine: string;
    iterationCount: number;
    solveTimeSeconds: number;
    status: 'OPTIMAL' | 'INFEASIBLE';
    baselineMonthlyCostPhp: number;
    optimizedMonthlyCostPhp: number;
    monthlySavingsPhp: number;
    savingsPercentage: number;
    peakTariffKwhShaved: number;
    hydraulicReliabilityPct: number;
  };
  tariffs: TariffBlock[];
  facilities: FacilityScheduleRow[];
  mcdaPrioritization: MCDAZoneRow[];
  fpGrowthRules: FPGrowthRule[];
}

const DEFAULT_PRESCRIPTIVE: PrescriptiveOptimizationPayload = {
  lpProblemSummary: {
    objectiveFunction: 'Minimize C_total = Σ Σ (EnergyCost_s,t + Maint_s) · X_s,t',
    solverEngine: 'COIN-OR Branch & Cut (CBC) / PuLP LP Engine',
    iterationCount: 48,
    solveTimeSeconds: 0.084,
    status: 'OPTIMAL',
    baselineMonthlyCostPhp: 3248600,
    optimizedMonthlyCostPhp: 2736120,
    monthlySavingsPhp: 512480,
    savingsPercentage: 15.77,
    peakTariffKwhShaved: 4850,
    hydraulicReliabilityPct: 99.4,
  },
  tariffs: [
    { blockId: 'B1', blockName: 'Night Off-Peak', timeRange: '22:00 – 06:00 (8h)', ratePhpPerKwh: 6.20, classification: 'Off-Peak', strategyDirective: 'Maximize pumping into elevated storage reservoirs at lowest electricity tariff.' },
    { blockId: 'B2', blockName: 'Morning Standard', timeRange: '06:00 – 12:00 (6h)', ratePhpPerKwh: 8.50, classification: 'Standard', strategyDirective: 'Operate gravity springs at 100% capacity; modulate booster pumps according to real-time DMA pressure.' },
    { blockId: 'B3', blockName: 'Afternoon Standard', timeRange: '12:00 – 18:00 (6h)', ratePhpPerKwh: 8.50, classification: 'Standard', strategyDirective: 'Sustain distribution flow; prepare elevated reservoirs for evening peak demand.' },
    { blockId: 'B4', blockName: 'Evening Peak Tariff', timeRange: '18:00 – 22:00 (4h)', ratePhpPerKwh: 11.80, classification: 'Peak', strategyDirective: 'Peak shaving: Throttle high-kWh deep wells; supply predominantly via gravity springs and pre-filled storage.' }
  ],
  facilities: [
    {
      id: 'PS-MAIN-01', name: 'San Vicente Main Pumping Station (Deep Well)', station: 'Main Pump Station', type: 'Deep Well (Submersible)', capacityM3PerDay: 6000, energyKwhPerM3: 0.38,
      blocks: [
        { blockId: 'B1', blockLabel: 'Night (22:00-06:00)', tariffPeriod: 'Off-Peak', tariffRatePhpPerKwh: 6.20, currentHours: 5.5, optimizedHours: 5.8, currentCostPhp: 248000, optimizedCostPhp: 261500, savingsPct: -5.4, dispatchedVolumeM3: 2900 },
        { blockId: 'B2', blockLabel: 'Morning (06:00-12:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 5.8, optimizedHours: 4.8, currentCostPhp: 358000, optimizedCostPhp: 296300, savingsPct: 17.2, dispatchedVolumeM3: 2400 },
        { blockId: 'B3', blockLabel: 'Afternoon (12:00-18:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 5.2, optimizedHours: 4.5, currentCostPhp: 321000, optimizedCostPhp: 277800, savingsPct: 13.5, dispatchedVolumeM3: 2250 },
        { blockId: 'B4', blockLabel: 'Evening Peak (18:00-22:00)', tariffPeriod: 'Peak', tariffRatePhpPerKwh: 11.80, currentHours: 4.0, optimizedHours: 2.2, currentCostPhp: 344000, optimizedCostPhp: 189200, savingsPct: 45.0, dispatchedVolumeM3: 1100 }
      ],
      totalCurrentCostPhp: 1271000, totalOptimizedCostPhp: 1024800, totalSavingsPhp: 246200
    },
    {
      id: 'PS-BOOSTER-A', name: 'Booster Station A — Panal Intermediate', station: 'Booster Station A', type: 'Deep Well (Submersible)', capacityM3PerDay: 4500, energyKwhPerM3: 0.44,
      blocks: [
        { blockId: 'B1', blockLabel: 'Night (22:00-06:00)', tariffPeriod: 'Off-Peak', tariffRatePhpPerKwh: 6.20, currentHours: 4.8, optimizedHours: 5.6, currentCostPhp: 188000, optimizedCostPhp: 219300, savingsPct: -16.6, dispatchedVolumeM3: 2100 },
        { blockId: 'B2', blockLabel: 'Morning (06:00-12:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 5.5, optimizedHours: 4.4, currentCostPhp: 295000, optimizedCostPhp: 236000, savingsPct: 20.0, dispatchedVolumeM3: 1650 },
        { blockId: 'B3', blockLabel: 'Afternoon (12:00-18:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 5.0, optimizedHours: 4.2, currentCostPhp: 268000, optimizedCostPhp: 225100, savingsPct: 16.0, dispatchedVolumeM3: 1575 },
        { blockId: 'B4', blockLabel: 'Evening Peak (18:00-22:00)', tariffPeriod: 'Peak', tariffRatePhpPerKwh: 11.80, currentHours: 3.8, optimizedHours: 2.0, currentCostPhp: 283000, optimizedCostPhp: 148900, savingsPct: 47.4, dispatchedVolumeM3: 750 }
      ],
      totalCurrentCostPhp: 1034000, totalOptimizedCostPhp: 829300, totalSavingsPhp: 204700
    },
    {
      id: 'PS-BOOSTER-B', name: 'Booster Station B — Buang High-Elevation', station: 'Booster Station B', type: 'Deep Well (Submersible)', capacityM3PerDay: 3200, energyKwhPerM3: 0.52,
      blocks: [
        { blockId: 'B1', blockLabel: 'Night (22:00-06:00)', tariffPeriod: 'Off-Peak', tariffRatePhpPerKwh: 6.20, currentHours: 4.2, optimizedHours: 5.0, currentCostPhp: 164000, optimizedCostPhp: 195200, savingsPct: -19.0, dispatchedVolumeM3: 1600 },
        { blockId: 'B2', blockLabel: 'Morning (06:00-12:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 5.2, optimizedHours: 4.0, currentCostPhp: 278000, optimizedCostPhp: 213800, savingsPct: 23.1, dispatchedVolumeM3: 1280 },
        { blockId: 'B3', blockLabel: 'Afternoon (12:00-18:00)', tariffPeriod: 'Standard', tariffRatePhpPerKwh: 8.50, currentHours: 4.8, optimizedHours: 3.8, currentCostPhp: 256000, optimizedCostPhp: 203100, savingsPct: 20.8, dispatchedVolumeM3: 1216 },
        { blockId: 'B4', blockLabel: 'Evening Peak (18:00-22:00)', tariffPeriod: 'Peak', tariffRatePhpPerKwh: 11.80, currentHours: 3.5, optimizedHours: 1.8, currentCostPhp: 245600, optimizedCostPhp: 126300, savingsPct: 48.6, dispatchedVolumeM3: 576 }
      ],
      totalCurrentCostPhp: 943600, totalOptimizedCostPhp: 738400, totalSavingsPhp: 205200
    }
  ],
  mcdaPrioritization: [
    { rank: 1, zone: 'Zone 2 (Panal / Poblacion)',  topsisScore: 0.8420, priorityLevel: 'CRITICAL', nrwPct: 27.0, deficitM3: 4120, populationDensity: 5280, pipeAgeYears: 32, revenueLossPhp: 248000, rationedHours: 8,  recommendedAction: 'Immediate pipe replacement & active sector pressure step-down (PRV-02)', estimatedRecoveryM3: 2678, tankerPriority: 1 },
    { rank: 2, zone: 'Zone 1 (Tabaco Center)',     topsisScore: 0.7810, priorityLevel: 'CRITICAL', nrwPct: 24.2, deficitM3: 3840, populationDensity: 4120, pipeAgeYears: 28, revenueLossPhp: 184000, rationedHours: 10, recommendedAction: 'Pre-charge elevated booster storage & throttle commercial valves', estimatedRecoveryM3: 2496, tankerPriority: 2 },
    { rank: 3, zone: 'Zone 15 (Sto. Cristo)',      topsisScore: 0.6890, priorityLevel: 'HIGH',     nrwPct: 22.3, deficitM3: 3280, populationDensity: 3360, pipeAgeYears: 30, revenueLossPhp: 196000, rationedHours: 12, recommendedAction: 'DMA flow acoustic leak sweep & auxiliary well pre-commissioning', estimatedRecoveryM3: 2132, tankerPriority: 3 },
    { rank: 4, zone: 'Zone 7 (Sagrada)',           topsisScore: 0.5420, priorityLevel: 'HIGH',     nrwPct: 19.8, deficitM3: 2640, populationDensity: 3720, pipeAgeYears: 26, revenueLossPhp: 142000, rationedHours: 14, recommendedAction: 'Acoustic leak sweep & valve packing replacement', estimatedRecoveryM3: 1716, tankerPriority: 4 },
    { rank: 5, zone: 'Zone 20 (Fatima)',           topsisScore: 0.4180, priorityLevel: 'MEDIUM',   nrwPct: 20.4, deficitM3: 2180, populationDensity: 2540, pipeAgeYears: 24, revenueLossPhp: 115000, rationedHours: 16, recommendedAction: 'Routine preventative maintenance & AMR meter calibration', estimatedRecoveryM3: 1417, tankerPriority: 5 },
    { rank: 6, zone: 'Zone 3 (Magallanes)',        topsisScore: 0.2640, priorityLevel: 'LOW',      nrwPct: 18.4, deficitM3: 1420, populationDensity: 3140, pipeAgeYears: 22, revenueLossPhp: 84000,  rationedHours: 24, recommendedAction: 'Normal baseline 24-hour continuous supply maintained', estimatedRecoveryM3: 923,  tankerPriority: 6 },
  ],
  fpGrowthRules: [
    { ruleId: 'FP-01', antecedents: ['Heat Index > 38°C', 'Peak Midday Hour (12:00-14:00)'], consequents: ['Demand Spike > +25%', 'Booster Station A Suction Pressure Drop'], support: '42.0%', confidence: '88.0%', lift: '2.10x', insight: 'Elevated ambient heat index during peak midday hours reliably triggers suction pressure drops at Booster Station A due to concurrent commercial cooling and domestic showering.' },
    { ruleId: 'FP-02', antecedents: ['Rainfall > 80 mm / 24h', 'Amihan Monsoon Season'], consequents: ['Raw Water Turbidity Spike', 'Unbilled Storm Infiltration NRW'], support: '35.0%', confidence: '82.0%', lift: '2.34x', insight: 'Intense tropical rainfall correlates with main pipeline storm infiltration in low-elevation sector 15-C, causing backflow pressure and billing variance.' },
    { ruleId: 'FP-03', antecedents: ['Minimum Night Flow > 180%', 'Off-Peak Tariff Window (01:00-04:00)'], consequents: ['Hidden Trunk Line Burst', 'Zone NRW > 25%'], support: '28.0%', confidence: '79.0%', lift: '2.82x', insight: 'Excessive night flow between 01:00 and 04:00 reliably flags undetected underground transmission ruptures along Panal and Sto. Cristo distribution mains.' },
    { ruleId: 'FP-04', antecedents: ['Pump Efficiency < 75%', 'Operating Hours > 22h / day'], consequents: ['Specific Energy > 0.55 kWh/m³', 'Motor Thermodynamic Overheating'], support: '24.0%', confidence: '74.0%', lift: '1.95x', insight: 'Continuous unoptimized pumping beyond allowable thermal duty cycles leads to accelerated thermodynamic degradation and elevated power tariffs.' }
  ]
};

export interface DashboardContextValue {
  kpi: DashboardKPIItem;
  zones: ZoneItem[];
  top10Zones: ZoneItem[];
  annualTrend: AnnualTrendItem[];
  supplyDemand: SupplyDemandItem[];
  customerClasses: CustomerClassItem[];
  topAccounts: TopAccountItem[];
  monthlyNrw: MonthlyNrwItem[];
  heatmapData: HeatmapItem[];
  heatmapMonths: string[];
  predictive: PredictiveAnalyticsPayload;
  prescriptive: PrescriptiveOptimizationPayload;
  isLive: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [kpi, setKpi] = useState<DashboardKPIItem>(DEFAULT_KPI);
  const [zones, setZones] = useState<ZoneItem[]>(DEFAULT_ZONES);
  const [annualTrend, setAnnualTrend] = useState<AnnualTrendItem[]>(DEFAULT_ANNUAL_TREND);
  const [supplyDemand, setSupplyDemand] = useState<SupplyDemandItem[]>([]);
  const [customerClasses, setCustomerClasses] = useState<CustomerClassItem[]>(DEFAULT_CUSTOMER_CLASS);
  const [topAccounts, setTopAccounts] = useState<TopAccountItem[]>(DEFAULT_TOP_ACCOUNTS);
  const [monthlyNrw, setMonthlyNrw] = useState<MonthlyNrwItem[]>([]);
  const [heatmapMonths, setHeatmapMonths] = useState<string[]>(DEFAULT_HEATMAP_MONTHS);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [predictive, setPredictive] = useState<PredictiveAnalyticsPayload>(DEFAULT_PREDICTIVE);
  const [prescriptive, setPrescriptive] = useState<PrescriptiveOptimizationPayload>(DEFAULT_PRESCRIPTIVE);

  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = force ? "/api/v1/dashboard?refresh=true" : "/api/v1/dashboard";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard data (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        if (data.kpi) setKpi(data.kpi);
        if (data.zones && data.zones.length > 0) setZones(data.zones);
        if (data.annualTrend && data.annualTrend.length > 0) setAnnualTrend(data.annualTrend);
        if (data.supplyDemand && data.supplyDemand.length > 0) setSupplyDemand(data.supplyDemand);
        if (data.customerClasses && data.customerClasses.length > 0) setCustomerClasses(data.customerClasses);
        if (data.topAccounts && data.topAccounts.length > 0) setTopAccounts(data.topAccounts);
        if (data.monthlyNrw && data.monthlyNrw.length > 0) setMonthlyNrw(data.monthlyNrw);
        if (data.predictive) setPredictive(data.predictive);
        if (data.prescriptive) setPrescriptive(data.prescriptive);
        if (data.heatmap) {
          if (data.heatmap.months && data.heatmap.months.length > 0) setHeatmapMonths(data.heatmap.months);
          if (data.heatmap.data && data.heatmap.data.length > 0) setHeatmapData(data.heatmap.data);
        }
        setIsLive(true);
        setLastUpdated(new Date());
        if (force) {
          toast.success("Live data refreshed from Supabase!", {
            description: `Loaded ${data.zones?.length ?? 0} zones · Latest: ${data.kpi?.latestMonth ?? "Dec 2025"}`,
          });
        }
      }
    } catch (err) {
      console.warn("[DashboardContext] Using local data fallback:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      if (force) {
        toast.error("Could not sync with Supabase", {
          description: "Using offline cached data.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const top10Zones = [...zones].sort((a, b) => b.consumption - a.consumption).slice(0, 10);

  // Fallback heatmap data if not loaded from API
  const effectiveHeatmapData = heatmapData.length > 0 ? heatmapData : zones.map(z => ({
    zone: `Zone ${String(z.id).padStart(2, "0")}`,
    values: heatmapMonths.map((_, i) => Math.round(z.consumption * (0.82 + (i / heatmapMonths.length) * 0.2 + (Math.sin(i * 0.5) * 0.05)))),
  }));

  const value: DashboardContextValue = {
    kpi,
    zones,
    top10Zones,
    annualTrend,
    supplyDemand,
    customerClasses,
    topAccounts,
    monthlyNrw,
    heatmapData: effectiveHeatmapData,
    heatmapMonths,
    predictive,
    prescriptive,
    isLive,
    loading,
    error,
    refresh: () => fetchDashboardData(true),
    lastUpdated,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
