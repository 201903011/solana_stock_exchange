import { Response } from 'express';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { query, queryOne } from '../database/connection';
import { AuthRequest, Company, CompanyRegistration, ApiResponse } from '../types';
import { connection, getAdminWallet, initializeOrderBook } from '../utils/solana';

// Admin: Register Company
export async function registerCompany(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const adminId = req.user?.userId;
        const companyData: CompanyRegistration = req.body as any;

        // Check if symbol already exists
        const existing = await queryOne<Company>(
            'SELECT id FROM companies WHERE symbol = ?',
            [companyData.symbol]
        );

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Company with this symbol already exists',
            });
        }

        // Get admin wallet
        const adminWallet = getAdminWallet();

        // Create new mint for company token
        console.log('Creating new token mint for company:', companyData.symbol);
        const tokenMint = await createMint(
            connection,
            adminWallet, // payer
            adminWallet.publicKey, // mint authority
            adminWallet.publicKey, // freeze authority
            9 // decimals
        );

        console.log('Token mint created:', tokenMint.toString());

        // Create associated token account for admin to hold the minted tokens
        const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            adminWallet,
            tokenMint,
            adminWallet.publicKey
        );

        console.log('Admin token account created:', adminTokenAccount.address.toString());

        // Mint total_shares to admin's token account
        const totalSharesWithDecimals = BigInt(companyData.total_shares) * BigInt(10 ** 9);
        await mintTo(
            connection,
            adminWallet,
            tokenMint,
            adminTokenAccount.address,
            adminWallet.publicKey, // mint authority
            totalSharesWithDecimals
        );

        console.log(`Minted ${companyData.total_shares} tokens to admin account`);

        // Initialize order book for the token
        console.log('Initializing order book for token:', tokenMint.toString());
        const orderBookData = await initializeOrderBook(
            tokenMint,
            companyData.tick_size || '1000000',
            companyData.min_order_size || '1'
        );

        console.log('Order book initialized:', orderBookData.orderBookAddress);

        // Insert company with newly created mint
        const result = await query(
            `INSERT INTO companies (
        symbol, name, description, token_mint, total_shares, sector, industry,
        logo_url, website_url, tick_size, min_order_size, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyData.symbol,
                companyData.name,
                companyData.description || null,
                tokenMint.toString(),
                companyData.total_shares,
                companyData.sector || null,
                companyData.industry || null,
                companyData.logo_url || null,
                companyData.website_url || null,
                companyData.tick_size || '1000000',
                companyData.min_order_size || '1',
                adminId,
            ]
        );

        const companyId = (result as any).insertId;

        return res.status(201).json({
            success: true,
            data: {
                id: companyId,
                symbol: companyData.symbol,
                name: companyData.name,
                token_mint: tokenMint.toString(),
                total_shares: companyData.total_shares,
                admin_token_account: adminTokenAccount.address.toString(),
                minted_amount: totalSharesWithDecimals.toString(),
                order_book_address: orderBookData.orderBookAddress,
                base_vault_address: orderBookData.baseVaultAddress,
                sol_vault_address: orderBookData.solVaultAddress
            },
            message: `Company registered successfully. Minted ${companyData.total_shares} tokens and initialized order book`,
        });
    } catch (error) {
        console.error('Register company error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get All Companies
export async function getAllCompanies(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { page = 1, limit = 20, search = '', is_active = 'true' } = req.query as any;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (symbol LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (is_active !== 'all') {
            whereClause += ' AND is_active = ?';
            params.push(is_active === 'true');
        }

        const companies = await query<Company>(
            `SELECT * FROM companies ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, Number(limit).toString(), offset.toString()]
        );

        const [{ total }] = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM companies ${whereClause}`,
            params
        );

        return res.status(200).json({
            success: true,
            data: {
                companies,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get companies error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get Company by ID
export async function getCompanyById(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { id } = req.params as any;

        const company = await queryOne<Company>(
            'SELECT * FROM companies WHERE id = ?',
            [id]
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: company,
        });
    } catch (error) {
        console.error('Get company error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Admin: Update Company
export async function updateCompany(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { id } = req.params as any;
        const updates = req.body as any;

        const company = await queryOne<Company>(
            'SELECT id FROM companies WHERE id = ?',
            [id]
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        const allowedFields = [
            'name',
            'description',
            'sector',
            'industry',
            'logo_url',
            'website_url',
            'is_active',
        ];

        const updateFields: string[] = [];
        const updateValues: any[] = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update',
            });
        }

        updateValues.push(id);

        await query(
            `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        return res.status(200).json({
            success: true,
            message: 'Company updated successfully',
        });
    } catch (error) {
        console.error('Update company error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
