# Solana Stock Exchange API

A comprehensive Express.js + TypeScript + MySQL API for a Solana-based stock exchange platform with KYC verification, order matching, IPO applications, and wallet management.

## 🚀 Features

### User Management
- ✅ User registration and JWT authentication
- ✅ KYC submission and verification workflow
- ✅ Automatic Solana trading account creation after KYC approval
- ✅ Wallet address integration

### Trading
- ✅ Place market and limit orders (BUY/SELL)
- ✅ Cancel pending orders
- ✅ Real-time order book
- ✅ Order matching engine with SQL
- ✅ Partial and full order execution
- ✅ Integration with Solana blockchain for order placement

### Portfolio Management
- ✅ View holdings fetched from Solana blockchain
- ✅ Real-time balance synchronization with on-chain data
- ✅ Profit/Loss calculation
- ✅ Trade history with transaction signatures

### IPO System
- ✅ Admin IPO creation
- ✅ User IPO applications with SOL escrow
- ✅ IPO status tracking (UPCOMING, OPEN, CLOSED, ALLOTTED)
- ✅ Application history

### Wallet & Payments
- ✅ Deposit SOL via Razorpay
- ✅ Withdraw SOL to bank account
- ✅ Bank account management
- ✅ Payment history tracking
- ✅ Transaction verification

### Admin Features
- ✅ Company registration
- ✅ KYC approval/rejection
- ✅ IPO management
- ✅ Company listing management

## 📋 Prerequisites

- Node.js >= 16.x
- MySQL >= 8.0
- Solana CLI tools
- Anchor Framework
- Razorpay account (for payments)

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Setup Database

Create MySQL database and run schema:

```bash
mysql -u root -p
CREATE DATABASE solana_stock_exchange;
exit

mysql -u root -p solana_stock_exchange < database/schema.sql
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=solana_stock_exchange

# JWT
JWT_SECRET=your_secret_key_change_this

# Solana
SOLANA_RPC_URL=http://localhost:8899
EXCHANGE_PROGRAM_ID=ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD
GOVERNANCE_PROGRAM_ID=GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq
ADMIN_WALLET_PRIVATE_KEY=your_base58_private_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Start the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## 📚 API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "wallet_address": "SolanaWalletAddress..."
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Submit KYC
```http
POST /api/auth/kyc/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_type": "AADHAAR",
  "document_number": "1234-5678-9012",
  "date_of_birth": "1990-01-01",
  "address_line1": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "country": "India"
}
```

### Companies

#### Get All Companies
```http
GET /api/companies?page=1&limit=20&search=tata
```

#### Get Company by ID
```http
GET /api/companies/:id
```

#### Register Company (Admin)
```http
POST /api/companies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "symbol": "TATA",
  "name": "Tata Motors",
  "description": "Leading automobile company",
  "token_mint": "TokenMintAddress...",
  "total_shares": "1000000000",
  "sector": "Automobile",
  "industry": "Manufacturing"
}
```

### Orders

#### Place Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "company_id": 1,
  "side": "BUY",
  "order_type": "LIMIT",
  "price": "1000000000",
  "quantity": "10"
}
```

#### Cancel Order
```http
POST /api/orders/:orderId/cancel
Authorization: Bearer <token>
```

#### Get User Orders
```http
GET /api/orders?page=1&limit=20&status=PENDING
Authorization: Bearer <token>
```

#### Get Order Book
```http
GET /api/orders/book/:companyId
```

### Portfolio

#### Get Portfolio
```http
GET /api/portfolio
Authorization: Bearer <token>
```

#### Get Trade History
```http
GET /api/portfolio/trades?page=1&limit=20
Authorization: Bearer <token>
```

### IPOs

#### Get All IPOs
```http
GET /api/ipos?status=OPEN
```

#### Apply to IPO
```http
POST /api/ipos/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "ipo_id": 1,
  "quantity": "100"
}
```

#### Get User IPO Applications
```http
GET /api/ipos/applications
Authorization: Bearer <token>
```

#### Create IPO (Admin)
```http
POST /api/ipos
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "company_id": 1,
  "title": "TATA IPO 2024",
  "description": "Initial public offering",
  "total_shares": "1000000",
  "price_per_share": "5000000000",
  "min_subscription": "10",
  "max_subscription": "1000",
  "open_date": "2024-01-01T00:00:00Z",
  "close_date": "2024-01-31T23:59:59Z"
}
```

### Wallet

#### Create Deposit
```http
POST /api/wallet/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "1000000000"
}
```

#### Verify Deposit
```http
POST /api/wallet/deposit/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

#### Request Withdrawal
```http
POST /api/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "500000000",
  "bank_account_id": 1
}
```

#### Add Bank Account
```http
POST /api/wallet/bank-accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "account_holder_name": "John Doe",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "bank_name": "State Bank of India",
  "account_type": "SAVINGS"
}
```

#### Get Wallet Transactions
```http
GET /api/wallet/transactions?page=1&limit=20&type=DEPOSIT
Authorization: Bearer <token>
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- CORS configuration
- Input validation with express-validator
- SQL injection prevention
- XSS protection

## 🏗️ Architecture

### Data Flow Example: Place Order

1. **User Request**: User sends order via API with wallet signature
2. **Authentication**: JWT token validated
3. **KYC Check**: Verify user has approved KYC
4. **Company Verification**: Check company exists and is active
5. **Solana Transaction**: Place order on Solana blockchain
   - Creates order PDA
   - Escrows tokens/SOL in vault
6. **Database Record**: Store order in MySQL with transaction signature
7. **Response**: Return order ID and transaction signature

### Solana Integration

- **Trading Account**: PDA created after KYC approval
- **Order Placement**: Interacts with Exchange Core program
- **Balance Fetching**: Queries on-chain token accounts
- **Address Verification**: All data joined with Solana addresses

## 📊 Database Schema

Key tables:
- `users`: User accounts
- `kyc_records`: KYC submissions and approvals
- `companies`: Listed companies with token mints
- `orders`: Order book and history
- `trades`: Executed trades
- `ipos`: IPO offerings
- `ipo_applications`: User IPO applications
- `holdings`: User portfolio cache
- `wallet_transactions`: Deposits and withdrawals
- `bank_accounts`: User bank account details

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support, email support@solanaexchange.com or open an issue.
