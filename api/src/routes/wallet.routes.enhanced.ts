import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    getWalletInfo,
    depositSOL,
    withdrawSOL,
    addBankAccount,
    getTransactionHistory,
    // Legacy compatibility functions
    createDeposit,
    verifyDeposit,
    requestWithdrawal,
    getWalletTransactions,
    getBankAccounts
} from '../controllers/wallet.controller.enhanced';

const router = express.Router();

// Enhanced wallet routes
router.get('/info', authenticate, getWalletInfo);
router.post('/deposit', authenticate, depositSOL);
router.post('/withdraw', authenticate, withdrawSOL);
router.post('/bank-accounts', authenticate, addBankAccount);
router.get('/transactions', authenticate, getTransactionHistory);

// Legacy routes for backward compatibility
router.post('/create-deposit', authenticate, createDeposit);
router.post('/verify-deposit', authenticate, verifyDeposit);
router.post('/request-withdrawal', authenticate, requestWithdrawal);
router.get('/wallet-transactions', authenticate, getWalletTransactions);
router.get('/bank-accounts', authenticate, getBankAccounts);

export default router;