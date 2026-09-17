/**
 * @file src/services/ml.service.ts
 * @description Orchestration service connecting Node.js Express to the Python ML Engine (FastAPI).
 * Queries `fact_billing` / `fact_production` in the Constellation Schema and calls the Three-Tier Analytics microservice.
 */

import axios, { AxiosError } from 'axios';
import { query } from '../database/pool';
import { logger } from '../utils/logger';
import { fetchCurrentWeather } from './weather.service';

export interface DemandPredictionRequest {
  historical_consumption: number[];
  temperature: number;
  rainfall: number;
}

export interface DemandPredictionResponse {
  status: string;
  model: string;
  forecasted_demand_m3: number;
  confidence_band_low_m3?: number;
  confidence_band_high_m3?: number;
}

export interface OptimizationScheduleResponse {
  status: string;
  data: {
    status: string;
    total_optimized_cost_php: number;
    baseline_unoptimized_cost_php: number;
    monthly_savings_php: number;
    energy_savings_percentage: number;
    total_volume_m3: number;
    schedule: Record<string, number[]>;
  };
}

export interface MCDAZoneRanking {
  zone: string;
  mcda_score: number;
  priority_rank: number;
  recommended_action: string;
  estimated_recovery_m3: number;
}

export interface FPGrowthPatternRule {
  rule_id: string;
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  insight: string;
}

export class MLService {
  private getBaseUrl(): string {
    return process.env.FASTAPI_BASE_URL ?? 'http://127.0.0.1:8001';
  }

  /**
   * Retrieves historical consumption from `fact_billing` for a specific service zone.
   */
  public async getHistoricalConsumption(zoneId: string): Promise<number[]> {
    try {
      const sql = `
        SELECT 
          COALESCE(SUM(fb.billed_volume_m3), 0)::FLOAT AS daily_volume
        FROM fact_billing fb
        JOIN dim_time dt ON fb.time_id = dt.time_id
        JOIN dim_location dl ON fb.location_id = dl.location_id
        WHERE dl.service_zone ILIKE $1 OR dl.service_zone ILIKE $2
        GROUP BY dt.full_date
        ORDER BY dt.full_date ASC
        LIMIT 30;
      `;
      const result = await query<{ daily_volume: number }>(sql, [zoneId, `%${zoneId}%`]);

      if (result.rows.length === 0) {
        logger.warn(`[ML Service] No historical consumption found for zone ${zoneId}. Using baseline.`);
        return [6120.0, 6240.0, 6380.0, 6420.0, 6500.0, 6480.0, 6610.0];
      }

      return result.rows.map(row => Number(row.daily_volume));
    } catch (error) {
      logger.error(`[ML Service] Failed to retrieve historical consumption for zone ${zoneId}`, { error });
      return [6120.0, 6240.0, 6380.0, 6420.0, 6500.0, 6480.0, 6610.0];
    }
  }

  /**
   * Fetches real-time weather telemetry for Tabaco City.
   */
  public async getCurrentWeather(): Promise<{ temperature: number; rainfall: number }> {
    try {
      const weather = await fetchCurrentWeather();
      return {
        temperature: weather.temperature,
        rainfall: weather.rainfallToday
      };
    } catch {
      return { temperature: 30.2, rainfall: 4.5 };
    }
  }

  private async callFastApi<T>(endpoint: string, method: 'GET' | 'POST' = 'POST', payload?: unknown): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    try {
      logger.info(`[ML Service] Calling FastAPI ${method} ${url}`);
      const response = method === 'POST'
        ? await axios.post<T>(url, payload, { timeout: 8000 })
        : await axios.get<T>(url, { timeout: 8000 });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error(`[ML Service] Axios Error calling ${url}`, {
          status: axiosError.response?.status,
          message: axiosError.message
        });
      }
      throw new Error('ML_SERVICE_UNAVAILABLE');
    }
  }

  public async getSarimaxForecast(zoneId: string): Promise<DemandPredictionResponse> {
    const historical_consumption = await this.getHistoricalConsumption(zoneId);
    const weather = await this.getCurrentWeather();
    return this.callFastApi<DemandPredictionResponse>('/api/predict/sarimax', 'POST', {
      historical_consumption,
      temperature: weather.temperature,
      rainfall: weather.rainfall
    });
  }

  public async getLstmForecast(zoneId: string): Promise<DemandPredictionResponse> {
    const historical_consumption = await this.getHistoricalConsumption(zoneId);
    const weather = await this.getCurrentWeather();
    return this.callFastApi<DemandPredictionResponse>('/api/predict/lstm', 'POST', {
      historical_consumption,
      temperature: weather.temperature,
      rainfall: weather.rainfall
    });
  }

  public async getProphetForecast(zoneId: string): Promise<DemandPredictionResponse> {
    const historical_consumption = await this.getHistoricalConsumption(zoneId);
    const weather = await this.getCurrentWeather();
    return this.callFastApi<DemandPredictionResponse>('/api/predict/prophet', 'POST', {
      historical_consumption,
      temperature: weather.temperature,
      rainfall: weather.rainfall
    });
  }

  public async getXGBoostForecast(zoneId: string): Promise<DemandPredictionResponse> {
    const historical_consumption = await this.getHistoricalConsumption(zoneId);
    const weather = await this.getCurrentWeather();
    return this.callFastApi<DemandPredictionResponse>('/api/predict/xgboost', 'POST', {
      historical_consumption,
      temperature: weather.temperature,
      rainfall: weather.rainfall
    });
  }

  public async getPumpScheduleOptimization(demandBlocks?: number[]): Promise<OptimizationScheduleResponse> {
    const blocks = demandBlocks ?? [5500, 6200, 5800, 4800];
    return this.callFastApi<OptimizationScheduleResponse>('/api/prescribe/pump-schedule', 'POST', {
      forecasted_demand: blocks,
      energy_cost_kwh: 8.50
    });
  }

  public async getMCDAZoneRankings(): Promise<{ status: string; rankings: MCDAZoneRanking[] }> {
    return this.callFastApi<{ status: string; rankings: MCDAZoneRanking[] }>('/api/prescribe/mcda-zone-ranking', 'POST', {});
  }

  public async getFPGrowthPatterns(): Promise<{ status: string; patterns: FPGrowthPatternRule[] }> {
    return this.callFastApi<{ status: string; patterns: FPGrowthPatternRule[] }>('/api/prescribe/fp-growth-patterns', 'GET');
  }
}

export const mlService = new MLService();

