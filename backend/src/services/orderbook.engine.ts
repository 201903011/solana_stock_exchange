import { query } from '../database/connection';
import {
    Order,
    OrderBook,
    OrderBookEntry,
    Trade,
    OrderSide,
    MarketDepth,
    PriceLevel,
} from '../types';
import logger from '../utils/logger';
import { WebSocketServer } from './websocket.service';

export class OrderBookEngine {
    private static instance: OrderBookEngine;
    private orderBooks: Map<number, OrderBook> = new Map();
    private wsServer?: WebSocketServer;

    private constructor() { }

    public static getInstance(): OrderBookEngine {
        if (!OrderBookEngine.instance) {
            OrderBookEngine.instance = new OrderBookEngine();
        }
        return OrderBookEngine.instance;
    }

    public setWebSocketServer(wsServer: WebSocketServer): void {
        this.wsServer = wsServer;
    }

    // Initialize order books from database
    public async initialize(): Promise<void> {
        try {
            logger.info('Initializing order book engine...');

            // Load all active companies
            const companies = await query<any[]>(
                'SELECT id, symbol FROM companies WHERE is_active = TRUE AND is_listed = TRUE'
            );

            for (const company of companies) {
                await this.loadOrderBook(company.id, company.symbol);
            }

            logger.info(`Order book engine initialized with ${companies.length} order books`);
        } catch (error) {
            logger.error('Error initializing order book engine:', error);
            throw error;
        }
    }

    // Load order book for a company from database
    private async loadOrderBook(companyId: number, symbol: string): Promise<void> {
        try {
            // Load active orders for this company
            const orders = await query<any[]>(
                `SELECT o.*, u.wallet_address 
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.company_id = ? AND o.status IN ('PENDING', 'PARTIAL')
         ORDER BY 
           CASE WHEN o.side = 'BUY' THEN o.price END DESC,
           CASE WHEN o.side = 'SELL' THEN o.price END ASC,
           o.created_at ASC`,
                [companyId]
            );

            const bids: OrderBookEntry[] = [];
            const asks: OrderBookEntry[] = [];

            for (const order of orders) {
                const entry: OrderBookEntry = {
                    orderId: order.id,
                    orderAddress: order.order_address,
                    userId: order.user_id,
                    walletAddress: order.wallet_address,
                    price: BigInt(order.price || 0),
                    quantity: BigInt(order.quantity),
                    remainingQuantity: BigInt(order.remaining_quantity),
                    timestamp: new Date(order.created_at),
                };

                if (order.side === 'BUY') {
                    bids.push(entry);
                } else {
                    asks.push(entry);
                }
            }

            this.orderBooks.set(companyId, {
                companyId,
                symbol,
                bids, // Already sorted DESC by price in SQL
                asks, // Already sorted ASC by price in SQL
                lastUpdated: new Date(),
            });

            logger.info(`Loaded order book for ${symbol} with ${bids.length} bids and ${asks.length} asks`);
        } catch (error) {
            logger.error(`Error loading order book for company ${companyId}:`, error);
            throw error;
        }
    }

    // Add order to order book
    public async addOrder(order: Order): Promise<void> {
        const orderBook = this.orderBooks.get(order.company_id);
        if (!orderBook) {
            logger.warn(`Order book not found for company ${order.company_id}`);
            return;
        }

        // Get user wallet address
        const users = await query<any[]>(
            'SELECT wallet_address FROM users WHERE id = ?',
            [order.user_id]
        );

        const entry: OrderBookEntry = {
            orderId: order.id,
            orderAddress: order.order_address,
            userId: order.user_id,
            walletAddress: users[0]?.wallet_address,
            price: order.price || BigInt(0),
            quantity: order.quantity,
            remainingQuantity: order.remaining_quantity,
            timestamp: order.created_at,
        };

        if (order.side === 'BUY') {
            orderBook.bids.push(entry);
            // Sort bids by price DESC, then timestamp ASC
            orderBook.bids.sort((a, b) => {
                if (a.price !== b.price) return Number(b.price - a.price);
                return a.timestamp.getTime() - b.timestamp.getTime();
            });
        } else {
            orderBook.asks.push(entry);
            // Sort asks by price ASC, then timestamp ASC
            orderBook.asks.sort((a, b) => {
                if (a.price !== b.price) return Number(a.price - b.price);
                return a.timestamp.getTime() - b.timestamp.getTime();
            });
        }

        orderBook.lastUpdated = new Date();

        // Broadcast market depth update
        await this.broadcastMarketDepth(order.company_id);
    }

