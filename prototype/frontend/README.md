# Solana IPO Frontend

Next.js TypeScript frontend with Phantom wallet integration for the Solana IPO and Trading Platform.

## Features

- 🔐 Phantom wallet integration
- 📊 IPO marketplace and applications
- 💱 Trading interface with order book
- 👛 Portfolio management
- ✍️ Transaction signing on frontend

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

   Frontend will run on http://localhost:3000

3. **Configure Phantom Wallet:**
   - Install Phantom wallet extension in your browser
   - Switch to Localhost network in Phantom settings
   - Make sure your local Solana validator is running

## Pages

### Home (`/`)
- Dashboard with wallet connection
- Portfolio summary
- Quick actions

### IPO Marketplace (`/ipo`)
- Browse available IPOs
- Apply for IPO allocations
- View IPO details

### Trading (`/trading`)
- Place buy/sell orders
- View order book
- Sign transactions with Phantom
- Track your orders

### Portfolio (`/portfolio`)
- View SOL balance
- View token holdings
- Portfolio summary

## How It Works

### Transaction Flow

1. **User Action**: User fills out a form (IPO application, order placement)
2. **Backend Creates Transaction**: Backend creates an unsigned transaction
3. **Frontend Signs**: User signs transaction with Phantom wallet
4. **Backend Processes**: Signed transaction is sent back to backend for confirmation
5. **On-Chain Execution**: Transaction is executed on Solana

### Wallet Integration

The app uses `@solana/wallet-adapter-react` for wallet integration:

```typescript
const { publicKey, connected, signTransaction } = useWallet();
```

- `publicKey`: User's wallet address
- `connected`: Wallet connection status
- `signTransaction`: Function to sign transactions

### API Integration

All API calls go through the backend server at http://localhost:5000:

- IPO endpoints: Create, list, apply, allocate
- Order endpoints: Place, confirm, match, settle
- Portfolio endpoints: Get balances and tokens

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOLANA_NETWORK=http://127.0.0.1:8899
```

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: Solana Wallet Adapter + Phantom
- **HTTP Client**: Axios
- **Blockchain**: Solana Web3.js

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Security Notes

⚠️ **This is a prototype for development/testing:**

- All transactions are signed client-side with Phantom
- Private keys never leave the user's wallet
- Backend holds escrow (use PDA-based escrow in production)
- Add proper error handling and validation in production
- Implement proper state management (Redux/Zustand) for larger apps

## Connecting to Local Validator

1. Start Solana test validator:
   ```bash
   solana-test-validator
   ```

2. Configure Phantom:
   - Settings → Change Network → Localhost

3. Airdrop SOL to your wallet:
   ```bash
   solana airdrop 10 <YOUR_WALLET_ADDRESS> --url localhost
   ```

## Troubleshooting

- **Wallet not connecting**: Check if Phantom is on localhost network
- **Transaction failing**: Ensure backend wallet has sufficient SOL
- **Network errors**: Verify backend server is running on port 5000
- **Blockhash errors**: Transactions expire after ~60 seconds, try again
