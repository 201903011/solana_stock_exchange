// Placeholder routes - implementations in IMPLEMENTATION_GUIDE.md
import { Router } from 'express';
import { authenticate, requireKYCApproved } from '../middleware/auth';

const router = Router();

// TODO: Implement controller functions (see IMPLEMENTATION_GUIDE.md)
router.post('/deposit', authenticate, requireKYCApproved); // createDeposit
router.post('/verify-deposit', authenticate); // verifyDeposit
router.post('/withdraw', authenticate, requireKYCApproved); // requestWithdrawal
router.get('/transaction/list', authenticate); // listTransactions
router.post('/add-bank-account', authenticate); // addBankAccount
router.get('/wallet-transaction', authenticate); // fetchWalletTransactions

export default router;