    // Match orders - Price-Time Priority Algorithm
    public async matchOrders(companyId: number, newOrder: Order): Promise<Trade[]> {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) {
            logger.warn(`Order book not found for company ${companyId}`);
            return [];
        }

        const trades: Trade[] = [];
        let remainingQuantity = newOrder.remaining_quantity;

        // Get opposite side orders
        const oppositeOrders = newOrder.side === 'BUY' ? orderBook.asks : orderBook.bids;

        for (let i = 0; i < oppositeOrders.length && remainingQuantity > BigInt(0); i++) {
            const matchOrder = oppositeOrders[i];

            // Check price condition for limit orders
            if (newOrder.order_type === 'LIMIT') {
                if (newOrder.side === 'BUY' && newOrder.price! < matchOrder.price) break;
                if (newOrder.side === 'SELL' && newOrder.price! > matchOrder.price) break;
            }

            // Calculate fill quantity
            const fillQuantity =
                remainingQuantity < matchOrder.remainingQuantity
                    ? remainingQuantity
                    : matchOrder.remainingQuantity;

            // Determine maker and taker
            const isMaker = matchOrder.timestamp < newOrder.created_at;
            const executionPrice = matchOrder.price; // Maker's price

            // Create trade record
            const trade: Partial<Trade> = {
                company_id: companyId,
                buyer_id: newOrder.side === 'BUY' ? newOrder.user_id : matchOrder.userId,
                seller_id: newOrder.side === 'SELL' ? newOrder.user_id : matchOrder.userId,
                buy_order_id: newOrder.side === 'BUY' ? newOrder.id : matchOrder.orderId,
                sell_order_id: newOrder.side === 'SELL' ? newOrder.id : matchOrder.orderId,
                trade_id: BigInt(Date.now()), // Generate unique trade ID
                price: executionPrice,
                quantity: fillQuantity,
                maker_side: newOrder.side === 'BUY' ? 'SELL' : 'BUY',
                maker_fee: (fillQuantity * executionPrice * BigInt(5)) / BigInt(100000), // 0.05%
                taker_fee: (fillQuantity * executionPrice * BigInt(10)) / BigInt(100000), // 0.10%
                transaction_signature: `trade_${Date.now()}_${Math.random()}`, // Placeholder
                settled: false,
                executed_at: new Date(),
            };

            // Insert trade into database
            const result = await query<any>(
                `INSERT INTO trades (
          company_id, buyer_id, seller_id, buy_order_id, sell_order_id,
          trade_id, price, quantity, maker_side, maker_fee, taker_fee,
          transaction_signature, settled, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    trade.company_id,
                    trade.buyer_id,
                    trade.seller_id,
                    trade.buy_order_id,
                    trade.sell_order_id,
                    trade.trade_id?.toString(),
                    trade.price?.toString(),
                    trade.quantity?.toString(),
                    trade.maker_side,
                    trade.maker_fee?.toString(),
                    trade.taker_fee?.toString(),
                    trade.transaction_signature,
                    trade.settled,
                    trade.executed_at,
                ]
            );

            trades.push({ ...trade, id: result.insertId } as Trade);

            // Update order quantities in database
            await this.updateOrderQuantity(newOrder.id, fillQuantity, 'filled');
            await this.updateOrderQuantity(matchOrder.orderId, fillQuantity, 'filled');

            // Update in-memory quantities
            remainingQuantity -= fillQuantity;
            matchOrder.remainingQuantity -= fillQuantity;

            // Remove fully filled orders
            if (matchOrder.remainingQuantity === BigInt(0)) {
                oppositeOrders.splice(i, 1);
                i--;
            }
        }

        // Update new order status
        if (remainingQuantity === BigInt(0)) {
            await query('UPDATE orders SET status = ? WHERE id = ?', ['FILLED', newOrder.id]);
        } else if (remainingQuantity < newOrder.quantity) {
            await query('UPDATE orders SET status = ? WHERE id = ?', ['PARTIAL', newOrder.id]);
        }

        // Broadcast market depth if trades occurred
        if (trades.length > 0) {
            await this.updateMarketData(companyId, trades);
            await this.broadcastMarketDepth(companyId);
        }

        return trades;
    }

    // Update order quantity after fill
    private async updateOrderQuantity(
        orderId: number,
        filledQty: bigint,
        action: 'filled' | 'cancelled'
    ): Promise<void> {
        await query(
            `UPDATE orders 
       SET filled_quantity = filled_quantity + ?,
           remaining_quantity = remaining_quantity - ?,
           updated_at = NOW()
       WHERE id = ?`,
            [filledQty.toString(), filledQty.toString(), orderId]
        );
    }

    // Cancel order
    public async cancelOrder(orderId: number, companyId: number): Promise<boolean> {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) return false;

        // Remove from bids
        const bidIndex = orderBook.bids.findIndex((o) => o.orderId === orderId);
        if (bidIndex !== -1) {
            orderBook.bids.splice(bidIndex, 1);
            await query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [
                'CANCELLED',
                orderId,
            ]);
            await this.broadcastMarketDepth(companyId);
            return true;
        }

        // Remove from asks
        const askIndex = orderBook.asks.findIndex((o) => o.orderId === orderId);
        if (askIndex !== -1) {
            orderBook.asks.splice(askIndex, 1);
            await query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [
                'CANCELLED',
                orderId,
            ]);
            await this.broadcastMarketDepth(companyId);
            return true;
        }

        return false;
    }

    // Get market depth (top 5 bids and asks)
    public getMarketDepth(companyId: number): MarketDepth {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) {
            return { bids: [], asks: [] };
        }

        const aggregateLevels = (orders: OrderBookEntry[]): PriceLevel[] => {
            const levels = new Map<string, { quantity: bigint; count: number }>();

            for (const order of orders) {
                const priceKey = order.price.toString();
                const existing = levels.get(priceKey);

                if (existing) {
                    existing.quantity += order.remainingQuantity;
                    existing.count++;
                } else {
                    levels.set(priceKey, {
                        quantity: order.remainingQuantity,
                        count: 1,
                    });
                }
            }

            return Array.from(levels.entries())
                .slice(0, 5)
                .map(([price, data]) => ({
                    price,
                    quantity: data.quantity.toString(),
                    orderCount: data.count,
                }));
        };

        return {
            bids: aggregateLevels(orderBook.bids),
            asks: aggregateLevels(orderBook.asks),
        };
    }

    // Update market data after trades
    private async updateMarketData(companyId: number, trades: Trade[]): Promise<void> {
        if (trades.length === 0) return;

        const lastTrade = trades[trades.length - 1];
        const lastPrice = lastTrade.price;

        // Update or insert market data
        await query(
            `INSERT INTO market_data (company_id, last_price, volume, trades_count, last_updated)
       VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
       last_price = ?,
       volume = volume + ?,
       trades_count = trades_count + ?,
       last_updated = NOW()`,
            [
                companyId,
                lastPrice.toString(),
                lastTrade.quantity.toString(),
                lastPrice.toString(),
                lastTrade.quantity.toString(),
                trades.length,
            ]
        );
    }

    // Broadcast market depth via WebSocket
    private async broadcastMarketDepth(companyId: number): Promise<void> {
        if (!this.wsServer) return;

        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) return;

        const marketDepth = this.getMarketDepth(companyId);

        this.wsServer.broadcastMarketDepth({
            companyId,
            symbol: orderBook.symbol,
            bids: marketDepth.bids,
            asks: marketDepth.asks,
            timestamp: new Date(),
        });
    }

    // Get order book for a company
    public getOrderBook(companyId: number): OrderBook | undefined {
        return this.orderBooks.get(companyId);
    }
}
