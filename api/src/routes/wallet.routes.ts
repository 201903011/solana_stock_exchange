import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import {
    createDeposit,
    verifyDeposit,
    requestWithdrawal,
    getWalletTransactions,
    addBankAccount,
    getBankAccounts,
} from '../controllers/wallet.controller';

const router = Router();

// All routes require authentication
router.post(
    '/deposit',
    authenticate,
    validate([
        body('amount').notEmpty().withMessage('Amount is required'),
    ]),
    createDeposit
);

router.post(
    '/deposit/verify',
    authenticate,
    validate([
        body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
        body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
        body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    ]),
    verifyDeposit
);

router.post(
    '/withdraw',
    authenticate,
    validate([
        body('amount').notEmpty().withMessage('Amount is required'),
        body('bank_account_id').isInt().withMessage('Bank account ID is required'),
    ]),
    requestWithdrawal
);

router.get('/transactions', authenticate, getWalletTransactions);

router.post(
    '/bank-accounts',
    authenticate,
    validate([
        body('account_holder_name').notEmpty().withMessage('Account holder name is required'),
        body('account_number').notEmpty().withMessage('Account number is required'),
        body('ifsc_code').notEmpty().withMessage('IFSC code is required'),
        body('account_type').isIn(['SAVINGS', 'CURRENT']).withMessage('Invalid account type'),
    ]),
    addBankAccount
);

router.get('/bank-accounts', authenticate, getBankAccounts);

export default router;
