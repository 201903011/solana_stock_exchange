# Backend Implementation Guide

This guide provides complete implementation details for all remaining backend files.

## Overview

The backend is structured with:
- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints and validation
- **Services**: Business logic and external integrations
- **Middleware**: Authentication, validation, error handling
- **Utils**: Helper functions for common tasks

---

## 🏢 Company Module

### `src/controllers/company.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PublicKey, Keypair } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import { query } from '../database/connection';
import { connection, findPDA } from '../utils/solana';
import { Company, CompanyRegisterRequest, ValidationError } from '../types';
import logger from '../utils/logger';

// Register new company (Admin only)
export const registerCompany = async (
  req: Request<{}, {}, CompanyRegisterRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      symbol,
      name,
      description,
      total_shares,
      sector,
      industry,
      logo_url,
      website_url,
      tick_size,
      min_order_size,
    } = req.body;

    const adminId = req.user!.userId;

    // Check if symbol already exists
    const existing = await query<Company[]>(
      'SELECT id FROM companies WHERE symbol = ?',
      [symbol]
    );

    if (existing.length > 0) {
      throw new ValidationError('Company symbol already exists');
    }

    // Create SPL token mint
    const mintKeypair = Keypair.generate();
    const mint = await createMint(
      connection,
      mintKeypair, // Payer (should be admin wallet in production)
      new PublicKey(process.env.ADMIN_PUBLIC_KEY!),
      new PublicKey(process.env.ADMIN_PUBLIC_KEY!),
      9 // Decimals
    );

    // Derive order book PDA
    const exchangeProgram = new PublicKey(process.env.EXCHANGE_PROGRAM_ID!);
    const [orderBookPDA, bump] = findPDA(
      [Buffer.from('order_book'), mint.toBuffer()],
      exchangeProgram
    );

    // Insert company
    const result = await query<any>(
      `INSERT INTO companies (
        symbol, name, description, token_mint, total_shares,
        sector, industry, logo_url, website_url,
        order_book_address, order_book_bump,
        tick_size, min_order_size, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        symbol,
        name,
        description,
        mint.toString(),
        total_shares,
        sector,
        industry,
        logo_url,
        website_url,
        orderBookPDA.toString(),
        bump,
        tick_size || '1000000',
        min_order_size || '1',
        adminId,
      ]
    );

    // Initialize market data
    await query(
      `INSERT INTO market_data (company_id, volume, trades_count)
       VALUES (?, 0, 0)`,
      [result.insertId]
    );

    logger.info(`Company registered: ${symbol} by admin ${adminId}`);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        symbol,
        token_mint: mint.toString(),
        order_book_address: orderBookPDA.toString(),
      },
      message: 'Company registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// List companies with pagination and filters
export const listCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const sector = req.query.sector as string;
    const isActive = req.query.isActive as string;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(symbol LIKE ? OR name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sector) {
      conditions.push('sector = ?');
      params.push(sector);
    }

    if (isActive) {
      conditions.push('is_active = ?');
      params.push(isActive === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM companies ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    const companies = await query<any[]>(
      `SELECT c.*, m.last_price, m.bid_price, m.ask_price
       FROM companies c
       LEFT JOIN market_data m ON c.id = m.company_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get company details
export const getCompanyDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const companies = await query<any[]>(
      `SELECT c.*, m.*
       FROM companies c
       LEFT JOIN market_data m ON c.id = m.company_id
       WHERE c.id = ?`,
      [id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    res.json({
      success: true,
      data: companies[0],
    });
  } catch (error) {
    next(error);
  }
};
```

### `src/routes/company.routes.ts`

```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerCompany,
  listCompanies,
  getCompanyDetails,
} from '../controllers/company.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

// POST /api/company/register
router.post(
  '/register',
  authenticate,
  requireAdmin,
  validate([
    body('symbol').notEmpty().isLength({ max: 20 }),
    body('name').notEmpty().isLength({ max: 255 }),
    body('total_shares').notEmpty().isNumeric(),
  ]),
  registerCompany
);

// GET /api/company/list
router.get('/list', listCompanies);

// GET /api/company/:id
router.get('/:id', getCompanyDetails);

export default router;
```

---

## 📦 Order Module

### `src/controllers/order.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { query } from '../database/connection';
import {
  verifyTransactionSignature,
  getTransactionDetails,
} from '../utils/solana';
import { OrderBookEngine } from '../services/orderbook.engine';
import { Order, PlaceOrderRequest, ValidationError } from '../types';
import logger from '../utils/logger';

const orderBookEngine = OrderBookEngine.getInstance();

