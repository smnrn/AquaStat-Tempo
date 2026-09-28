/**
 * @file src/controllers/analytics.controller.ts
 * @description HTTP handlers for the AquaStat Analytics & Decision Support API.
 *
 * Exposes endpoints for:
 *  - Zone-level descriptive billing analytics
 *  - Pump station operational monitoring
 *  - Non-Revenue Water (NRW) mass balance calculation
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as AnalyticsService from '../services/analytics.service';
import { sendSuccess } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';

// ─── GET /api/v1/analytics/billing-summary ───────────────────────────────────

/**
 * Aggregates total billed volume, revenue, and arrears per service zone
 * for a specific month and year.
 *
 * Query params:
 *  - month (1-12)
 *  - year  (e.g., 2026)
 */
export async function getZoneBillingSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(
        'Validation failed for billing analytics query parameters.',
        StatusCodes.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR'
      );
    }

    const month = Number.parseInt(req.query['month'] as string, 10);
    const year = Number.parseInt(req.query['year'] as string, 10);

    const data = await AnalyticsService.getZoneBillingAnalytics(month, year);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/analytics/pump-monitoring ───────────────────────────────────

/**
 * Retrieves total water produced, power consumed, and capacity utilization
 * for each pump station over a date range.
 *
 * Query params:
 *  - dateFrom (YYYY-MM-DD)
 *  - dateTo   (YYYY-MM-DD)
 */
export async function getPumpMonitoring(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(
        'Validation failed for pump monitoring query parameters.',
        StatusCodes.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR'
      );
    }

    const dateFrom = req.query['dateFrom'] as string;
    const dateTo = req.query['dateTo'] as string;

    const data = await AnalyticsService.getPumpMonitoringAnalytics(dateFrom, dateTo);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/analytics/nrw ───────────────────────────────────────────────

/**
 * Calculates Non-Revenue Water (NRW) for a target service zone over a date range.
 *
 * Query params:
 *  - serviceZone (e.g. 'Zone 1 - North District')
 *  - dateFrom    (YYYY-MM-DD)
 *  - dateTo      (YYYY-MM-DD)
 */
export async function getNonRevenueWater(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(
        'Validation failed for NRW calculation query parameters.',
        StatusCodes.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR'
      );
    }

    const serviceZone = req.query['serviceZone'] as string;
    const dateFrom = req.query['dateFrom'] as string;
    const dateTo = req.query['dateTo'] as string;

    const data = await AnalyticsService.calculateServiceZoneNRW(serviceZone, dateFrom, dateTo);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
