/**
 * @file src/routes/analytics.routes.ts
 * @description Route definitions & input validations for AquaStat Decision Support Analytics.
 */

import { Router, RequestHandler } from 'express';
import { query } from 'express-validator';
import * as AnalyticsController from '../controllers/analytics.controller';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// ─── Validations ─────────────────────────────────────────────────────────────

const billingAnalyticsValidation = [
  query('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('month must be an integer between 1 and 12.'),
  query('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('year must be a valid 4-digit year (>= 2000).'),
];

const pumpMonitoringValidation = [
  query('dateFrom')
    .isISO8601()
    .withMessage('dateFrom must be an ISO-8601 date (YYYY-MM-DD).'),
  query('dateTo')
    .isISO8601()
    .withMessage('dateTo must be an ISO-8601 date (YYYY-MM-DD).'),
];

const nrwCalculationValidation = [
  query('serviceZone')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('serviceZone is required.'),
  query('dateFrom')
    .isISO8601()
    .withMessage('dateFrom must be an ISO-8601 date (YYYY-MM-DD).'),
  query('dateTo')
    .isISO8601()
    .withMessage('dateTo must be an ISO-8601 date (YYYY-MM-DD).'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/analytics/billing-summary?month=8&year=2026
 * Zone-level descriptive billing analytics (volume, revenue, arrears).
 */
router.get(
  '/billing-summary',
  billingAnalyticsValidation,
  wrap(AnalyticsController.getZoneBillingSummary)
);

/**
 * GET /api/v1/analytics/pump-monitoring?dateFrom=2026-08-01&dateTo=2026-08-25
 * Pump station operational monitoring, output volume, power consumption & specific energy.
 */
router.get(
  '/pump-monitoring',
  pumpMonitoringValidation,
  wrap(AnalyticsController.getPumpMonitoring)
);

/**
 * GET /api/v1/analytics/nrw?serviceZone=Zone+1+-+North+District&dateFrom=2026-08-01&dateTo=2026-08-25
 * Multi-Fact Non-Revenue Water (NRW) mass balance calculation.
 */
router.get(
  '/nrw',
  nrwCalculationValidation,
  wrap(AnalyticsController.getNonRevenueWater)
);

export default router;
