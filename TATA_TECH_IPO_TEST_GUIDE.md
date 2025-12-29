# Tata Tech IPO and Trading Test Guide

## Overview

This test simulates a complete IPO and trading flow for Tata Technologies Ltd. (TATATECH) stock token on the Solana blockchain.

## Test Scenario

### User Onboarding
- **Alice**: `7xhNGGARx2HZDAqhAp9TWd68ejzi9HbmafkZjvGGxGEU` - Seller
- **Bob**: `En4riywe6GfC47jRwAGm5RHcEnt9EUGwzN3vPQ1vTGv2` - Buyer  
- **Charlie**: `HfXnwjezLuD47MjbbXudusxruTd4hV57utQeERjhZkja` - IPO Applicant

### Test Flow

1. **User Onboarding**
   - Generate test keypairs for Alice, Bob, and Charlie
   - Fund accounts with SOL for transactions
   - Note: In production, users would sign with their own wallets

2. **Token Creation**
   - Create TATATECH SPL token (Tata Technologies Ltd.)
   - Decimals: 9
   - All tokens viewable in Solana Explorer

3. **IPO Process**
   - All three users apply for IPO
   - **Alice receives**: 15 TATATECH tokens
   - **Bob receives**: 15 TATATECH tokens
   - **Charlie**: Not allocated in this round (0 tokens)

4. **Order Placement with Escrow**
   
   **Alice's Sell Order:**
   - Type: MARKET SELL
   - Quantity: 3 TATATECH tokens
   - Price: 50 SOL per token
   - Total Value: 150 SOL
   - Action: 3 tokens transferred to escrow

   **Bob's Buy Order:**
   - Type: LIMIT BUY
   - Quantity: 3 TATATECH tokens
   - Limit Price: 55 SOL per token
   - Total Committed: 165 SOL (3 × 55)
   - Action: 165 SOL transferred to escrow

5. **Off-Chain Order Matching (by Admin)**
   - Match Logic:
     * Bob's limit price (55 SOL) >= Alice's market price (50 SOL) ✅
     * Quantities match: 3 tokens ✅
     * Execute at Alice's price: 50 SOL per token
     * Total trade value: 150 SOL
     * Bob's refund: 165 - 150 = 15 SOL

6. **Trade Settlement**
   
   **Settlement Transactions:**
   1. Transfer 3 TATATECH from Alice's escrow → Bob
   2. Transfer 150 SOL from Bob's escrow → Alice
   3. Refund 15 SOL from Bob's escrow → Bob

   **Final Balances:**
   - **Alice**: 12 TATATECH tokens, +150 SOL
   - **Bob**: 18 TATATECH tokens, -135 SOL (net: paid 150, got 15 back)
   - **Charlie**: 0 TATATECH tokens (unchanged)

## Running the Test

### Prerequisites

1. **Solana CLI Tools** installed
2. **Anchor Framework** installed (v0.31.1)
3. **Node.js** and **npm** installed

### Step 1: Build the Programs

```bash
cd /home/rahul/projects/solana_stock_exchange
anchor build
```

### Step 2: Start Local Validator

In a separate terminal:

```bash
solana-test-validator --reset
```

Wait for the validator to initialize (about 10 seconds).

### Step 3: Deploy Programs

In another terminal:

```bash
cd /home/rahul/projects/solana_stock_exchange
anchor deploy
```

### Step 4: Run the Test

```bash
# Option 1: Using anchor test (with validator already running)
anchor test --skip-deploy tests/tata-tech-ipo-test.ts

# Option 2: Using ts-mocha directly
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/tata-tech-ipo-test.ts

# Option 3: Using npm test
npm test tests/tata-tech-ipo-test.ts
```

## Test File Location

`/home/rahul/projects/solana_stock_exchange/tests/tata-tech-ipo-test.ts`

## Expected Output

The test will display detailed output for each step:

```
======================================================================
  🏭 TATA TECH IPO AND TRADING TEST
======================================================================

Network: http://127.0.0.1:8899

📍 ADMIN ACCOUNT:
   Admin: [address]

======================================================================
  STEP 1: USER ONBOARDING
======================================================================

📱 Onboarding users with given public keys...

Alice (Buyer):
   Given Public Key: 7xhNGGARx2HZDAqhAp9TWd68ejzi9HbmafkZjvGGxGEU
   Test Keypair: [generated address]
   Balance: 300.0000 SOL ✅

... (continues with detailed output for each step)
```

## Key Features

### Escrow System
- **Token Escrow**: Seller's tokens are held safely until settlement
- **SOL Escrow**: Buyer's SOL is locked until trade execution
- **Refund Mechanism**: Excess SOL returned to buyer if execution price < limit price

### Price Matching
- Off-chain matching by admin (gas-efficient)
- Limit orders protect buyers from overpaying
- Market orders execute at best available price

### Settlement
- Atomic swap of tokens and SOL
- Automatic refund calculation
- All transactions verifiable on-chain

## Viewing Results

All transactions and accounts are recorded on-chain and can be viewed in Solana Explorer:

1. Open https://explorer.solana.com
2. Click settings (gear icon)
3. Set Custom RPC URL: `http://127.0.0.1:8899`
4. Search for any address from the test output

## Troubleshooting

### Validator Not Running
```bash
# Kill any existing validator
pkill -9 -f solana-test-validator

# Start fresh
solana-test-validator --reset
```

### Port Already in Use
```bash
# Find process using port 8899
lsof -i :8899

# Kill it
kill -9 <PID>
```

### Airdrop Failures
If airdrops fail during the test, ensure:
- Validator is running
- No rate limiting issues
- Sufficient SOL in faucet

### Build Errors
```bash
# Clean and rebuild
anchor clean
anchor build
```

## Architecture

### Programs Used
- **exchange_core**: Order book and matching logic
- **escrow**: Secure token and SOL holding
- **fee_management**: Trading fees (if applicable)
- **governance**: Protocol governance (if applicable)

### Token Standard
- SPL Token Program
- Associated Token Account Program
- 9 decimals for TATATECH token

## Notes

### Test vs Production
- **Test**: Uses generated keypairs for transaction signing
- **Production**: Users sign with their own wallet (Phantom, Solflare, etc.)
- **Public Keys**: The given public keys are referenced but test uses new keypairs

### Escrow Implementation
- This test uses simplified escrow logic
- Production would use the full escrow program with PDAs
- Settlement requires admin signature (simulated authority)

### Order Matching
- Off-chain matching reduces gas costs
- Only settlement is on-chain
- Future: Could implement on-chain order book

## Success Criteria

The test passes when:
- ✅ All users funded successfully
- ✅ TATATECH token created
- ✅ IPO tokens allocated correctly
- ✅ Orders placed and escrowed
- ✅ Trade matched correctly
- ✅ Settlement completed
- ✅ Final balances verified
- ✅ Alice: 12 tokens, +150 SOL
- ✅ Bob: 18 tokens, -135 SOL net
- ✅ Charlie: 0 tokens

## Next Steps

To extend this test:

1. **Add More Traders**: Test with multiple buy/sell orders
2. **Implement Fees**: Add trading fees and fee distribution
3. **Order Book Visualization**: Display order book state
4. **Partial Fills**: Support partial order execution
5. **Cancel Orders**: Add order cancellation functionality
6. **Time-in-Force**: Implement order expiration
7. **Stop Loss**: Add stop-loss and take-profit orders

## Support

For issues or questions:
- Check validator logs: `test-ledger/validator.log`
- Review transaction signatures in Explorer
- Verify account balances on-chain
- Check test output for detailed error messages

## License

MIT
