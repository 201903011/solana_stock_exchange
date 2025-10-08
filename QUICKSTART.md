# Quick Start Guide

## Prerequisites Installation

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default stable
```

### 2. Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### 3. Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
```

### 4. Install Node.js and Yarn
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn
```

## Project Setup

### 1. Navigate to Project
```bash
cd /home/rahul/projects/solana_stock_exchange
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Configure Solana
```bash
# Create a new keypair (if you don't have one)
solana-keygen new

# Set cluster to localnet for testing
solana config set --url localhost
```

## Building the Project

### Option 1: Using Build Script
```bash
./scripts/build.sh
```

### Option 2: Using Anchor Directly
```bash
anchor build
```

### Verify Build
After building, you should see:
- `target/deploy/exchange_core.so`
- `target/deploy/escrow.so`
- `target/deploy/governance.so`
- `target/deploy/fee_management.so`

## Running Tests

### Option 1: Using Test Script
```bash
./scripts/test.sh
```

### Option 2: Using Anchor Directly
```bash
# Start local validator (in separate terminal)
solana-test-validator

# Run tests (in project directory)
anchor test --skip-local-validator
```

## Deployment

### Deploy to Localnet

#### 1. Start Local Validator
```bash
# In a separate terminal
solana-test-validator
```

#### 2. Deploy Programs
```bash
anchor deploy
```

### Deploy to Devnet

```bash
# Switch to devnet
solana config set --url devnet

# Get some SOL for deployment
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

### Using Deploy Script
```bash
./scripts/deploy.sh
```

## Interacting with Programs

### Initialize Exchange
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ExchangeCore } from "./target/types/exchange_core";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.ExchangeCore as Program<ExchangeCore>;

// Find Exchange PDA
const [exchangePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("exchange")],
  program.programId
);

// Initialize
await program.methods
  .initializeExchange(30, 50) // 0.3% maker, 0.5% taker
  .accounts({
    exchange: exchangePda,
    authority: provider.wallet.publicKey,
    feeCollector: feeCollectorPubkey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Common Commands

### Check Program IDs
```bash
solana-keygen pubkey target/deploy/exchange_core-keypair.json
solana-keygen pubkey target/deploy/escrow-keypair.json
solana-keygen pubkey target/deploy/governance-keypair.json
solana-keygen pubkey target/deploy/fee_management-keypair.json
```

### View Program Info
```bash
solana program show <PROGRAM_ID>
```

### Check Solana Config
```bash
solana config get
```

### Check Balance
```bash
solana balance
```

### View Logs
```bash
solana logs <PROGRAM_ID>
```

## Troubleshooting

### Build Errors

**Error: "Anchor not found"**
```bash
# Reinstall Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm use 0.30.1
```

**Error: "rustc version too old"**
```bash
rustup update
```

**Error: "cargo not found"**
```bash
source $HOME/.cargo/env
```

### Test Errors

**Error: "Connection refused"**
```bash
# Make sure local validator is running
solana-test-validator
```

**Error: "Insufficient funds"**
```bash
# For localnet
solana airdrop 10

# For devnet
solana airdrop 2
```

**Error: "Module not found"**
```bash
# Reinstall node modules
rm -rf node_modules
yarn install
```

### Deployment Errors

**Error: "Program already deployed"**
```bash
# You can upgrade existing program
solana program deploy target/deploy/program.so --program-id <EXISTING_ID>
```

**Error: "Insufficient funds for deployment"**
```bash
# Check balance
solana balance

# For devnet, request airdrop
solana airdrop 2
```

## Development Workflow

### 1. Make Changes
Edit files in `programs/*/src/`

### 2. Format Code
```bash
cargo fmt --all
```

### 3. Build
```bash
anchor build
```

### 4. Test
```bash
anchor test
```

### 5. Deploy
```bash
anchor deploy
```

## Useful Resources

- **Anchor Documentation**: https://book.anchor-lang.com/
- **Solana Documentation**: https://docs.solana.com/
- **SPL Token**: https://spl.solana.com/token
- **Solana Cookbook**: https://solanacookbook.com/

## Next Steps

1. ✅ Build the project successfully
2. ✅ Run all tests
3. ✅ Deploy to localnet
4. ✅ Test on devnet
5. ⬜ Develop frontend integration
6. ⬜ Set up backend/indexer
7. ⬜ Conduct security audit
8. ⬜ Deploy to mainnet

## Getting Help

- Review `README.md` for detailed documentation
- Check `ARCHITECTURE.md` for system design
- Read `DEVELOPMENT.md` for development guidelines
- See `DEPLOYMENT.md` for deployment procedures

## Quick Reference

| Command | Description |
|---------|-------------|
| `anchor build` | Build all programs |
| `anchor test` | Run tests |
| `anchor deploy` | Deploy to configured cluster |
| `anchor clean` | Clean build artifacts |
| `./scripts/build.sh` | Build with script |
| `./scripts/test.sh` | Test with script |
| `./scripts/deploy.sh` | Deploy with script |

---

**You're all set! Start building amazing decentralized exchange features! 🚀**
