import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPortfolio, getTradeHistory } from '../controllers/portfolio.controller';

const router = Router();

// All routes require authentication
router.get('/', authenticate, getPortfolio);
router.get('/trades', authenticate, getTradeHistory);

export default router;
