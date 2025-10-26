import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query, queryOne, beginTransaction } from '../database/connection';
import { AuthRequest, ApiResponse, DepositRequest, WithdrawalRequest, BankAccountCreation } from '../types';
import { config } from '../config';
import { getUserSolBalance } from '../utils/solana';
import { PublicKey } from '@solana/web3.js';
import { solanaService } from '../services/solana.service';

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});

// SOL to INR conversion rate (this should ideally come from an API or database config)
// You can update this to fetch from a price API like CoinGecko or maintain in database
const SOL_TO_INR_RATE = 1; // Example: 1 SOL = 12,000 INR
const LAMPORTS_PER_SOL = 1000000000;

/**
 * Get current SOL to INR conversion rate
 * TODO: Implement real-time price fetching from CoinGecko, CoinMarketCap, or other API
 */
async function getSolToInrRate(): Promise<number> {
    try {
        // For now, return static rate
        // In production, fetch from price API or database config
        return SOL_TO_INR_RATE;

        // Example implementation with CoinGecko API (commented):
        // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=inr');
        // const data = await response.json();
        // return data.solana.inr;
    } catch (error) {
        console.error('Error fetching SOL rate:', error);
        return SOL_TO_INR_RATE; // Fallback to static rate
    }
}

// Create Deposit Order (Step 1: Create Razorpay Order)
export async function createDeposit(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { amount }: DepositRequest = req.body as any; // Amount in SOL

        console.log('\n💳 CREATE RAZORPAY DEPOSIT ORDER');
        console.log(`   User ID: ${userId}`);
        console.log(`   Amount: ${amount} SOL\n`);

        const amountSOL = parseFloat(amount);

        // Validate amount
        const minDeposit = 1; // 1 SOL minimum
        const maxDeposit = 100000; // 100000 SOL maximum

        if (amountSOL < minDeposit || amountSOL > maxDeposit) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Deposit amount must be between ${minDeposit} and ${maxDeposit} SOL`,
            });
        }

        // Get user wallet address
        const user = await queryOne<{ wallet_address: string; full_name: string }>(
            'SELECT wallet_address, full_name FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'User wallet address not found. Please complete your profile.',
            });
        }

        // Convert SOL to INR using current rate
        const amountInr = Math.floor(amountSOL * SOL_TO_INR_RATE);
        const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInr * 100, // Amount in paise (smallest currency unit)
            currency: 'INR',
            receipt: `deposit_${userId}_${Date.now()}`,
            notes: {
                user_id: userId?.toString() || '',
                wallet_address: user.wallet_address,
                sol_amount: amountSOL.toString(),
                sol_rate: SOL_TO_INR_RATE.toString(),
            }
        });

        console.log(`📝 Razorpay Order Created:`);
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Amount: ₹${amountInr} (${amountSOL} SOL)`);
        console.log(`   Rate: 1 SOL = ₹${SOL_TO_INR_RATE}`);

        // Insert transaction record with PENDING status
        const result = await connection.execute(
            `INSERT INTO wallet_transactions (
                user_id, type, amount, currency, status, payment_method, 
                razorpay_order_id, amount_inr, sol_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                'DEPOSIT',
                amountLamports,
                'SOL',
                'PENDING',
                'RAZORPAY',
                order.id,
                amountInr,
                SOL_TO_INR_RATE
            ]
        );

        await connection.commit();

        const transactionId = (result[0] as any).insertId;

        console.log(`✅ Transaction Record Created (ID: ${transactionId})\n`);

        return res.status(201).json({
            success: true,
            data: {
                transaction_id: transactionId,
                razorpay_order_id: order.id,
                amount_sol: amountSOL,
                amount_inr: amountInr,
                currency: 'INR',
                razorpay_key_id: config.razorpay.keyId, // For frontend integration
                sol_rate: SOL_TO_INR_RATE,
                user: {
                    name: user.full_name,
                    wallet_address: user.wallet_address,
                }
            },
            message: 'Razorpay order created. Please complete payment.',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create deposit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create deposit order',
        });
    } finally {
        connection.release();
    }
}

// Verify Deposit Payment (Step 2: Verify Razorpay Payment & Airdrop SOL)
export async function verifyDeposit(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as any;

        console.log('\n✅ VERIFY RAZORPAY PAYMENT');
        console.log(`   User ID: ${userId}`);
        console.log(`   Order ID: ${razorpay_order_id}`);
        console.log(`   Payment ID: ${razorpay_payment_id}\n`);

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', config.razorpay.keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            await connection.rollback();
            console.error('❌ Signature verification failed');
            return res.status(400).json({
                success: false,
                error: 'Payment signature verification failed',
            });
        }

        console.log('✅ Signature verified successfully');

        // Get transaction details
        const transaction = await queryOne<{
            id: number;
            amount: string;
            wallet_address: string;
            full_name: string;
            status: string;
        }>(
            `SELECT wt.id, wt.amount, u.wallet_address, u.full_name, wt.status
             FROM wallet_transactions wt
             JOIN users u ON wt.user_id = u.id
             WHERE wt.user_id = ? AND wt.razorpay_order_id = ? AND wt.type = 'DEPOSIT'`,
            [userId, razorpay_order_id]
        );

        if (!transaction) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }

        if (transaction.status === 'COMPLETED') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Transaction already completed',
            });
        }

        // Update transaction to PROCESSING
        await connection.execute(
            `UPDATE wallet_transactions
             SET status = ?, razorpay_payment_id = ?, razorpay_signature = ?
             WHERE id = ?`,
            ['PROCESSING', razorpay_payment_id, razorpay_signature, transaction.id]
        );

        await connection.commit();

        // Airdrop SOL to user's wallet (outside transaction to avoid rollback on error)
        let solanaSignature: string;
        try {
            const walletPubkey = new PublicKey(transaction.wallet_address);
            const amountSOL = parseInt(transaction.amount) / LAMPORTS_PER_SOL;

            console.log(`💰 Airdropping ${amountSOL} SOL to wallet...`);
            solanaSignature = await solanaService.airdropSOL(walletPubkey, amountSOL);

            console.log(`✅ Airdrop Successful:`);
            console.log(`   User: ${transaction.full_name}`);
            console.log(`   Amount: ${amountSOL} SOL`);
            console.log(`   Transaction: ${solanaSignature}`);
            console.log(`   Explorer: ${solanaService.getExplorerUrl(solanaSignature, 'tx')}\n`);

            // Update transaction to COMPLETED with Solana signature
            await query(
                `UPDATE wallet_transactions
                 SET status = ?, transaction_signature = ?, completed_at = NOW()
                 WHERE id = ?`,
                ['COMPLETED', solanaSignature, transaction.id]
            );

            return res.status(200).json({
                success: true,
                data: {
                    transaction_id: transaction.id,
                    amount_sol: amountSOL,
                    solana_signature: solanaSignature,
                    explorer_url: solanaService.getExplorerUrl(solanaSignature, 'tx')
                },
                message: 'Payment verified and SOL deposited successfully',
            });

        } catch (solanaError: any) {
            console.error('❌ Airdrop failed:', solanaError);

            // Update transaction to FAILED
            await query(
                `UPDATE wallet_transactions
                 SET status = ?, failure_reason = ?
                 WHERE id = ?`,
                ['FAILED', solanaError?.message || solanaError.toString(), transaction.id]
            );

            return res.status(500).json({
                success: false,
                error: 'Payment verified but SOL airdrop failed. Please contact support.',
            });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Verify deposit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify payment',
        });
    } finally {
        connection.release();
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

        const amountLamports = BigInt(parseFloat(amount) * LAMPORTS_PER_SOL);
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
