import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
    createIPO,
    getAllIPOs,
    // applyToIPO,
    getUserIPOApplications,
} from '../controllers/ipo.controller';

import { applyToIPO, allocateIPOTokens, confirmIPOPayment } from '../controllers/company.controller.enhanced';

const router = Router();

// Public/User routes
router.get('/', getAllIPOs);
router.post(
    '/apply',
    authenticate,
    validate([
        body('ipo_id').isInt().withMessage('IPO ID is required'),
        body('quantity').notEmpty().withMessage('Quantity is required'),
    ]),
    applyToIPO
);
router.get('/applications', authenticate, getUserIPOApplications);

// Confirm SOL payment after client-side transaction signing
router.post(
    '/confirm-payment',
    authenticate,
    validate([
        body('application_id').isInt().withMessage('Application ID is required'),
        body('transaction_signature').notEmpty().withMessage('Transaction signature is required'),
    ]),
    confirmIPOPayment
);

// Admin routes
router.post(
    '/create',
    authenticate,
    authorizeAdmin,
    validate([
        body('company_id').isInt().withMessage('Company ID is required'),
        body('title').notEmpty().withMessage('Title is required'),
        body('total_shares').notEmpty().withMessage('Total shares is required'),
        body('price_per_share').notEmpty().withMessage('Price per share is required'),
        body('min_subscription').notEmpty().withMessage('Min subscription is required'),
        body('max_subscription').notEmpty().withMessage('Max subscription is required'),
        body('open_date').isISO8601().withMessage('Valid open date is required'),
        body('close_date').isISO8601().withMessage('Valid close date is required'),
    ]),
    createIPO
);

// Admin routes
router.post(
    '/allocate-tokens',
    authenticate,
    authorizeAdmin,
    allocateIPOTokens
);


export default router;
