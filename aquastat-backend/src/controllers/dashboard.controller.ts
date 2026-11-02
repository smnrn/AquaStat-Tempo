/**
 * @file src/controllers/dashboard.controller.ts
 * @description Controller for the unified dashboard data endpoint.
 * Returns all dashboard data in a single response to minimize round trips.
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as DashboardService from '../services/dashboard.service';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/dashboard
 * Returns the complete dashboard payload (zones, KPIs, trends, etc.).
 */
export async function getFullDashboard(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.refresh === 'true';
    const data = await DashboardService.getFullDashboard(force);
    res.status(StatusCodes.OK).json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (err) {
    logger.error('[DashboardController] Failed to load dashboard data.', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to load dashboard data.',
    });
  }
}

/**
 * GET /api/v1/dashboard/zones
 * Returns zone summary only (lighter endpoint for zone-specific views).
 */
export async function getZones(req: Request, res: Response): Promise<void> {
  try {
    const zones = await DashboardService.getZoneSummary();
    res.status(StatusCodes.OK).json({
      success: true,
      data: zones,
    });
  } catch (err) {
    logger.error('[DashboardController] Failed to load zones.', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to load zone data.',
    });
  }
}

/**
 * GET /api/v1/dashboard/kpi
 * Returns KPI summary only.
 */
export async function getKPI(req: Request, res: Response): Promise<void> {
  try {
    const kpi = await DashboardService.getDashboardKPI();
    res.status(StatusCodes.OK).json({
      success: true,
      data: kpi,
    });
  } catch (err) {
    logger.error('[DashboardController] Failed to load KPIs.', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to load KPI data.',
    });
  }
}
