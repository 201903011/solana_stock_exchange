import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    sendGlobalNotification
} from '../controllers/notification.controller';

const router = express.Router();

// User notification routes
router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/:notificationId/read', authenticate, markAsRead);
router.patch('/mark-all-read', authenticate, markAllAsRead);

// Admin routes
router.post('/global', authenticate, authorizeAdmin, sendGlobalNotification);

export default router;