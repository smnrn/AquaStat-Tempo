/**
 * @file src/routes/index.ts
 * @description Root API router — aggregates all domain routers under a single
 * versioned mount point.
 *
 * To add a new DataMart or feature module:
 *  1. Create `src/routes/<domain>.routes.ts`
 *  2. Import and mount it here.
 */

import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import billingRouter from './billing.routes';
import consumptionRouter from './consumption.routes';
import productionRouter from './production.routes';
import analyticsRouter from './analytics.routes';
import mlRouter from './ml.routes';
import weatherRouter from './weather.routes';
import dashboardRouter from './dashboard.routes';

const router = Router();

// ─── Root API index ──────────────────────────────────────────────────────────

/**
 * GET /api/v1
 * Root API metadata and endpoints directory.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'AquaStat Water Supply Forecasting & Decision Support API',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${config.apiBasePath}/${config.apiVersion}/health`,
      billing: `${config.apiBasePath}/${config.apiVersion}/billing`,
      consumption: `${config.apiBasePath}/${config.apiVersion}/consumption`,
      production: `${config.apiBasePath}/${config.apiVersion}/production`,
      analytics: `${config.apiBasePath}/${config.apiVersion}/analytics`,
      ml: `${config.apiBasePath}/${config.apiVersion}/ml`,
      weather: `${config.apiBasePath}/${config.apiVersion}/weather`,
      dashboard: `${config.apiBasePath}/${config.apiVersion}/dashboard`,
    },
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/health
 * Lightweight liveness probe for load balancers / orchestration platforms.
 */
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

// ─── DataMart & Analytics routers ─────────────────────────────────────────────

router.use('/billing',     billingRouter);
router.use('/consumption', consumptionRouter);
router.use('/production',  productionRouter);
router.use('/analytics',   analyticsRouter);
router.use('/ml',          mlRouter);
router.use('/weather',     weatherRouter);
router.use('/dashboard',   dashboardRouter);

export default router;
