import { query } from '../database/connection';
import { NotificationType, NotificationRequest, Notification } from '../types';

export class NotificationService {
    /**
     * Send notification to a user
     */
    static async sendNotification(notification: NotificationRequest): Promise<number> {
        try {
            const result = await query(
                `INSERT INTO notifications (user_id, type, title, message, data)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    notification.user_id,
                    notification.type,
                    notification.title,
                    notification.message,
                    notification.data ? JSON.stringify(notification.data) : null
                ]
            );

            const notificationId = (result as any).insertId;
            console.log(`📧 Notification [${notification.type}] → User ${notification.user_id}: ${notification.message}`);

            return notificationId;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users
     */
    static async sendBulkNotifications(notifications: NotificationRequest[]): Promise<void> {
        try {
            const values = notifications.map(n => [
                n.user_id,
                n.type,
                n.title,
                n.message,
                n.data ? JSON.stringify(n.data) : null
            ]);

            if (values.length === 0) return;

            await query(
                `INSERT INTO notifications (user_id, type, title, message, data)
                 VALUES ${values.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
                values.flat()
            );

            console.log(`📧 Sent ${notifications.length} bulk notifications`);
        } catch (error) {
            console.error('Error sending bulk notifications:', error);
            throw error;
        }
    }

    /**
     * Send notification to all active users
     */
    static async sendGlobalNotification(
        type: NotificationType,
        title: string,
        message: string,
        data?: any,
        excludeUserIds: number[] = []
    ): Promise<void> {
        try {
            // Get all active users
            const users = await query<{ id: number }>(
                `SELECT id FROM users WHERE is_active = true 
                 ${excludeUserIds.length > 0 ? `AND id NOT IN (${excludeUserIds.map(() => '?').join(',')})` : ''}`,
                excludeUserIds
            );

            const notifications: NotificationRequest[] = users.map(user => ({
                user_id: user.id,
                type,
                title,
                message,
                data
            }));

            await this.sendBulkNotifications(notifications);
        } catch (error) {
            console.error('Error sending global notification:', error);
            throw error;
        }
    }

    /**
     * Get user notifications
     */
    static async getUserNotifications(
        userId: number,
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ): Promise<{ notifications: Notification[], total: number }> {
        try {
            const offset = (page - 1) * limit;
            const whereClause = unreadOnly ? 'WHERE user_id = ? AND is_read = false' : 'WHERE user_id = ?';
            const params = [userId];

            const notifications = await query<Notification>(
                `SELECT * FROM notifications 
                 ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            const [{ total }] = await query<{ total: number }>(
                `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
                params
            );

            return { notifications, total };
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: number, userId: number): Promise<boolean> {
        try {
            const result = await query(
                'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );

            return (result as any).affectedRows > 0;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all user notifications as read
     */
    static async markAllAsRead(userId: number): Promise<number> {
        try {
            const result = await query(
                'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
                [userId]
            );

            return (result as any).affectedRows;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get unread count for user
     */
    static async getUnreadCount(userId: number): Promise<number> {
        try {
            const [{ count }] = await query<{ count: number }>(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
                [userId]
            );

            return count;
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    /**
     * Notification templates for common events
     */
    static getNotificationTemplate(type: NotificationType, data: any): { title: string; message: string } {
        switch (type) {
            case NotificationType.USER_REGISTRATION:
                return {
                    title: 'Welcome to Solana Stock Exchange!',
                    message: `Welcome ${data.userName}! Your account has been created successfully. Complete your KYC to start trading.`
                };

            case NotificationType.KYC_APPROVED:
                return {
                    title: 'KYC Approved',
                    message: 'Your KYC verification has been approved. You can now start trading on the platform.'
                };

            case NotificationType.KYC_REJECTED:
                return {
                    title: 'KYC Rejected',
                    message: `Your KYC verification has been rejected. Reason: ${data.reason || 'Please resubmit with correct documents.'}`
                };

            case NotificationType.DEPOSIT_CONFIRMED:
                return {
                    title: 'Deposit Confirmed',
                    message: `Your deposit of ${data.amount} SOL has been confirmed and added to your account.`
                };

            case NotificationType.WITHDRAWAL_PROCESSING:
                return {
                    title: 'Withdrawal Processing',
                    message: `Withdrawal of ${data.amount} SOL is being processed.`
                };

            case NotificationType.WITHDRAWAL_CONFIRMED:
                return {
                    title: 'Withdrawal Confirmed',
                    message: `Withdrawal confirmed! Signature: ${data.signature?.slice(0, 16)}...`
                };

            case NotificationType.NEW_LISTING:
                return {
                    title: 'New Stock Listed',
                    message: `${data.symbol} is now available for trading at ${data.price} SOL`
                };

            case NotificationType.IPO_OPENED:
                return {
                    title: 'IPO Now Open',
                    message: `${data.companyName} IPO is now open for applications. Price: ${data.price} SOL per share`
                };

            case NotificationType.IPO_ALLOTMENT:
                return {
                    title: 'IPO Allotment',
                    message: `You have been allotted ${data.quantity} shares of ${data.symbol} in the IPO.`
                };

            case NotificationType.ORDER_PLACED:
                return {
                    title: 'Order Placed',
                    message: `${data.side} order for ${data.quantity} ${data.symbol} @ ${data.price} SOL placed`
                };

            case NotificationType.ORDER_FILLED:
                return {
                    title: 'Order Filled',
                    message: `Your ${data.side} order for ${data.quantity} ${data.symbol} has been filled at ${data.price} SOL`
                };

            case NotificationType.ORDER_CANCELLED:
                return {
                    title: 'Order Cancelled',
                    message: `Your ${data.side} order for ${data.quantity} ${data.symbol} has been cancelled`
                };

            case NotificationType.ORDERS_MATCHED:
                return {
                    title: 'Orders Matched',
                    message: `Matched: ${data.buyer} (buy) ↔ ${data.seller} (sell)`
                };

            case NotificationType.TRADE_EXECUTED:
                return {
                    title: 'Trade Executed',
                    message: `Successfully ${data.action} ${data.quantity} ${data.symbol} @ ${data.price} SOL each. Total: ${data.total} SOL ${data.fees ? '(inc. fees)' : ''}`
                };

            case NotificationType.TRADE_SUCCESS:
                return {
                    title: 'Trade Successful',
                    message: `${data.action} ${data.quantity} ${data.symbol} @ ${data.price} SOL each`
                };

            default:
                return {
                    title: 'Notification',
                    message: 'You have a new notification'
                };
        }
    }

    /**
     * Send templated notification
     */
    static async sendTemplatedNotification(
        userId: number,
        type: NotificationType,
        data: any
    ): Promise<number> {
        const template = this.getNotificationTemplate(type, data);

        return await this.sendNotification({
            user_id: userId,
            type,
            title: template.title,
            message: template.message,
            data
        });
    }

    /**
     * Send templated notification to multiple users
     */
    static async sendTemplatedBulkNotifications(
        userIds: number[],
        type: NotificationType,
        data: any
    ): Promise<void> {
        const template = this.getNotificationTemplate(type, data);

        const notifications: NotificationRequest[] = userIds.map(userId => ({
            user_id: userId,
            type,
            title: template.title,
            message: template.message,
            data
        }));

        await this.sendBulkNotifications(notifications);
    }
}