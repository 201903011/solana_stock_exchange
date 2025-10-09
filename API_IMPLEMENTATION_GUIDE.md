# Solana Stock Exchange API - Complete Documentation

## Overview

This API provides a complete stock exchange platform on Solana blockchain with MySQL for off-chain data management. It includes user management, KYC verification, order placement, portfolio tracking, IPO applications, and wallet operations.

## Key Features

### 🔐 Authentication & Security
- JWT-based authentication
- bcrypt password hashing
- Role-based access control (User/Admin)
- Rate limiting
- Input validation

### 👤 User Management
- User registration with email/password
- Wallet address linking
- Profile management
- Session management

### 📋 KYC Verification
- Document submission (AADHAAR, PAN, PASSPORT)
- Admin approval workflow
- Automatic Solana trading account creation on approval
- Rejection with reasons
- Status tracking (PENDING, APPROVED, REJECTED)

### 🏢 Company Management
- Admin company registration
- Token mint association
- Company listing/delisting
- Company information management
- Search and filtering

### 📊 Order Management
- **Order Types**: Market, Limit, Post-Only, IOC
- **Order Sides**: Buy, Sell
- **Order Status**: Pending, Partial, Filled, Cancelled
- Real-time order book
- Order cancellation
- Order history

### 💼 Portfolio Management
- Real-time holdings from Solana blockchain
- Automatic balance synchronization
- Profit/Loss calculation
- Average price tracking
- Token account management
- **Address Verification**: All holdings verified with on-chain Solana addresses

### 🎯 IPO System
- Admin IPO creation
- User applications with SOL escrow
- Subscription limits (min/max)
- IPO status lifecycle
- Application history
- Allotment tracking

### 💰 Wallet & Payments
- **Deposits**: Via Razorpay (INR → SOL)
- **Withdrawals**: To bank accounts
- Bank account management
- Transaction history
- Payment verification

## Architecture

### Data Flow with Solana Integration

#### Example 1: User Portfolio
```
1. User → GET /api/portfolio
2. API fetches user wallet address from MySQL
3. For each company:
   - Query Solana: getUserTokenBalance(wallet, tokenMint)
   - Get token account address
   - Fetch from MySQL: average price, trade history
4. Join Solana data + MySQL data
5. Calculate: profit/loss, market value
6. Update holdings cache in MySQL
7. Return: Portfolio with Solana addresses
```

#### Example 2: Place Order
```
1. User → POST /api/orders (signed request)
2. Verify KYC status (MySQL)
3. Fetch company token mint (MySQL)
4. Call Solana program:
   - Create order PDA
   - Escrow tokens/SOL
   - Get transaction signature
5. Store in MySQL:
   - Order details
   - Transaction signature
   - Order address (PDA)
6. Return: Order ID + Transaction signature
```

#### Example 3: IPO Application
```
1. User → POST /api/ipos/apply
2. Verify KYC (MySQL)
3. Fetch IPO details (MySQL)
4. Validate subscription limits
5. Calculate SOL amount
6. Create escrow on Solana
7. Store application in MySQL with escrow address
8. Return: Application ID + Escrow address
```

## Database Schema

### Key Tables

#### users
- Stores user accounts
- Links wallet addresses
- Admin flags

#### kyc_records
- KYC submissions
- Verification status
- **trade_account_address**: Solana trading account PDA

#### companies
- Company information
- **token_mint**: Solana token mint address
- **order_book_address**: Solana order book PDA
- **base_vault_address**: Token vault
- **sol_vault_address**: SOL vault

#### orders
- Order book
- **order_address**: Solana order PDA
- **transaction_signature**: Solana tx signature
- Status and execution tracking

#### trades
- Executed trades
- **transaction_signature**: Solana tx signature
- Buyer/seller information
- Fees

#### holdings
- Portfolio cache
- **token_account**: Solana token account address
- Synced from blockchain
- Average price tracking

#### wallet_transactions
- Deposits and withdrawals
- Razorpay integration
- **transaction_signature**: Solana tx (for deposits)
- Bank transfer details (for withdrawals)

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone": "+919876543210",
  "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
Login with credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "is_admin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### GET /api/auth/profile
Get user profile with KYC status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "is_active": true,
      "is_admin": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "kyc": {
      "status": "APPROVED",
      "trade_account_address": "8xKYui3DX98e08UKTEqcE6kClfuFrB94UASvkptdHdpV",
      "verified_at": "2024-01-02T00:00:00.000Z"
    }
  }
}
```

#### POST /api/auth/kyc/submit
Submit KYC documents.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "document_type": "AADHAAR",
  "document_number": "1234-5678-9012",
  "date_of_birth": "1990-01-15",
  "address_line1": "123 Main Street",
  "address_line2": "Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "country": "India"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC submitted successfully. Verification is pending."
}
```

### Company Endpoints

#### GET /api/companies
Get all companies with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by symbol or name
- `is_active`: Filter by active status (true/false/all)

