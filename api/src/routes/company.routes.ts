import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
    registerCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
} from '../controllers/company.controller';

const router = Router();

// Public routes
router.get('/', getAllCompanies);
router.get('/:id', getCompanyById);

// Admin routes
router.post(
    '/',
    authenticate,
    authorizeAdmin,
    validate([
        body('symbol').notEmpty().withMessage('Symbol is required'),
        body('name').notEmpty().withMessage('Company name is required'),
        body('token_mint').notEmpty().withMessage('Token mint is required'),
        body('total_shares').notEmpty().withMessage('Total shares is required'),
    ]),
    registerCompany
);

router.put(
    '/:id',
    authenticate,
    authorizeAdmin,
    updateCompany
);

export default router;
