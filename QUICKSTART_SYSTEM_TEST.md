# Quick Start: Running System Flow Tests

## Overview
This guide shows you how to run the comprehensive system flow tests for the Solana Stock Exchange.

## Prerequisites

### 1. Ensure Solana Test Validator is Running
```bash
# Check if validator is running
solana cluster-info

# If not running, start it
solana-test-validator
```

### 2. Check Node Modules
```bash
cd /home/rahul/projects/solana_stock_exchange
npm install  # or yarn install
```

## Running the Tests

### Method 1: Direct with ts-mocha (Recommended)
```bash
cd /home/rahul/projects/solana_stock_exchange

# Set environment variables and run
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts
```

### Method 2: Using Anchor Test
```bash
cd /home/rahul/projects/solana_stock_exchange

# If validator is already running
anchor test --skip-local-validator tests/system-flow-test.ts

# If you want anchor to start/stop validator
anchor test tests/system-flow-test.ts
```

### Method 3: Using NPM Script
Add to `package.json`:
```json
{
  "scripts": {
    "test:flow": "ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts"
  }
}
```

Then run:
```bash
npm run test:flow
```

## Expected Output

### Success
```
  🚀 Solana Stock Exchange - Complete System Flow
    👥 A. USER ONBOARDING PROCESS
      ✔ Step 1: Users create Solana wallets
      ✔ Step 2: Complete KYC verification (mock service) (1506ms)
      ✔ Step 3: Deposit SOL into accounts (1092ms)
      ✔ Step 4: Users receive verified status
    🏢 B. ASSET LISTING PROCESS
      ✔ Step 1: Companies submit listing applications
      ✔ Step 2: Compliance team reviews applications (mock) (3007ms)
      ✔ Steps 3-5: Create SPL tokens for stocks
      ✔ Step 6: Announce listing to users
    📊 C. ORDER PLACEMENT & EXECUTION PROCESS
      ✔ Step 1-3: Alice submits buy order
      ✔ Step 1-3: Bob submits sell order
      ✔ Steps 4-5: Matching engine finds and matches orders
      ✔ Steps 6-9: Execute trade and update accounts (1005ms)
    🔄 D. TRADE SETTLEMENT PROCESS
      ✔ Steps 1-7: Complete settlement with escrow (1409ms)
      ✔ Step 8: Emit settlement events
    💸 E. WITHDRAWAL PROCESS
      ✔ Steps 1-2: User requests withdrawal
      ✔ Steps 3-4: Process withdrawal with fees (1006ms)
      ✔ Steps 5-6: Record and confirm withdrawal
    🔥 F. ADDITIONAL TRADING SCENARIO
      ✔ Complete trade: Charlie buys FINS from Alice (2110ms)
    📈 G. SYSTEM STATE & SUMMARY
      ✔ Verify final system state on localnet

  19 passing (11s)
```

## Test Files

### Main Test Files
- `tests/system-flow-test.ts` - Complete system flow test (use this one!)
- `tests/integration-test.ts` - Detailed program integration test
- `tests/mock-data.ts` - Mock data (users, companies, orders)
- `tests/mock-services.ts` - Mock backend services
- `tests/test-helpers.ts` - Utility functions

## What the Test Does

### A. User Onboarding (4 tests)
1. Creates 3 test users (Alice, Bob, Charlie)
2. Runs mock KYC verification for all users
3. Airdrops SOL to each user (100, 100, 50 SOL)
4. Verifies all accounts are active and ready to trade

### B. Asset Listing (3 tests)
1. Submits 3 company listing applications (TECH, FINS, HLTH)
2. Runs mock compliance review (all approved)
3. Creates mock SPL token mints
4. Announces listings to all users

### C. Order Placement & Execution (4 tests)
1. Alice places buy order: 10 TECH @ 1 SOL
2. Bob places sell order: 10 TECH @ 1 SOL
3. Matching engine finds perfect match
4. Executes trade with fees (0.05 SOL)

### D. Trade Settlement (2 tests)
1. Creates escrow and executes atomic swap
2. Emits settlement events for indexing

### E. Withdrawal (3 tests)
1. Alice requests 5 SOL withdrawal
2. Processes with 0.1% fee
3. Records transaction and confirms

### F. Second Trade (1 test)
- Charlie buys 3 FINS from Alice @ 2 SOL each

### G. Final Verification (1 test)
- Verifies complete system state on localnet

## Troubleshooting

### Error: "ANCHOR_PROVIDER_URL is not defined"
**Solution**: Make sure to set environment variables
```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
```

### Error: "Connection refused"
**Solution**: Start the Solana test validator
```bash
solana-test-validator
```

### Error: "Airdrop failed"
**Solution**: Validator might be out of SOL. Reset it:
```bash
# Kill existing validator
pkill solana-test-validator

# Start fresh
solana-test-validator --reset
```

### Tests Run but Fail
**Solution**: Check that you're on localnet
```bash
solana config get
# Should show: RPC URL: http://127.0.0.1:8899
```

## Mock Data Reference

### Users
- **Alice** (Buyer): 100 SOL initial balance
- **Bob** (Seller): 100 SOL initial balance  
- **Charlie** (Trader): 50 SOL initial balance

### Stocks
- **TECH**: TechCorp Inc., 1M shares @ 1 SOL
- **FINS**: Finance Solutions Co., 500K shares @ 2 SOL
- **HLTH**: HealthMed Ltd., 750K shares @ 1.5 SOL

### Trades
1. Alice buys 10 TECH from Bob @ 1 SOL (Total: 10 SOL)
2. Charlie buys 3 FINS from Alice @ 2 SOL (Total: 6 SOL)

## Viewing Detailed Output

### Save output to file
```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts 2>&1 | tee test-output.log
```

### Filter for specific sections
```bash
# Only show test results
... | grep "✔"

# Only show notifications
... | grep "📧"

# Only show trade info
... | grep "Trade"
```

## Performance

- **Total Duration**: ~11 seconds
- **Network**: Solana Localnet
- **Tests**: 19 test cases
- **Async Operations**: Simulated with delays (KYC: 500ms, Compliance: 1000ms)

## Next Steps After Running

1. ✅ Review test output and ensure all 19 tests pass
2. 📊 Check `SYSTEM_FLOW_TEST_RESULTS.md` for detailed analysis
3. 🔍 Examine mock data in `tests/mock-data.ts`
4. 🛠️ Modify test scenarios for your use case
5. 🚀 Integrate with actual Solana programs

## Support

If tests fail, check:
1. Solana validator status: `solana cluster-info`
2. Wallet configuration: `solana config get`
3. Node modules: `npm install`
4. TypeScript compilation: `npx tsc --noEmit`

For questions, refer to:
- `SYSTEM_FLOW_TEST_RESULTS.md` - Detailed test results
- `TESTING.md` - General testing guide
- `ARCHITECTURE.md` - System architecture

---

**Last Updated**: October 8, 2025  
**Status**: ✅ All Tests Passing  
**Framework**: Mocha + TypeScript + Anchor
