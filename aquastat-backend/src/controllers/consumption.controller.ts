/**
 * @file src/controllers/consumption.controller.ts
 * @description HTTP handlers for the Consumption DataMart.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as ConsumptionService from '../services/consumption.service';
import { sendSuccess, parsePagination } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';
import { CreateConsumptionPayload } from '../types/api';

// ─── GET /api/v1/consumption ──────────────────────────────────────────────────

/**
 * List consumption readings with optional filters.
 *
 * Query params:
 *  - page, limit
 *  - dateFrom, dateTo (ISO-8601)
 *  - zoneId           (filter by distribution zone)
 *  - anomalyOnly      ("true" to return only anomalous readings)
 *  - search           (meter ID / customer ID fragment)
 */
export async function listConsumptionRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query['page'], req.query['limit']);
    const { records, pagination } = await ConsumptionService.getConsumptionRecords({
      page,
      limit,
      dateFrom: req.query['dateFrom'] as string | undefined,
      dateTo: req.query['dateTo'] as string | undefined,
      zoneId: req.query['zoneId'] as string | undefined,
      search: req.query['search'] as string | undefined,
      anomalyOnly: req.query['anomalyOnly'] === 'true',
    });
    sendSuccess(res, records, StatusCodes.OK, pagination);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/consumption/aggregates ──────────────────────────────────────

/**
 * Zone-level consumption aggregates for a time window.
 *
 * Query params:
 *  - zoneId   (required)
 *  - dateFrom (required, ISO-8601)
 *  - dateTo   (required, ISO-8601)
 */
export async function getConsumptionAggregates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { zoneId, dateFrom, dateTo } = req.query as {
      zoneId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!zoneId || !dateFrom || !dateTo) {
      throw new AppError(
        'zoneId, dateFrom, and dateTo query parameters are required.',
        StatusCodes.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const aggregates = await ConsumptionService.getConsumptionAggregates(
      zoneId, dateFrom, dateTo
    );
    sendSuccess(res, aggregates);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/consumption/:id ─────────────────────────────────────────────

/**
 * Fetch a single consumption reading by UUID.
 */
export async function getConsumptionById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await ConsumptionService.getConsumptionById(req.params.id);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/consumption ─────────────────────────────────────────────────

/**
 * Ingest a new meter reading.
 * Automatically computes delta and runs anomaly detection.
 *
 * Body: `CreateConsumptionPayload`
 */
export async function createConsumptionRecord(
  req: Request<Record<string, never>, unknown, CreateConsumptionPayload>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed.', StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    }
    const record = await ConsumptionService.createConsumptionRecord(req.body);
    sendSuccess(res, record, StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
}
