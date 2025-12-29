# Solana IPO Backend

Express TypeScript backend for the Solana IPO and Trading Platform prototype.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate backend wallet:**
   ```bash
   npm run generate-wallet
   ```

   This will create `backend-wallet.json` with the keypair.

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add the `secretKey` from `backend-wallet.json` to `BACKEND_WALLET_SECRET_KEY`.

4. **Fund the backend wallet:**
   
   Get the public key from `backend-wallet.json` and send SOL to it:
   ```bash
   solana airdrop 100 <BACKEND_WALLET_PUBLIC_KEY> --url localhost
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

   Server will run on http://localhost:5000

## API Endpoints

### General

- `GET /health` - Health check
- `GET /api/backend-wallet` - Get backend wallet info and balance

### IPO Endpoints

- `POST /api/ipo/create` - Create new IPO
  ```json
  {
    "companyName": "Tata Technologies Ltd.",
    "symbol": "TATATECH",
    "totalShares": 1000,
    "pricePerShare": 50
  }
  ```

- `GET /api/ipo/list` - Get all IPOs

- `GET /api/ipo/:id` - Get IPO details

- `POST /api/ipo/apply` - Apply for IPO
  ```json
  {
    "ipoId": "1234567890",
    "userAddress": "7xhNGGARx2HZDAqhAp9TWd68ejzi9HbmafkZjvGGxGEU",
    "sharesRequested": 15
  }
  ```

- `POST /api/ipo/allocate` - Allocate shares (Admin)
  ```json
  {
    "ipoId": "1234567890",
    "allocations": [
      {
        "userAddress": "7xhNGGARx2HZDAqhAp9TWd68ejzi9HbmafkZjvGGxGEU",
        "sharesAllocated": 15
      }
    ]
  }
  ```

### Order Endpoints

- `POST /api/orders/place` - Place order (returns unsigned transaction)
  ```json
  {
    "userAddress": "7xhNGGARx2HZDAqhAp9TWd68ejzi9HbmafkZjvGGxGEU",
    "mintAddress": "...",
    "side": "sell",
    "orderType": "market",
    "quantity": 3,
    "price": 50
  }
  ```

- `POST /api/orders/confirm` - Confirm order with signed transaction
  ```json
  {
    "orderId": "1234567890",
    "signedTransaction": "base64_encoded_transaction"
  }
  ```

- `GET /api/orders/book/:mintAddress` - Get order book

- `GET /api/orders/user/:userAddress` - Get user orders

- `POST /api/orders/match` - Match orders (Admin)
  ```json
  {
    "buyOrderId": "1234567890",
    "sellOrderId": "0987654321"
  }
  ```

- `POST /api/orders/settle` - Settle matched orders (Admin)
  ```json
  {
    "buyOrderId": "1234567890",
    "sellOrderId": "0987654321"
  }
  ```

### Portfolio Endpoints

- `GET /api/portfolio/:userAddress` - Get user portfolio

- `GET /api/portfolio/:userAddress/token/:mintAddress` - Get specific token balance

## Architecture

- **Backend Wallet**: Server-controlled wallet that acts as IPO issuer and escrow manager
- **Escrow**: User funds (SOL/tokens) held by backend wallet during order placement
- **Order Matching**: Off-chain order matching by admin
- **Settlement**: On-chain atomic settlement of matched trades

## Security Notes

⚠️ **This is a prototype for development/testing:**

- Backend wallet private key should be in environment variable
- Use proper database instead of in-memory storage
- Implement authentication and authorization
- Add rate limiting and input validation
- Use proper escrow program (PDA-based) in production
- Never expose private keys in code or logs
