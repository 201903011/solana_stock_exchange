# 🚀 Quick Start Guide - Solana Stock Exchange API

## Prerequisites Checklist

- [ ] Node.js 16+ installed (`node --version`)
- [ ] MySQL 8.0+ installed (`mysql --version`)
- [ ] Solana CLI installed (`solana --version`)
- [ ] Anchor Framework installed (`anchor --version`)
- [ ] Git installed

## 5-Minute Setup

### Step 1: Database Setup (2 minutes)

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE solana_stock_exchange;"

# Import schema
cd /home/rahul/projects/solana_stock_exchange/api
mysql -u root -p solana_stock_exchange < database/schema.sql

# Verify
mysql -u root -p solana_stock_exchange -e "SHOW TABLES;"
```

Expected output: 12 tables (users, kyc_records, companies, orders, etc.)

### Step 2: API Configuration (1 minute)

```bash
# Copy environment file
cp .env.example .env

# Edit with your details
nano .env
```

**Minimal configuration needed:**
```env
DB_PASSWORD=your_mysql_password
JWT_SECRET=any_random_string_here
SOLANA_RPC_URL=http://localhost:8899
ADMIN_WALLET_PRIVATE_KEY=your_wallet_private_key_base58
```

### Step 3: Install Dependencies (1 minute)

```bash
npm install
```

### Step 4: Start Server (1 minute)

```bash
# Development mode
npm run dev

# OR Production mode
npm run build && npm start
```

✅ Server should start on http://localhost:3000

### Step 5: Verify Setup

```bash
# Health check
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Solana Stock Exchange API is running"
}
```

## First API Calls

### 1. Register Your First User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@123456",
    "full_name": "Admin User",
    "wallet_address": "YOUR_SOLANA_WALLET_ADDRESS"
  }'
```

**Save the token!** You'll need it for authenticated requests.

### 2. Make User Admin (via MySQL)

```bash
mysql -u root -p solana_stock_exchange -e \
  "UPDATE users SET is_admin = TRUE WHERE email = 'admin@test.com';"
```

### 3. List Companies

```bash
curl http://localhost:3000/api/companies
```

## Common Issues & Quick Fixes

### Issue: "Database connection failed"
```bash
# Fix: Check MySQL is running
sudo systemctl status mysql
sudo systemctl start mysql

# Verify credentials
mysql -u root -p
```

### Issue: "Cannot find module"
```bash
# Fix: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"
```bash
# Fix: Change port in .env
echo "PORT=3001" >> .env

# OR kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: "Failed to connect to Solana"
```bash
# Fix: Start local validator
solana-test-validator

# OR use devnet
# In .env: SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Project Structure Quick Reference

```
api/
├── src/
│   ├── index.ts              # Main server file
│   ├── config/               # Configuration
│   ├── types/                # TypeScript types
│   ├── controllers/          # Business logic
│   │   ├── auth.controller.ts
│   │   ├── company.controller.ts
│   │   ├── order.controller.ts
│   │   ├── portfolio.controller.ts
│   │   ├── ipo.controller.ts
│   │   └── wallet.controller.ts
│   ├── routes/               # API routes
│   ├── middleware/           # Auth, validation
│   ├── utils/                # Helpers
│   │   ├── auth.ts           # JWT utilities
│   │   └── solana.ts         # Blockchain integration
│   └── database/             # DB connection
├── database/
│   └── schema.sql            # Database schema
├── .env.example              # Environment template
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

## Development Workflow

### 1. Make Changes
```bash
# Edit files in src/
nano src/controllers/your.controller.ts
```

### 2. TypeScript Check
```bash
npm run build
```

### 3. Run Dev Server (Auto-reload)
```bash
npm run dev
```

### 4. Test Endpoint
```bash
curl -X GET http://localhost:3000/api/your-endpoint
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3000 | Server port |
| `DB_HOST` | Yes | localhost | MySQL host |
| `DB_USER` | Yes | root | MySQL user |
| `DB_PASSWORD` | Yes | - | MySQL password |
| `DB_NAME` | Yes | solana_stock_exchange | Database name |
| `JWT_SECRET` | Yes | - | JWT secret key |
| `SOLANA_RPC_URL` | Yes | - | Solana RPC endpoint |
| `EXCHANGE_PROGRAM_ID` | Yes | - | Exchange program address |
| `ADMIN_WALLET_PRIVATE_KEY` | Yes | - | Admin wallet key (base58) |
| `RAZORPAY_KEY_ID` | No | - | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | No | - | Razorpay secret |

## Useful Commands

### Database
```bash
# Backup database
mysqldump -u root -p solana_stock_exchange > backup.sql

# Restore database
mysql -u root -p solana_stock_exchange < backup.sql

# Reset database
mysql -u root -p solana_stock_exchange < database/schema.sql
```

### Server
```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production
npm start

# Check TypeScript errors
npx tsc --noEmit
```

### Logs
```bash
# View server logs (if using PM2)
pm2 logs

# View MySQL logs
sudo tail -f /var/log/mysql/error.log
```

## API Testing Tools

### Using cURL
```bash
# Set token variable
TOKEN="your_jwt_token_here"

# Authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/profile
```

### Using Postman
1. Import collection from `TESTING_GUIDE.md`
2. Set `base_url` variable to `http://localhost:3000`
3. Set `token` variable after login
4. Start testing!

### Using VS Code REST Client
Create `test.http`:
```http
### Health Check
GET http://localhost:3000/health

### Register
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123",
  "full_name": "Test User"
}

### Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123"
}
```

## Next Steps

1. **Read Documentation**
   - `API_IMPLEMENTATION_GUIDE.md` - Complete API reference
   - `API_SUMMARY.md` - Feature overview
   - `TESTING_GUIDE.md` - Testing instructions

2. **Deploy Solana Programs**
   ```bash
   cd /home/rahul/projects/solana_stock_exchange
   anchor build
   anchor deploy
   ```

3. **Configure Razorpay**
   - Sign up at https://razorpay.com
   - Get API keys
   - Add to `.env`

4. **Test All Flows**
   - Follow `TESTING_GUIDE.md`
   - Test each endpoint
   - Verify Solana integration

5. **Deploy to Production**
   - Setup cloud server (AWS/DigitalOcean)
   - Configure SSL certificate
   - Setup MySQL replication
   - Configure Solana mainnet RPC

## Support & Resources

- **Documentation**: `/API_IMPLEMENTATION_GUIDE.md`
- **Architecture**: `/ARCHITECTURE_VISUAL.md`
- **Testing**: `/TESTING_GUIDE.md`
- **Summary**: `/API_SUMMARY.md`

## Quick Debug Checklist

When something goes wrong:

1. [ ] Check server logs
2. [ ] Verify database connection
3. [ ] Check Solana validator is running
4. [ ] Verify environment variables
5. [ ] Check JWT token is valid
6. [ ] Verify KYC is approved (for trading)
7. [ ] Check Solana program IDs match
8. [ ] Verify wallet has SOL for gas

## Success Indicators

✅ Server starts without errors
✅ Database schema imported successfully
✅ Health endpoint returns 200
✅ User can register and login
✅ JWT token is generated
✅ Solana connection established
✅ API endpoints respond correctly

---

**You're all set!** 🎉

Start the server with `npm run dev` and begin testing the API endpoints.

For detailed documentation, see:
- API Reference: `API_IMPLEMENTATION_GUIDE.md`
- Testing Guide: `TESTING_GUIDE.md`
- Architecture: `ARCHITECTURE_VISUAL.md`
