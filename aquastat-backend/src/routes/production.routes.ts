/**
 * @file src/routes/production.routes.ts
 */

import { Router, RequestHandler } from 'express';
import { body, param, query } from 'express-validator';
import * as ProductionController from '../controllers/production.controller';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// ─── Validation chains ────────────────────────────────────────────────────────

const createProductionValidation = [
  body('facilityId').isString().trim().notEmpty().withMessage('facilityId is required.'),
  body('recordedAt').isISO8601().withMessage('recordedAt must be a valid ISO-8601 datetime.'),
  body('volumeProducedM3')
    .isFloat({ min: 0 })
    .withMessage('volumeProducedM3 must be a non-negative number.'),
  body('nrwVolumeM3')
    .isFloat({ min: 0 })
    .withMessage('nrwVolumeM3 must be a non-negative number.'),
  body('energyConsumptionKwh')
    .isFloat({ min: 0 })
    .withMessage('energyConsumptionKwh must be a non-negative number.'),
  body('status')
    .isIn(['operational', 'maintenance', 'offline'])
    .withMessage('status must be: operational, maintenance, or offline.'),
  // Cross-field: nrwVolumeM3 must not exceed volumeProducedM3
  body('nrwVolumeM3').custom((nrw: number, { req }) => {
    if (nrw > (req.body as { volumeProducedM3: number }).volumeProducedM3) {
      throw new Error('nrwVolumeM3 cannot exceed volumeProducedM3.');
    }
    return true;
  }),
];

const modelInputValidation = [
  param('facilityId').isString().trim().notEmpty().withMessage('facilityId is required.'),
  query('lookbackDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('lookbackDays must be between 1 and 365.'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/summary', wrap(ProductionController.getProductionSummary));
router.get(
  '/model-input/:facilityId',
  modelInputValidation,
  wrap(ProductionController.getPythonModelInput)
);
router.get('/', wrap(ProductionController.listProductionRecords));
router.get('/:id', wrap(ProductionController.getProductionById));

router.post(
  '/',
  strictLimiter,
  createProductionValidation,
  wrap(ProductionController.createProductionRecord)
);

export default router;
