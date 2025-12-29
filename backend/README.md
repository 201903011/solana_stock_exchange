# Solana Stock Exchange Backend API

Complete Express TypeScript backend for a Solana-based stock exchange platform.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with KYC management
- **Company Management**: Register and list companies/stocks
- **Order Management**: Place, cancel, and track orders with on-chain verification
- **Order Book Engine**: In-memory matching engine synchronized with database
- **Funds Management**: Deposits via Razorpay, withdrawals to bank accounts
- **Portfolio/Holdings**: Real-time portfolio tracking synced from blockchain
- **IPO Management**: IPO applications with allocation and refund logic
- **WebSocket**: Real-time market depth updates
- **Comprehensive Logging & Audit Trail**

## 📋 Prerequisites

- Node.js >= 18.x
- MySQL >= 8.0
- Solana CLI tools
- Razorpay account (for payments)

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
mysql -u root -p < database/schema.sql

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── database/        # Database connection
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   │   ├── orderbook.engine.ts   # Order matching engine
│   │   ├── websocket.service.ts  # WebSocket server
│   │   ├── razorpay.service.ts   # Payment integration
│   │   └── solana.service.ts     # Blockchain interactions
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── database/
│   └── schema.sql       # Database schema
├── uploads/             # File uploads directory
├── logs/                # Application logs
└── package.json
```

## 🔗 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /kyc/submit` - Submit KYC documents
- `GET /kyc/list` - List KYC applications (Admin)
- `GET /kyc/:id` - Get KYC details (Admin)
- `POST /kyc/:id/approve` - Approve/Reject KYC (Admin)

### Company (`/api/company`)
- `POST /register` - Register new company (Admin)
- `GET /list` - List all companies
- `GET /:id` - Get company details

### Funds (`/api/fund`)
- `POST /deposit` - Initiate deposit (Razorpay)
- `POST /verify-deposit` - Verify payment and credit SOL
- `POST /withdraw` - Request withdrawal
- `GET /transaction/list` - List all transactions
- `POST /add-bank-account` - Add bank account
- `GET /wallet-transaction` - Fetch on-chain transactions

### Holdings (`/api/holdings`)
- `GET /list` - Get user portfolio with current values

### Orders (`/api/order`)
- `POST /placeOrderTxnSign` - Generate order transaction (front-end signs)
- `POST /placeOrder` - Submit signed transaction and match orders
- `GET /list` - List user orders

### IPO (`/api/ipo`)
- `GET /list` - List all IPOs
- `GET /myapplication/list` - User's IPO applications
- `POST /apply` - Apply for IPO
- `GET /:applicationId` - Application details
- `POST /:applicationId/allocate` - Allocate or refund (Admin)

### WebSocket (`ws://:4001`)
- `ws/:companyId/marketDepth` - Real-time market depth updates

## 🔐 Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

JWT Payload includes:
- userId
- email
- walletAddress
- isAdmin
- kycStatus

## 📊 Order Book Engine

The in-memory order book engine:

1. **Initialization**: Loads active orders from database on startup
2. **Order Placement**: Validates, stores in DB, adds to memory, attempts matching
3. **Matching Algorithm**: Price-time priority matching
4. **Settlement**: Updates database and notifies via WebSocket
5. **Persistence**: All changes synced to database

### Matching Logic

```typescript
// Buy orders sorted by price DESC (highest first)
// Sell orders sorted by price ASC (lowest first)

for each new order:
  if (market order):
    match with best available opposite orders
  else if (limit order):
    match with opposite orders where price condition met
  
  if (partial fill):
    update order quantities in DB and memory
  
  if (fully filled):
    mark order as FILLED, remove from order book
  
  emit trade events via WebSocket
```

## 💰 Razorpay Integration

### Deposit Flow

1. User initiates deposit with INR amount
2. Backend creates Razorpay order
3. Frontend displays Razorpay checkout
4. User completes payment
5. Frontend calls `/verify-deposit` with payment details
6. Backend verifies signature and credits SOL to user wallet

### Environment Variables
```env
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
SOL_TO_INR_RATE=8000
```

## 🔄 Database Synchronization

### Holdings Sync
Periodically fetch on-chain token balances and update database:

```typescript
// Pseudo-code
async syncHoldings(userId) {
  const user = await getUser(userId);
  const companies = await getAllCompanies();
  
  for (company of companies) {
    const onChainBalance = await getTokenBalance(
      user.wallet_address,
      company.token_mint
    );
    
    await updateHolding(userId, company.id, onChainBalance);
  }
}
```

### SOL Balance Sync
Similar process for SOL balances with locked balance tracking for open buy orders.

## 🌐 WebSocket Protocol

### Subscribe to Market Depth
```json
{
  "type": "SUBSCRIBE",
  "data": {
    "companyId": 1
  }
}
```

### Market Depth Update
```json
{
  "type": "MARKET_DEPTH",
  "data": {
    "companyId": 1,
    "symbol": "AAPL",
    "bids": [
      { "price": "100000000", "quantity": "50", "orderCount": 3 },
      ...
    ],
    "asks": [
      { "price": "101000000", "quantity": "30", "orderCount": 2 },
      ...
    ],
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## 🔍 Pagination & Filtering

All list endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by (default: 'id')
- `sortOrder` - ASC or DESC (default: DESC)
- `search` - Search term
- `status` - Filter by status
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)

Example:
```
GET /api/order/list?page=1&limit=20&status=FILLED&dateFrom=2025-01-01&sortBy=created_at&sortOrder=DESC
```

## 🛡️ Security Features

- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting per endpoint
- Password hashing with bcrypt
- JWT token expiration
- Input validation with express-validator
- SQL injection prevention via parameterized queries
- Transaction signature verification

## 📝 Logging

Winston logger with levels:
- `error` - Error logs (saved to error.log)
- `warn` - Warning logs
- `info` - Info logs
- `debug` - Debug logs (development only)

All logs saved to `logs/` directory with rotation.

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Environment Variables

Ensure all production environment variables are set:
- Database credentials
- JWT secret (strong, random)
- Razorpay keys
- Solana RPC URL (mainnet/devnet)
- Admin wallet address

### Build

```bash
npm run build
```

### Start

```bash
NODE_ENV=production npm start
```

### Process Manager (PM2)

```bash
pm2 start dist/index.js --name stock-exchange-api
pm2 logs stock-exchange-api
pm2 restart stock-exchange-api
```

## 📊 Monitoring

- Health check endpoint: `GET /health`
- Database connection pool monitoring
- WebSocket connection tracking
- Order book metrics

## 🔧 Configuration

Edit `src/config/index.ts` for application configuration or use environment variables.

## 📄 License

MIT

## 👥 Support

For issues and questions, please open a GitHub issue.

---

## Implementation Status

✅ Complete:
- Project structure and configuration
- Database schema with all tables, triggers, views
- TypeScript types and interfaces
- Authentication & KYC system
- Middleware (auth, validation, error handling)
- Utility functions (Solana, pagination, logger, auth)

🚧 Remaining Files to Create:
- Additional controllers (company, order, fund, holding, ipo)
- Additional routes
- Order book matching engine
- WebSocket service
- Razorpay service
- Solana service wrapper

See IMPLEMENTATION_GUIDE.md for detailed implementation of remaining files.
