/**
 * @file src/routes/dashboard.routes.ts
 * @description Route definitions for the unified dashboard data API.
 */

import { Router, RequestHandler } from 'express';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * GET /api/v1/dashboard
 * Full dashboard data — all charts, KPIs, zones in one payload.
 */
router.get('/', wrap(DashboardController.getFullDashboard));

/**
 * GET /api/v1/dashboard/zones
 * Zone summary only.
 */
router.get('/zones', wrap(DashboardController.getZones));

/**
 * GET /api/v1/dashboard/kpi
 * KPI summary only.
 */
router.get('/kpi', wrap(DashboardController.getKPI));

export default router;
