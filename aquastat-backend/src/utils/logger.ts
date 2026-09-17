/**
 * @file src/utils/logger.ts
 * @description Structured Winston logger with daily log rotation.
 *
 * - In development: colourised console output.
 * - In production: JSON console + rotating file transports (info & error).
 * - Exported as a singleton — import `logger` wherever you need it.
 */

import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// ─── Custom development format ────────────────────────────────────────────────

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n  ${JSON.stringify(meta, null, 2)}`
      : '';
    const tsStr = typeof ts === 'string' ? ts : String(ts);
    const stackStr = typeof stack === 'string' ? `\n${stack}` : '';
    return `[${tsStr}] ${String(level)}: ${String(message)}${stackStr}${metaStr}`;
  })
);

// ─── Production file transports ───────────────────────────────────────────────
// winston-daily-rotate-file accepts string values for maxSize/maxFiles at
// runtime, but the TS types declare them as `number | undefined`.
// We use a typed factory to avoid propagating `any` throughout the file.

function makeRotateTransport(
  filename: string,
  level: string,
  maxFiles = '30d'
): DailyRotateFile {
  const transport = new DailyRotateFile({ filename, level });
  // Set string-valued options that are not exposed in the TS type signature
  const t = transport as unknown as Record<string, unknown>;
  t['dirname'] = path.resolve(config.logging.dir);
  t['datePattern'] = 'YYYY-MM-DD';
  t['zippedArchive'] = true;
  t['maxSize'] = '20m';
  t['maxFiles'] = maxFiles;
  return transport;
}

const fileTransports: winston.transport[] = config.isProduction
  ? [
      makeRotateTransport('aquastat-combined-%DATE%.log', 'info'),
      makeRotateTransport('aquastat-error-%DATE%.log', 'error', '90d'),
    ]
  : [];

// ─── Logger instance ──────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'aquastat-api' },
  transports: [
    new winston.transports.Console({
      format: config.isProduction
        ? combine(timestamp(), errors({ stack: true }), json())
        : devFormat,
    }),
    ...fileTransports,
  ],
  exitOnError: false,
});

// Pipe unhandled exceptions / promise rejections through Winston
logger.exceptions.handle(
  new winston.transports.Console({ format: devFormat })
);

logger.rejections.handle(
  new winston.transports.Console({ format: devFormat })
);
