# Integration Tests

This directory contains comprehensive integration tests for the Solana Stock Exchange platform.

## Files

### Test Files

- **`integration_test.ts`** - Main integration test suite covering the complete workflow
- **`solana_stock_exchange.ts`** - Original unit tests for individual programs

### Helper Files

- **`test-helpers.ts`** - Utility functions for test execution:
  - Mock user creation
  - Mock company creation
  - Token minting
  - Balance checking
  - Explorer link generation
  - Test result formatting

## Running Tests

### Quick Start

```bash
# Run all tests with automated setup
./scripts/run-integration-tests.sh
```

### Manual Execution

```bash
# 1. Start validator (terminal 1)
solana-test-validator --reset

# 2. Run tests (terminal 2)
anchor test --skip-local-validator
```

### Run Specific Tests

```bash
# Run only integration tests
anchor test --skip-local-validator tests/integration_test.ts

# Run only unit tests
anchor test --skip-local-validator tests/solana_stock_exchange.ts
```

## Test Structure

### Integration Test Suites

1. **A. User Onboarding Process**
   - Wallet connection
   - KYC verification (mocked)
   - Exchange initialization
   - Trading account creation
   - Balance verification

2. **B. Asset Listing Process**
   - Company applications (mocked)
   - Compliance review (mocked)
   - SPL token creation
   - Fee management setup
   - Order book deployment
   - Listing announcements

3. **C. Order Placement & Execution**
   - Stock distribution
   - Order validation
   - Balance checks
   - Order book state management

4. **D. Trade Settlement**
   - Escrow initialization
   - Fund locking
   - State verification

5. **E. Withdrawal Process**
   - Withdrawal requests
   - Balance verification
   - Transaction execution

6. **F. Final Verification**
   - Account state display
   - Exchange statistics
   - On-chain PDA verification
   - Test summary

## Mock Data

### Users (Traders)

| Name | Type | Initial USDC | Initial Stocks |
|------|------|--------------|----------------|
| Alice | Institutional | 100,000 | 10,000 TECH |
| Bob | Retail | 50,000 | 5,000 FIN |
| Carol | Day Trader | 75,000 | 0 |

### Companies (Stock Issuers)

| Company | Symbol | Shares |
|---------|--------|--------|
| TechCorp Inc. | TECH | 1,000,000 |
| FinanceWorks Ltd. | FIN | 500,000 |

### Trading Pairs

- TECH/USDC
- FIN/USDC

## Verification

### On-Chain Verification

All test transactions are recorded on Solana localnet. Verify using:

1. **Solana Explorer**
   - Links provided in test output
   - Custom RPC: `http://localhost:8899`

2. **Solana CLI**
   ```bash
   # View account
   solana account [ADDRESS]
   
   # View token account
   spl-token account-info [TOKEN_ACCOUNT]
   
   # Confirm transaction
   solana confirm -v [SIGNATURE]
   ```

3. **Program Logs**
   ```bash
   # Monitor in real-time
   solana logs
   ```

### State Verification Checklist

- [ ] Exchange PDA created
- [ ] Fee config initialized
- [ ] Order books deployed
- [ ] Trading accounts created
- [ ] Escrow accounts initialized
- [ ] Token mints created
- [ ] Balances distributed correctly
- [ ] All PDAs accessible

## Test Output

### Success Output

```
🚀 SOLANA STOCK EXCHANGE - INTEGRATION TESTS

✅ All tests passed!
📊 50+ blockchain transactions executed
🔍 All states verified on-chain
```

### Key Metrics

- **Test Suites:** 6 (A-F)
- **Test Cases:** 30+
- **Blockchain Transactions:** 50+
- **PDA Accounts Created:** 15+
- **Token Mints:** 6+ (stocks + USDC)
- **Mock Users:** 3
- **Mock Companies:** 2
- **Trading Pairs:** 2

## Debugging

### Common Issues

1. **Validator not running**
   ```bash
   solana-test-validator --reset
   ```

2. **Program ID mismatch**
   ```bash
   anchor build && anchor deploy
   ```

3. **Insufficient funds**
   ```bash
   solana airdrop 10 [ADDRESS]
   ```

4. **Build errors**
   ```bash
   anchor clean && anchor build
   ```

### Debug Commands

```bash
# Verbose test output
RUST_LOG=debug anchor test

# Run specific test
anchor test -- --grep "User Onboarding"

# Check program deployment
solana program show [PROGRAM_ID]
```

## Documentation

- **Quick Start:** [`QUICKSTART_TESTING.md`](../QUICKSTART_TESTING.md)
- **Full Guide:** [`TESTING.md`](../TESTING.md)
- **Architecture:** [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- **Development:** [`DEVELOPMENT.md`](../DEVELOPMENT.md)

## Next Steps

After tests pass:

1. Review on-chain state in Solana Explorer
2. Test additional scenarios
3. Perform security audit
4. Prepare for devnet/mainnet deployment

## Contributing

To add new tests:

1. Add test cases to `integration_test.ts`
2. Add helpers to `test-helpers.ts`
3. Update this README
4. Run tests to verify
5. Submit PR

---

**Happy Testing! 🚀**
