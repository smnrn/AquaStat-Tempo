/**
 * @file src/middleware/requestLogger.ts
 * @description HTTP request/response logging middleware using Morgan.
 *
 * Routes Morgan's output through the Winston logger so all logs share a
 * single transport configuration (file rotation, JSON format in prod, etc.).
 */

import morgan, { StreamOptions } from 'morgan';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Bridge Morgan's stream to Winston
const stream: StreamOptions = {
  write: (message: string) => {
    // Morgan appends a newline; strip it before handing to Winston
    logger.http(message.trim());
  },
};

/**
 * Use 'combined' Apache format in production (includes IP, user-agent, etc.).
 * Use 'dev' in development for a concise, colour-coded summary.
 */
export const requestLogger = morgan(
  config.isProduction ? 'combined' : 'dev',
  { stream }
);
