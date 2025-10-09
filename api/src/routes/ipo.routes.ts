import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
    createIPO,
    getAllIPOs,
    applyToIPO,
    getUserIPOApplications,
} from '../controllers/ipo.controller';

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

// Admin routes
router.post(
    '/',
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

export default router;
