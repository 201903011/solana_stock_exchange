import { Response } from 'express';
import {
    AuthRequest,
    ApiResponse,
    Notification,
    NotificationType
} from '../types';
import { NotificationService } from '../services/notification.service';

// Get user notifications
export async function getNotifications(
    req: AuthRequest,
    res: Response
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, unread_only = false } = req.query;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                timestamp: new Date()
            });
        }

        const isUnreadOnly = unread_only === 'true';

        const { notifications, total } = await NotificationService.getUserNotifications(
            userId,
            Number(page),
            Number(limit),
            isUnreadOnly
        );

        const totalPages = Math.ceil(total / Number(limit));

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Mark notification as read
export async function markAsRead(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { notificationId } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                timestamp: new Date()
            });
        }

        const success = await NotificationService.markAsRead(
            Number(notificationId),
            userId
        );

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
                timestamp: new Date()
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Mark all notifications as read
export async function markAllAsRead(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                timestamp: new Date()
            });
        }

        const updatedCount = await NotificationService.markAllAsRead(userId);

        return res.status(200).json({
            success: true,
            data: { updated_count: updatedCount },
            message: `${updatedCount} notifications marked as read`,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Get unread count
export async function getUnreadCount(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                timestamp: new Date()
            });
        }

        const count = await NotificationService.getUnreadCount(userId);

        return res.status(200).json({
            success: true,
            data: { unread_count: count },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Admin: Send global notification
export async function sendGlobalNotification(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { type, title, message, data, exclude_user_ids = [] } = req.body;

        // Validate notification type
        if (!Object.values(NotificationType).includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification type',
                timestamp: new Date()
            });
        }

        await NotificationService.sendGlobalNotification(
            type,
            title,
            message,
            data,
            exclude_user_ids
        );

        return res.status(200).json({
            success: true,
            message: 'Global notification sent successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Send global notification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}