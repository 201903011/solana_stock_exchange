import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { query, queryOne } from '../database/connection';
import { AuthRequest, ApiResponse, PortfolioHolding } from '../types';
import { getUserTokenBalance, connection } from '../utils/solana';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Get User Portfolio
export async function getPortfolio(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;

        // Get user wallet
        const user = await queryOne<{ wallet_address: string }>(
            'SELECT wallet_address FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address not configured',
            });
        }

        // Get all companies
        const companies = await query(
            'SELECT id, symbol, name, token_mint FROM companies WHERE is_active = TRUE'
        );

        const portfolio: any[] = [];
        const userPubkey = new PublicKey(user.wallet_address);

        for (const company of companies) {
            try {
                const tokenMint = new PublicKey(company.token_mint);
                const balance = await getUserTokenBalance(userPubkey, tokenMint);

                if (balance > BigInt(0)) {
                    // Get token account address
                    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPubkey);

                    // Get or create holding record
                    const holding = await queryOne(
                        'SELECT * FROM holdings WHERE user_id = ? AND company_id = ?',
                        [userId, company.id]
                    );

                    // Get latest price from last trade
                    const lastTrade = await queryOne<{ price: bigint }>(
                        'SELECT price FROM trades WHERE company_id = ? ORDER BY executed_at DESC LIMIT 1',
                        [company.id]
                    );

                    const currentPrice = lastTrade?.price || BigInt(0);
                    const averagePrice = holding?.average_price || BigInt(0);
                    const marketValue = balance * currentPrice;
                    const costBasis = balance * averagePrice;
                    const profitLoss = marketValue - costBasis;
                    const profitLossPercentage =
                        costBasis > BigInt(0) ? Number((profitLoss * BigInt(10000)) / costBasis) / 100 : 0;

                    // Update or insert holding
                    if (holding) {
                        await query(
                            'UPDATE holdings SET quantity = ?, last_synced = NOW() WHERE id = ?',
                            [balance.toString(), holding.id]
                        );
                    } else {
                        await query(
                            `INSERT INTO holdings (user_id, company_id, token_account, quantity, average_price)
               VALUES (?, ?, ?, ?, ?)`,
                            [userId, company.id, tokenAccount.toBase58(), balance.toString(), averagePrice.toString()]
                        );
                    }

                    portfolio.push({
                        company: {
                            id: company.id,
                            symbol: company.symbol,
                            name: company.name,
                            token_mint: company.token_mint,
                        },
                        quantity: balance.toString(),
                        token_account: tokenAccount.toBase58(),
                        current_price: currentPrice.toString(),
                        average_price: averagePrice.toString(),
                        market_value: marketValue.toString(),
                        cost_basis: costBasis.toString(),
                        profit_loss: profitLoss.toString(),
                        profit_loss_percentage: profitLossPercentage,
                    });
                }
            } catch (error) {
                console.error(`Error fetching balance for ${company.symbol}:`, error);
                // Continue with next company
            }
        }

        // Calculate total portfolio value
        const totalValue = portfolio.reduce(
            (sum, item) => sum + BigInt(item.market_value),
            BigInt(0)
        );

        return res.status(200).json({
            success: true,
            data: {
                holdings: portfolio,
                total_value: totalValue.toString(),
            },
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get Trade History
export async function getTradeHistory(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, company_id } = req.query as any;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE (t.buyer_id = ? OR t.seller_id = ?)';
        const params: any[] = [userId, userId];

        if (company_id) {
            whereClause += ' AND t.company_id = ?';
            params.push(company_id);
        }

        const trades = await query(
            `SELECT t.*, c.symbol, c.name as company_name,
              CASE WHEN t.buyer_id = ? THEN 'BUY' ELSE 'SELL' END as side
       FROM trades t
       JOIN companies c ON t.company_id = c.id
       ${whereClause}
       ORDER BY t.executed_at DESC
       LIMIT ? OFFSET ?`,
            [userId, ...params, Number(limit), offset]
        );

        const [{ total }] = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM trades t ${whereClause}`,
            params
        );

        return res.status(200).json({
            success: true,
            data: {
                trades,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get trade history error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