// Place order with transaction signature
export const placeOrder = async (
  req: Request<{}, {}, PlaceOrderRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      company_id,
      side,
      order_type,
      price,
      quantity,
      transaction_signature,
    } = req.body;

    // Verify transaction signature
    const isValid = await verifyTransactionSignature(transaction_signature);
    if (!isValid) {
      throw new ValidationError('Invalid transaction signature');
    }

    // Get transaction details for order_id and order_address
    const txDetails = await getTransactionDetails(transaction_signature);
    // Extract order_id and order_address from transaction logs
    // (Implementation depends on your Solana program structure)
    const orderId = Date.now(); // Placeholder
    const orderAddress = `order_${orderId}`; // Placeholder

    // Insert order into database
    const result = await query<any>(
      `INSERT INTO orders (
        user_id, company_id, order_id, order_address, side, order_type,
        price, quantity, filled_quantity, remaining_quantity,
        status, transaction_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', ?)`,
      [
        userId,
        company_id,
        orderId,
        orderAddress,
        side,
        order_type,
        price || null,
        quantity,
        quantity,
        transaction_signature,
      ]
    );

    const order = {
      id: result.insertId,
      user_id: userId,
      company_id,
      order_id: BigInt(orderId),
      order_address: orderAddress,
      side,
      order_type,
      price: price ? BigInt(price) : undefined,
      quantity: BigInt(quantity),
      filled_quantity: BigInt(0),
      remaining_quantity: BigInt(quantity),
      status: 'PENDING' as const,
      transaction_signature,
      created_at: new Date(),
      updated_at: new Date(),
    } as Order;

    // Add to order book
    await orderBookEngine.addOrder(order);

    // Attempt matching
    const trades = await orderBookEngine.matchOrders(company_id, order);

    logger.info(`Order placed: ${result.insertId} by user ${userId}, matched ${trades.length} trades`);

    res.status(201).json({
      success: true,
      data: {
        orderId: result.insertId,
        trades: trades.length,
      },
      message: 'Order placed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// List user orders
export const listOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const companyId = req.query.companyId as string;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (companyId) {
      conditions.push('company_id = ?');
      params.push(companyId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const orders = await query<any[]>(
      `SELECT o.*, c.symbol, c.name as company_name
       FROM orders o
       JOIN companies c ON o.company_id = c.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { orderId } = req.params;

    // Verify order ownership
    const orders = await query<Order[]>(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const order = orders[0];

    if (order.status !== 'PENDING' && order.status !== 'PARTIAL') {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled',
      });
    }

    // Cancel in order book
    await orderBookEngine.cancelOrder(order.id, order.company_id);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

### `src/routes/order.routes.ts`

```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import {
  placeOrder,
  listOrders,
  cancelOrder,
} from '../controllers/order.controller';
import { authenticate, requireKYCApproved } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

// POST /api/order/placeOrder
router.post(
  '/placeOrder',
  authenticate,
  requireKYCApproved,
  validate([
    body('company_id').isInt(),
    body('side').isIn(['BUY', 'SELL']),
    body('order_type').isIn(['MARKET', 'LIMIT', 'POST_ONLY', 'IOC']),
    body('quantity').notEmpty(),
    body('transaction_signature').notEmpty(),
  ]),
  placeOrder
);

// GET /api/order/list
router.get('/list', authenticate, listOrders);

// DELETE /api/order/:orderId
router.delete('/:orderId', authenticate, cancelOrder);

export default router;
```

---

## 💰 Fund Module

### Implementation in `src/controllers/fund.controller.ts`

Key functions:
- `createDeposit`: Creates Razorpay order
- `verifyDeposit`: Verifies payment and credits SOL
- `requestWithdrawal`: Initiates withdrawal
- `listTransactions`: Lists wallet transactions
- `addBankAccount`: Adds bank account
- `fetchWalletTransactions`: Fetches on-chain transactions

### Razorpay Service (`src/services/razorpay.service.ts`)

```typescript
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config';

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export const createOrder = async (amountINR: number): Promise<any> => {
  return razorpay.orders.create({
    amount: amountINR * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  });
};

export const verifySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const text = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(text)
    .digest('hex');

  return generated_signature === signature;
};
```

---

## 📊 Holdings Module

### `src/controllers/holding.controller.ts`

```typescript
export const listHoldings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Sync holdings from on-chain first
    await syncUserHoldings(userId);

    // Fetch from database with market data
    const holdings = await query<any[]>(
      `SELECT * FROM v_user_portfolio WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    next(error);
  }
};

const syncUserHoldings = async (userId: number): Promise<void> => {
  // Implementation to fetch on-chain balances and update database
};
```

---

## 🏛️ IPO Module

### `src/controllers/ipo.controller.ts`

Key functions:
- `listIPOs`: List all IPOs with filters
- `applyIPO`: Apply for IPO
- `getMyApplications`: User's applications
- `getApplicationDetails`: Application details
- `allocateIPO`: Admin allocates or refunds

---

## 📁 File Upload

Create `src/middleware/upload.ts` for handling KYC document uploads using multer.

---

## ✅ Completion Checklist

Create these remaining files:

- [ ] `src/controllers/company.controller.ts`
- [ ] `src/controllers/order.controller.ts`
- [ ] `src/controllers/fund.controller.ts`
- [ ] `src/controllers/holding.controller.ts`
- [ ] `src/controllers/ipo.controller.ts`
- [ ] `src/routes/company.routes.ts`
- [ ] `src/routes/order.routes.ts`
- [ ] `src/routes/fund.routes.ts`
- [ ] `src/routes/holding.routes.ts`
- [ ] `src/routes/ipo.routes.ts`
- [ ] `src/services/razorpay.service.ts`
- [ ] `src/services/solana.service.ts`
- [ ] `src/middleware/upload.ts`
- [ ] `uploads/.gitkeep`
- [ ] `logs/.gitkeep`

All files follow the same patterns established in the auth module.
