/**
 * @file src/controllers/datamart.controller.ts
 * @description Controller handling Gold Layer Datamarts and Analytics endpoints:
 *   - GET /api/v1/water-balance
 *   - GET /api/v1/nrw-zonal
 *   - GET /api/v1/source-supply
 *   - GET /api/v1/pump-optimization
 *   - GET /api/v1/forecast
 *   - GET /api/v1/weather-correlation
 */

import { Request, Response } from 'express';
import {
  getWaterBalanceData,
  getZonalNrwData,
  getSourceSupplyData,
  getLiveForecastData,
  getWeatherCorrelationData,
} from '../services/datamart.service';
import { getPrescriptiveOptimization } from '../services/dashboard.service';
import { logger } from '../utils/logger';

export async function getWaterBalanceHandler(req: Request, res: Response): Promise<void> {
  try {
    const yearParam = req.query['year'] ? parseInt(req.query['year'] as string, 10) : undefined;
    const data = await getWaterBalanceData(yearParam);
    res.status(200).json({
      success: true,
      service: 'AquaStat Water Balance Datamart',
      count: data.length,
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getWaterBalanceHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve water balance datamart records.' });
  }
}

export async function getNrwZonalHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getZonalNrwData();
    res.status(200).json({
      success: true,
      service: 'AquaStat Zonal NRW Datamart',
      count: data.length,
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getNrwZonalHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve zonal NRW datamart records.' });
  }
}

export async function getSourceSupplyHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getSourceSupplyData();
    res.status(200).json({
      success: true,
      service: 'AquaStat Water Source Supply Datamart',
      count: data.length,
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getSourceSupplyHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve source supply datamart records.' });
  }
}

export async function getPumpOptimizationHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getPrescriptiveOptimization();
    res.status(200).json({
      success: true,
      service: 'AquaStat Prescriptive Pump Optimization',
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getPumpOptimizationHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve pump optimization schedule.' });
  }
}

export async function getForecastHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getLiveForecastData();
    res.status(200).json({
      success: true,
      service: 'AquaStat Multi-Model Time Series Forecast',
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getForecastHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve time-series forecasts.' });
  }
}

export async function getWeatherCorrelationHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getWeatherCorrelationData();
    res.status(200).json({
      success: true,
      service: 'AquaStat Weather-Demand Correlation Engine',
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[DatamartController] getWeatherCorrelationHandler failed', { error: errorMsg });
    res.status(500).json({ success: false, error: 'Failed to retrieve weather-demand correlations.' });
  }
}
