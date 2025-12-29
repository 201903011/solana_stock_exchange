# Backend Quick Reference

## 🚀 Quick Start

```bash
cd backend
./setup.sh           # Run setup script
npm run dev          # Start development server
```

## 📁 Directory Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript types
│   └── index.ts         # Entry point
├── database/
│   └── schema.sql       # Database schema
└── package.json
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Express server setup |
| `src/config/index.ts` | Configuration management |
| `src/types/index.ts` | All TypeScript types |
| `src/controllers/auth.controller.ts` | Auth logic (COMPLETE) |
| `src/services/orderbook.engine.ts` | Order matching (COMPLETE) |
| `src/services/websocket.service.ts` | WebSocket server (COMPLETE) |
| `database/schema.sql` | Complete DB schema (COMPLETE) |

## 📡 API Endpoints

### Auth
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login
- POST `/api/auth/kyc/submit` - Submit KYC
- GET `/api/auth/kyc/list` - List KYC (Admin)
- POST `/api/auth/kyc/:id/approve` - Approve KYC (Admin)

### Company
- POST `/api/company/register` - Register (Admin)
- GET `/api/company/list` - List companies
- GET `/api/company/:id` - Get details

### Orders
- POST `/api/order/placeOrder` - Place order
- GET `/api/order/list` - List orders
- DELETE `/api/order/:orderId` - Cancel order

### Funds
- POST `/api/fund/deposit` - Initiate deposit
- POST `/api/fund/verify-deposit` - Verify payment
- POST `/api/fund/withdraw` - Withdraw
- GET `/api/fund/transaction/list` - List transactions

### Holdings
- GET `/api/holdings/list` - Get portfolio

### IPO
- GET `/api/ipo/list` - List IPOs
- POST `/api/ipo/apply` - Apply for IPO
- POST `/api/ipo/:id/allocate` - Allocate (Admin)

## 🔐 Authentication

```typescript
// Headers
Authorization: Bearer <JWT_TOKEN>

// JWT Payload
{
  userId: number,
  email: string,
  walletAddress: string,
  isAdmin: boolean,
  kycStatus: string
}
```

## 🗄️ Database Commands

```bash
# Create database
mysql -u root -p
CREATE DATABASE solana_stock_exchange;

# Run schema
mysql -u root -p solana_stock_exchange < database/schema.sql

# Default admin
Email: admin@stockexchange.com
Password: admin123
```

## 🧪 Testing

```bash
npm test              # Run tests
npm run test:coverage # With coverage
```

## 📊 Order Book Engine

```typescript
// Get instance
const engine = OrderBookEngine.getInstance();

// Initialize (on startup)
await engine.initialize();

// Add order
await engine.addOrder(order);

// Match orders
const trades = await engine.matchOrders(companyId, newOrder);

// Get market depth
const depth = engine.getMarketDepth(companyId);
```

## 🌐 WebSocket

```javascript
// Connect
const ws = new WebSocket('ws://localhost:4001/ws');

// Subscribe
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  data: { companyId: 1 }
}));

// Receive updates
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // Handle MARKET_DEPTH, TRADE, ORDER_UPDATE
};
```

## 🔧 Environment Variables

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_NAME=solana_stock_exchange
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Solana
SOLANA_RPC_URL=http://127.0.0.1:8899
EXCHANGE_PROGRAM_ID=ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
SOL_TO_INR_RATE=8000
```

## 🛠️ Utility Functions

```typescript
// Solana
import { getSOLBalance, verifyTransactionSignature } from './utils/solana';
const balance = await getSOLBalance(publicKey);
const isValid = await verifyTransactionSignature(signature);

// Pagination
import { parsePaginationParams, buildWhereClause } from './utils/pagination';
const pagination = parsePaginationParams(req);

// Auth
import { hashPassword, comparePassword, generateToken } from './utils/auth';
const hash = await hashPassword(password);
const token = generateToken(payload);

// Logger
import logger from './utils/logger';
logger.info('Message');
logger.error('Error', error);
```

## 📈 Performance Tips

1. **Order Book**: Kept in memory for speed
2. **Pagination**: Max 100 items per page
3. **Indexes**: All critical fields indexed
4. **Connection Pool**: 10 database connections
5. **Caching**: SOL balances and holdings cached

## 🚨 Common Issues

### Database Connection Failed
- Check MySQL is running
- Verify credentials in .env
- Ensure database exists

### JWT Token Invalid
- Check JWT_SECRET matches
- Token may be expired
- Check Authorization header format

### Order Not Matching
- Verify order book initialized
- Check price conditions for limit orders
- Ensure sufficient liquidity

### WebSocket Not Connecting
- Check WS_PORT in .env
- Verify WebSocket server initialized
- Check firewall settings

## 📚 Documentation

- `README.md` - General documentation
- `PROJECT_SUMMARY.md` - Complete design summary
- `IMPLEMENTATION_GUIDE.md` - Implementation details

## 🎯 Status

**✅ Complete:**
- Database schema (25+ tables)
- Auth system with KYC
- Order book matching engine
- WebSocket real-time updates
- Type definitions (400+ lines)
- Utilities and middleware

**🚧 To Complete:**
- Controller implementations (templates in IMPLEMENTATION_GUIDE.md)
- Razorpay service integration
- File upload middleware
- Unit tests

## 📞 Support

For implementation questions, refer to:
1. `IMPLEMENTATION_GUIDE.md` for controller templates
2. `PROJECT_SUMMARY.md` for architecture
3. `README.md` for API documentation
