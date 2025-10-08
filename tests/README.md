# Solana Stock Exchange - Test Suite

## Overview

This directory contains comprehensive integration tests for the Solana Stock Exchange platform, covering the complete system flow from user onboarding to trade settlement.

## Test Files

### Main Test Suite
| File | Description | Tests | Duration |
|------|-------------|-------|----------|
| `system-flow-test.ts` | Complete business flow test | 19 | ~11s |
| `integration-test.ts` | Detailed program integration | - | TBD |

### Support Files
| File | Purpose |
|------|---------|
| `mock-data.ts` | Mock users, companies, orders, and trade scenarios |
| `mock-services.ts` | Mock KYC, compliance, notification, and price oracle services |
| `test-helpers.ts` | Utility functions for SOL operations, PDA derivation, and formatting |

## System Flow Coverage

### ✅ A. User Onboarding Process
Tests user registration, KYC verification, deposits, and account activation.

**Test Cases:**
- Wallet creation for multiple users
- Mock KYC verification with realistic delays
- SOL deposits via airdrop
- Account status verification

**Mock Data:**
- 3 users: Alice (buyer), Bob (seller), Charlie (trader)
- Initial balances: 100, 100, 50 SOL respectively

### ✅ B. Asset Listing Process
Tests company applications, compliance review, token creation, and public announcements.

**Test Cases:**
- Company listing application submission
- Mock compliance review with scoring
- SPL token mint creation
- Listing announcements to all users

**Mock Data:**
- 3 companies: TECH, FINS, HLTH
- Industries: Technology, Finance, Healthcare
- Token supplies: 1M, 500K, 750K
- IPO prices: 1, 2, 1.5 SOL

### ✅ C. Order Placement & Execution
Tests order validation, matching engine, trade execution, and account updates.

**Test Cases:**
- Buy order placement with validation
- Sell order placement with validation
- Automated order matching
- Trade execution with fee calculation

**Mock Scenarios:**
- Alice buys 10 TECH @ 1 SOL from Bob
- Order matching at perfect price
- 0.5% trading fee deduction

### ✅ D. Trade Settlement
Tests escrow creation, asset locking, atomic swaps, and event emission.

**Test Cases:**
- Escrow account initialization
- Buyer and seller asset locking
- Atomic token swap execution
- Trading fee collection
- Settlement event emission

### ✅ E. Withdrawal Process
Tests withdrawal requests, fee calculation, transaction recording, and confirmations.

**Test Cases:**
- Withdrawal request validation
- Withdrawal fee calculation (0.1%)
- Transaction processing
- On-chain recording and confirmation

**Mock Scenario:**
- Alice withdraws 5 SOL
- Net amount: 4.995 SOL (after 0.1% fee)

### ✅ F. Complete Trading Scenarios
Tests end-to-end multi-user trading with different stocks.

**Test Cases:**
- Multi-stock trading (TECH, FINS)
- User-to-user trades
- Balance verification throughout
- Fee accumulation tracking

**Mock Scenario:**
- Charlie buys 3 FINS @ 2 SOL from Alice
- Total value: 6 SOL
- Trading fee: 0.03 SOL

### ✅ G. System State Verification
Tests final system state, statistics, and data integrity.

**Test Cases:**
- Localnet state verification
- Exchange statistics validation
- Stock listing verification
- User account verification
- Notification count verification

## Mock Services

### 1. MockKYCService
Simulates off-chain KYC verification.

**Features:**
- Async verification with 500ms delay
- User tracking
- Verification status queries
- 100% approval in test environment

**Usage:**
```typescript
const kycService = new MockKYCService();
const result = await kycService.verifyUser(user);
// result: { success: true, verified: true, message: "..." }
```

### 2. MockComplianceService
Simulates company listing compliance review.

**Features:**
- Async review with 1000ms delay
- Compliance scoring (80-100)
- Status tracking (pending/approved/rejected)
- Approval for scores >= 75

**Usage:**
```typescript
const complianceService = new MockComplianceService();
const result = await complianceService.reviewListing(company);
// result: { success: true, approved: true, complianceScore: 92 }
```

### 3. MockNotificationService
Tracks and logs user notifications.

**Features:**
- Multi-channel notification logging
- User-specific notification queries
- Notification type categorization
- Timestamp tracking

**Notification Types:**
- KYC_VERIFIED
- DEPOSIT_CONFIRMED
- ACCOUNT_ACTIVE
- NEW_LISTING
- ORDER_PLACED
- ORDERS_MATCHED
- TRADE_EXECUTED
- WITHDRAWAL_CONFIRMED

