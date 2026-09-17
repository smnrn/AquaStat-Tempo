/**
 * @file src/utils/responseHelper.ts
 * @description Factory functions for building the standard AquaStat API
 * response envelope.  Every controller uses these instead of constructing
 * raw JSON objects, guaranteeing a consistent contract with the frontend.
 */

import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from '../config/env';
import {
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginationMeta,
} from '../types/api';

// ─── Success response ─────────────────────────────────────────────────────────

/**
 * Send a standard success response.
 *
 * @example
 * sendSuccess(res, billingRecord, StatusCodes.CREATED);
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
  pagination?: PaginationMeta
): void {
  const body: ApiSuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    data,
    ...(pagination && { pagination }),
  };
  res.status(statusCode).json(body);
}

// ─── Error response ───────────────────────────────────────────────────────────

/**
 * Send a standard error response.
 * Prefer throwing `AppError` inside services so the global handler formats
 * the error; use this only when you need direct control in a controller.
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  code = 'INTERNAL_ERROR'
): void {
  const body: ApiErrorResponse = {
    success: false,
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    error: { code, message },
  };
  res.status(statusCode).json(body);
}

// ─── Pagination builder ───────────────────────────────────────────────────────

/**
 * Builds a `PaginationMeta` object from raw query values.
 *
 * @param page      Current page (1-indexed)
 * @param limit     Items per page
 * @param total     Total items in the full result set
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Extracts safe, validated page / limit values from query parameters.
 *
 * @param rawPage   Value from `req.query.page`
 * @param rawLimit  Value from `req.query.limit`
 */
export function parsePagination(
  rawPage: unknown,
  rawLimit: unknown
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(String(rawPage ?? '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(rawLimit ?? '20'), 10) || 20)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
