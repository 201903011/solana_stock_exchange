import { Response, NextFunction } from 'express';
import { PublicKey, Keypair } from '@solana/web3.js';
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
    NotificationType,
} from '../types';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { createTradingAccount, getTradingAccountPDA } from '../utils/solana';
import { config } from '../config';
import { NotificationService } from '../services/notification.service';
import { solanaService } from '../services/solana.service';

// Generate wallet for a user
export async function generateWallet(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        console.log('🎬 GENERATING NEW WALLET');

        // Generate new keypair
        const keypair = solanaService.generateKeypair();
        const walletAddress = keypair.publicKey.toBase58();
        const privateKey = Array.from(keypair.secretKey);

        console.log('\n📱 New Wallet Generated:');
        solanaService.printAddressWithExplorer('   Address', keypair.publicKey);
        console.log('   Status: ✅ Generated\n');

        // For security, we don't store the private key in the database
        // The user should save it securely
        return res.status(200).json({
            success: true,
            data: {
                wallet_address: walletAddress,
                private_key: privateKey, // Only return once during generation
                explorer_url: solanaService.getExplorerUrl(walletAddress)
            },
            message: 'Wallet generated successfully. Please save your private key securely.',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Generate wallet error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate wallet',
            timestamp: new Date()
        });
    }
}

