/**
 * @file src/controllers/billing.controller.ts
 * @description HTTP handlers for the Billing DataMart.
 *
 * Controllers are intentionally thin:
 *  1. Parse & validate request inputs.
 *  2. Delegate to the service layer.
 *  3. Format and return the response envelope.
 *
 * All async errors are forwarded to the global error handler via `next(err)`.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as BillingService from '../services/billing.service';
import { sendSuccess, parsePagination } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';
import { BillingStatus, CreateBillingPayload } from '../types/api';

// ─── GET /api/v1/billing ──────────────────────────────────────────────────────

/**
 * List billing records with optional pagination, date-range, and search filters.
 *
 * Query params:
 *  - page, limit
 *  - dateFrom, dateTo  (ISO-8601 date strings)
 *  - search            (customer name / ID fragment)
 *  - sortBy, sortOrder
 */
export async function listBillingRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query['page'], req.query['limit']);
    const { records, pagination } = await BillingService.getBillingRecords({
      page,
      limit,
      dateFrom: req.query['dateFrom'] as string | undefined,
      dateTo: req.query['dateTo'] as string | undefined,
      search: req.query['search'] as string | undefined,
      sortBy: req.query['sortBy'] as string | undefined,
      sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') ?? 'desc',
    });
    sendSuccess(res, records, StatusCodes.OK, pagination);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/billing/summary ─────────────────────────────────────────────

/**
 * Aggregate KPI summary for the Billing DataMart.
 * Powers dashboard widgets.
 */
export async function getBillingSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const summary = await BillingService.getBillingSummary(
      req.query['dateFrom'] as string | undefined,
      req.query['dateTo'] as string | undefined
    );
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/billing/:id ──────────────────────────────────────────────────

/**
 * Fetch a single billing record by its UUID.
 */
export async function getBillingById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await BillingService.getBillingById(req.params.id);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/billing ─────────────────────────────────────────────────────

/**
 * Create a new billing record.
 *
 * Body: `CreateBillingPayload`
 */
export async function createBillingRecord(
  req: Request<Record<string, never>, unknown, CreateBillingPayload>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // express-validator result check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(
        'Validation failed.',
        StatusCodes.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR'
      );
    }
    const record = await BillingService.createBillingRecord(req.body);
    sendSuccess(res, record, StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/billing/:id/status ────────────────────────────────────────

/**
 * Update a billing record's payment status.
 *
 * Body: `{ status: BillingStatus; paidDate?: string }`
 */
export async function updateBillingStatus(
  req: Request<{ id: string }, unknown, { status: BillingStatus; paidDate?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed.', StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    }
    const record = await BillingService.updateBillingStatus(
      req.params.id,
      req.body.status,
      req.body.paidDate
    );
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}
