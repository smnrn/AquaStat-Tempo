/**
 * @file src/middleware/rateLimiter.ts
 * @description Configurable rate limiting middleware using `express-rate-limit`.
 *
 * Two limiters are exported:
 *  - `defaultLimiter`  — applied to all /api routes.
 *  - `strictLimiter`   — applied to sensitive write endpoints.
 */

import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { config } from '../config/env';
import { ApiErrorResponse } from '../types/api';

const makeErrorBody = (message: string): ApiErrorResponse => ({
  success: false,
  timestamp: new Date().toISOString(),
  version: config.apiVersion,
  error: { code: 'RATE_LIMIT_EXCEEDED', message },
});

/** Standard limiter — 100 req / 15 min per IP */
export const defaultLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json(
      makeErrorBody('Too many requests. Please slow down and try again later.')
    );
  },
});

/** Strict limiter for write operations — 30 req / 15 min per IP */
export const strictLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.ceil(config.rateLimit.max * 0.3),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json(
      makeErrorBody('Write rate limit exceeded. Please wait before submitting again.')
    );
  },
});
