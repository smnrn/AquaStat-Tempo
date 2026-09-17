/**
 * @file src/app.ts
 * @description Express application factory.
 *
 * Separating the Express `app` from the HTTP server (`server.ts`) lets you:
 *  - Import `app` cleanly in integration tests without binding a port.
 *  - Swap transport layers (HTTP → HTTPS, HTTP/2) in `server.ts` alone.
 *
 * Middleware stack order (matters!):
 *  1. Security headers (Helmet)
 *  2. CORS
 *  3. Request logging (Morgan → Winston)
 *  4. Rate limiting
 *  5. Body parsing
 *  6. Compression
 *  7. API routes
 *  8. 404 handler
 *  9. Global error handler
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { StatusCodes } from 'http-status-codes';
import { config } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { defaultLimiter } from './middleware/rateLimiter';
import { globalErrorHandler, AppError } from './middleware/errorHandler';
import apiRouter from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── 1. Security headers ──────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow the API to be consumed from a browser SPA
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Strict CSP — APIs don't need to load resources, so block everything
      contentSecurityPolicy: config.isProduction
        ? {
            directives: {
              defaultSrc: ["'none'"],
              scriptSrc: ["'none'"],
              styleSrc: ["'none'"],
            },
          }
        : false, // Relaxed in dev to allow Swagger UI / testing tools
    })
  );

  // ── 2. CORS ───────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no Origin header) and allowed origins
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new AppError(`Origin ${origin} not allowed by CORS.`, StatusCodes.FORBIDDEN, 'CORS_ERROR'));
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: true,
      maxAge: 86400, // Cache preflight for 24 h
    })
  );

  // ── 3. Request logging ────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── 4. Rate limiting (applied globally to /api) ───────────────────────────
  app.use(config.apiBasePath, defaultLimiter);

  // ── 5. Body parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── 6. Response compression ───────────────────────────────────────────────
  app.use(compression());

  // ── 7. Trust proxy (required behind Nginx / load balancers in production) ─
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  // ── 8. API routes ──────────────────────────────────────────────────────────
  const versionedBasePath = `${config.apiBasePath}/${config.apiVersion}`;
  app.use(versionedBasePath, apiRouter);

  // Root redirect — useful during development
  app.get('/', (_req: Request, res: Response) => {
    res.redirect(`${versionedBasePath}/health`);
  });

  // ── 9. 404 handler ────────────────────────────────────────────────────────
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(
      new AppError(
        `Route not found: ${_req.method} ${_req.originalUrl}`,
        StatusCodes.NOT_FOUND,
        'ROUTE_NOT_FOUND'
      )
    );
  });

  // ── 10. Global error handler (MUST be last) ───────────────────────────────
  app.use(globalErrorHandler);

  return app;
}
