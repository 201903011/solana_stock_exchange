import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query, queryOne, beginTransaction } from '../database/connection';
import { AuthRequest, ApiResponse, DepositRequest, WithdrawalRequest, BankAccountCreation } from '../types';
import { config } from '../config';
import { getUserSolBalance } from '../utils/solana';
import { PublicKey } from '@solana/web3.js';

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});

// Create Deposit Order
export async function createDeposit(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { amount }: DepositRequest = req.body as any;

        const amountLamports = BigInt(amount);
        const minDeposit = BigInt(1000000000); // 1 SOL

        if (amountLamports < minDeposit) {
            return res.status(400).json({
                success: false,
                error: 'Minimum deposit is 1 SOL',
            });
        }

        // Convert lamports to INR (example: 1 SOL = 5000 INR)
        const solToInr = 5000;
        const amountInr = Math.floor(Number(amountLamports) / 1000000000 * solToInr);

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInr * 100, // Amount in paise
            currency: 'INR',
            receipt: `deposit_${userId}_${Date.now()}`,
        });

        // Insert transaction record
        await query(
            `INSERT INTO wallet_transactions (
        user_id, type, amount, status, payment_method, razorpay_order_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, 'DEPOSIT', amount, 'PENDING', 'RAZORPAY', order.id]
        );

        return res.status(201).json({
            success: true,
            data: {
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            message: 'Deposit order created',
        });
    } catch (error) {
        console.error('Create deposit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Verify Deposit Payment
export async function verifyDeposit(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as any;

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', config.razorpay.keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment signature',
            });
        }

        // Update transaction
        await query(
            `UPDATE wallet_transactions
       SET status = ?, razorpay_payment_id = ?, razorpay_signature = ?, completed_at = NOW()
       WHERE user_id = ? AND razorpay_order_id = ? AND type = 'DEPOSIT'`,
            ['COMPLETED', razorpay_payment_id, razorpay_signature, userId, razorpay_order_id]
        );

        return res.status(200).json({
            success: true,
            message: 'Deposit verified successfully',
        });
    } catch (error) {
        console.error('Verify deposit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Request Withdrawal
export async function requestWithdrawal(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { amount, bank_account_id }: WithdrawalRequest = req.body as any;

        const amountLamports = BigInt(amount);
        const minWithdrawal = BigInt(500000000); // 0.5 SOL

        if (amountLamports < minWithdrawal) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Minimum withdrawal is 0.5 SOL',
            });
        }

        // Get user wallet
        const user = await queryOne<{ wallet_address: string }>(
            'SELECT wallet_address FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Wallet address not configured',
            });
        }

        // Check SOL balance
        const balance = await getUserSolBalance(new PublicKey(user.wallet_address));
        if (balance < amountLamports) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Insufficient SOL balance',
            });
        }

        // Verify bank account
        const bankAccount = await queryOne(
            'SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?',
            [bank_account_id, userId]
        );

        if (!bankAccount) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Bank account not found',
            });
        }

        // Insert withdrawal request
        const result = await connection.execute(
            `INSERT INTO wallet_transactions (
        user_id, type, amount, status, payment_method, bank_account_number, bank_ifsc, bank_account_holder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                'WITHDRAWAL',
                amount,
                'PENDING',
                'BANK_TRANSFER',
                bankAccount.account_number,
                bankAccount.ifsc_code,
                bankAccount.account_holder_name,
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            data: {
                withdrawalId: (result[0] as any).insertId,
            },
            message: 'Withdrawal request submitted',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Request withdrawal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    } finally {
        connection.release();
    }
}

// Get Wallet Transactions
export async function getWalletTransactions(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, type } = req.query as any;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE user_id = ?';
        const params: any[] = [userId];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const transactions = await query(
            `SELECT * FROM wallet_transactions
       ${whereClause}
       ORDER BY initiated_at DESC
       LIMIT ? OFFSET ?`,
            [...params, Number(limit), offset]
        );

        const [{ total }] = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM wallet_transactions ${whereClause}`,
            params
        );

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Add Bank Account
export async function addBankAccount(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const bankData: BankAccountCreation = req.body as any;

        // Check if account already exists
        const existing = await queryOne(
            'SELECT id FROM bank_accounts WHERE user_id = ? AND account_number = ?',
            [userId, bankData.account_number]
        );

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Bank account already added',
            });
        }

        // If this is first account, make it primary
        const count = await queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM bank_accounts WHERE user_id = ?',
            [userId]
        );

        const isPrimary = count && count.count === 0;

        // Insert bank account
        const result = await query(
            `INSERT INTO bank_accounts (
        user_id, account_holder_name, account_number, ifsc_code,
        bank_name, branch_name, account_type, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                bankData.account_holder_name,
                bankData.account_number,
                bankData.ifsc_code,
                bankData.bank_name || null,
                bankData.branch_name || null,
                bankData.account_type,
                isPrimary,
            ]
        );

        return res.status(201).json({
            success: true,
            data: {
                bankAccountId: (result as any).insertId,
            },
            message: 'Bank account added successfully',
        });
    } catch (error) {
        console.error('Add bank account error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get User Bank Accounts
export async function getBankAccounts(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        const accounts = await query(
            'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: accounts,
        });
    } catch (error) {
        console.error('Get bank accounts error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
