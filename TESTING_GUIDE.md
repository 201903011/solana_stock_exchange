# Quick Test Guide - Solana Stock Exchange API

## Prerequisites
1. Ensure Solana test validator is running
2. Database is setup with schema
3. API server is running (`npm run dev`)
4. Have Postman or curl ready

## Test Flow

### 1. Register Admin User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exchange.com",
    "password": "Admin@123",
    "full_name": "Admin User",
    "wallet_address": "YourSolanaWalletAddress"
  }'
```

**Save the token from response!**

### 2. Update Admin Flag (Manually in DB)
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'admin@exchange.com';
```

### 3. Register Company (Admin)
```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "symbol": "TATA",
    "name": "Tata Motors",
    "description": "Leading automobile company",
    "token_mint": "TokenMintAddressFromSolana",
    "total_shares": "1000000000",
    "sector": "Automobile",
    "industry": "Manufacturing"
  }'
```

### 4. Register Normal User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@example.com",
    "password": "Trader@123",
    "full_name": "Trader User",
    "wallet_address": "TraderWalletAddress"
  }'
```

**Save this token too!**

### 5. Submit KYC
```bash
curl -X POST http://localhost:3000/api/auth/kyc/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TRADER_TOKEN" \
  -d '{
    "document_type": "AADHAAR",
    "document_number": "1234-5678-9012",
    "date_of_birth": "1995-05-15",
    "address_line1": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  }'
```

### 6. Get Pending KYCs (Admin)
```bash
curl -X GET http://localhost:3000/api/auth/kyc/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 7. Approve KYC (Admin)
```bash
curl -X POST http://localhost:3000/api/auth/kyc/1/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

This creates the Solana trading account!

### 8. Get Companies
```bash
curl -X GET http://localhost:3000/api/companies
```

### 9. Place Buy Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TRADER_TOKEN" \
  -d '{
    "company_id": 1,
    "side": "BUY",
    "order_type": "LIMIT",
    "price": "5000000000",
    "quantity": "10"
  }'
```

### 10. Get Order Book
```bash
curl -X GET http://localhost:3000/api/orders/book/1
```

### 11. Get User Orders
```bash
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer TRADER_TOKEN"
```

### 12. View Portfolio
```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer TRADER_TOKEN"
```

This fetches balances from Solana and joins with SQL!

### 13. Create IPO (Admin)
```bash
curl -X POST http://localhost:3000/api/ipos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "company_id": 1,
    "title": "TATA Motors IPO 2024",
    "description": "Initial public offering",
    "total_shares": "1000000",
    "price_per_share": "5000000000",
    "min_subscription": "10",
    "max_subscription": "1000",
    "open_date": "2024-12-01T00:00:00Z",
    "close_date": "2024-12-31T23:59:59Z"
  }'
```

### 14. Apply to IPO
```bash
curl -X POST http://localhost:3000/api/ipos/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TRADER_TOKEN" \
  -d '{
    "ipo_id": 1,
    "quantity": "100"
  }'
```

### 15. Add Bank Account
```bash
curl -X POST http://localhost:3000/api/wallet/bank-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TRADER_TOKEN" \
  -d '{
    "account_holder_name": "Trader User",
    "account_number": "1234567890",
    "ifsc_code": "SBIN0001234",
    "bank_name": "State Bank of India",
    "account_type": "SAVINGS"
  }'
```

### 16. Request Withdrawal
```bash
curl -X POST http://localhost:3000/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TRADER_TOKEN" \
  -d '{
    "amount": "500000000",
    "bank_account_id": 1
  }'
```

### 17. Get Transaction History
```bash
curl -X GET http://localhost:3000/api/wallet/transactions \
  -H "Authorization: Bearer TRADER_TOKEN"
```

### 18. Get Trade History
```bash
curl -X GET http://localhost:3000/api/portfolio/trades \
  -H "Authorization: Bearer TRADER_TOKEN"
```

## Verification Steps

### Verify User Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TRADER_TOKEN"
```

Should show:
- User details
- KYC status: APPROVED
- Trading account address (Solana PDA)

### Verify Portfolio
```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer TRADER_TOKEN"
```

Should show:
- Holdings with token account addresses
- Balances fetched from Solana
- Company info from SQL
- Profit/Loss calculations

### Verify Order Book
```bash
curl -X GET http://localhost:3000/api/orders/book/1
```

Should show:
- Bid orders grouped by price
- Ask orders grouped by price
- Aggregated from SQL

## Common Issues & Solutions

### Issue: "KYC verification required"
**Solution**: Ensure KYC is approved by admin

### Issue: "Company not found"
**Solution**: Register company first as admin

### Issue: "Invalid wallet address"
**Solution**: Use valid Solana base58 encoded address

### Issue: "Failed to place order on blockchain"
**Solution**: 
1. Check Solana validator is running
2. Verify program IDs in .env
3. Ensure wallet has SOL for gas
4. Check order book is initialized

### Issue: "Database connection failed"
**Solution**: 
1. Verify MySQL is running
2. Check DB credentials in .env
3. Ensure database exists
4. Run schema.sql

## Health Check
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "success": true,
  "message": "Solana Stock Exchange API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Database Queries for Testing

### Check Users
```sql
SELECT id, email, full_name, wallet_address, is_admin FROM users;
```

### Check KYC Status
```sql
SELECT u.email, k.status, k.trade_account_address 
FROM kyc_records k 
JOIN users u ON k.user_id = u.id;
```

### Check Companies
```sql
SELECT id, symbol, name, token_mint, order_book_address 
FROM companies;
```

### Check Orders
```sql
SELECT o.id, u.email, c.symbol, o.side, o.order_type, 
       o.quantity, o.status, o.transaction_signature
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN companies c ON o.company_id = c.id;
```

### Check Holdings
```sql
SELECT h.*, u.email, c.symbol 
FROM holdings h
JOIN users u ON h.user_id = u.id
JOIN companies c ON h.company_id = c.id;
```

## Tips

1. **Always save tokens** - You'll need them for authenticated requests
2. **Test in order** - Follow the flow: Register → KYC → Trade
3. **Check database** - Verify data is being stored correctly
4. **Monitor Solana** - Use `solana logs` to see blockchain transactions
5. **Use Postman** - Create a collection for easier testing

## Postman Collection

Import this JSON to Postman:

```json
{
  "info": {
    "name": "Solana Stock Exchange API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test@123\",\n  \"full_name\": \"Test User\",\n  \"wallet_address\": \"YourWalletAddress\"\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/login"
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

## Success Criteria

✅ Users can register and login
✅ KYC can be submitted and approved
✅ Trading account created on Solana after KYC
✅ Companies can be registered with token mints
✅ Orders can be placed on Solana
✅ Order book shows aggregated orders
✅ Portfolio shows balances from Solana
✅ IPOs can be created and applied to
✅ Wallet operations work with Razorpay
✅ All addresses verified with Solana
