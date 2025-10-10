# Postman Collection - Solana Stock Exchange API

## 📦 Files Included

1. **`postman_collection.json`** - Complete API collection with 27 endpoints
2. **`postman_environment_local.json`** - Local development environment
3. **`postman_environment_production.json`** - Production environment template

## 🚀 Quick Setup

### Step 1: Import into Postman

1. Open Postman
2. Click **Import** button (top left)
3. Drag and drop all 3 JSON files or click **Upload Files**
4. Click **Import**

### Step 2: Select Environment

1. Click the environment dropdown (top right)
2. Select **"Solana Stock Exchange - Local"**
3. Click the eye icon to view/edit environment variables

### Step 3: Configure Environment Variables

Before testing, update these variables in the Local environment:

#### Required Variables (Set Before Testing):
```
user_wallet_address    = Your Solana wallet address
company_token_mint     = Token mint address for test company
order_book_address     = Order book PDA address
base_vault_address     = Base vault PDA address
sol_vault_address      = SOL vault PDA address
```

#### Auto-populated Variables (Set by API responses):
```
auth_token            = Automatically set after login/register
admin_token           = Set after admin login
user_id               = Set after registration
company_id            = Set after company registration
order_id              = Set after placing order
ipo_id                = Set after creating IPO
razorpay_order_id     = Set after creating deposit
```

## 📋 API Endpoints Overview

### 🔐 Authentication (7 endpoints)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/kyc/submit` - Submit KYC documents
- `GET /api/auth/kyc/pending` - Get pending KYCs (Admin)
- `POST /api/auth/kyc/approve` - Approve KYC (Admin)
- `POST /api/auth/kyc/reject` - Reject KYC (Admin)

### 🏢 Companies (4 endpoints)
- `POST /api/companies/register` - Register company (Admin)
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `PUT /api/companies/:id` - Update company (Admin)

### 📊 Orders (5 endpoints)
- `POST /api/orders/place` - Place limit/market order
- `POST /api/orders/cancel` - Cancel order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/order-book/:companyId` - Get order book

### 💼 Portfolio (2 endpoints)
- `GET /api/portfolio` - Get portfolio with holdings
- `GET /api/portfolio/trade-history` - Get trade history

### 🎯 IPO (4 endpoints)
- `POST /api/ipos/create` - Create IPO (Admin)
- `GET /api/ipos` - Get all IPOs
- `POST /api/ipos/apply` - Apply to IPO
- `GET /api/ipos/my-applications` - Get user's IPO applications

### 💰 Wallet (6 endpoints)
- `POST /api/wallet/deposit/create` - Create deposit order
- `POST /api/wallet/deposit/verify` - Verify deposit payment
- `POST /api/wallet/withdraw` - Request withdrawal
- `GET /api/wallet/transactions` - Get wallet transactions
- `POST /api/wallet/bank-account` - Add bank account
- `GET /api/wallet/bank-accounts` - Get bank accounts

### ❤️ Health Check (1 endpoint)
- `GET /health` - Server health check

## 🔄 Testing Workflow

### 1. Register and Login

**Step 1: Register User**
```
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "SecurePass@123",
  "full_name": "John Doe",
  "wallet_address": "{{user_wallet_address}}"
}
```
✅ Sets `auth_token` automatically

**Step 2: Login (or use token from register)**
```
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```
✅ Updates `auth_token`

### 2. Complete KYC

**Step 3: Submit KYC**
```
POST /api/auth/kyc/submit
Headers: Authorization: Bearer {{auth_token}}
```

**Step 4: Admin Approves KYC**
```
POST /api/auth/kyc/approve (Admin only)
Headers: Authorization: Bearer {{admin_token}}
```

### 3. Company Setup (Admin)

**Step 5: Register Company**
```
POST /api/companies/register
Headers: Authorization: Bearer {{admin_token}}
```
✅ Sets `company_id`, `company_symbol`, `token_mint`

### 4. Trading

**Step 6: Place Buy Order**
```
POST /api/orders/place
Body: {
  "companyId": {{company_id}},
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 10,
  "price": 100.00
}
```

**Step 7: Place Sell Order**
```
POST /api/orders/place
Body: {
  "side": "SELL",
  "type": "MARKET",
  "quantity": 5
}
```

**Step 8: View Portfolio**
```
GET /api/portfolio
```

### 5. IPO Investment

**Step 9: Create IPO (Admin)**
```
POST /api/ipos/create
Headers: Authorization: Bearer {{admin_token}}
```

**Step 10: Apply to IPO**
```
POST /api/ipos/apply
Body: {
  "ipoId": {{ipo_id}},
  "shares_applied": 100,
  "amount_invested": 5000
}
```

### 6. Wallet Operations

**Step 11: Deposit Funds**
```
POST /api/wallet/deposit/create
Body: {
  "amount": 10000,
  "currency": "INR"
}
```

**Step 12: Add Bank Account**
```
POST /api/wallet/bank-account
Body: {
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "account_holder_name": "John Doe"
}
```

**Step 13: Request Withdrawal**
```
POST /api/wallet/withdraw
Body: {
  "amount": 5000,
  "bankAccountId": 1
}
```

## 🎯 Pre-request Scripts

The collection includes automatic token handling:

1. **After Login/Register**: `auth_token` is automatically saved
2. **After Company Registration**: `company_id`, `token_mint` saved
3. **After Placing Order**: `order_id` saved
4. **After Creating IPO**: `ipo_id` saved
5. **After Deposit**: `razorpay_order_id` saved

## 🔑 Authentication

### Regular User Endpoints
Add header to authenticated requests:
```
Authorization: Bearer {{auth_token}}
```

### Admin Only Endpoints
Use admin token:
```
Authorization: Bearer {{admin_token}}
```

Admin endpoints:
- Company registration/update
- KYC approval/rejection
- IPO creation

## 🌍 Environment Variables

### Local Environment (Development)
```json
{
  "base_url": "http://localhost:3000",
  "user_wallet_address": "DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU"
}
```

### Production Environment
```json
{
  "base_url": "https://api.yourdomain.com"
}
```

## 📝 Creating Admin User

To test admin endpoints:

1. Register a user through API
2. Manually set admin flag in database:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com';
```
3. Login with that user to get `admin_token`
4. Set `admin_token` in environment variables

