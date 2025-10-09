import { Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { query, queryOne, beginTransaction } from '../database/connection';
import {
    AuthRequest,
    User,
    UserRegistration,
    UserLogin,
    KYCSubmission,
    KYCRecord,
    KYCStatus,
    ApiResponse,
} from '../types';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { createTradingAccount, getTradingAccountPDA } from '../utils/solana';
import { config } from '../config';

// User Registration
export async function register(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { email, password, full_name, phone, wallet_address }: UserRegistration = req.body;

        // Check if user already exists
        const existingUser = await queryOne<User>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists',
            });
        }

        // Validate wallet address if provided
        if (wallet_address) {
            try {
                new PublicKey(wallet_address);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Solana wallet address',
                });
            }
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Insert user
        const result = await query(
            'INSERT INTO users (email, password_hash, full_name, phone, wallet_address) VALUES (?, ?, ?, ?, ?)',
            [email, password_hash, full_name, phone || null, wallet_address || null]
        );

        const userId = (result as any).insertId;

        // Generate JWT token
        const token = generateToken({
            userId,
            email,
            isAdmin: false,
        });

        return res.status(201).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email,
                    full_name,
                    wallet_address,
                },
                token,
            },
            message: 'User registered successfully',
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// User Login
export async function login(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { email, password }: UserLogin = req.body;

        // Find user
        const user = await queryOne<User>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            isAdmin: user.is_admin,
        });

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    wallet_address: user.wallet_address,
                    is_admin: user.is_admin,
                },
                token,
            },
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get User Profile
export async function getProfile(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        const user = await queryOne<User>(
            'SELECT id, email, full_name, phone, wallet_address, is_active, is_admin, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Get KYC status
        const kyc = await queryOne<KYCRecord>(
            'SELECT status, trade_account_address, verified_at FROM kyc_records WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: {
                user,
                kyc: kyc ? {
                    status: kyc.status,
                    trade_account_address: kyc.trade_account_address,
                    verified_at: kyc.verified_at,
                } : null,
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Submit KYC
export async function submitKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const kycData: KYCSubmission = req.body;

        // Check if KYC already submitted
        const existingKYC = await queryOne<KYCRecord>(
            'SELECT id, status FROM kyc_records WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        if (existingKYC && existingKYC.status === 'APPROVED') {
            return res.status(400).json({
                success: false,
                error: 'KYC already approved',
            });
        }

        if (existingKYC && existingKYC.status === 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'KYC already submitted and pending verification',
            });
        }

        // Insert KYC record
        await query(
            `INSERT INTO kyc_records (
        user_id, document_type, document_number, date_of_birth,
        address_line1, address_line2, city, state, postal_code, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                kycData.document_type,
                kycData.document_number,
                kycData.date_of_birth,
                kycData.address_line1,
                kycData.address_line2 || null,
                kycData.city,
                kycData.state,
                kycData.postal_code,
                kycData.country,
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'KYC submitted successfully. Verification is pending.',
        });
    } catch (error) {
        console.error('Submit KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Admin: Approve KYC
export async function approveKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { kycId } = req.params;
        const adminId = req.user?.userId;

        // Get KYC record
        const kyc = await queryOne<KYCRecord>(
            'SELECT * FROM kyc_records WHERE id = ?',
            [kycId]
        );

        if (!kyc) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'KYC record not found',
            });
        }

        if (kyc.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'KYC is not in pending status',
            });
        }

        // Get user wallet address
        const user = await queryOne<User>(
            'SELECT wallet_address FROM users WHERE id = ?',
            [kyc.user_id]
        );

        if (!user?.wallet_address) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'User wallet address not found',
            });
        }

        // Create trading account on Solana
        let tradeAccountAddress: string;
        try {
            const userPubkey = new PublicKey(user.wallet_address);
            const programId = new PublicKey(config.solana.exchangeProgramId);
            const [tradingAccountPDA] = getTradingAccountPDA(userPubkey, programId);
            tradeAccountAddress = tradingAccountPDA.toBase58();

            // Note: The actual transaction should be signed by the user
            // For now, we just store the PDA address
        } catch (error) {
            await connection.rollback();
            console.error('Error creating trading account:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create trading account on Solana',
            });
        }

        // Update KYC record
        await connection.execute(
            `UPDATE kyc_records 
       SET status = ?, verified_by = ?, verified_at = NOW(), trade_account_address = ?
       WHERE id = ?`,
            ['APPROVED', adminId, tradeAccountAddress, kycId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'KYC approved successfully',
            data: {
                trade_account_address: tradeAccountAddress,
            },
        });
    } catch (error) {
        await connection.rollback();
        console.error('Approve KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    } finally {
        connection.release();
    }
}

// Admin: Reject KYC
export async function rejectKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { kycId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.userId;

        // Get KYC record
        const kyc = await queryOne<KYCRecord>(
            'SELECT * FROM kyc_records WHERE id = ?',
            [kycId]
        );

        if (!kyc) {
            return res.status(404).json({
                success: false,
                error: 'KYC record not found',
            });
        }

        if (kyc.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'KYC is not in pending status',
            });
        }

        // Update KYC record
        await query(
            `UPDATE kyc_records 
       SET status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
            ['REJECTED', adminId, reason, kycId]
        );

        return res.status(200).json({
            success: true,
            message: 'KYC rejected',
        });
    } catch (error) {
        console.error('Reject KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Admin: Get Pending KYCs
export async function getPendingKYCs(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const kycs = await query<KYCRecord & { user_email: string; user_name: string }>(
            `SELECT k.*, u.email as user_email, u.full_name as user_name
       FROM kyc_records k
       JOIN users u ON k.user_id = u.id
       WHERE k.status = 'PENDING'
       ORDER BY k.submitted_at DESC
       LIMIT ? OFFSET ?`,
            [Number(limit), offset]
        );

        const [{ total }] = await query<{ total: number }>(
            'SELECT COUNT(*) as total FROM kyc_records WHERE status = ?',
            ['PENDING']
        );

        return res.status(200).json({
            success: true,
            data: kycs,
            message: 'Pending KYCs retrieved successfully',
        });
    } catch (error) {
        console.error('Get pending KYCs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
