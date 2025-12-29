# Solana IPO Platform Prototype

Full-stack prototype implementing the Tata Tech IPO scenario with Express TypeScript backend and Next.js frontend with Phantom wallet integration.

## Project Structure

```
prototype/
├── backend/          # Express TypeScript API server
│   ├── src/
│   │   ├── config/   # Configuration and wallet setup
│   │   ├── routes/   # API endpoints (IPO, orders, portfolio)
│   │   ├── scripts/  # Utility scripts (wallet generation)
│   │   └── server.ts # Main server file
│   └── package.json
│
└── frontend/         # Next.js TypeScript app
    ├── src/
    │   ├── components/ # UI components (Navbar, Layout)
    │   ├── config/     # Frontend configuration
    │   ├── contexts/   # Wallet context provider
    │   ├── pages/      # Next.js pages (home, IPO, trading, portfolio)
    │   ├── services/   # API client
    │   └── styles/     # Global styles
    └── package.json
```

## Features

### Backend
- ✅ Express TypeScript server with backend wallet
- ✅ IPO creation and allocation endpoints
- ✅ Order placement with escrow (SOL/tokens)
- ✅ Order matching and settlement
- ✅ Portfolio and balance queries
- ✅ Transaction creation for frontend signing

### Frontend
- ✅ Next.js with TypeScript and Tailwind CSS
- ✅ Phantom wallet integration
- ✅ IPO marketplace and applications
- ✅ Trading interface with order book
- ✅ Portfolio management
- ✅ Transaction signing on frontend

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Solana CLI tools
- Phantom wallet browser extension
- Running Solana test validator

### 1. Start Solana Test Validator

```bash
solana-test-validator
```

### 2. Setup Backend

```bash
cd prototype/backend

# Install dependencies
npm install

# Generate backend wallet
npm run generate-wallet

# Copy environment file
cp .env.example .env

# Edit .env and add the secretKey from backend-wallet.json to BACKEND_WALLET_SECRET_KEY

# Fund backend wallet
solana airdrop 100 <BACKEND_WALLET_PUBLIC_KEY> --url localhost

# Start backend server
npm run dev
```

Backend will run on http://localhost:5000

### 3. Setup Frontend

```bash
cd prototype/frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend will run on http://localhost:3000

### 4. Configure Phantom Wallet

1. Install Phantom wallet extension
2. Switch to **Localhost** network in settings
3. Import a wallet or create new one
4. Airdrop SOL to your wallet:
   ```bash
   solana airdrop 10 <YOUR_WALLET_ADDRESS> --url localhost
   ```

## Usage Flow

### 1. Create IPO (Backend)

Use API or curl:

```bash
curl -X POST http://localhost:5000/api/ipo/create \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Tata Technologies Ltd.",
    "symbol": "TATATECH",
    "totalShares": 1000,
    "pricePerShare": 50
  }'
```

### 2. Apply for IPO (Frontend)

1. Go to http://localhost:3000/ipo
2. Connect Phantom wallet
3. Enter number of shares
4. Click "Apply for IPO"

### 3. Allocate Shares (Backend API)

```bash
curl -X POST http://localhost:5000/api/ipo/allocate \
  -H "Content-Type: application/json" \
  -d '{
    "ipoId": "<IPO_ID>",
    "allocations": [
      {
        "userAddress": "<USER_WALLET_ADDRESS>",
        "sharesAllocated": 15
      }
    ]
  }'
```

### 4. Trade Tokens (Frontend)

1. Go to http://localhost:3000/trading
2. Select token
3. Choose buy/sell and enter details
4. Click "Place Order"
5. **Sign transaction with Phantom wallet**
6. Order is placed with escrow

### 5. Match & Settle (Backend API)

```bash
# Match orders
curl -X POST http://localhost:5000/api/orders/match \
  -H "Content-Type: application/json" \
  -d '{
    "buyOrderId": "<BUY_ORDER_ID>",
    "sellOrderId": "<SELL_ORDER_ID>"
  }'

