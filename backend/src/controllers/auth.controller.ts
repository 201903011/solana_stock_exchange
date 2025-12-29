import { Request, Response, NextFunction } from 'express';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { query } from '../database/connection';
import {
    hashPassword,
    comparePassword,
    generateToken,
    createJWTPayload,
    isValidEmail,
    isStrongPassword,
} from '../utils/auth';
import {
    User,
    KYCRecord,
    RegisterRequest,
    LoginRequest,
    KYCSubmitRequest,
    ApiResponse,
    LoginResponse,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    ConflictError,
} from '../types';
import logger from '../utils/logger';

// Register new user
export const register = async (
    req: Request<{}, {}, RegisterRequest>,
    res: Response<ApiResponse<LoginResponse>>,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password, full_name, phone } = req.body;

        // Validate email
        if (!isValidEmail(email)) {
            throw new ValidationError('Invalid email format');
        }

        // Validate password strength
        const passwordValidation = isStrongPassword(password);
        if (!passwordValidation.isValid) {
            throw new ValidationError(passwordValidation.errors.join(', '));
        }

        // Check if user already exists
        const existingUsers = await query<User[]>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            throw new ConflictError('User with this email already exists');
        }

        // Generate Solana wallet
        const wallet = Keypair.generate();
        const walletAddress = wallet.publicKey.toString();
        const walletPrivateKey = bs58.encode(wallet.secretKey); // Store encrypted in production!

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert user
        const result = await query<any>(
            `INSERT INTO users (email, password_hash, full_name, phone, wallet_address, wallet_private_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, full_name, phone || null, walletAddress, walletPrivateKey]
        );

        const userId = result.insertId;

        // Create SOL balance entry
        await query(
            `INSERT INTO sol_balances (user_id, wallet_address, balance, locked_balance, available_balance)
       VALUES (?, ?, 0, 0, 0)`,
            [userId, walletAddress]
        );

        // Fetch created user
        const users = await query<User[]>(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        const user = users[0];

        // Generate JWT
        const token = generateToken(createJWTPayload(user));

        // Log audit
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES (?, 'REGISTER', 'USER', ?, ?)`,
            [userId, userId, req.ip]
        );

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    wallet_address: user.wallet_address,
                    is_admin: user.is_admin,
                    kyc_status: user.kyc_status,
                },
            },
            message: 'User registered successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Login user
export const login = async (
    req: Request<{}, {}, LoginRequest>,
    res: Response<ApiResponse<LoginResponse>>,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user
        const users = await query<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            throw new AuthenticationError('Invalid email or password');
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            throw new AuthenticationError('Account is deactivated');
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AuthenticationError('Invalid email or password');
        }

        // Update last login
        await query(
            'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
            [req.ip, user.id]
        );

        // Generate JWT
        const token = generateToken(createJWTPayload(user));

        // Log audit
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES (?, 'LOGIN', 'USER', ?, ?)`,
            [user.id, user.id, req.ip]
        );

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    wallet_address: user.wallet_address,
                    is_admin: user.is_admin,
                    kyc_status: user.kyc_status,
                },
            },
            message: 'Login successful',
        });
    } catch (error) {
        next(error);
    }
};

// Submit KYC
export const submitKYC = async (
    req: Request<{}, {}, KYCSubmitRequest>,
    res: Response<ApiResponse>,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const {
            document_type,
            document_number,
            date_of_birth,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
        } = req.body;

        // Check if KYC already submitted or approved
        const existingKYC = await query<KYCRecord[]>(
            'SELECT * FROM kyc_records WHERE user_id = ?',
            [userId]
        );

        if (existingKYC.length > 0 && existingKYC[0].status === 'APPROVED') {
            throw new ConflictError('KYC already approved');
        }

        if (existingKYC.length > 0 && existingKYC[0].status === 'PENDING') {
            throw new ConflictError('KYC already submitted and pending review');
        }

        // Insert or update KYC record
        if (existingKYC.length > 0) {
            await query(
                `UPDATE kyc_records SET
         document_type = ?, document_number = ?, date_of_birth = ?,
         address_line1 = ?, address_line2 = ?, city = ?, state = ?,
         postal_code = ?, country = ?, status = 'PENDING', updated_at = NOW()
         WHERE user_id = ?`,
                [
                    document_type,
                    document_number,
                    date_of_birth,
                    address_line1,
                    address_line2,
                    city,
                    state,
                    postal_code,
                    country,
                    userId,
                ]
            );
        } else {
            await query(
                `INSERT INTO kyc_records (
          user_id, document_type, document_number, date_of_birth,
          address_line1, address_line2, city, state, postal_code, country, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                [
                    userId,
                    document_type,
                    document_number,
                    date_of_birth,
                    address_line1,
                    address_line2,
                    city,
                    state,
                    postal_code,
                    country,
                ]
            );
        }

        // Update user KYC status
        await query('UPDATE users SET kyc_status = ? WHERE id = ?', ['PENDING', userId]);

        // Create notification
        await query(
            `INSERT INTO notifications (user_id, type, category, title, message)
       VALUES (?, 'INFO', 'KYC', 'KYC Submitted', 'Your KYC application has been submitted for review')`,
            [userId]
        );

        logger.info(`KYC submitted by user ${userId}`);

        res.json({
            success: true,
            message: 'KYC submitted successfully for review',
        });
    } catch (error) {
        next(error);
    }
};

