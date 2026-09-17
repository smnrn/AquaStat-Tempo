/**
 * @file src/middleware/errorHandler.ts
 * @description Global Express error handler middleware.
 *
 * Catches all errors forwarded via `next(err)` from route handlers and
 * formats them into the standard AquaStat `ApiErrorResponse` envelope.
 *
 * Must be registered LAST (after all routes) in app.ts.
 */

import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { ApiErrorResponse } from '../types/api';

// ─── Custom application error ─────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Convenience factory helpers ──────────────────────────────────────────────

export const notFoundError = (resource: string): AppError =>
  new AppError(`${resource} not found.`, StatusCodes.NOT_FOUND, 'NOT_FOUND');

export const validationError = (message: string): AppError =>
  new AppError(message, StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');

export const conflictError = (message: string): AppError =>
  new AppError(message, StatusCodes.CONFLICT, 'CONFLICT');

// ─── Global error middleware ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Determine HTTP status
  const statusCode =
    err instanceof AppError
      ? err.statusCode
      : StatusCodes.INTERNAL_SERVER_ERROR;

  const errorCode =
    err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  const message =
    err instanceof AppError
      ? err.message
      : config.isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : (err instanceof Error ? err.message : String(err));

  // Log the error (with stack in non-production)
  logger.error('[ErrorHandler]', {
    statusCode,
    code: errorCode,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  const body: ApiErrorResponse = {
    success: false,
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    error: {
      code: errorCode,
      message,
    },
  };

  res.status(statusCode).json(body);
};