// User Registration with enhanced wallet support
export async function register(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { email, password, full_name, phone, wallet_address }: UserRegistration = req.body;

        console.log('\n======================================================================');
        console.log('  USER REGISTRATION');
        console.log('======================================================================\n');

        // Check if user already exists
        const existingUser = await queryOne<User>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists',
                timestamp: new Date()
            });
        }

        // Validate wallet address if provided
        let validatedWalletAddress = wallet_address;
        if (wallet_address) {
            try {
                new PublicKey(wallet_address);
                console.log(`📱 Using provided wallet: ${wallet_address.slice(0, 16)}...`);
            } catch (error) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Solana wallet address',
                    timestamp: new Date()
                });
            }
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Insert user
        const result = await connection.execute(
            'INSERT INTO users (email, password_hash, full_name, phone, wallet_address) VALUES (?, ?, ?, ?, ?)',
            [email, password_hash, full_name, phone || null, validatedWalletAddress || null]
        );

        const userId = (result as any).insertId;

        // Initialize SOL balance cache
        if (validatedWalletAddress) {
            await connection.execute(
                'INSERT INTO sol_balances (user_id, wallet_address, balance, available_balance) VALUES (?, ?, 0, 0)',
                [userId, validatedWalletAddress]
            );
        }

        await connection.commit();

        console.log('👤 User Registration Details:');
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${email}`);
        console.log(`   Name: ${full_name}`);
        if (validatedWalletAddress) {
            solanaService.printAddressWithExplorer('   Wallet', validatedWalletAddress);
        }
        console.log('   Status: ✅ Registered\n');

        // Send welcome notification
        await NotificationService.sendTemplatedNotification(
            userId,
            NotificationType.USER_REGISTRATION,
            { userName: full_name }
        );

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
                    wallet_address: validatedWalletAddress,
                },
                token,
                explorer_url: validatedWalletAddress ? solanaService.getExplorerUrl(validatedWalletAddress) : null
            },
            message: 'User registered successfully',
            timestamp: new Date()
        });
    } catch (error) {
        await connection.rollback();
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Enhanced login with balance sync
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
                timestamp: new Date()
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
                timestamp: new Date()
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
                timestamp: new Date()
            });
        }

        // Sync SOL balance if wallet address exists
        let currentBalance = 0;
        if (user.wallet_address) {
            try {
                const walletPubkey = new PublicKey(user.wallet_address);
                currentBalance = await solanaService.getSOLBalance(walletPubkey);

                // Update balance cache
                await query(
                    `INSERT INTO sol_balances (user_id, wallet_address, balance, available_balance, last_synced)
                     VALUES (?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE 
                     balance = VALUES(balance),
                     available_balance = VALUES(available_balance),
                     last_synced = NOW()`,
                    [user.id, user.wallet_address, Math.floor(currentBalance * 1e9), Math.floor(currentBalance * 1e9)]
                );
            } catch (error) {
                console.warn('Failed to sync SOL balance:', error);
            }
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            isAdmin: user.is_admin,
        });

        console.log(`🔐 User Login: ${email}`);
        console.log(`   Balance: ${currentBalance.toFixed(4)} SOL`);

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    wallet_address: user.wallet_address,
                    is_admin: user.is_admin,
                    sol_balance: currentBalance,
                },
                token,
            },
            message: 'Login successful',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Enhanced profile with real-time balance
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
                timestamp: new Date()
            });
        }

        // Get KYC status
        const kyc = await queryOne<KYCRecord>(
            'SELECT status, trade_account_address, verified_at FROM kyc_records WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        // Get current SOL balance
        let currentBalance = 0;
        if (user.wallet_address) {
            try {
                const walletPubkey = new PublicKey(user.wallet_address);
                currentBalance = await solanaService.getSOLBalance(walletPubkey);
            } catch (error) {
                console.warn('Failed to get SOL balance:', error);
            }
        }

        // Get unread notifications count
        const unreadCount = await NotificationService.getUnreadCount(userId!);

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    ...user,
                    sol_balance: currentBalance,
                    explorer_url: user.wallet_address ? solanaService.getExplorerUrl(user.wallet_address) : null
                },
                kyc: kyc ? {
                    status: kyc.status,
                    trade_account_address: kyc.trade_account_address,
                    verified_at: kyc.verified_at,
                    explorer_url: kyc.trade_account_address ? solanaService.getExplorerUrl(kyc.trade_account_address) : null
                } : null,
                notifications: {
                    unread_count: unreadCount
                }
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Submit KYC with enhanced logging
export async function submitKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const kycData: KYCSubmission = req.body;

        console.log('\n--------------------------------------------------');
        console.log('  KYC SUBMISSION');
        console.log('--------------------------------------------------\n');

        // Check if KYC already submitted
        const existingKYC = await queryOne<KYCRecord>(
            'SELECT id, status FROM kyc_records WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        if (existingKYC && existingKYC.status === 'APPROVED') {
            return res.status(400).json({
                success: false,
                error: 'KYC already approved',
                timestamp: new Date()
            });
        }

        if (existingKYC && existingKYC.status === 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'KYC already submitted and pending verification',
                timestamp: new Date()
            });
        }

        // Insert KYC record
        const result = await query(
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

        const kycId = (result as any).insertId;

        console.log('📋 KYC Submission Details:');
        console.log(`   KYC ID: ${kycId}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Document Type: ${kycData.document_type}`);
        console.log(`   Document Number: ${kycData.document_number}`);
        console.log(`   Address: ${kycData.city}, ${kycData.state}`);
        console.log('   Status: PENDING\n');

        return res.status(201).json({
            success: true,
            data: { kyc_id: kycId },
            message: 'KYC submitted successfully. Verification is pending.',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Submit KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Enhanced KYC approval with Solana integration
export async function approveKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { kycId } = req.params;
        const adminId = req.user?.userId;

        console.log('\n--------------------------------------------------');
        console.log('  KYC APPROVAL PROCESS');
        console.log('--------------------------------------------------\n');

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
                timestamp: new Date()
            });
        }

        if (kyc.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'KYC is not in pending status',
                timestamp: new Date()
            });
        }

        // Get user wallet address
        const user = await queryOne<{ wallet_address: string; full_name: string }>(
            'SELECT wallet_address, full_name FROM users WHERE id = ?',
            [kyc.user_id.toString()]
        );

        if (!user?.wallet_address) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'User wallet address not found',
                timestamp: new Date()
            });
        }

        // Create trading account on Solana
        let tradeAccountAddress: string;
        try {
            const userPubkey = new PublicKey(user.wallet_address);
            const programId = new PublicKey(config.solana.exchangeProgramId);
            const [tradingAccountPDA] = getTradingAccountPDA(userPubkey, programId);
            tradeAccountAddress = tradingAccountPDA.toBase58();

            console.log('🏦 Creating Trading Account:');
            console.log(`   User: ${user.full_name}`);
            solanaService.printAddressWithExplorer('   User Wallet', userPubkey);
            solanaService.printAddressWithExplorer('   Trading Account PDA', tradingAccountPDA);
            console.log('   Status: ✅ Trading account PDA generated\n');

            // Note: The actual transaction should be signed by the user
            // For now, we just store the PDA address
        } catch (error) {
            await connection.rollback();
            console.error('Error creating trading account:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create trading account on Solana',
                timestamp: new Date()
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

        // Send approval notification
        await NotificationService.sendTemplatedNotification(
            kyc.user_id,
            NotificationType.KYC_APPROVED,
            { tradeAccountAddress }
        );

        console.log('✅ KYC Approved Successfully');
        console.log(`   KYC ID: ${kycId}`);
        console.log(`   User: ${user.full_name}`);
        console.log(`   Approved by Admin: ${adminId}`);
        console.log(`   Trading Account: ${tradeAccountAddress.slice(0, 16)}...\n`);

        return res.status(200).json({
            success: true,
            message: 'KYC approved successfully',
            data: {
                trade_account_address: tradeAccountAddress,
                explorer_url: solanaService.getExplorerUrl(tradeAccountAddress)
            },
            timestamp: new Date()
        });
    } catch (error) {
        await connection.rollback();
        console.error('Approve KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Enhanced KYC rejection with notifications
export async function rejectKYC(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { kycId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.userId;

        console.log('\n--------------------------------------------------');
        console.log('  KYC REJECTION');
        console.log('--------------------------------------------------\n');

        // Get KYC record
        const kyc = await queryOne<KYCRecord>(
            'SELECT k.*, u.full_name FROM kyc_records k JOIN users u ON k.user_id = u.id WHERE k.id = ?',
            [kycId]
        );

        if (!kyc) {
            return res.status(404).json({
                success: false,
                error: 'KYC record not found',
                timestamp: new Date()
            });
        }

        if (kyc.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'KYC is not in pending status',
                timestamp: new Date()
            });
        }

        // Update KYC record
        await query(
            `UPDATE kyc_records 
       SET status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
            ['REJECTED', adminId, reason, kycId]
        );

        // Send rejection notification
        await NotificationService.sendTemplatedNotification(
            kyc.user_id,
            NotificationType.KYC_REJECTED,
            { reason }
        );

        console.log('❌ KYC Rejected');
        console.log(`   KYC ID: ${kycId}`);
        console.log(`   User: ${(kyc as any).full_name}`);
        console.log(`   Reason: ${reason}`);
        console.log(`   Rejected by Admin: ${adminId}\n`);

        return res.status(200).json({
            success: true,
            message: 'KYC rejected',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Reject KYC error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Enhanced pending KYCs list
export async function getPendingKYCs(
    req: AuthRequest,
    res: Response
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
            [Number(limit).toString(), offset.toString()]
        );

        const [{ total }] = await query<{ total: number }>(
            'SELECT COUNT(*) as total FROM kyc_records WHERE status = ?',
            ['PENDING']
        );

        const totalPages = Math.ceil(total / Number(limit));

        return res.status(200).json({
            success: true,
            data: kycs.map(kyc => ({
                ...kyc,
                explorer_url: kyc.trade_account_address ? solanaService.getExplorerUrl(kyc.trade_account_address) : null
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages
            },
            message: 'Pending KYCs retrieved successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get pending KYCs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}
