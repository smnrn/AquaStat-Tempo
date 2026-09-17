/**
 * @file src/routes/consumption.routes.ts
 */

import { Router, RequestHandler } from 'express';
import { body } from 'express-validator';
import * as ConsumptionController from '../controllers/consumption.controller';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// ─── Validation chains ────────────────────────────────────────────────────────

const createConsumptionValidation = [
  body('meterId').isString().trim().notEmpty().withMessage('meterId is required.'),
  body('customerId').isUUID().withMessage('customerId must be a valid UUID.'),
  body('readingTimestamp')
    .isISO8601()
    .withMessage('readingTimestamp must be a valid ISO-8601 datetime.'),
  body('meterReadingM3')
    .isFloat({ min: 0 })
    .withMessage('meterReadingM3 must be a non-negative number.'),
  body('zoneId').isString().trim().notEmpty().withMessage('zoneId is required.'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/aggregates', wrap(ConsumptionController.getConsumptionAggregates));
router.get('/', wrap(ConsumptionController.listConsumptionRecords));
router.get('/:id', wrap(ConsumptionController.getConsumptionById));

router.post(
  '/',
  strictLimiter,
  createConsumptionValidation,
  wrap(ConsumptionController.createConsumptionRecord)
);

export default router;