## 🔍 Query Parameters

### Orders
```
GET /api/orders/my-orders?status=OPEN
status: OPEN | FILLED | PARTIALLY_FILLED | CANCELLED
```

### IPOs
```
GET /api/ipos?status=OPEN
status: UPCOMING | OPEN | CLOSED | CANCELLED
```

### Trade History
```
GET /api/portfolio/trade-history?limit=50&offset=0
limit: Number of records (default: 50)
offset: Skip records (default: 0)
```

### Wallet Transactions
```
GET /api/wallet/transactions?type=DEPOSIT&limit=20
type: DEPOSIT | WITHDRAWAL | IPO_INVESTMENT | IPO_REFUND
limit: Number of records
offset: Skip records
```

## ⚡ Tips & Best Practices

### 1. Token Management
- Tokens are automatically saved from login/register responses
- Check environment variables if auth fails
- Admin token must be set manually after admin login

### 2. Order of Operations
1. Register → Login → Submit KYC → Admin Approves
2. Only trade after KYC approval
3. Create company before placing orders
4. Create IPO before applying

### 3. Solana Addresses
- Update environment variables with actual Solana addresses
- Get addresses from deployed programs
- Use `solana address` command for wallet addresses

### 4. Testing on Local
- Ensure database is created and schema imported
- Server should be running on http://localhost:3000
- Test validator should be running (if using Solana integration)

### 5. Error Handling
- Check response for error messages
- Verify authentication token is set
- Ensure KYC is approved for trading endpoints
- Validate Solana addresses format

## 🐛 Troubleshooting

### "Access denied. No token provided"
- Check if `auth_token` is set in environment
- Verify Authorization header is present
- Re-login to get fresh token

### "Access denied. Admin privileges required"
- Use `admin_token` instead of `auth_token`
- Ensure user has `is_admin = TRUE` in database
- Set `admin_token` in environment after admin login

### "KYC verification required"
- Submit KYC documents via `/api/auth/kyc/submit`
- Admin must approve via `/api/auth/kyc/approve`
- Check KYC status in user profile

### "Company not found"
- Register company first (admin endpoint)
- Update `company_id` in environment
- Verify company exists via GET /api/companies

### Variables Not Auto-populating
- Check "Tests" tab in request for script
- Ensure response is successful (2xx status)
- Manually set in environment if needed

## 📚 Additional Resources

- **API Documentation**: See `API_IMPLEMENTATION_GUIDE.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Architecture**: See `ARCHITECTURE_VISUAL.md`
- **Quick Start**: See `QUICK_START.md`

## 🎉 Example Test Sequence

```
1. Health Check → Verify server is running
2. Register User → Get auth token
3. Submit KYC → Upload documents
4. Register Admin → Manually set admin flag
5. Login as Admin → Get admin token
6. Approve KYC → Enable trading
7. Register Company → Create TECH stock
8. Place Buy Order → Buy 10 shares @ $100
9. Place Sell Order → Sell 5 shares
10. View Portfolio → See holdings and P&L
11. Create IPO → New company IPO
12. Apply to IPO → Invest in IPO
13. Add Bank Account → For withdrawals
14. Create Deposit → Add funds via Razorpay
15. Request Withdrawal → Transfer to bank
16. View Transactions → See all wallet activity
```

## 📞 Support

For issues or questions:
1. Check error message in response
2. Verify environment variables are set correctly
3. Ensure database and server are running
4. Review API documentation for endpoint requirements

---

**Happy Testing! 🚀**
