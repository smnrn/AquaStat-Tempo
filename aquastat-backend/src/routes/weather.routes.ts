/**
 * @file src/routes/weather.routes.ts
 * @description Weather API routes for real-time data + 10-day forecast.
 */

import { Router, RequestHandler } from 'express';
import { getCurrentWeather, getForecast, refreshWeather } from '../controllers/weather.controller';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// GET  /api/v1/weather/current
router.get('/current', wrap(getCurrentWeather));

// GET  /api/v1/weather/forecast
router.get('/forecast', wrap(getForecast));

// POST /api/v1/weather/refresh  (admin: bypass cache)
router.post('/refresh', wrap(refreshWeather));

export default router;

