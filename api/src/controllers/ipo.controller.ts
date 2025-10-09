import { Response } from 'express';
import { query, queryOne, beginTransaction } from '../database/connection';
import { AuthRequest, ApiResponse, IPO, IPOCreation, IPOApplicationRequest } from '../types';

// Admin: Create IPO
export async function createIPO(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const adminId = req.user?.userId;
        const ipoData: IPOCreation = req.body as any;

        // Verify company exists
        const company = await queryOne(
            'SELECT id FROM companies WHERE id = ?',
            [ipoData.company_id]
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        // Insert IPO
        const result = await query(
            `INSERT INTO ipos (
        company_id, title, description, total_shares, price_per_share,
        min_subscription, max_subscription, open_date, close_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ipoData.company_id,
                ipoData.title,
                ipoData.description || null,
                ipoData.total_shares,
                ipoData.price_per_share,
                ipoData.min_subscription,
                ipoData.max_subscription,
                ipoData.open_date,
                ipoData.close_date,
                adminId,
            ]
        );

        return res.status(201).json({
            success: true,
            data: { ipoId: (result as any).insertId },
            message: 'IPO created successfully',
        });
    } catch (error) {
        console.error('Create IPO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get All IPOs
export async function getAllIPOs(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { status = 'OPEN' } = req.query as any;

        let whereClause = '';
        const params: any[] = [];

        if (status && status !== 'ALL') {
            whereClause = 'WHERE i.status = ?';
            params.push(status);
        }

        const ipos = await query(
            `SELECT i.*, c.symbol, c.name as company_name, c.token_mint
       FROM ipos i
       JOIN companies c ON i.company_id = c.id
       ${whereClause}
       ORDER BY i.open_date DESC`,
            params
        );

        return res.status(200).json({
            success: true,
            data: ipos,
        });
    } catch (error) {
        console.error('Get IPOs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Apply to IPO
export async function applyToIPO(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { ipo_id, quantity }: IPOApplicationRequest = req.body as any;

        // Verify KYC
        const kyc = await queryOne(
            'SELECT status FROM kyc_records WHERE user_id = ? AND status = ?',
            [userId, 'APPROVED']
        );

        if (!kyc) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'KYC verification required',
            });
        }

        // Get IPO details
        const ipo = await queryOne<IPO>(
            'SELECT * FROM ipos WHERE id = ?',
            [ipo_id]
        );

        if (!ipo) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'IPO not found',
            });
        }

        if (ipo.status !== 'OPEN') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'IPO is not open for applications',
            });
        }

        const qty = BigInt(quantity);
        if (qty < ipo.min_subscription || qty > ipo.max_subscription) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Quantity must be between ${ipo.min_subscription} and ${ipo.max_subscription}`,
            });
        }

        // Check if already applied
        const existing = await queryOne(
            'SELECT id FROM ipo_applications WHERE ipo_id = ? AND user_id = ?',
            [ipo_id, userId]
        );

        if (existing) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Already applied to this IPO',
            });
        }

        const amount = qty * ipo.price_per_share;

        // Insert application
        await connection.execute(
            `INSERT INTO ipo_applications (ipo_id, user_id, quantity, amount)
       VALUES (?, ?, ?, ?)`,
            [ipo_id, userId, quantity, amount.toString()]
        );

        // Update total subscribed
        await connection.execute(
            'UPDATE ipos SET total_subscribed = total_subscribed + ? WHERE id = ?',
            [quantity, ipo_id]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'IPO application submitted successfully',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Apply to IPO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    } finally {
        connection.release();
    }
}

// Get User IPO Applications
export async function getUserIPOApplications(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        const applications = await query(
            `SELECT a.*, i.title, i.price_per_share, c.symbol, c.name as company_name
       FROM ipo_applications a
       JOIN ipos i ON a.ipo_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: applications,
        });
    } catch (error) {
        console.error('Get IPO applications error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
