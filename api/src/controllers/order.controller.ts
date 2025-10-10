import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { query, queryOne, beginTransaction } from '../database/connection';
import {
    AuthRequest,
    PlaceOrderRequest,
    Order,
    OrderStatus,
    ApiResponse,
    Company,
} from '../types';
import { placeLimitOrder, placeMarketOrder, cancelOrder } from '../utils/solana';

// Place Order
export async function placeOrder(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    const connection = await beginTransaction();

    try {
        const userId = req.user?.userId;
        const orderData: PlaceOrderRequest = req.body as any;

        // Get user and verify KYC
        const user = await queryOne(
            `SELECT u.wallet_address, k.status as kyc_status, k.trade_account_address
       FROM users u
       LEFT JOIN kyc_records k ON u.id = k.user_id AND k.status = 'APPROVED'
       WHERE u.id = ?`,
            [userId]
        );

        if (!user || !user.kyc_status || user.kyc_status !== 'APPROVED') {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                error: 'KYC verification required',
            });
        }

        // Get company details
        const company = await queryOne<Company>(
            'SELECT * FROM companies WHERE id = ? AND is_active = TRUE',
            [orderData.company_id]
        );

        if (!company) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Company not found or inactive',
            });
        }

        // Validate and align price for limit orders
        if (orderData.order_type === 'LIMIT' && orderData.price) {
            const tickSize = BigInt(company.tick_size || '1000000');
            const price = BigInt(orderData.price);

            // Check if price is aligned to tick size
            const remainder = price % tickSize;
            if (remainder !== BigInt(0)) {
                // Align price to tick size (round down)
                const alignedPrice = price - remainder;

                if (alignedPrice <= BigInt(0)) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        error: `Price must be at least ${tickSize.toString()} (one tick size). Tick size for ${company.symbol} is ${tickSize.toString()} lamports.`,
                    });
                }

                console.log(`Price ${price} not aligned to tick size ${tickSize}`);
                console.log(`Auto-aligning to ${alignedPrice}`);

                // Update the price to aligned value
                orderData.price = alignedPrice.toString();
            }
        }

        // Place order on Solana
        let txSignature: string;
        try {
            const userPubkey = new PublicKey(user.wallet_address);

            if (orderData.order_type === 'MARKET') {
                txSignature = await placeMarketOrder(
                    userPubkey,
                    company.token_mint,
                    orderData.side,
                    orderData.quantity,
                    orderData.max_quote_amount || '0'
                );
            } else {
                if (!orderData.price) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        error: 'Price required for limit orders',
                    });
                }
                txSignature = await placeLimitOrder(
                    userPubkey,
                    company.token_mint,
                    orderData.side,
                    orderData.price,
                    orderData.quantity
                );
            }
        } catch (error) {
            await connection.rollback();
            console.error('Solana order error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to place order on blockchain',
            });
        }

        // Insert order in database
        const result = await connection.execute(
            `INSERT INTO orders (
        user_id, company_id, order_id, order_address, side, order_type,
        price, quantity, remaining_quantity, transaction_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                orderData.company_id,
                0, // Will be updated from blockchain
                '', // Will be updated from blockchain
                orderData.side,
                orderData.order_type,
                orderData.price || null,
                orderData.quantity,
                orderData.quantity,
                txSignature,
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            data: {
                orderId: (result[0] as any).insertId,
                txSignature,
            },
            message: 'Order placed successfully',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Place order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    } finally {
        connection.release();
    }
}

// Cancel Order
export async function cancelOrderHandler(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { orderId } = req.params as any;

        // Get order
        const order = await queryOne<Order & { token_mint: string }>(
            `SELECT o.*, c.token_mint
       FROM orders o
       JOIN companies c ON o.company_id = c.id
       WHERE o.id = ? AND o.user_id = ?`,
            [orderId, userId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
            });
        }

        if (order.status !== 'PENDING' && order.status !== 'PARTIAL') {
            return res.status(400).json({
                success: false,
                error: 'Order cannot be cancelled',
            });
        }

        // Get user wallet
        const user = await queryOne<{ wallet_address: string }>(
            'SELECT wallet_address FROM users WHERE id = ?',
            [userId]
        );

        if (!user?.wallet_address) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address not found',
            });
        }

        // Cancel on Solana
        let txSignature: string;
        try {
            const userPubkey = new PublicKey(user.wallet_address);
            txSignature = await cancelOrder(
                userPubkey,
                order.token_mint,
                order.order_id.toString()
            );
        } catch (error) {
            console.error('Solana cancel order error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to cancel order on blockchain',
            });
        }

        // Update order in database
        await query(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            ['CANCELLED', orderId]
        );

        return res.status(200).json({
            success: true,
            data: { txSignature },
            message: 'Order cancelled successfully',
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get User Orders
export async function getUserOrders(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, status, company_id } = req.query as any;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE o.user_id = ?';
        const params: any[] = [userId];

        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }

        if (company_id) {
            whereClause += ' AND o.company_id = ?';
            params.push(company_id);
        }

        const orders = await query(
            `SELECT o.*, c.symbol, c.name as company_name
       FROM orders o
       JOIN companies c ON o.company_id = c.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
            [...params, Number(limit).toString(), offset.toString()]
        );

        const [{ total }] = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
            params
        );

        return res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get orders error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}

// Get Order Book
export async function getOrderBook(
    req: AuthRequest,
    res: Response<ApiResponse>
): Promise<Response> {
    try {
        const { companyId } = req.params as any;

        const bids = await query(
            `SELECT price, SUM(remaining_quantity) as quantity, COUNT(*) as orders
       FROM orders
       WHERE company_id = ? AND side = 'BUY' AND status IN ('PENDING', 'PARTIAL')
       GROUP BY price
       ORDER BY price DESC
       LIMIT 20`,
            [companyId]
        );

        const asks = await query(
            `SELECT price, SUM(remaining_quantity) as quantity, COUNT(*) as orders
       FROM orders
       WHERE company_id = ? AND side = 'SELL' AND status IN ('PENDING', 'PARTIAL')
       GROUP BY price
       ORDER BY price ASC
       LIMIT 20`,
            [companyId]
        );

        return res.status(200).json({
            success: true,
            data: {
                bids,
                asks,
            },
        });
    } catch (error) {
        console.error('Get order book error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}