# Settle matched orders
curl -X POST http://localhost:5000/api/orders/settle \
  -H "Content-Type: application/json" \
  -d '{
    "buyOrderId": "<BUY_ORDER_ID>",
    "sellOrderId": "<SELL_ORDER_ID>"
  }'
```

### 6. View Portfolio (Frontend)

1. Go to http://localhost:3000/portfolio
2. View SOL balance and token holdings

## API Endpoints

### General
- `GET /health` - Health check
- `GET /api/backend-wallet` - Backend wallet info

### IPO
- `POST /api/ipo/create` - Create IPO
- `GET /api/ipo/list` - List all IPOs
- `GET /api/ipo/:id` - Get IPO details
- `POST /api/ipo/apply` - Apply for IPO
- `POST /api/ipo/allocate` - Allocate shares (admin)

### Orders
- `POST /api/orders/place` - Place order (returns unsigned tx)
- `POST /api/orders/confirm` - Confirm with signed tx
- `GET /api/orders/book/:mintAddress` - Get order book
- `GET /api/orders/user/:userAddress` - Get user orders
- `POST /api/orders/match` - Match orders (admin)
- `POST /api/orders/settle` - Settle orders (admin)

### Portfolio
- `GET /api/portfolio/:userAddress` - Get portfolio
- `GET /api/portfolio/:userAddress/token/:mintAddress` - Get token balance

## Architecture

### Transaction Flow

```
1. User fills form on frontend
2. Frontend calls backend API
3. Backend creates unsigned transaction
4. Backend returns transaction to frontend
5. Frontend shows transaction to user
6. User signs with Phantom wallet
7. Frontend sends signed transaction to backend
8. Backend broadcasts to Solana network
9. Transaction confirmed on-chain
```

### Escrow System

- **Sell Orders**: Tokens transferred to backend's token account
- **Buy Orders**: SOL transferred to backend's wallet
- **Settlement**: Backend releases assets atomically

⚠️ **Note**: This uses a simplified escrow (backend wallet). In production, use a proper escrow program with PDAs for security.

## Security Considerations

This is a **prototype for development/testing**. For production:

- ✅ Use proper PDA-based escrow program
- ✅ Implement authentication and authorization
- ✅ Use database instead of in-memory storage
- ✅ Add rate limiting and input validation
- ✅ Implement proper error handling
- ✅ Add transaction retry logic
- ✅ Use environment-specific configurations
- ✅ Add monitoring and logging
- ✅ Implement proper key management (HSM, KMS)

## Technology Stack

### Backend
- Express.js with TypeScript
- @solana/web3.js
- @solana/spl-token
- dotenv

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- Phantom Wallet
- Axios

## Testing

Run the test from the main project:

```bash
cd ../..  # Back to root
anchor test tests/tata-tech-ipo-test.ts
```

This prototype implements the same flow as the test file, but with:
- Backend API instead of direct program calls
- Frontend UI instead of test scripts
- Phantom wallet signing instead of test keypairs

## Troubleshooting

### Backend Issues
- **Wallet not loaded**: Check BACKEND_WALLET_SECRET_KEY in .env
- **Insufficient funds**: Airdrop SOL to backend wallet
- **Port in use**: Change PORT in .env

### Frontend Issues
- **Wallet not connecting**: Check Phantom is on localhost network
- **Transaction failing**: Ensure user wallet has sufficient balance
- **Network errors**: Verify backend is running
- **CORS errors**: Backend has CORS enabled for all origins (dev only)

### Common Issues
- **Blockhash expired**: Transactions expire after ~60s, retry
- **Account not found**: Token account may not exist, backend creates it
- **Insufficient lamports**: Ensure all parties have enough SOL for fees

## Next Steps

To make this production-ready:

1. Implement proper escrow program (Anchor)
2. Add database (PostgreSQL/MongoDB)
3. Add authentication (JWT, sessions)
4. Add admin dashboard for matching/settling
5. Implement WebSocket for real-time updates
6. Add proper state management (Redux/Zustand)
7. Add comprehensive error handling
8. Add transaction history and notifications
9. Deploy to mainnet/devnet
10. Add proper testing suite

## License

MIT
