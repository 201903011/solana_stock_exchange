# 🚀 Quick Start - Integration Testing

## Run Complete Integration Tests in 3 Steps

### Step 1: Start Test Validator

```bash
# In terminal 1 - Keep this running
solana-test-validator --reset
```

### Step 2: Run the Test Script

```bash
# In terminal 2 - Run from project root
cd /home/rahul/projects/solana_stock_exchange
./scripts/run-integration-tests.sh
```

### Step 3: Verify on Solana Explorer

Open the explorer links shown in test output:
```
https://explorer.solana.com/address/[ADDRESS]?cluster=custom&customUrl=http://localhost:8899
```

---

## What You'll See

### ✅ Test Flow

1. **Setup Phase**
   - Mock users created (Alice, Bob, Carol)
   - Mock companies created (TechCorp, FinanceWorks)
   - Tokens minted (TECH, FIN, USDC)

2. **User Onboarding**
   - Wallets connected
   - Trading accounts initialized
   - Initial balances set

3. **Asset Listing**
   - Order books created
   - Fee management configured
   - Markets deployed

4. **Trading Process**
   - Stocks distributed
   - Orders validated
   - Order book state shown

5. **Settlement**
   - Escrow initialized
   - Funds locked
   - State verified

6. **Withdrawal**
   - Balances checked
   - Fees calculated
   - Transactions recorded

### 📊 Expected Output

```bash
🚀 SOLANA STOCK EXCHANGE - INTEGRATION TESTS

════════════════════════════════════════════════════════════════════════════
  🔧 SETUP: Initializing Test Environment
════════════════════════════════════════════════════════════════════════════
  💰 Airdropped 50 SOL to [ADDRESS]
  🪙 Created TechCorp Inc. (TECH) token: [TOKEN_ADDRESS]
  🪙 Created FinanceWorks Ltd. (FIN) token: [TOKEN_ADDRESS]
  💵 Creating quote currency (USDC)...

... [tests continue] ...

  ✅ All tests passed!
  🔍 Check addresses on Solana Explorer
```

---

## 🔍 Quick Verification Checklist

After tests complete, verify:

- [ ] All test suites passed (A-E)
- [ ] Exchange PDA created
- [ ] 2 Order books initialized (TECH/USDC, FIN/USDC)
- [ ] 3 Trading accounts created
- [ ] Escrow account initialized
- [ ] Token balances correct
- [ ] All PDAs visible on explorer

---

## 🐛 Quick Troubleshooting

**Test fails to start?**
```bash
# Check validator is running
solana cluster-version

# If not, start it
solana-test-validator --reset
```

**Build errors?**
```bash
# Rebuild everything
anchor clean
anchor build
```

**Program ID mismatch?**
```bash
# Redeploy programs
anchor deploy
```

---

## 📝 Manual Testing Commands

```bash
# View all program accounts
solana program show $(solana address -k target/deploy/exchange_core-keypair.json)

# Check account state
solana account [PDA_ADDRESS]

# View token accounts
spl-token accounts --owner [USER_PUBLIC_KEY]

# Monitor logs
solana logs | grep -i "program log"
```

---

## 🎯 What Gets Tested

✅ User wallet creation and onboarding
✅ Trading account initialization  
✅ Token minting for stocks (TECH, FIN)
✅ USDC (quote currency) creation
✅ Order book creation and configuration
✅ Fee management setup
✅ Order validation logic
✅ Escrow initialization for settlement
✅ Balance verification
✅ State changes on blockchain
✅ PDA account creation

---

## 📊 Mock Data Summary

**3 Users:**
- Alice (Institutional) - 100,000 USDC, 10,000 TECH
- Bob (Retail) - 50,000 USDC, 5,000 FIN  
- Carol (Day Trader) - 75,000 USDC

**2 Companies:**
- TechCorp Inc. (TECH) - 1M shares
- FinanceWorks Ltd. (FIN) - 500K shares

**2 Trading Pairs:**
- TECH/USDC
- FIN/USDC

---

## 🔗 Important Links

- **Test Script:** `./scripts/run-integration-tests.sh`
- **Test File:** `tests/integration_test.ts`
- **Helper Utils:** `tests/test-helpers.ts`
- **Full Guide:** `TESTING.md`

---

## ⚡ One-Line Test Command

```bash
# Complete automated testing (if validator is already running)
anchor test --skip-local-validator
```

---

**Need more details?** See [TESTING.md](./TESTING.md) for comprehensive guide.
