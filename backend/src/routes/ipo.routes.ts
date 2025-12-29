// Placeholder routes - implementations in IMPLEMENTATION_GUIDE.md
import { Router } from 'express';
import { authenticate, requireAdmin, requireKYCApproved } from '../middleware/auth';

const router = Router();

// TODO: Implement controller functions (see IMPLEMENTATION_GUIDE.md)
router.get('/list'); // listIPOs
router.get('/myapplication/list', authenticate, requireKYCApproved); // getMyApplications
router.post('/apply', authenticate, requireKYCApproved); // applyIPO
router.get('/:applicationId', authenticate); // getApplicationDetails
router.post('/:applicationId/allocate', authenticate, requireAdmin); // allocateIPO

export default router;
