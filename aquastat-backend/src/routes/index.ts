/**
 * @file src/routes/index.ts
 * @description Root API router — aggregates all domain routers and Gold Layer DataMarts
 * under a unified versioned mount point (/api/v1).
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { config } from '../config/env';
import billingRouter from './billing.routes';
import consumptionRouter from './consumption.routes';
import productionRouter from './production.routes';
import analyticsRouter from './analytics.routes';
import mlRouter from './ml.routes';
import weatherRouter from './weather.routes';
import dashboardRouter from './dashboard.routes';
import {
  getWaterBalanceHandler,
  getNrwZonalHandler,
  getSourceSupplyHandler,
  getPumpOptimizationHandler,
  getForecastHandler,
  getWeatherCorrelationHandler,
} from '../controllers/datamart.controller';

const router = Router();

// Helper to safely wrap async route handlers
function wrap(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

// ─── Root API index ──────────────────────────────────────────────────────────

/**
 * GET /api/v1
 * Root API metadata and conformed endpoints directory.
 */
router.get('/', (_req: Request, res: Response) => {
  const base = `${config.apiBasePath}/${config.apiVersion}`;
  res.json({
    success: true,
    service: 'AquaStat Water Supply Forecasting & Decision Support API',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${base}/health`,
      dashboard: `${base}/dashboard`,
      waterBalance: `${base}/water-balance`,
      nrwZonal: `${base}/nrw-zonal`,
      sourceSupply: `${base}/source-supply`,
      pumpOptimization: `${base}/pump-optimization`,
      forecast: `${base}/forecast`,
      weatherCorrelation: `${base}/weather-correlation`,
      billing: `${base}/billing`,
      consumption: `${base}/consumption`,
      production: `${base}/production`,
      analytics: `${base}/analytics`,
      ml: `${base}/ml`,
      weather: `${base}/weather`,
    },
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
});

// ─── Gold Layer DataMarts & Analytics Endpoints ───────────────────────────────

// 1. Water Balance & Zonal NRW (direct from public.dm_water_balance_datamart)
router.get('/water-balance', wrap(getWaterBalanceHandler));
router.get('/nrw-zonal', wrap(getNrwZonalHandler));

// 2. Source Supply & Prescriptive Pump Optimization (from dm_source_supply_datamart & analytics_prescriptive_output)
router.get('/source-supply', wrap(getSourceSupplyHandler));
router.get('/pump-optimization', wrap(getPumpOptimizationHandler));

// 3. Multi-Model Time Series Forecast (from public.analytics_forecast_output)
router.get('/forecast', wrap(getForecastHandler));

// 4. Weather-Demand Correlation Engine (from public.dim_weather & dm_water_balance_datamart)
router.get('/weather-correlation', wrap(getWeatherCorrelationHandler));

// ─── Existing Module Routers ───────────────────────────────────────────────────

router.use('/billing',     billingRouter);
router.use('/consumption', consumptionRouter);
router.use('/production',  productionRouter);
router.use('/analytics',   analyticsRouter);
router.use('/ml',          mlRouter);
router.use('/weather',     weatherRouter);
router.use('/dashboard',   dashboardRouter);

export default router;
