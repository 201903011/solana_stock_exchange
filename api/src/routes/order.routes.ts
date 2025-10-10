import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import {
    placeOrder,
    cancelOrderHandler,
    getUserOrders,
    getOrderBook,
} from '../controllers/order.controller';

const router = Router();

// All routes require authentication
router.post(
    '/place',
    authenticate,
    validate([
        body('company_id').isInt().withMessage('Company ID is required'),
        body('side').isIn(['BUY', 'SELL']).withMessage('Side must be BUY or SELL'),
        body('order_type').isIn(['MARKET', 'LIMIT']).withMessage('Invalid order type'),
        body('quantity').notEmpty().withMessage('Quantity is required'),
    ]),
    placeOrder
);

router.post('/:orderId/cancel', authenticate, cancelOrderHandler);
router.get('/getorders', authenticate, getUserOrders);
router.get('/book/:companyId', getOrderBook);

export default router;
