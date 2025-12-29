// Placeholder routes - implementations in IMPLEMENTATION_GUIDE.md
import { Router } from 'express';
import { authenticate, requireKYCApproved } from '../middleware/auth';

const router = Router();

// TODO: Implement controller functions (see IMPLEMENTATION_GUIDE.md)
router.post('/placeOrder', authenticate, requireKYCApproved); // placeOrder
router.get('/list', authenticate); // listOrders
router.delete('/:orderId', authenticate); // cancelOrder

export default router;