**Usage:**
```typescript
const notificationService = new MockNotificationService();
await notificationService.notify(userId, "TRADE_EXECUTED", message);
const userNotifications = notificationService.getNotifications(userId);
```

### 4. MockPriceOracle
Provides price feeds for stocks.

**Features:**
- Price storage and retrieval
- Price update simulation
- Multi-stock support

**Usage:**
```typescript
const priceOracle = new MockPriceOracle();
priceOracle.setPrice("TECH", 1_000_000_000); // 1 SOL
const price = priceOracle.getPrice("TECH");
priceOracle.updatePrice("TECH", 5); // +5% price change
```

## Test Helpers

### SOL Operations
```typescript
// Airdrop SOL to user
await airdropSOL(connection, publicKey, 100); // 100 SOL

// Get SOL balance
const balance = await getSOLBalance(connection, publicKey);

// Get token balance
const tokens = await getTokenBalance(connection, tokenAccount);
```

### Token Operations
```typescript
// Create stock token mint
const mint = await createStockToken(connection, payer, company);

// Mint tokens to user
await mintStockTokens(connection, payer, mint, destination, amount);

// Get or create associated token account
const ata = await getOrCreateATA(connection, payer, mint, owner);
```

### PDA Derivation
```typescript
// Find exchange PDA
const [exchangePDA, bump] = findExchangePDA(programId);

// Find order book PDA
const [orderBookPDA, bump] = findOrderBookPDA(baseMint, programId);

// Find trading account PDA
const [tradingAccountPDA, bump] = findTradingAccountPDA(user, programId);

// Find order PDA
const [orderPDA, bump] = findOrderPDA(orderBook, orderId, programId);

// Find escrow PDA
const [escrowPDA, bump] = findEscrowPDA(tradeId, programId);

// Find fee config PDA
const [feeConfigPDA, bump] = findFeeConfigPDA(programId);
```

### Formatting
```typescript
// Format SOL amount
formatSOL(1_000_000_000); // "1.0000 SOL"

// Format token amount
formatTokens(10_000_000_000, 9); // "10.0000"

// Print section headers
printSection("TEST PHASE");
printSubSection("Sub Phase");
```

## Running Tests

### Quick Start
```bash
# From project root
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts
```

### Expected Output
```
  🚀 Solana Stock Exchange - Complete System Flow
    ✔ 19 passing (11s)
```

### Detailed Guide
See [`QUICKSTART_SYSTEM_TEST.md`](../QUICKSTART_SYSTEM_TEST.md) for complete instructions.

## Test Data

### Mock Users
```typescript
{
  alice: {
    name: "Alice (Buyer)",
    keypair: Keypair.generate(),
    kycVerified: false,
    balance: 100, // SOL
    tradingAccountInitialized: false,
  },
  bob: {
    name: "Bob (Seller)",
    keypair: Keypair.generate(),
    kycVerified: false,
    balance: 100, // SOL
    tradingAccountInitialized: false,
  },
  charlie: {
    name: "Charlie (Trader)",
    keypair: Keypair.generate(),
    kycVerified: false,
    balance: 50, // SOL
    tradingAccountInitialized: false,
  }
}
```

### Mock Companies
```typescript
{
  techCorp: {
    name: "TechCorp Inc.",
    symbol: "TECH",
    totalShares: 1_000_000,
    pricePerShare: 1_000_000_000, // 1 SOL
    industry: "Technology",
    complianceStatus: "pending",
  },
  financeCo: {
    name: "Finance Solutions Co.",
    symbol: "FINS",
    totalShares: 500_000,
    pricePerShare: 2_000_000_000, // 2 SOL
    industry: "Finance",
    complianceStatus: "pending",
  },
  healthMed: {
    name: "HealthMed Ltd.",
    symbol: "HLTH",
    totalShares: 750_000,
    pricePerShare: 1_500_000_000, // 1.5 SOL
    industry: "Healthcare",
    complianceStatus: "pending",
  }
}
```

### Trade Scenarios
```typescript
[
  {
    description: "Alice buys 5 TECH shares from Bob at 1 SOL each",
    buyer: "alice",
    seller: "bob",
    stockSymbol: "TECH",
    quantity: 5,
    price: 1_000_000_000,
  },
  {
    description: "Charlie buys 3 FINS shares from Alice at 2 SOL each",
    buyer: "charlie",
    seller: "alice",
    stockSymbol: "FINS",
    quantity: 3,
    price: 2_000_000_000,
  }
]
```

