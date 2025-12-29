import { Router } from 'express';
import { body } from 'express-validator';
import {
    register,
    login,
    submitKYC,
    listKYC,
    getKYCDetails,
    approveKYC,
} from '../controllers/auth.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

// POST /api/auth/register
router.post(
    '/register',
    validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
        body('full_name').notEmpty().withMessage('Full name is required'),
        body('phone').optional().isMobilePhone('any'),
    ]),
    register
);

// POST /api/auth/login
router.post(
    '/login',
    validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ]),
    login
);

// POST /api/auth/kyc/submit
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

// GET /api/auth/kyc/list
router.get('/kyc/list', authenticate, requireAdmin, listKYC);

// GET /api/auth/kyc/:id
router.get('/kyc/:id', authenticate, requireAdmin, getKYCDetails);

// POST /api/auth/kyc/:id/approve
router.post(
    '/kyc/:id/approve',
    authenticate,
    requireAdmin,
    validate([
        body('status')
            .isIn(['APPROVED', 'REJECTED', 'RESUBMIT'])
            .withMessage('Invalid status'),
        body('rejection_reason')
            .optional()
            .isString()
            .withMessage('Rejection reason must be a string'),
    ]),
    approveKYC
);

export default router;
