import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { query, queryOne, beginTransaction } from '../database/connection';
import {
    AuthRequest,
    Company,
    CompanyRegistration,
    IPO,
    IPOCreation,
    IPOApplication,
    IPOApplicationRequest,
    ApiResponse,
    NotificationType,
} from '../types';
import { NotificationService } from '../services/notification.service';
import { solanaService } from '../services/solana.service';

// Create new company/stock token
export async function createCompany(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const adminId = req.user?.userId;
        const companyData: CompanyRegistration = req.body;

        console.log('\n======================================================================');
        console.log('  COMPANY/TOKEN CREATION');
        console.log('======================================================================\n');

        // Validate admin permission (in real app, this would be more sophisticated)
        if (!req.user?.isAdmin) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'Only administrators can create companies',
                timestamp: new Date()
            });
        }

        // Check if company symbol already exists
        const existingCompany = await queryOne<Company>(
            'SELECT id FROM companies WHERE symbol = ?',
            [companyData.symbol]
        );

        if (existingCompany) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Company symbol already exists',
                timestamp: new Date()
            });
        }

        console.log('🏭 Creating Company Token:');
        console.log(`   Company: ${companyData.name}`);
        console.log(`   Symbol: ${companyData.symbol}`);
        console.log(`   Total Shares: ${Number(companyData.total_shares).toLocaleString()}`);
        console.log(`   Sector: ${companyData.sector || 'Not specified'}\n`);

        // Create SPL token on Solana
        let tokenMintAddress: string;
        let creationSignature: string;

        try {
            const { mintAddress, signature } = await solanaService.createToken(
                companyData.symbol,
                Number(companyData.total_shares),
                9 // Standard 9 decimals
            );

            tokenMintAddress = mintAddress.toBase58();
            creationSignature = signature;

            console.log(`✅ Token Created Successfully:`);
            solanaService.printAddressWithExplorer('   Token Mint', mintAddress);
            console.log(`   Decimals: 9`);
            console.log(`   Status: ✅ Created on-chain\n`);
        } catch (error) {
            await connection.rollback();
            console.error('Error creating SPL token:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create token on Solana',
                timestamp: new Date()
            });
        }

        // Insert company record
        const result = await connection.execute(
            `INSERT INTO companies (
                symbol, name, description, token_mint, total_shares, 
                outstanding_shares, sector, industry, logo_url, website_url,
                tick_size, min_order_size, registered_by
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyData.symbol,
                companyData.name,
                companyData.description || null,
                tokenMintAddress,
                companyData.total_shares,
                companyData.sector || null,
                companyData.industry || null,
                companyData.logo_url || null,
                companyData.website_url || null,
                companyData.tick_size || '1000000', // Default 0.001 SOL
                companyData.min_order_size || '1',
                adminId
            ]
        );

        const companyId = (result as any).insertId;

        // Initialize market data
        await connection.execute(
            `INSERT INTO market_data (company_id, current_price, high_24h, low_24h)
             VALUES (?, 0, 0, 0)`,
            [companyId]
        );

        await connection.commit();

        console.log(`✅ Company Registration Complete:`);
        console.log(`   Company ID: ${companyId}`);
        console.log(`   Token Mint: ${tokenMintAddress}`);
        console.log(`   Status: REGISTERED\n`);

        return res.status(201).json({
            success: true,
            data: {
                company_id: companyId,
                symbol: companyData.symbol,
                name: companyData.name,
                token_mint: tokenMintAddress,
                explorer_url: solanaService.getExplorerUrl(tokenMintAddress),
                creation_signature: creationSignature
            },
            message: 'Company and token created successfully',
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Create company error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// List company for trading
export async function listCompany(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { companyId } = req.params;
        const { initial_price } = req.body;
        const adminId = req.user?.userId;

        console.log('\n--------------------------------------------------');
        console.log('  COMPANY LISTING FOR TRADING');
        console.log('--------------------------------------------------\n');

        // Validate admin permission
        if (!req.user?.isAdmin) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'Only administrators can list companies',
                timestamp: new Date()
            });
        }

        // Get company details
        const company = await queryOne<Company>(
            'SELECT * FROM companies WHERE id = ?',
            [companyId]
        );

        if (!company) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Company not found',
                timestamp: new Date()
            });
        }

        if (company.is_active) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Company is already listed for trading',
                timestamp: new Date()
            });
        }

        const initialPriceLamports = Math.floor(parseFloat(initial_price) * 1e9); // Convert SOL to lamports

        // Update company status and set listing date
        await connection.execute(
            'UPDATE companies SET is_active = true, listed_at = NOW() WHERE id = ?',
            [companyId]
        );

        // Update market data with initial price
        await connection.execute(
            `UPDATE market_data 
             SET current_price = ?, high_24h = ?, low_24h = ?
             WHERE company_id = ?`,
            [initialPriceLamports, initialPriceLamports, initialPriceLamports, companyId]
        );

        await connection.commit();

        console.log('📈 Company Listed for Trading:');
        console.log(`   Company: ${company.name} (${company.symbol})`);
        console.log(`   Starting Price: ${initial_price} SOL`);
        console.log(`   Token Mint: ${company.token_mint}`);
        console.log(`   Status: ACTIVE\n`);

        // Send listing notification to all users
        await NotificationService.sendGlobalNotification(
            NotificationType.NEW_LISTING,
            'New Stock Listed',
            `${company.symbol} is now available for trading at ${initial_price} SOL`,
            {
                symbol: company.symbol,
                companyName: company.name,
                price: initial_price,
                tokenMint: company.token_mint
            }
        );

        console.log('✅ Listing notifications sent to all users\n');

        return res.status(200).json({
            success: true,
            data: {
                company_id: company.id,
                symbol: company.symbol,
                name: company.name,
                initial_price: parseFloat(initial_price),
                token_mint: company.token_mint,
                explorer_url: solanaService.getExplorerUrl(company.token_mint),
                status: 'ACTIVE'
            },
            message: 'Company listed for trading successfully',
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('List company error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Create IPO
export async function createIPO(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const ipoData: IPOCreation = req.body;
        const adminId = req.user?.userId;

        console.log('\n======================================================================');
        console.log('  IPO CREATION');
        console.log('======================================================================\n');

        // Validate admin permission
        if (!req.user?.isAdmin) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'Only administrators can create IPOs',
                timestamp: new Date()
            });
        }

        // Get company details
        const company = await queryOne<Company>(
            'SELECT * FROM companies WHERE id = ?',
            [ipoData.company_id]
        );

        if (!company) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Company not found',
                timestamp: new Date()
            });
        }

        // Check if IPO already exists for this company
        const existingIPO = await queryOne<IPO>(
            'SELECT id FROM ipos WHERE company_id = ? AND status IN ("UPCOMING", "OPEN")',
            [ipoData.company_id]
        );

        if (existingIPO) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Active IPO already exists for this company',
                timestamp: new Date()
            });
        }

        const pricePerShareLamports = Math.floor(parseFloat(ipoData.price_per_share) * 1e9);
        const totalShares = BigInt(ipoData.total_shares);
        const minSubscription = BigInt(ipoData.min_subscription);
        const maxSubscription = BigInt(ipoData.max_subscription);

        console.log('🎯 IPO Details:');
        console.log(`   Company: ${company.name} (${company.symbol})`);
        console.log(`   Title: ${ipoData.title}`);
        console.log(`   Total Shares: ${totalShares.toLocaleString()}`);
        console.log(`   Price per Share: ${ipoData.price_per_share} SOL`);
        console.log(`   Min Subscription: ${minSubscription.toLocaleString()}`);
        console.log(`   Max Subscription: ${maxSubscription.toLocaleString()}`);
        console.log(`   Open Date: ${ipoData.open_date}`);
        console.log(`   Close Date: ${ipoData.close_date}\n`);

        // Insert IPO record
        const result = await connection.execute(
            `INSERT INTO ipos (
                company_id, title, description, total_shares, price_per_share,
                min_subscription, max_subscription, open_date, close_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ipoData.company_id,
                ipoData.title,
                ipoData.description || null,
                totalShares.toString(),
                pricePerShareLamports,
                minSubscription.toString(),
                maxSubscription.toString(),
                ipoData.open_date,
                ipoData.close_date,
                adminId
            ]
        );

        const ipoId = (result as any).insertId;

        await connection.commit();

        console.log(`✅ IPO Created Successfully:`);
        console.log(`   IPO ID: ${ipoId}`);
        console.log(`   Status: UPCOMING\n`);

        return res.status(201).json({
            success: true,
            data: {
                ipo_id: ipoId,
                company_symbol: company.symbol,
                company_name: company.name,
                title: ipoData.title,
                total_shares: totalShares.toString(),
                price_per_share: parseFloat(ipoData.price_per_share),
                status: 'UPCOMING'
            },
            message: 'IPO created successfully',
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Create IPO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
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
        const applicationData: IPOApplicationRequest = req.body;

        console.log('\n--------------------------------------------------');
        console.log('  IPO APPLICATION');
        console.log('--------------------------------------------------\n');

        // Get IPO details
        const ipo = await queryOne<IPO & { company_symbol: string; company_name: string; token_mint: string }>(
            `SELECT i.*, c.symbol as company_symbol, c.name as company_name, c.token_mint
             FROM ipos i 
             JOIN companies c ON i.company_id = c.id 
             WHERE i.id = ?`,
            [applicationData.ipo_id]
        );

        if (!ipo) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'IPO not found',
                timestamp: new Date()
            });
        }

        if (ipo.status !== 'OPEN') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'IPO is not open for applications',
                timestamp: new Date()
            });
        }

        // Check if user already applied
        const existingApplication = await queryOne<IPOApplication>(
            'SELECT id FROM ipo_applications WHERE ipo_id = ? AND user_id = ?',
            [applicationData.ipo_id, userId]
        );

        if (existingApplication) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'You have already applied to this IPO',
                timestamp: new Date()
            });
        }

        const quantity = BigInt(applicationData.quantity);
        const totalAmount = BigInt(ipo.price_per_share) * quantity;

        // Validate quantity limits
        if (quantity < BigInt(ipo.min_subscription)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Minimum subscription is ${ipo.min_subscription} shares`,
                timestamp: new Date()
            });
        }

        if (quantity > BigInt(ipo.max_subscription)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Maximum subscription is ${ipo.max_subscription} shares`,
                timestamp: new Date()
            });
        }

        // Get user details
        const user = await queryOne<{ full_name: string; wallet_address: string }>(
            'SELECT full_name, wallet_address FROM users WHERE id = ?',
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

        // Check user's SOL balance
        const walletPubkey = new PublicKey(user.wallet_address);
        const solBalance = await solanaService.getSOLBalance(walletPubkey);
        const requiredSOL = Number(totalAmount) / 1e9;

        if (solBalance < requiredSOL) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Insufficient SOL balance. Required: ${requiredSOL.toFixed(4)} SOL, Available: ${solBalance.toFixed(4)} SOL`,
                timestamp: new Date()
            });
        }

        console.log('📋 IPO Application Details:');
        console.log(`   User: ${user.full_name}`);
        console.log(`   Company: ${ipo.company_name} (${ipo.company_symbol})`);
        console.log(`   Quantity: ${quantity.toLocaleString()} shares`);
        console.log(`   Cost per Share: ${Number(ipo.price_per_share) / 1e9} SOL`);
        console.log(`   Total Cost: ${requiredSOL.toFixed(4)} SOL`);
        console.log(`   User Balance: ${solBalance.toFixed(4)} SOL\n`);

        // Create token account for user if it doesn't exist
        const tokenMintPubkey = new PublicKey(ipo.token_mint);
        const { tokenAccountAddress } = await solanaService.createTokenAccount(
            walletPubkey,
            tokenMintPubkey
        );

        // Insert IPO application
        const appResult = await connection.execute(
            `INSERT INTO ipo_applications (
                ipo_id, user_id, quantity, amount, status, escrow_address
            ) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
            [
                applicationData.ipo_id,
                userId,
                quantity.toString(),
                totalAmount.toString(),
                tokenAccountAddress.toBase58()
            ]
        );

        const applicationId = (appResult as any).insertId;

        // Deduct respective SOL from user's wallet
        // Note: In a production environment, this would typically require:
        // 1. Client-side transaction signing by the user, OR
        // 2. An escrow program to handle the SOL transfer securely
        console.log('💰 Processing SOL payment...');
        console.log(`   Required SOL: ${requiredSOL.toFixed(4)} SOL`);
        console.log(`   From: ${walletPubkey.toString().slice(0, 16)}...`);
        console.log(`   To: Admin/Escrow Wallet`);

        try {
            // Option 1: Client-side signing (recommended for security)
            // Create a transaction for the frontend to sign and verify payment

            const adminPublicKey = solanaService.getAdminPublicKey();
            if (!adminPublicKey) {
                throw new Error('Admin wallet not configured');
            }

            // Check if transaction signature was provided (frontend already signed and sent the transaction)
            if (applicationData.transaction_signature) {
                console.log(`🔍 Verifying SOL transfer transaction: ${applicationData.transaction_signature}`);

                // Verify the transaction exists and is confirmed
                const solanaConnection = solanaService.getConnection();
                const txInfo = await solanaConnection.getTransaction(applicationData.transaction_signature, {
                    commitment: 'confirmed'
                });

                if (!txInfo) {
                    throw new Error('Transaction not found or not confirmed');
                }

                // Verify transaction details
                const instruction = txInfo.transaction.message.instructions[0];
                const accountKeys = txInfo.transaction.message.accountKeys;

                // Check if it's a SOL transfer from user to admin
                const fromAccount = accountKeys[instruction.accounts[0]];
                const toAccount = accountKeys[instruction.accounts[1]];

                if (fromAccount.toString() !== walletPubkey.toString()) {
                    throw new Error('Transaction sender mismatch');
                }

                if (toAccount.toString() !== adminPublicKey.toString()) {
                    throw new Error('Transaction recipient mismatch');
                }

                // Verify transfer amount (approximate check due to fees)
                const postBalance = txInfo.meta?.postBalances[0] || 0;
                const preBalance = txInfo.meta?.preBalances[0] || 0;
                const transferredLamports = preBalance - postBalance;
                const expectedLamports = Math.floor(requiredSOL * 1e9);

                // Allow for transaction fees (typically 5000 lamports)
                const tolerance = 10000; // 0.00001 SOL tolerance for fees
                if (Math.abs(transferredLamports - expectedLamports) > tolerance) {
                    throw new Error(`Transfer amount mismatch. Expected: ${expectedLamports}, Actual: ${transferredLamports}`);
                }

                console.log(`✅ SOL transfer verified:`);
                console.log(`   Transaction: ${applicationData.transaction_signature}`);
                console.log(`   Amount: ${(transferredLamports / 1e9).toFixed(4)} SOL`);
                console.log(`   Status: Confirmed`);

                // Update application with verified transaction
                await connection.execute(
                    'UPDATE ipo_applications SET payment_signature = ? WHERE id = ?',
                    [applicationData.transaction_signature, applicationId]
                );

            } else {
                // No transaction provided - this means frontend needs to create and sign the transaction
                // Return transaction details for frontend to process
                const transferInstruction = {
                    type: 'sol_transfer',
                    from: walletPubkey.toString(),
                    to: adminPublicKey.toString(),
                    amount_lamports: Math.floor(requiredSOL * 1e9),
                    amount_sol: requiredSOL
                };

                // Temporarily save application as PAYMENT_PENDING
                await connection.execute(
                    'UPDATE ipo_applications SET status = ? WHERE id = ?',
                    ['PAYMENT_PENDING', applicationId]
                );

                await connection.commit();

                console.log(`⏳ Payment pending - waiting for client-side transaction:`);
                console.log(`   Required SOL: ${requiredSOL.toFixed(4)} SOL`);
                console.log(`   Transfer to: ${adminPublicKey.toString()}`);

                return res.status(202).json({
                    success: true,
                    data: {
                        application_id: applicationId,
                        ipo_symbol: ipo.company_symbol,
                        quantity: quantity.toString(),
                        total_amount_sol: requiredSOL,
                        token_account: tokenAccountAddress.toBase58(),
                        status: 'PAYMENT_PENDING',
                        payment_instruction: transferInstruction
                    },
                    message: 'IPO application created. Please complete SOL payment to confirm.',
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('❌ Error processing SOL payment:', error);
            // In case of payment failure, rollback the application
            await connection.rollback();
            return res.status(500).json({
                success: false,
                error: 'Failed to process SOL payment. IPO application cancelled.',
                message: error instanceof Error ? error.message : 'Unknown payment error',
                timestamp: new Date()
            });
        }

        // Update IPO subscription count
        await connection.execute(
            'UPDATE ipos SET total_subscribed = total_subscribed + ? WHERE id = ?',
            [quantity.toString(), applicationData.ipo_id]
        );

        await connection.commit();

        console.log(`✅ IPO Application Successful:`);
        console.log(`   Application ID: ${applicationId}`);
        console.log(`   Token Account: ${tokenAccountAddress.toBase58()}`);
        console.log(`   Status: PENDING\n`);

        return res.status(201).json({
            success: true,
            data: {
                application_id: applicationId,
                ipo_symbol: ipo.company_symbol,
                quantity: quantity.toString(),
                total_amount_sol: requiredSOL,
                token_account: tokenAccountAddress.toBase58(),
                status: 'PENDING'
            },
            message: 'IPO application submitted successfully',
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Apply to IPO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Allocate IPO tokens (Admin function)
export async function allocateIPOTokens(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { ipoId } = req.body;
        const adminId = req.user?.userId;

        console.log('\n--------------------------------------------------');
        console.log('  IPO TOKEN ALLOCATION');
        console.log('--------------------------------------------------\n');

        // Validate admin permission
        if (!req.user?.isAdmin) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'Only administrators can allocate IPO tokens',
                timestamp: new Date()
            });
        }

        // Get IPO details
        const ipo = await queryOne<IPO & { company_symbol: string; company_name: string; token_mint: string }>(
            `SELECT i.*, c.symbol as company_symbol, c.name as company_name, c.token_mint
             FROM ipos i 
             JOIN companies c ON i.company_id = c.id 
             WHERE i.id = ?`,
            [ipoId]
        );

        if (!ipo) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'IPO not found',
                timestamp: new Date()
            });
        }

        if (ipo.status !== 'CLOSED') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'IPO must be closed before allocation',
                timestamp: new Date()
            });
        }

        // Get all pending applications
        const applications = await query<IPOApplication & { user_name: string; user_wallet: string }>(
            `SELECT ia.*, u.full_name as user_name, u.wallet_address as user_wallet
             FROM ipo_applications ia
             JOIN users u ON ia.user_id = u.id
             WHERE ia.ipo_id = ? AND ia.status = 'PENDING'`,
            [ipoId]
        );

        if (applications.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'No pending applications found',
                timestamp: new Date()
            });
        }

        console.log(`🎯 Allocating tokens for ${ipo.company_name} IPO:`);
        console.log(`   Total Applications: ${applications.length}`);

        let successfulAllocations = 0;
        const mintPubkey = new PublicKey(ipo.token_mint);

        // Process each application
        for (const app of applications) {
            try {
                // For demonstration, allocate full quantity to each user
                // In real-world, this would involve pro-rata allocation logic
                const allocatedQuantity = app.quantity;

                const userWalletPubkey = new PublicKey(app.user_wallet);
                const tokenAccountPubkey = new PublicKey(app.escrow_address!);

                console.log(`   Processing: ${app.user_name}`);
                console.log(`     Requested: ${Number(app.quantity).toLocaleString()} shares`);
                console.log(`     Allocated: ${Number(allocatedQuantity).toLocaleString()} shares`);

                // Mint tokens to user's account
                const mintSignature = await solanaService.mintTokens(
                    mintPubkey,
                    tokenAccountPubkey,
                    Number(allocatedQuantity) / 1e9, // Convert back to token units
                    9
                );

                // Update application status
                await connection.execute(
                    `UPDATE ipo_applications 
                     SET allotted_quantity = ?, status = 'ALLOTTED', transaction_signature = ?
                     WHERE id = ?`,
                    [allocatedQuantity.toString(), mintSignature, app.id]
                );

                // Add to user holdings
                await connection.execute(
                    `INSERT INTO holdings (user_id, company_id, token_account, quantity, average_price)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     quantity = quantity + VALUES(quantity),
                     average_price = ((quantity * average_price) + (VALUES(quantity) * VALUES(average_price))) / (quantity + VALUES(quantity))`,
                    [
                        app.user_id,
                        ipo.company_id,
                        app.escrow_address,
                        allocatedQuantity.toString(),
                        ipo.price_per_share
                    ]
                );

                // Send notification
                await NotificationService.sendTemplatedNotification(
                    app.user_id,
                    NotificationType.IPO_ALLOTMENT,
                    {
                        symbol: ipo.company_symbol,
                        quantity: Number(allocatedQuantity).toLocaleString()
                    }
                );

                console.log(`     ✅ Tokens minted: ${mintSignature.slice(0, 16)}...`);
                successfulAllocations++;

            } catch (error) {
                console.error(`     ❌ Failed to allocate for ${app.user_name}:`, error);
                // Mark as failed
                await connection.execute(
                    'UPDATE ipo_applications SET status = ? WHERE id = ?',
                    ['REJECTED', app.id]
                );
            }
        }

        // Update IPO status
        await connection.execute(
            'UPDATE ipos SET status = ?, allotment_date = NOW() WHERE id = ?',
            ['ALLOTTED', ipoId]
        );

        await connection.commit();

        console.log(`\n✅ IPO Allocation Complete:`);
        console.log(`   Successful Allocations: ${successfulAllocations}/${applications.length}`);
        console.log(`   IPO Status: ALLOTTED\n`);

        return res.status(200).json({
            success: true,
            data: {
                ipo_id: ipo.id,
                company_symbol: ipo.company_symbol,
                total_applications: applications.length,
                successful_allocations: successfulAllocations,
                status: 'ALLOTTED'
            },
            message: 'IPO tokens allocated successfully',
            timestamp: new Date()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Allocate IPO tokens error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}

// Get listed companies
export async function getListedCompanies(
    req: AuthRequest,
    res: Response
): Promise<Response> {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const companies = await query<Company & { current_price: bigint; price_change_24h: bigint; volume_24h: bigint }>(
            `SELECT c.*, m.current_price, m.price_change_24h, m.volume_24h
             FROM companies c
             LEFT JOIN market_data m ON c.id = m.company_id
             WHERE c.is_active = true
             ORDER BY c.listed_at DESC
             LIMIT ? OFFSET ?`,
            [Number(limit), offset]
        );

        const [{ total }] = await query<{ total: number }>(
            'SELECT COUNT(*) as total FROM companies WHERE is_active = true'
        );

        const totalPages = Math.ceil(total / Number(limit));

        return res.status(200).json({
            success: true,
            data: companies.map(company => ({
                ...company,
                current_price_sol: company.current_price ? Number(company.current_price) / 1e9 : 0,
                explorer_url: solanaService.getExplorerUrl(company.token_mint)
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
        console.error('Get listed companies error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Get active IPOs
export async function getActiveIPOs(
    req: AuthRequest,
    res: Response
): Promise<Response> {
    try {
        const { status = 'OPEN' } = req.query;

        const ipos = await query<IPO & { company_name: string; company_symbol: string; token_mint: string }>(
            `SELECT i.*, c.name as company_name, c.symbol as company_symbol, c.token_mint
             FROM ipos i
             JOIN companies c ON i.company_id = c.id
             WHERE i.status = ?
             ORDER BY i.open_date DESC`,
            [status]
        );

        return res.status(200).json({
            success: true,
            data: ipos.map(ipo => ({
                ...ipo,
                price_per_share_sol: Number(ipo.price_per_share) / 1e9,
                explorer_url: solanaService.getExplorerUrl(ipo.token_mint)
            })),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get active IPOs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    }
}

// Confirm IPO payment (called after user signs SOL transfer transaction)
export async function confirmIPOPayment(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const { application_id, transaction_signature } = req.body;
        const userId = req.user?.userId;

        console.log('\n--------------------------------------------------');
        console.log('  IPO PAYMENT CONFIRMATION');
        console.log('--------------------------------------------------\n');

        // Get application details
        const application = await queryOne<IPOApplication & {
            ipo_id: number;
            user_id: number;
            quantity: string;
            amount: string;
            company_symbol: string;
            user_wallet: string;
            price_per_share: string;
        }>(
            `SELECT ia.*, i.company_id, c.symbol as company_symbol, u.wallet_address as user_wallet, i.price_per_share
             FROM ipo_applications ia
             JOIN ipos i ON ia.ipo_id = i.id
             JOIN companies c ON i.company_id = c.id
             JOIN users u ON ia.user_id = u.id
             WHERE ia.id = ? AND ia.user_id = ?`,
            [application_id, userId]
        );

        if (!application) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'IPO application not found',
                timestamp: new Date()
            });
        }

        if (application.status !== 'PAYMENT_PENDING') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: `Payment already processed. Current status: ${application.status}`,
                timestamp: new Date()
            });
        }

        // Verify the transaction
        console.log(`🔍 Verifying SOL payment transaction: ${transaction_signature}`);

        const adminPublicKey = solanaService.getAdminPublicKey();
        const userWalletPubkey = new PublicKey(application.user_wallet);
        const requiredSOL = Number(application.amount) / 1e9;

        try {
            const solanaConnection = solanaService.getConnection();
            const txInfo = await solanaConnection.getTransaction(transaction_signature, {
                commitment: 'confirmed'
            });

            if (!txInfo) {
                throw new Error('Transaction not found or not confirmed');
            }

            // Verify transaction details
            const instruction = txInfo.transaction.message.instructions[0];
            const accountKeys = txInfo.transaction.message.accountKeys;

            // Check if it's a SOL transfer from user to admin
            const fromAccount = accountKeys[instruction.accounts[0]];
            const toAccount = accountKeys[instruction.accounts[1]];

            if (fromAccount.toString() !== userWalletPubkey.toString()) {
                throw new Error('Transaction sender mismatch');
            }

            if (!adminPublicKey || toAccount.toString() !== adminPublicKey.toString()) {
                throw new Error('Transaction recipient mismatch');
            }

            // Verify transfer amount (approximate check due to fees)
            const postBalance = txInfo.meta?.postBalances[0] || 0;
            const preBalance = txInfo.meta?.preBalances[0] || 0;
            const transferredLamports = preBalance - postBalance;
            const expectedLamports = Math.floor(requiredSOL * 1e9);

            // Allow for transaction fees (typically 5000 lamports)
            const tolerance = 10000; // 0.00001 SOL tolerance for fees
            if (Math.abs(transferredLamports - expectedLamports) > tolerance) {
                throw new Error(`Transfer amount mismatch. Expected: ${expectedLamports}, Actual: ${transferredLamports}`);
            }

            console.log(`✅ SOL payment verified:`);
            console.log(`   Transaction: ${transaction_signature}`);
            console.log(`   Amount: ${(transferredLamports / 1e9).toFixed(4)} SOL`);
            console.log(`   From: ${userWalletPubkey.toString().slice(0, 16)}...`);
            console.log(`   To: ${adminPublicKey.toString().slice(0, 16)}...`);

            // Update application status to PENDING with payment signature
            await connection.execute(
                'UPDATE ipo_applications SET status = ?, payment_signature = ? WHERE id = ?',
                ['PENDING', transaction_signature, application_id]
            );

            // Update IPO subscription count
            await connection.execute(
                'UPDATE ipos SET total_subscribed = total_subscribed + ? WHERE id = ?',
                [application.quantity, application.ipo_id]
            );

            await connection.commit();

            console.log(`✅ IPO Payment Confirmed:`);
            console.log(`   Application ID: ${application_id}`);
            console.log(`   Status: PENDING (Payment Complete)\n`);

            return res.status(200).json({
                success: true,
                data: {
                    application_id: application_id,
                    transaction_signature: transaction_signature,
                    company_symbol: application.company_symbol,
                    quantity: application.quantity,
                    amount_sol: requiredSOL,
                    status: 'PENDING'
                },
                message: 'SOL payment confirmed successfully. IPO application is now pending allocation.',
                timestamp: new Date()
            });

        } catch (verificationError) {
            await connection.rollback();
            console.error('❌ Payment verification failed:', verificationError);
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed',
                message: verificationError instanceof Error ? verificationError.message : 'Unknown verification error',
                timestamp: new Date()
            });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Confirm IPO payment error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
        });
    } finally {
        connection.release();
    }
}