import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
    register,
    login,
    getProfile,
    submitKYC,
    approveKYC,
    rejectKYC,
    getPendingKYCs,
} from '../controllers/auth.controller';

const router = Router();

// Public routes
router.post(
    '/register',
    validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('full_name').notEmpty().withMessage('Full name is required'),
        body('wallet_address').optional().isString(),
    ]),
    register
);

router.post(
    '/login',
    validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ]),
    login
);

// Protected routes
router.get('/profile', authenticate, getProfile);

router.post(
    '/kyc/submit',
    authenticate,
    validate([
        body('document_type').notEmpty().withMessage('Document type is required'),
        body('document_number').notEmpty().withMessage('Document number is required'),
        body('date_of_birth').isISO8601().withMessage('Valid date of birth is required'),
        body('address_line1').notEmpty().withMessage('Address is required'),
        body('city').notEmpty().withMessage('City is required'),
        body('state').notEmpty().withMessage('State is required'),
        body('postal_code').notEmpty().withMessage('Postal code is required'),
        body('country').notEmpty().withMessage('Country is required'),
    ]),
    submitKYC
);

// Admin routes
router.get('/kyc/pending', authenticate, authorizeAdmin, getPendingKYCs);

router.post(
    '/kyc/:kycId/approve',
    authenticate,
    authorizeAdmin,
    approveKYC
);

router.post(
    '/kyc/:kycId/reject',
    authenticate,
    authorizeAdmin,
    validate([
        body('reason').notEmpty().withMessage('Rejection reason is required'),
    ]),
    rejectKYC
);

export default router;