// List KYC applications (Admin only)
export const listKYC = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const status = req.query.status as string;

        let sql = `
      SELECT k.*, u.email, u.full_name, u.wallet_address
      FROM kyc_records k
      JOIN users u ON k.user_id = u.id
    `;

        const params: any[] = [];

        if (status) {
            sql += ' WHERE k.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY k.submitted_at DESC';

        const kycRecords = await query(sql, params);

        res.json({
            success: true,
            data: kycRecords,
        });
    } catch (error) {
        next(error);
    }
};

// Get KYC details (Admin only)
export const getKYCDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const records = await query<any[]>(
            `SELECT k.*, u.email, u.full_name, u.phone, u.wallet_address
       FROM kyc_records k
       JOIN users u ON k.user_id = u.id
       WHERE k.id = ?`,
            [id]
        );

        if (records.length === 0) {
            throw new NotFoundError('KYC record not found');
        }

        res.json({
            success: true,
            data: records[0],
        });
    } catch (error) {
        next(error);
    }
};

// Approve/Reject KYC (Admin only)
export const approveKYC = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;
        const adminId = req.user!.userId;

        if (!['APPROVED', 'REJECTED', 'RESUBMIT'].includes(status)) {
            throw new ValidationError('Invalid status');
        }

        if (status === 'REJECTED' && !rejection_reason) {
            throw new ValidationError('Rejection reason is required');
        }

        // Get KYC record
        const records = await query<KYCRecord[]>(
            'SELECT * FROM kyc_records WHERE id = ?',
            [id]
        );

        if (records.length === 0) {
            throw new NotFoundError('KYC record not found');
        }

        const kycRecord = records[0];

        // Update KYC status
        await query(
            `UPDATE kyc_records SET status = ?, rejection_reason = ?, verified_by = ?, verified_at = NOW()
       WHERE id = ?`,
            [status, rejection_reason || null, adminId, id]
        );

        // Update user KYC status
        await query('UPDATE users SET kyc_status = ? WHERE id = ?', [status, kycRecord.user_id]);

        // Create notification
        const notificationMessage =
            status === 'APPROVED'
                ? 'Your KYC has been approved'
                : status === 'REJECTED'
                    ? `Your KYC has been rejected: ${rejection_reason}`
                    : 'Please resubmit your KYC with correct information';

        await query(
            `INSERT INTO notifications (user_id, type, category, title, message)
       VALUES (?, ?, 'KYC', ?, ?)`,
            [kycRecord.user_id, status === 'APPROVED' ? 'SUCCESS' : 'WARNING', 'KYC Update', notificationMessage]
        );

        logger.info(`KYC ${id} ${status} by admin ${adminId}`);

        res.json({
            success: true,
            message: `KYC ${status.toLowerCase()} successfully`,
        });
    } catch (error) {
        next(error);
    }
};

export default {
    register,
    login,
    submitKYC,
    listKYC,
    getKYCDetails,
    approveKYC,
};
