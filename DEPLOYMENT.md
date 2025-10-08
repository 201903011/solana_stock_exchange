# Deployment Guide

## Pre-Deployment Checklist

- [ ] All programs compiled successfully
- [ ] Tests passing
- [ ] Security audit completed (for mainnet)
- [ ] Configuration parameters reviewed
- [ ] Keypairs generated and secured
- [ ] Sufficient SOL for deployment

## Deployment Steps

### 1. Build Programs

```bash
anchor build
```

This creates program artifacts in `target/deploy/`.

### 2. Update Program IDs

After building, update the program IDs in:
- `Anchor.toml`
- Each program's `declare_id!` macro in `lib.rs`

```bash
# Get program IDs
solana address -k target/deploy/exchange_core-keypair.json
solana address -k target/deploy/escrow-keypair.json
solana address -k target/deploy/governance-keypair.json
solana address -k target/deploy/fee_management-keypair.json
```

### 3. Deploy to Localnet

```bash
# Start local validator
solana-test-validator

# In another terminal
anchor deploy
```

### 4. Deploy to Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

### 5. Deploy to Mainnet

⚠️ **IMPORTANT**: Only deploy to mainnet after thorough testing and audits!

```bash
# Set cluster to mainnet
solana config set --url mainnet-beta

# Ensure you have sufficient SOL
solana balance

# Deploy (requires ~20 SOL)
anchor deploy --provider.cluster mainnet-beta
```

## Post-Deployment

### Initialize Programs

1. **Initialize Exchange:**
```bash
anchor run initialize-exchange
```

2. **Initialize Fee Configuration:**
```bash
anchor run initialize-fees
```

3. **Initialize Governance:**
```bash
anchor run initialize-governance
```

### Verify Deployment

```bash
# Check program accounts
solana program show <PROGRAM_ID>

# Verify program is deployed
anchor idl fetch <PROGRAM_ID>
```

## Upgrade Programs

```bash
# Build new version
anchor build

# Upgrade program (requires upgrade authority)
solana program deploy target/deploy/exchange_core.so --program-id <PROGRAM_ID>
```

## Security Best Practices

1. **Use multisig for upgrade authority**
2. **Store keypairs securely (hardware wallet)**
3. **Test thoroughly on devnet first**
4. **Get security audit before mainnet**
5. **Implement circuit breakers**
6. **Monitor program accounts**
7. **Have emergency pause mechanism**

## Monitoring

Monitor your programs:
```bash
# Watch program logs
solana logs <PROGRAM_ID>

# Check program account data
solana account <ACCOUNT_ADDRESS>
```

## Troubleshooting

### Insufficient Funds
```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2
```

### Program Already Exists
```bash
# Use existing program ID or upgrade
solana program deploy --program-id <EXISTING_ID> target/deploy/program.so
```

### Build Failures
```bash
# Clean and rebuild
anchor clean
anchor build
```

## Cost Estimates

Approximate deployment costs:
- **Devnet**: Free (use airdrops)
- **Mainnet**: 
  - Exchange Core: ~8 SOL
  - Escrow: ~4 SOL
  - Governance: ~6 SOL
  - Fee Management: ~5 SOL
  - **Total: ~23 SOL**

Prices vary based on rent exemption and program size.
