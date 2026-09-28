/**
 * @file src/controllers/production.controller.ts
 * @description HTTP handlers for the Production DataMart.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as ProductionService from '../services/production.service';
import { sendSuccess, parsePagination } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';
import { CreateProductionPayload, ProductionStatus } from '../types/api';

// ─── GET /api/v1/production ───────────────────────────────────────────────────

/**
 * List production records with optional filters.
 *
 * Query params:
 *  - page, limit
 *  - dateFrom, dateTo  (ISO-8601)
 *  - facilityId
 *  - status            ('operational' | 'maintenance' | 'offline')
 *  - search            (facility name fragment)
 *  - sortBy, sortOrder
 */
export async function listProductionRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query['page'], req.query['limit']);
    const { records, pagination } = await ProductionService.getProductionRecords({
      page,
      limit,
      dateFrom: req.query['dateFrom'] as string | undefined,
      dateTo: req.query['dateTo'] as string | undefined,
      facilityId: req.query['facilityId'] as string | undefined,
      status: req.query['status'] as ProductionStatus | undefined,
      search: req.query['search'] as string | undefined,
      sortBy: req.query['sortBy'] as string | undefined,
      sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') ?? 'desc',
    });
    sendSuccess(res, records, StatusCodes.OK, pagination);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/production/summary ──────────────────────────────────────────

/**
 * Fleet-wide production KPI summary.
 */
export async function getProductionSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const summary = await ProductionService.getProductionSummary(
      req.query['dateFrom'] as string | undefined,
      req.query['dateTo'] as string | undefined
    );
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/production/:id ───────────────────────────────────────────────

/**
 * Fetch a single production record by UUID.
 */
export async function getProductionById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await ProductionService.getProductionById(req.params.id);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/production ──────────────────────────────────────────────────

/**
 * Log a new production record.
 * NRW percentage and efficiency are computed server-side.
 *
 * Body: `CreateProductionPayload`
 */
export async function createProductionRecord(
  req: Request<Record<string, never>, unknown, CreateProductionPayload>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed.', StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    }
    const record = await ProductionService.createProductionRecord(req.body);
    sendSuccess(res, record, StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/production/model-input/:facilityId ──────────────────────────

/**
 * Returns formatted historical data to feed the Python supply-forecasting model.
 *
 * Query params:
 *  - lookbackDays  (default: 30)
 */
export async function getPythonModelInput(
  req: Request<{ facilityId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lookbackDays = Number.parseInt(
      typeof req.query['lookbackDays'] === 'string' ? req.query['lookbackDays'] : '30',
      10
    );
    const payload = await ProductionService.getPythonModelInput(
      req.params.facilityId,
      lookbackDays
    );
    sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}
