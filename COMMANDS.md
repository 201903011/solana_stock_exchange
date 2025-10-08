# 📝 Test Commands Reference

Quick reference for all testing commands and verification procedures.

---

## 🚀 Running Tests

### Automated (Recommended)

```bash
# Run complete test suite with automatic setup
./scripts/run-integration-tests.sh
```

### Manual

```bash
# Step 1: Start validator (terminal 1)
solana-test-validator --reset

# Step 2: Build and test (terminal 2)
anchor build
anchor deploy
anchor test --skip-local-validator
```

### Specific Tests

```bash
# Run only integration tests
anchor test --skip-local-validator tests/integration_test.ts

# Run only unit tests
anchor test --skip-local-validator tests/solana_stock_exchange.ts

# Run with verbose output
RUST_LOG=debug anchor test --skip-local-validator

# Run specific test suite
anchor test --skip-local-validator -- --grep "User Onboarding"
```

---

## 🔧 Validator Commands

```bash
# Start test validator
solana-test-validator

# Start with clean state
solana-test-validator --reset

# Start with specific features
solana-test-validator --reset --bpf-program <PROGRAM_ID> <PROGRAM_PATH>

# Stop validator
pkill solana-test-validator
# or
pkill solana-test-val

# Check if running
pgrep -x "solana-test-val"
```

---

## 🏗️ Build Commands

```bash
# Build all programs
anchor build

# Clean build artifacts
anchor clean

# Build and deploy
anchor build && anchor deploy

# Build specific program
cd programs/exchange_core && anchor build
```

---

## 🚀 Deploy Commands

```bash
# Deploy all programs
anchor deploy

# Deploy specific program
anchor deploy --program-name exchange_core

# Deploy with specific keypair
anchor deploy --provider.wallet ~/.config/solana/id.json

# Check deployment
solana program show <PROGRAM_ID>
```

---

## 🔍 Solana CLI Verification

### Account Information

```bash
# View any account
solana account <ADDRESS>

# View with JSON output
solana account <ADDRESS> --output json

# View program account
solana program show <PROGRAM_ID>

# Get program data account
solana program show <PROGRAM_ID> --programs
```

### Balance Checks

```bash
# Check SOL balance
solana balance <ADDRESS>

# Airdrop SOL (localnet/devnet)
solana airdrop 10 <ADDRESS>

# Transfer SOL
solana transfer <RECIPIENT> <AMOUNT>
```

### Transaction Verification

```bash
# Confirm transaction
solana confirm <SIGNATURE>

# Confirm with verbose output
solana confirm -v <SIGNATURE>

# View recent transactions
solana transaction-history <ADDRESS>

# Get transaction details
solana transaction <SIGNATURE>
```

### Cluster & Config

```bash
# Show current config
solana config get

# Set to localhost
solana config set --url http://localhost:8899

# Set to devnet
solana config set --url https://api.devnet.solana.com

# Check cluster version
solana cluster-version

# View cluster nodes
solana cluster-nodes
```

### Logs

```bash
# View all logs
solana logs

# View logs for specific program
solana logs <PROGRAM_ID>

# Grep logs
solana logs | grep "Program log"
```

---

## 🪙 SPL Token Commands

### Token Information

```bash
# View token mint info
spl-token display <MINT_ADDRESS>

# View all token accounts for owner
spl-token accounts --owner <OWNER_ADDRESS>

# View specific token account
spl-token account-info <TOKEN_ACCOUNT_ADDRESS>

# Get balance
spl-token balance <MINT_ADDRESS> --owner <OWNER_ADDRESS>
```

### Token Operations

```bash
# Create new token
spl-token create-token

# Create token account
spl-token create-account <MINT_ADDRESS>

# Mint tokens
spl-token mint <MINT_ADDRESS> <AMOUNT>

# Transfer tokens
spl-token transfer <MINT_ADDRESS> <AMOUNT> <RECIPIENT>

# Get supply
spl-token supply <MINT_ADDRESS>
```

---

## 🧪 Test Utilities

### NPM Scripts

```bash
# Run tests
npm test

# Build project
npm run build

# Deploy
npm run deploy
```

### Anchor CLI

```bash
# Show Anchor version
anchor --version

# Initialize new project
anchor init <PROJECT_NAME>

# Add new program
anchor new <PROGRAM_NAME>

# Verify setup
anchor test --skip-build --skip-deploy

# Clean everything
anchor clean
```

---

## 📊 Debugging Commands

### Program Debugging

```bash
# View program logs
solana logs <PROGRAM_ID>

# Decode program data
solana program dump <PROGRAM_ID> dump.so

# Close program (recover funds)
solana program close <PROGRAM_ID>
```

### Account Debugging

