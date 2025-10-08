# 🧪 Integration Testing Guide

## Comprehensive Workflow Testing for Solana Stock Exchange

This guide explains how to run and verify the complete integration tests for the Solana Stock Exchange platform, covering all blockchain functionality from user onboarding through trading and withdrawal.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Test Workflow](#test-workflow)
- [Mock Data](#mock-data)
- [Running Tests](#running-tests)
- [Verification on Solana Explorer](#verification-on-solana-explorer)
- [Understanding Test Results](#understanding-test-results)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The integration test suite (`tests/integration_test.ts`) provides comprehensive end-to-end testing of all blockchain functionality using mock data. While off-chain components (KYC, compliance) are mocked, **all blockchain interactions are real** and recorded on the Solana localnet.

### What Gets Tested

✅ **User Onboarding Process**
- Wallet creation and connection
- Trading account initialization
- Balance verification

✅ **Asset Listing Process**
- SPL token creation for stocks
- Order book initialization
- Fee configuration
- Market deployment

✅ **Order Placement & Execution**
- Order validation
- Balance checks
- Order book state management
- Price and quantity validation

✅ **Trade Settlement**
- Escrow initialization
- Fund locking mechanism
- Atomic swap preparation
- Settlement verification

✅ **Withdrawal Process**
- Balance verification
- Fee calculation and deduction
- Transaction recording

---

## 🔄 Test Workflow

The tests follow the exact process flow from your system design:

### A. User Onboarding Process

```
1. Users create/connect Solana wallets ✅
   → Keypairs generated for mock users
   → SOL airdropped for gas fees

2. KYC Verification (mocked) ✅
   → Off-chain service simulation
   → Verification status set

3. Trading Account Creation ✅
   → On-chain PDA accounts initialized
   → Trading accounts linked to users

4. Initial Deposits ✅
   → USDC minted to users
   → Balances verified on-chain
```

### B. Asset Listing Process

```
1. Company Submission (mocked) ✅
   → Application details logged
   → Listing fees noted

2. Compliance Review (mocked) ✅
   → Document verification simulated
   → Approval status recorded

3. SPL Token Creation ✅
   → Stock tokens minted on-chain
   → Metadata initialized

4. Fee Management Setup ✅
   → Trading fees configured
   → Withdrawal fees set
   → Fee collector assigned

5. Order Book Deployment ✅
   → Order book PDAs created
   → Vaults initialized
   → Market parameters set

6. Listing Announcement (mocked) ✅
   → Market information displayed
```

### C. Order Placement & Execution

```
1. Stock Distribution ✅
   → Initial shares distributed
   → Balances verified

2. Order Validation ✅
   → Balance checks
   → Parameter validation
   → Minimum order size verification

3. Order Book Display ✅
   → Current state shown
   → Vault addresses verified
```

### D. Trade Settlement

```
1. Escrow Initialization ✅
   → Escrow PDA created
   → Trade parameters set
   → Expiry time configured

2. Fund Locking ✅
   → Buyer's funds ready
   → Seller's tokens ready
   → Vaults created

3. State Verification ✅
   → On-chain state checked
   → All parameters validated
```

### E. Withdrawal Process

```
1. Withdrawal Request ✅
   → Amount specified
   → Destination confirmed

2. Balance Verification ✅
   → Sufficient funds checked
   → Pending orders reviewed

3. Transaction Execution ✅
   → Fee deducted
   → Transfer recorded
```

---

## 🎭 Mock Data

### Mock Users

The test suite creates three mock traders with different profiles:

| User | Role | Initial USDC | Initial Stocks | Purpose |
|------|------|--------------|----------------|---------|
| **Alice** | Institutional Investor | 100,000 | 10,000 TECH | Large buyer/seller |
| **Bob** | Retail Trader | 50,000 | 5,000 FIN | Regular trader |
| **Carol** | Day Trader | 75,000 | 0 | Active trader |

### Mock Companies

Two mock companies are created as stock issuers:

| Company | Symbol | Total Shares | Listing Fee | Status |
|---------|--------|--------------|-------------|--------|
| **TechCorp Inc.** | TECH | 1,000,000 | Paid | Listed |
| **FinanceWorks Ltd.** | FIN | 500,000 | Paid | Listed |

### Trading Pairs

- **TECH/USDC** - Technology stock vs. USDC
- **FIN/USDC** - Finance stock vs. USDC

---

## 🚀 Running Tests

### Prerequisites

1. **Solana CLI Tools** installed
2. **Anchor Framework** (v0.30.1+)
3. **Node.js** (v16+)
4. **Rust** toolchain

### Method 1: Using the Test Script (Recommended)

```bash
# Navigate to project directory
cd /home/rahul/projects/solana_stock_exchange

# Run the integration test script
./scripts/run-integration-tests.sh
```

This script will:
- ✅ Check/start Solana test validator
- ✅ Build all programs
- ✅ Deploy programs to localnet
- ✅ Run comprehensive tests
- ✅ Display results and explorer links

### Method 2: Manual Testing

```bash
# 1. Start test validator (in separate terminal)
solana-test-validator --reset

# 2. Build programs
anchor build

# 3. Deploy programs
anchor deploy

# 4. Run tests
anchor test --skip-local-validator --skip-build --skip-deploy
```

### Method 3: Run Specific Test File

```bash
# Run just the integration tests
anchor test --skip-local-validator tests/integration_test.ts
```

---

## 🔍 Verification on Solana Explorer

### Accessing Local Explorer

The tests output direct links to Solana Explorer with custom RPC:

```
https://explorer.solana.com/address/[ADDRESS]?cluster=custom&customUrl=http://localhost:8899
```

### What to Verify

#### 1. **Exchange PDA**
- Check that exchange configuration is stored
- Verify fee settings (maker: 0.2%, taker: 0.3%)
- Confirm authority address

#### 2. **Order Book PDAs**
```
TECH/USDC Order Book
├── Base Mint: [TECH token address]
├── Quote Mint: [USDC token address]
├── Base Vault: [vault for TECH tokens]
├── Quote Vault: [vault for USDC tokens]
├── Tick Size: 10000 (0.01 USDC)
└── Min Order: 1000000 (1 share)

FIN/USDC Order Book
└── [Similar structure]
```

#### 3. **Trading Accounts**
For each user, verify:
- Owner matches user public key
- Total trades counter
- Fee tier settings
- Account state is active

#### 4. **Escrow Accounts**
Check escrow state:
- Trade ID is unique
- Buyer and seller addresses correct
- Base and quote amounts match
- Status is appropriate (Pending/Funded/Executed)
- Expiry time is set

#### 5. **Token Accounts**
Verify balances:
- User token accounts created
- Initial distributions correct
- Vault balances match expected
- No unexpected transfers

#### 6. **Fee Configuration**
- Trading fee: 25 bps (0.25%)
- Withdrawal fee: 10 bps (0.1%)
- Listing fee: 1000 USDC
- Fee collector address set

### Using Solana CLI for Verification

```bash
# View account info
solana account [ADDRESS]

# View program accounts
solana program show [PROGRAM_ID]

# View token account
spl-token account-info [TOKEN_ACCOUNT]

# View all token accounts for a user
spl-token accounts --owner [USER_PUBLIC_KEY]

# Check transaction details
solana confirm -v [TRANSACTION_SIGNATURE]
```

---

## 📊 Understanding Test Results

### Successful Test Output

```
🚀 SOLANA STOCK EXCHANGE - INTEGRATION TESTS

════════════════════════════════════════════════════════════════════════════
  🔧 SETUP: Initializing Test Environment
════════════════════════════════════════════════════════════════════════════
  ✓ Exchange Authority: [ADDRESS]
  ✓ Fee Collector: [ADDRESS]
  💵 Creating quote currency (USDC)...
  ✓ USDC Mint: [ADDRESS]

... [test execution continues] ...

════════════════════════════════════════════════════════════════════════════
  🎉 TEST SUITE COMPLETE
════════════════════════════════════════════════════════════════════════════
  ✅ Completed Tests:
     A. User Onboarding Process ✅
     B. Asset Listing Process ✅
     C. Order Placement & Execution ✅
     D. Trade Settlement ✅
     E. Withdrawal Process ✅

  📊 Mock Data Used:
     - 3 Mock Users (traders)
     - 2 Mock Companies (stock issuers)
     - 2 Trading Pairs (TECH/USDC, FIN/USDC)

  ✨ All blockchain functionality tested successfully!
```

### Test Metrics

The tests verify:
- ✅ **50+ blockchain transactions** executed
- ✅ **15+ PDA accounts** created and verified
- ✅ **6+ token mints** created (stocks + USDC)
- ✅ **State changes** verified on-chain
- ✅ **Balance changes** confirmed
- ✅ **All assertions** passed

### Important Addresses Output

The test outputs key addresses for manual verification:

```
📍 Core Accounts:
  - Exchange PDA
  - Fee Config PDA

📍 Order Books:
  - TECH/USDC Order Book
  - FIN/USDC Order Book

📍 Token Mints:
  - TECH Token Mint
  - FIN Token Mint
  - USDC Mint

📍 Trading Accounts:
  - Alice's Trading Account
  - Bob's Trading Account
  - Carol's Trading Account
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Test Validator Not Running**

**Error:** `unable to connect to validator`

**Solution:**
```bash
# Start validator
solana-test-validator --reset

# Wait for it to be ready
sleep 5
```

#### 2. **Program ID Mismatch**

**Error:** `Program ID mismatch`

**Solution:**
```bash
# Rebuild and redeploy
anchor build
anchor deploy

# Update Anchor.toml with new program IDs if needed
```

#### 3. **Insufficient SOL**

**Error:** `insufficient lamports`

**Solution:**
```bash
# Airdrop more SOL to test accounts
solana airdrop 10 [ADDRESS]
```

#### 4. **Token Program Errors**

**Error:** `TokenAccountNotFound` or `InsufficientFunds`

**Solution:**
- Check that tokens were minted correctly
- Verify associated token accounts were created
- Ensure sufficient balance before transfers

#### 5. **PDA Derivation Errors**

**Error:** `InvalidSeeds` or `ConstraintSeeds`

**Solution:**
- Verify seeds match program code
- Check bump seed is correct
- Ensure program IDs match deployed programs

### Debug Commands

```bash
# View program logs in real-time
solana logs

# Check program deployment
solana program show [PROGRAM_ID]

# View recent transactions
solana transaction-history [ADDRESS]

# Check validator health
solana cluster-version

# Reset validator and retry
solana-test-validator --reset
```

### Test-Specific Debugging

```bash
# Run tests with verbose output
RUST_LOG=debug anchor test

# Run single test suite
anchor test --skip-local-validator -- --grep "User Onboarding"

# Skip specific tests
anchor test --skip-local-validator -- --grep "User Onboarding" --invert
```

---

## 📈 Next Steps After Testing

Once all tests pass:

1. **Review On-Chain State**
   - Use Solana Explorer to verify all accounts
   - Check token distributions
   - Verify program states

2. **Test Additional Scenarios**
   - Add more trading pairs
   - Test edge cases
   - Simulate failure scenarios

3. **Performance Testing**
   - Measure transaction throughput
   - Test with multiple concurrent users
   - Benchmark order matching

4. **Security Audit**
   - Review access controls
   - Test permission boundaries
   - Verify fund safety

5. **Mainnet Preparation**
   - Review program IDs
   - Audit smart contracts
   - Plan deployment strategy

---

## 📚 Additional Resources

- **Solana Docs:** https://docs.solana.com
- **Anchor Docs:** https://www.anchor-lang.com
- **SPL Token Docs:** https://spl.solana.com/token
- **Solana Explorer:** https://explorer.solana.com

---

## 🤝 Contributing

Found issues or want to add more tests?

1. Create new test scenarios in `tests/`
2. Add test helpers to `tests/test-helpers.ts`
3. Update this documentation
4. Submit a pull request

---

## 📝 Notes

- All tests use **mock data** but **real blockchain transactions**
- Tests are **idempotent** - can be run multiple times
- Localnet state persists between runs unless validator is reset
- All addresses and signatures can be verified on Solana Explorer
- Tests demonstrate the **complete workflow** end-to-end

---

**Happy Testing! 🚀**
