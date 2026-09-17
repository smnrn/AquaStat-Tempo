/**
 * @file src/routes/billing.routes.ts
 */

import { Router, RequestHandler } from 'express';
import { body, param } from 'express-validator';
import * as BillingController from '../controllers/billing.controller';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Async handler wrapper ────────────────────────────────────────────────────
// Casts a typed async controller to Express's broad RequestHandler so that
// (a) ESLint's no-misused-promises rule is satisfied and
// (b) TypeScript's strict param/body inference is preserved inside controllers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// ─── Validation chains ────────────────────────────────────────────────────────

const createBillingValidation = [
  body('customerId').isUUID().withMessage('customerId must be a valid UUID.'),
  body('billingPeriodStart')
    .isISO8601()
    .withMessage('billingPeriodStart must be an ISO-8601 date.'),
  body('billingPeriodEnd')
    .isISO8601()
    .withMessage('billingPeriodEnd must be an ISO-8601 date.'),
  body('volumeBilledM3')
    .isFloat({ min: 0 })
    .withMessage('volumeBilledM3 must be a non-negative number.'),
  body('amountDue')
    .isFloat({ min: 0 })
    .withMessage('amountDue must be a non-negative number.'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('currency must be a 3-letter ISO 4217 code (e.g. PHP, USD).'),
  body('dueDate')
    .isISO8601()
    .withMessage('dueDate must be a valid ISO-8601 date.'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('id must be a valid UUID.'),
  body('status')
    .isIn(['pending', 'paid', 'overdue', 'disputed', 'cancelled'])
    .withMessage('status must be one of: pending, paid, overdue, disputed, cancelled.'),
  body('paidDate')
    .optional()
    .isISO8601()
    .withMessage('paidDate must be an ISO-8601 date.'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/summary', wrap(BillingController.getBillingSummary));
router.get('/', wrap(BillingController.listBillingRecords));
router.get('/:id', wrap(BillingController.getBillingById));

router.post(
  '/',
  strictLimiter,
  createBillingValidation,
  wrap(BillingController.createBillingRecord)
);

router.patch(
  '/:id/status',
  strictLimiter,
  updateStatusValidation,
  wrap(BillingController.updateBillingStatus)
);

export default router;