```bash
# Decode account data
solana account <ACCOUNT_ADDRESS> --output json | jq

# View all accounts for program
solana program show <PROGRAM_ID> --accounts

# Check account ownership
solana account <ACCOUNT_ADDRESS> --output json | jq .owner
```

### Transaction Debugging

```bash
# Get transaction with verbose output
solana confirm -v <SIGNATURE>

# Decode transaction
solana transaction <SIGNATURE> --output json

# Get recent block hash
solana block-hash

# Get slot
solana slot
```

---

## 🔍 Solana Explorer Commands

### Generate Explorer Links

```bash
# Account on localnet
echo "https://explorer.solana.com/address/<ADDRESS>?cluster=custom&customUrl=http://localhost:8899"

# Transaction on localnet
echo "https://explorer.solana.com/tx/<SIGNATURE>?cluster=custom&customUrl=http://localhost:8899"

# Account on devnet
echo "https://explorer.solana.com/address/<ADDRESS>?cluster=devnet"

# Account on mainnet
echo "https://explorer.solana.com/address/<ADDRESS>"
```

---

## 📈 Performance & Monitoring

### RPC Calls

```bash
# Get account info
curl http://localhost:8899 -X POST -H "Content-Type: application/json" -d '
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getAccountInfo",
  "params": ["<ADDRESS>"]
}'

# Get balance
curl http://localhost:8899 -X POST -H "Content-Type: application/json" -d '
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["<ADDRESS>"]
}'
```

### Performance Metrics

```bash
# Transaction count
solana transaction-count

# Block height
solana block-height

# Epoch info
solana epoch-info

# Leader schedule
solana leader-schedule
```

---

## 🛠️ Troubleshooting Commands

### Reset Everything

```bash
# Stop validator
pkill solana-test-validator

# Clean build
anchor clean

# Remove node modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Fresh start
solana-test-validator --reset
anchor build
anchor deploy
anchor test --skip-local-validator
```

### Check Program IDs

```bash
# Get program ID from keypair
solana address -k target/deploy/exchange_core-keypair.json

# Compare with Anchor.toml
cat Anchor.toml | grep -A 5 "\[programs.localnet\]"

# Check deployed programs
solana program show <PROGRAM_ID>
```

### Verify Accounts

```bash
# Check if account exists
solana account <ADDRESS> && echo "EXISTS" || echo "NOT FOUND"

# Check account balance
solana balance <ADDRESS>

# Check token balance
spl-token balance <MINT> --owner <OWNER>
```

---

## 📋 Test Verification Checklist

After running tests, verify:

```bash
# 1. Check exchange PDA
solana account <EXCHANGE_PDA>

# 2. Check order books
solana account <ORDERBOOK_PDA_TECH_USDC>
solana account <ORDERBOOK_PDA_FIN_USDC>

# 3. Check trading accounts
solana account <TRADING_ACCOUNT_ALICE>
solana account <TRADING_ACCOUNT_BOB>
solana account <TRADING_ACCOUNT_CAROL>

# 4. Check escrow
solana account <ESCROW_PDA>

# 5. Check token mints
spl-token display <TECH_MINT>
spl-token display <FIN_MINT>
spl-token display <USDC_MINT>

# 6. Check user token accounts
spl-token accounts --owner <ALICE_PUBKEY>
spl-token accounts --owner <BOB_PUBKEY>
spl-token accounts --owner <CAROL_PUBKEY>
```

---

## 🎯 Quick Commands Summary

| Task | Command |
|------|---------|
| **Run all tests** | `./scripts/run-integration-tests.sh` |
| **Start validator** | `solana-test-validator --reset` |
| **Build programs** | `anchor build` |
| **Deploy programs** | `anchor deploy` |
| **Run tests** | `anchor test --skip-local-validator` |
| **View logs** | `solana logs` |
| **Check balance** | `solana balance <ADDRESS>` |
| **View account** | `solana account <ADDRESS>` |
| **Confirm tx** | `solana confirm -v <SIGNATURE>` |
| **Token accounts** | `spl-token accounts --owner <ADDRESS>` |

---

## 📚 Additional Resources

- **Solana CLI Docs:** https://docs.solana.com/cli
- **Anchor CLI Docs:** https://www.anchor-lang.com/docs/cli
- **SPL Token CLI:** https://spl.solana.com/token
- **Solana RPC API:** https://docs.solana.com/api

---

**Quick Tip:** Save frequently used addresses in environment variables:

```bash
export EXCHANGE_PDA="<address>"
export TECH_MINT="<address>"
export ALICE="<address>"

# Then use like:
solana account $EXCHANGE_PDA
spl-token balance $TECH_MINT --owner $ALICE
```
