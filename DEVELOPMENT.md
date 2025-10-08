# Development Guide

## Setup Development Environment

### 1. Install Dependencies

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup component add rustfmt clippy

# Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Node.js and Yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn
```

### 2. Clone and Setup

```bash
git clone <your-repo>
cd solana_stock_exchange
yarn install
```

### 3. Configure Solana

```bash
# Generate keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Set to localnet
solana config set --url localhost

# Check configuration
solana config get
```

## Development Workflow

### Building

```bash
# Build all programs
anchor build

# Build specific program
cd programs/exchange_core
cargo build-bpf

# Check for errors
cargo clippy --all-targets --all-features
```

### Testing

```bash
# Run all tests
anchor test

# Run specific test
anchor test --skip-deploy --skip-build -- --test test_name

# Test with verbose output
RUST_LOG=debug anchor test

# Test specific program
cd programs/exchange_core
cargo test-bpf
```

### Code Formatting

```bash
# Format Rust code
cargo fmt --all

# Format TypeScript/JavaScript
yarn prettier --write "**/*.{ts,js,json}"
```

### Linting

```bash
# Rust linting
cargo clippy --all-targets --all-features -- -D warnings

# TypeScript linting
yarn eslint "**/*.ts"
```

## Project Structure Best Practices

### Program Structure

```
program_name/
├── src/
│   ├── lib.rs              # Program entry point
│   ├── state.rs            # Account structures
│   ├── error.rs            # Custom errors
│   ├── constants.rs        # Seeds, constants
│   ├── instructions/
│   │   ├── mod.rs          # Export instructions
│   │   ├── instruction1.rs
│   │   └── instruction2.rs
│   └── utils.rs            # Helper functions (optional)
└── Cargo.toml
```

### Adding New Instructions

1. **Create instruction file:**
```rust
// programs/exchange_core/src/instructions/new_instruction.rs
use anchor_lang::prelude::*;
use crate::{state::*, error::*, constants::*};

#[derive(Accounts)]
pub struct NewInstruction<'info> {
    // Define accounts
}

pub fn handler(ctx: Context<NewInstruction>, params: u64) -> Result<()> {
    // Implementation
    Ok(())
}
```

2. **Export in mod.rs:**
```rust
pub mod new_instruction;
pub use new_instruction::*;
```

3. **Add to lib.rs:**
```rust
pub fn new_instruction(ctx: Context<NewInstruction>, params: u64) -> Result<()> {
    instructions::new_instruction::handler(ctx, params)
}
```

### Adding New Account Types

```rust
// In state.rs
#[account]
pub struct NewAccount {
    pub field1: Pubkey,
    pub field2: u64,
    pub bump: u8,
}

impl NewAccount {
    pub const LEN: usize = 8 + 32 + 8 + 1;
}
```

## Testing Guidelines

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function() {
        // Test implementation
    }
}
```

### Integration Tests

```typescript
describe("Program Test", () => {
  it("Should execute instruction", async () => {
    // Setup
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed")],
      program.programId
    );

    // Execute
    await program.methods
      .instruction()
      .accounts({ /* accounts */ })
      .rpc();

    // Assert
    const account = await program.account.accountType.fetch(pda);
    assert.equal(account.field, expectedValue);
  });
});
```

## Debugging

### Solana Logs

```bash
# View program logs
solana logs | grep "<PROGRAM_ID>"

# Watch specific transaction
solana confirm -v <SIGNATURE>
```

### Anchor Debugging

```rust
// Use msg! macro for logging
msg!("Debug value: {}", variable);

// Print account data
msg!("Account: {:?}", ctx.accounts.account);
```

### Common Issues

**Issue**: Account not initialized
```
Error: Account does not exist
```
**Solution**: Ensure account is initialized before use

**Issue**: Insufficient lamports
```
Error: insufficient lamports
```
**Solution**: Increase payer balance or adjust rent

**Issue**: Seeds constraint violated
```
Error: seeds constraint violated
```
**Solution**: Verify PDA seeds match exactly

## Performance Optimization

### Compute Units

```rust
// Request more compute units
#[program]
pub mod my_program {
    use super::*;
    
    pub fn expensive_operation(ctx: Context<MyAccounts>) -> Result<()> {
        // Request 400k compute units
        solana_program::compute_budget::request_units(400_000)?;
        // Operation
        Ok(())
    }
}
```

### Account Packing

- Keep accounts small to reduce rent
- Use appropriate data types (u8 instead of u64 when possible)
- Pack booleans efficiently

### Transaction Optimization

- Batch operations when possible
- Use CPI efficiently
- Minimize account lookups

## Best Practices

### Security

1. **Always validate inputs**
```rust
require!(amount > 0, ErrorCode::InvalidAmount);
require!(price % tick_size == 0, ErrorCode::InvalidPrice);
```

2. **Use checked arithmetic**
```rust
let result = value1.checked_add(value2).ok_or(ErrorCode::Overflow)?;
```

3. **Verify account ownership**
```rust
#[account(
    constraint = account.owner == authority.key() @ ErrorCode::Unauthorized
)]
pub account: Account<'info, MyAccount>,
```

4. **Implement proper access control**
```rust
#[account(
    seeds = [SEED],
    bump,
    has_one = authority @ ErrorCode::Unauthorized
)]
```

### Code Quality

1. **Write clear documentation**
```rust
/// Initializes a new order book for the trading pair
/// 
/// # Arguments
/// * `base_mint` - The mint address of the base token
/// * `quote_mint` - The mint address of the quote token
/// * `tick_size` - Minimum price increment
```

2. **Use descriptive names**
```rust
// Good
let unfilled_quantity = order.quantity - order.filled_quantity;

// Bad
let x = order.q - order.f;
```

3. **Keep functions small and focused**
```rust
// Each function should do one thing well
pub fn validate_order(order: &Order) -> Result<()> { }
pub fn execute_trade(maker: &Order, taker: &Order) -> Result<()> { }
```

## CI/CD Setup

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
      - run: cargo install --git https://github.com/coral-xyz/anchor avm
      - run: avm install 0.30.1
      - run: avm use 0.30.1
      - run: anchor build
      - run: anchor test
```

## Useful Commands

```bash
# Clean build artifacts
anchor clean

# Verify program builds
anchor verify <PROGRAM_ID>

# Generate IDL
anchor idl init <PROGRAM_ID> -f target/idl/program.json

# Upgrade IDL
anchor idl upgrade <PROGRAM_ID> -f target/idl/program.json

# Check account size
solana account <ADDRESS> --output json | jq .data | wc -c
```

## Resources

- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/tests)
