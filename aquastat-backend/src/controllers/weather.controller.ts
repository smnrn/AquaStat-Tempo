/**
 * @file src/controllers/weather.controller.ts
 * @description HTTP controller for the weather data pipeline.
 */

import { Request, Response, NextFunction } from 'express';
import {
  fetchCurrentWeather,
  fetchForecast,
  invalidateWeatherCache,
} from '../services/weather.service';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/weather/current
 * Returns live current conditions for Tabaco City, Albay.
 */
export async function getCurrentWeather(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await fetchCurrentWeather();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[Weather] getCurrentWeather failed', { err });
    next(err);
  }
}

/**
 * GET /api/v1/weather/forecast
 * Returns 10-day daily forecast for Tabaco City, Albay.
 */
export async function getForecast(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await fetchForecast();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[Weather] getForecast failed', { err });
    next(err);
  }
}

/**
 * POST /api/v1/weather/refresh
 * Admin endpoint: force-invalidates the cache and returns fresh data.
 */
export async function refreshWeather(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    invalidateWeatherCache();
    const [current, forecast] = await Promise.all([fetchCurrentWeather(), fetchForecast()]);
    res.json({ success: true, data: { current, forecast } });
  } catch (err) {
    logger.error('[Weather] refreshWeather failed', { err });
    next(err);
  }
}
