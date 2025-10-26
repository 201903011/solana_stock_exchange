import { Response } from 'express';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { query, queryOne, beginTransaction } from '../database/connection';
import {
    AuthRequest,
    DepositRequest,
    WithdrawalRequest,
    WalletTransaction,
    WalletTransactionType,
    WalletTransactionStatus,
    PaymentMethod,
    BankAccount,
    BankAccountCreation,
    ApiResponse,
    NotificationType,
} from '../types';
import { NotificationService } from '../services/notification.service';
import { solanaService } from '../services/solana.service';

// Get wallet balance and transactions
export async function getWalletInfo(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        console.log('\n💰 WALLET INFO REQUEST');
        console.log(`   User ID: ${userId}\n`);

        // Get user wallet address
        const user = await queryOne<{ wallet_address: string; full_name: string }>(
            'SELECT wallet_address, full_name FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            return res.status(400).json({
                success: false,
                error: 'User wallet address not found. Please complete your profile.',
                timestamp: new Date()
            });
        }

        // Get real-time SOL balance from Solana
        let realTimeBalance = 0;
        let blockHeight = 0;
        try {
            const walletPubkey = new PublicKey(user.wallet_address);
            realTimeBalance = await solanaService.getSOLBalance(walletPubkey);
            blockHeight = await solanaService.getBlockHeight();

            // Update cached balance
            await query(
                `INSERT INTO sol_balances (user_id, wallet_address, balance, available_balance, last_synced)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE 
                 balance = VALUES(balance),
                 available_balance = VALUES(available_balance),
                 last_synced = NOW()`,
                [userId, user.wallet_address, Math.floor(realTimeBalance * LAMPORTS_PER_SOL), Math.floor(realTimeBalance * LAMPORTS_PER_SOL)]
            );

            console.log(`💰 Real-time Balance Check:`);
            console.log(`   User: ${user.full_name}`);
            solanaService.printAddressWithExplorer('   Wallet', walletPubkey);
            console.log(`   Balance: ${realTimeBalance.toFixed(4)} SOL`);
            console.log(`   Block Height: ${blockHeight}\n`);
        } catch (error) {
            console.error('Error fetching real-time balance:', error);
        }

        // Get recent transactions
        const transactions = await query<WalletTransaction>(
            `SELECT * FROM wallet_transactions 
             WHERE user_id = ? 
             ORDER BY initiated_at DESC 
             LIMIT 20`,
            [userId]
        );

        // Get bank accounts
        const bankAccounts = await query<BankAccount>(
            'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: {
                wallet: {
                    address: user.wallet_address,
                    sol_balance: realTimeBalance,
                    sol_balance_lamports: Math.floor(realTimeBalance * LAMPORTS_PER_SOL),
                    explorer_url: solanaService.getExplorerUrl(user.wallet_address),
                    last_synced: new Date(),
                    block_height: blockHeight
                },
                recent_transactions: transactions.map(tx => ({
                    ...tx,
                    explorer_url: tx.transaction_signature ? solanaService.getExplorerUrl(tx.transaction_signature, 'tx') : null
                })),
                bank_accounts: bankAccounts
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get wallet info error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Deposit SOL (simulated airdrop for testing)
export async function depositSOL(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { amount }: { amount: string } = req.body;

        console.log('\n💸 SOL DEPOSIT REQUEST');
        console.log(`   User ID: ${userId}`);
        console.log(`   Amount: ${amount} SOL\n`);

        const depositAmount = parseFloat(amount);
        if (depositAmount <= 0 || depositAmount > 1000) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Invalid deposit amount. Must be between 0.001 and 1000 SOL.',
                timestamp: new Date()
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
                error: 'User wallet address not found',
                timestamp: new Date()
            });
        }

        // Create deposit transaction record
        const txResult = await connection.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, currency, status, payment_method)
             VALUES (?, ?, ?, 'SOL', 'PROCESSING', 'RAZORPAY')`,
            [userId, 'DEPOSIT', Math.floor(depositAmount * LAMPORTS_PER_SOL)]
        );

        const transactionId = (txResult as Array<any>)[0].insertId;

        try {
            // Perform airdrop on Solana (for testing)
            const walletPubkey = new PublicKey(user.wallet_address);
            const signature = await solanaService.airdropSOL(walletPubkey, depositAmount);

            // Update transaction with signature
            await connection.execute(
                'UPDATE wallet_transactions SET status = ?, transaction_signature = ?, completed_at = NOW() WHERE id = ?',
                ['COMPLETED', signature, transactionId]
            );

            await connection.commit();

            // Send notification
            await NotificationService.sendTemplatedNotification(
                userId!,
                NotificationType.DEPOSIT_CONFIRMED,
                { amount: `${depositAmount}` }
            );

            console.log(`✅ Deposit Successful:`);
            console.log(`   User: ${user.full_name}`);
            console.log(`   Amount: ${depositAmount} SOL`);
            console.log(`   Transaction: ${signature}`);
            console.log(`   Explorer: ${solanaService.getExplorerUrl(signature, 'tx')}\n`);

            return res.status(200).json({
                success: true,
                data: {
                    transaction_id: transactionId,
                    amount: depositAmount,
                    signature,
                    explorer_url: solanaService.getExplorerUrl(signature, 'tx')
                },
                message: `Successfully deposited ${depositAmount} SOL`,
                timestamp: new Date()
            });

        } catch (solanaError: any) {
            // Update transaction status to failed
            await connection.execute(
                'UPDATE wallet_transactions SET status = ?, failure_reason = ? WHERE id = ?',
                ['FAILED', solanaError?.message || solanaError.toString(), transactionId]
            );

            await connection.commit();
            throw solanaError;
        }

    } catch (error) {
        await connection.rollback();
        console.error('Deposit SOL error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process deposit',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Withdraw SOL
export async function withdrawSOL(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const { amount, destination_address }: { amount: string; destination_address: string } = req.body;

        console.log('\n💸 SOL WITHDRAWAL REQUEST');
        console.log(`   User ID: ${userId}`);
        console.log(`   Amount: ${amount} SOL`);
        console.log(`   Destination: ${destination_address.slice(0, 16)}...\n`);

        const withdrawAmount = parseFloat(amount);
        if (withdrawAmount <= 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Invalid withdrawal amount',
                timestamp: new Date()
            });
        }

        // Validate destination address
        let destinationPubkey: PublicKey;
        try {
            destinationPubkey = new PublicKey(destination_address);
        } catch (error) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Invalid destination address',
                timestamp: new Date()
            });
        }

        // Get user wallet and check balance
        const user = await queryOne<{ wallet_address: string; full_name: string }>(
            'SELECT wallet_address, full_name FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'User wallet address not found',
                timestamp: new Date()
            });
        }

        // Get real-time balance
        const walletPubkey = new PublicKey(user.wallet_address);
        const currentBalance = await solanaService.getSOLBalance(walletPubkey);

        console.log(`💰 Pre-Withdrawal Verification:`);
        console.log(`   User: ${user.full_name}`);
        console.log(`   Current Balance: ${currentBalance.toFixed(4)} SOL`);
        console.log(`   Withdrawal Amount: ${withdrawAmount} SOL`);

        // Calculate withdrawal fee (0.1%)
        const feePercentage = 0.001; // 0.1%
        const withdrawalFee = withdrawAmount * feePercentage;
        const netAmount = withdrawAmount - withdrawalFee;

        if (currentBalance < withdrawAmount + 0.01) { // 0.01 SOL buffer for transaction fees
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Insufficient balance. Available: ${currentBalance.toFixed(4)} SOL, Required: ${(withdrawAmount + 0.01).toFixed(4)} SOL`,
                timestamp: new Date()
            });
        }

        // Create withdrawal transaction record
        const txResult = await connection.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, currency, status, payment_method)
             VALUES (?, ?, ?, 'SOL', 'PROCESSING', 'BANK_TRANSFER')`,
            [userId, 'WITHDRAWAL', Math.floor(withdrawAmount * LAMPORTS_PER_SOL)]
        );

        const transactionId = (txResult as any).insertId;

        // For demonstration, we'll simulate a successful withdrawal
        // In production, this would integrate with actual payment processing
        const mockSignature = 'withdraw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        await connection.execute(
            'UPDATE wallet_transactions SET status = ?, transaction_signature = ?, completed_at = NOW() WHERE id = ?',
            ['COMPLETED', mockSignature, transactionId]
        );

        await connection.commit();

        // Send notifications
        await NotificationService.sendTemplatedNotification(
            userId!,
            NotificationType.WITHDRAWAL_PROCESSING,
            { amount: `${netAmount.toFixed(4)}` }
        );

        setTimeout(async () => {
            await NotificationService.sendTemplatedNotification(
                userId!,
                NotificationType.WITHDRAWAL_CONFIRMED,
                { signature: mockSignature }
            );
        }, 1000);

        console.log(`💸 Withdrawal Breakdown:`);
        console.log(`   Gross Amount: ${withdrawAmount.toFixed(4)} SOL`);
        console.log(`   Withdrawal Fee (0.1%): ${withdrawalFee.toFixed(4)} SOL`);
        console.log(`   Net Amount: ${netAmount.toFixed(4)} SOL\n`);

        console.log(`✅ Withdrawal Processed:`);
        console.log(`   Transaction ID: ${transactionId}`);
        console.log(`   Signature: ${mockSignature}`);
        console.log(`   Status: COMPLETED\n`);

        return res.status(200).json({
            success: true,
            data: {
                transaction_id: transactionId,
                gross_amount: withdrawAmount,
                fee: withdrawalFee,
                net_amount: netAmount,
                signature: mockSignature,
                status: 'COMPLETED'
            },
            message: `Withdrawal of ${netAmount.toFixed(4)} SOL processed successfully`,
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Withdraw SOL error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process withdrawal',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Add bank account
export async function addBankAccount(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const bankData: BankAccountCreation = req.body;

        // Check if account already exists
        const existingAccount = await queryOne<BankAccount>(
            'SELECT id FROM bank_accounts WHERE user_id = ? AND account_number = ?',
            [userId, bankData.account_number]
        );

        if (existingAccount) {
            return res.status(400).json({
                success: false,
                error: 'Bank account already exists',
                timestamp: new Date()
            });
        }

        // If this is the first bank account, make it primary
        const accountCount = await queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM bank_accounts WHERE user_id = ?',
            [userId]
        );

        const isPrimary = accountCount?.count === 0;

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
                isPrimary
            ]
        );

        const bankAccountId = (result as any).insertId;

        return res.status(201).json({
            success: true,
            data: { bank_account_id: bankAccountId },
            message: 'Bank account added successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Add bank account error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Get transaction history
export async function getTransactionHistory(
    req: AuthRequest,
    res: Response
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, type } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE user_id = ?';
        const params: any[] = [userId];

        if (type && ['DEPOSIT', 'WITHDRAWAL'].includes(type as string)) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const transactions = await query<WalletTransaction>(
            `SELECT * FROM wallet_transactions 
             ${whereClause}
             ORDER BY initiated_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit.toString(), offset.toString()]
        );

        const [{ total }] = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM wallet_transactions ${whereClause}`,
            params
        );

        const totalPages = Math.ceil(total / Number(limit));

        return res.status(200).json({
            success: true,
            data: transactions.map(tx => ({
                ...tx,
                amount_sol: (Number(tx.amount) / LAMPORTS_PER_SOL).toFixed(4),
                explorer_url: tx.transaction_signature ? solanaService.getExplorerUrl(tx.transaction_signature, 'tx') : null
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Legacy functions for compatibility
export async function createDeposit(req: AuthRequest, res: Response<ApiResponse>): Promise<Response> {
    // Redirect to new depositSOL function
    return depositSOL(req, res);
}

export async function verifyDeposit(req: AuthRequest, res: Response<ApiResponse>): Promise<Response> {
    return res.status(200).json({
        success: true,
        message: 'Deposit verification not needed for direct SOL deposits',
        timestamp: new Date()
    });
}

export async function requestWithdrawal(req: AuthRequest, res: Response<ApiResponse>): Promise<Response> {
    // Redirect to new withdrawSOL function  
    return withdrawSOL(req, res);
}

export async function getWalletTransactions(req: AuthRequest, res: Response<ApiResponse>): Promise<Response> {
    // Redirect to new getTransactionHistory function
    return getTransactionHistory(req, res);
}

export async function getBankAccounts(req: AuthRequest, res: Response<ApiResponse>): Promise<Response> {
    try {
        const userId = req.user?.userId;

        const accounts = await query<BankAccount>(
            'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: accounts,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get bank accounts error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

