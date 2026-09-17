/**
 * @file src/routes/ml.routes.ts
 * @description Routes for Three-Tier Analytics (Predictive forecasting & Prescriptive optimization).
 */

import { Router, RequestHandler } from 'express';
import { mlController } from '../controllers/ml.controller';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// Predictive Models
router.get('/predict/sarimax/:zoneId', wrap(mlController.getSarimaxForecast));
router.get('/predict/lstm/:zoneId',    wrap(mlController.getLstmForecast));
router.get('/predict/prophet/:zoneId', wrap(mlController.getProphetForecast));
router.get('/predict/xgboost/:zoneId', wrap(mlController.getXGBoostForecast));

// Prescriptive Analytics Tier
router.post('/prescribe/pump-schedule',    wrap(mlController.getPumpSchedule));
router.get('/prescribe/mcda-zone-ranking', wrap(mlController.getMCDARankings));
router.get('/prescribe/fp-growth-patterns', wrap(mlController.getFPGrowthPatterns));

export default router;