**Response:**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": 1,
        "symbol": "TATA",
        "name": "Tata Motors",
        "description": "Leading automobile manufacturer",
        "token_mint": "9xYvn2F45h9i09LMUFrdF7mDofvGsX95VAtsluqeJksW",
        "total_shares": "1000000000",
        "outstanding_shares": "500000000",
        "sector": "Automobile",
        "industry": "Manufacturing",
        "order_book_address": "BxZyo3G56j0k10NMVGseG8nEpgHuZ96XBuumvqfKmtnX",
        "base_vault_address": "CxZzp4H67k1l21ONWHtfH9oPqIvI0A107CVvwnrLnuoY",
        "sol_vault_address": "DxA0q5I78m2m32POXIugI0qRrJwJ2B218DWxosMLovpZ",
        "tick_size": "1000000",
        "min_order_size": "1",
        "is_active": true,
        "listed_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### POST /api/companies
Register a new company (Admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "symbol": "TATA",
  "name": "Tata Motors",
  "description": "Leading automobile manufacturer in India",
  "token_mint": "9xYvn2F45h9i09LMUFrdF7mDofvGsX95VAtsluqeJksW",
  "total_shares": "1000000000",
  "sector": "Automobile",
  "industry": "Manufacturing",
  "logo_url": "https://example.com/logo.png",
  "website_url": "https://tatamotors.com",
  "tick_size": "1000000",
  "min_order_size": "1"
}
```

### Order Endpoints

#### POST /api/orders
Place a new order.

**Headers:**
```
Authorization: Bearer <token>
```

**Request (Limit Order):**
```json
{
  "company_id": 1,
  "side": "BUY",
  "order_type": "LIMIT",
  "price": "5000000000",
  "quantity": "10"
}
```

**Request (Market Order):**
```json
{
  "company_id": 1,
  "side": "SELL",
  "order_type": "MARKET",
  "quantity": "5",
  "max_quote_amount": "30000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": 123,
    "txSignature": "5xKZuj3EY09f98VKUGrd9G8oEwfIvC095VButtmrKlqXYZ..."
  },
  "message": "Order placed successfully"
}
```

#### GET /api/orders/book/:companyId
Get order book for a company.

**Response:**
```json
{
  "success": true,
  "data": {
    "bids": [
      {
        "price": "5000000000",
        "quantity": "100",
        "orders": 5
      },
      {
        "price": "4900000000",
        "quantity": "250",
        "orders": 12
      }
    ],
    "asks": [
      {
        "price": "5100000000",
        "quantity": "150",
        "orders": 8
      },
      {
        "price": "5200000000",
        "quantity": "300",
        "orders": 15
      }
    ]
  }
}
```

### Portfolio Endpoints

#### GET /api/portfolio
Get user portfolio with Solana address verification.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "company": {
          "id": 1,
          "symbol": "TATA",
          "name": "Tata Motors",
          "token_mint": "9xYvn2F45h9i09LMUFrdF7mDofvGsX95VAtsluqeJksW"
        },
        "quantity": "100",
        "token_account": "ExB1r6KZ9q3n43RPYJvhJ1rStKxK3C319EYxptqKocwZ",
        "current_price": "5000000000",
        "average_price": "4500000000",
        "market_value": "500000000000",
        "cost_basis": "450000000000",
        "profit_loss": "50000000000",
        "profit_loss_percentage": 11.11
      }
    ],
    "total_value": "500000000000"
  }
}
```

### Wallet Endpoints

#### POST /api/wallet/deposit
Create deposit order via Razorpay.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "amount": "1000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "order_MxB2r7LZ0q4n54SQZKwi",
    "amount": 500000,
    "currency": "INR"
  },
  "message": "Deposit order created"
}
```

#### POST /api/wallet/withdraw
Request withdrawal to bank account.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "amount": "500000000",
  "bank_account_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": 456
  },
  "message": "Withdrawal request submitted"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [] // Optional validation errors
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Setup Instructions

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database
```bash
mysql -u root -p
CREATE DATABASE solana_stock_exchange;
exit

mysql -u root -p solana_stock_exchange < database/schema.sql
```

### 4. Run the Server
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Portfolio
```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

### 1. Address Verification
All Solana-related data is verified with on-chain addresses:
- Portfolio holdings → Token account addresses
- Orders → Order PDA addresses
- Trading accounts → Trading account PDAs
- Companies → Token mint addresses
- Order books → Order book PDAs

### 2. Transaction Tracking
Every blockchain interaction stores:
- Transaction signature
- On-chain account addresses
- Timestamp
- Status

### 3. Data Synchronization
- Holdings are synced from blockchain
- Order status updated from blockchain events
- Price data from last trades
- Balance verification before operations

### 4. Security
- All sensitive operations require JWT authentication
- KYC verification for trading
- Admin authorization for management operations
- Rate limiting on all endpoints
- Input validation on all requests

## Support

For issues or questions, please refer to the main README or open an issue on GitHub.