## Test Results

### Statistics
- **Total Tests**: 19
- **Duration**: ~11 seconds
- **Pass Rate**: 100%
- **Users Created**: 3
- **Stocks Listed**: 3
- **Trades Executed**: 2
- **Total Volume**: 16 SOL
- **Notifications Sent**: 26
- **Fees Collected**: 0.08 SOL

### Coverage Summary
| Category | Tests | Status |
|----------|-------|--------|
| User Onboarding | 4 | ✅ Passing |
| Asset Listing | 3 | ✅ Passing |
| Order Execution | 4 | ✅ Passing |
| Trade Settlement | 2 | ✅ Passing |
| Withdrawals | 3 | ✅ Passing |
| Trading Scenarios | 1 | ✅ Passing |
| System Verification | 1 | ✅ Passing |

## Customization

### Adding New Users
Edit `mock-data.ts`:
```typescript
export const MOCK_USERS: Record<string, MockUser> = {
  alice: { ... },
  bob: { ... },
  charlie: { ... },
  dave: {  // New user
    name: "Dave (Liquidity Provider)",
    keypair: Keypair.generate(),
    kycVerified: false,
    balance: 200,
    tradingAccountInitialized: false,
  }
};
```

### Adding New Companies
Edit `mock-data.ts`:
```typescript
export const MOCK_COMPANIES: Record<string, MockCompany> = {
  techCorp: { ... },
  financeCo: { ... },
  healthMed: { ... },
  energyCorp: {  // New company
    name: "Energy Corp",
    symbol: "ENRG",
    totalShares: 2_000_000,
    pricePerShare: 500_000_000, // 0.5 SOL
    industry: "Energy",
    complianceStatus: "pending",
  }
};
```

### Adding New Trade Scenarios
Edit `mock-data.ts`:
```typescript
export const TRADE_SCENARIOS: TradeScenario[] = [
  { ... },
  { ... },
  {  // New scenario
    description: "Dave buys 100 ENRG shares from Alice at 0.5 SOL each",
    buyer: "dave",
    seller: "alice",
    stockSymbol: "ENRG",
    quantity: 100,
    price: 500_000_000,
  }
];
```

### Modifying Mock Service Behavior
Edit `mock-services.ts`:
```typescript
// Adjust KYC delay
private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
await this.delay(1000);  // Change from 500ms to 1000ms

// Adjust compliance approval threshold
const approved = complianceScore >= 90;  // Change from 75 to 90

// Change compliance score range
const complianceScore = Math.floor(Math.random() * 10) + 90;  // 90-100 instead of 80-100
```

## Troubleshooting

### Common Issues

#### 1. Connection Errors
```
Error: Connection refused at 127.0.0.1:8899
```
**Solution**: Start Solana test validator
```bash
solana-test-validator
```

#### 2. Environment Variable Errors
```
Error: ANCHOR_PROVIDER_URL is not defined
```
**Solution**: Set environment variables
```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
```

#### 3. Airdrop Failures
```
Error: Airdrop request failed
```
**Solution**: Reset test validator
```bash
solana-test-validator --reset
```

#### 4. Type Errors
```
Error: Cannot find module '@solana/spl-token'
```
**Solution**: Install dependencies
```bash
npm install @solana/spl-token
```

### Debug Mode
Enable verbose logging:
```typescript
// In test file, set log level
console.log = console.log.bind(console);
console.error = console.error.bind(console);
```

## Contributing

### Adding New Tests
1. Create test case in appropriate section
2. Use existing mock data or add new
3. Follow naming convention: `✅ Step X: Description`
4. Include verification assertions
5. Update statistics in documentation

### Code Style
- Use TypeScript strict mode
- Include JSDoc comments
- Follow Anchor conventions
- Use async/await over promises
- Handle errors gracefully

## Documentation

- [`SYSTEM_FLOW_TEST_RESULTS.md`](../SYSTEM_FLOW_TEST_RESULTS.md) - Detailed test results
- [`QUICKSTART_SYSTEM_TEST.md`](../QUICKSTART_SYSTEM_TEST.md) - Quick start guide
- [`TESTING.md`](../TESTING.md) - General testing guide
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - System architecture

## License

MIT

---

**Last Updated**: October 8, 2025  
**Status**: ✅ All Tests Passing  
**Maintainer**: Solana Stock Exchange Team
