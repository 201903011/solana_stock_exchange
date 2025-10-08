# Solana Stock Exchange - Blockchain Layer

A comprehensive decentralized stock exchange built on Solana blockchain using the Anchor framework. This project implements a full-featured on-chain trading infrastructure with order books, escrow, governance, and fee management.

## 🔍 NEW: Solana Explorer Integration

All tests now include **clickable Solana Explorer URLs** for every account, token, and transaction!

- 🔗 View user wallets in real-time
- 🪙 Inspect token mints and holdings
- 📜 Track transaction history
- 📊 Monitor balance changes during tests

**Quick Start**: See [EXPLORER_QUICK_ACCESS.md](./EXPLORER_QUICK_ACCESS.md) for instant access to Explorer features!

## 🏗️ Architecture Overview

This project consists of four main Solana programs:

### 1. **Exchange Core Program** (`exchange_core`)
The heart of the exchange, handling all trading operations:
- **Order Book Management**: Create and manage order books for trading pairs
- **Order Matching Engine**: Price-time priority matching algorithm
- **Trade Execution**: Atomic swap execution with proper settlement
- **State Management**: PDAs for order books, orders, trading accounts, and trades

**Key Features:**
- Limit and market orders
- Order modification and cancellation
- Multiple trading pairs support
- Fee integration
- Trading account management

### 2. **Escrow Program** (`escrow`)
Ensures secure atomic settlements:
- **Fund Locking**: Securely locks buyer and seller funds
- **Atomic Swaps**: Guarantees simultaneous exchange or rollback
- **Time-based Expiry**: Automatic escrow expiration
- **Emergency Withdrawal**: Admin recovery for stuck funds

**Key Features:**
- PDA-based vault system
- Multi-token support
- Automatic settlement on full funding
- Cancellation mechanism

### 3. **Governance Program** (`governance`)
DAO-based decentralized governance:
- **Proposal Management**: Create, vote, and execute proposals
- **Token-based Voting**: Voting power based on governance tokens
- **Treasury Management**: Decentralized fund allocation
- **Parameter Updates**: Community-driven exchange parameter changes

**Key Features:**
- Multiple proposal types (parameter changes, treasury allocation, etc.)
- Quorum and approval threshold requirements
- Vote delegation
- Time-locked voting periods

### 4. **Fee Management Program** (`fee_management`)
Comprehensive fee collection and distribution:
- **Fee Collection**: Trading, withdrawal, and listing fees
- **Fee Distribution**: Multi-party distribution (treasury, stakers, LPs, referrers)
- **Tiered Fees**: Volume-based fee discounts
- **Staking Rewards**: Reward distribution to stakers

**Key Features:**
- Configurable fee structure
- Referral rewards system
- Staking pool integration
- Fee tier management

## 📁 Project Structure

```
solana_stock_exchange/
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace configuration
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript configuration
├── programs/
│   ├── exchange_core/         # Core exchange program
│   │   ├── src/
│   │   │   ├── lib.rs         # Program entry point
│   │   │   ├── state.rs       # Account structures
│   │   │   ├── error.rs       # Error definitions
│   │   │   ├── constants.rs   # Constants and seeds
│   │   │   └── instructions/  # Instruction handlers
│   │   └── Cargo.toml
│   ├── escrow/                # Escrow program
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs
│   │   │   ├── error.rs
│   │   │   ├── constants.rs
│   │   │   └── instructions/
│   │   └── Cargo.toml
│   ├── governance/            # Governance program
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs
│   │   │   ├── error.rs
│   │   │   ├── constants.rs
│   │   │   └── instructions/
│   │   └── Cargo.toml
│   └── fee_management/        # Fee management program
│       ├── src/
│       │   ├── lib.rs
│       │   ├── state.rs
│       │   ├── error.rs
│       │   ├── constants.rs
│       │   └── instructions/
│       └── Cargo.toml
├── tests/
│   └── solana_stock_exchange.ts  # Integration tests
└── target/                    # Build artifacts
```

## 🚀 Getting Started

### Prerequisites

- Rust 1.70.0 or higher
- Solana CLI 1.18.0 or higher
- Anchor 0.30.1
- Node.js 16+ and Yarn

### Installation

1. **Install Rust and Solana CLI:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
```

2. **Clone and setup:**
```bash
cd solana_stock_exchange
yarn install
```

3. **Configure Solana CLI:**
```bash
# Set to localnet for testing
solana config set --url localhost

# Generate a new keypair
solana-keygen new
```

### Building

```bash
# Build all programs
anchor build

# Build specific program
cd programs/exchange_core && cargo build-bpf
```

### Testing

```bash
# Run all tests
anchor test

# Run tests with logs
anchor test -- --features "test-bpf"
```

### Deployment

```bash
# Deploy to localnet
anchor deploy

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## 📚 Program APIs

### Exchange Core Program

#### Initialize Exchange
```rust
pub fn initialize_exchange(
    ctx: Context<InitializeExchange>,
    maker_fee_bps: u16,
    taker_fee_bps: u16,
) -> Result<()>
```

#### Initialize Order Book
```rust
pub fn initialize_order_book(
    ctx: Context<InitializeOrderBook>,
    base_mint: Pubkey,
    quote_mint: Pubkey,
    tick_size: u64,
    min_order_size: u64,
) -> Result<()>
```

#### Place Limit Order
```rust
pub fn place_limit_order(
    ctx: Context<PlaceLimitOrder>,
    side: OrderSide,
    price: u64,
    quantity: u64,
) -> Result<()>
```

#### Place Market Order
```rust
pub fn place_market_order(
    ctx: Context<PlaceMarketOrder>,
    side: OrderSide,
    quantity: u64,
    max_quote_amount: u64,
) -> Result<()>
```

### Escrow Program

#### Initialize Escrow
```rust
pub fn initialize_escrow(
    ctx: Context<InitializeEscrow>,
    trade_id: u64,
    base_amount: u64,
    quote_amount: u64,
    expiry: i64,
) -> Result<()>
```

#### Execute Swap
```rust
pub fn execute_swap(ctx: Context<ExecuteSwap>) -> Result<()>
```

### Governance Program

#### Create Proposal
```rust
pub fn create_proposal(
    ctx: Context<CreateProposal>,
    title: String,
    description: String,
    proposal_type: ProposalType,
) -> Result<()>
```

#### Cast Vote
```rust
pub fn cast_vote(
    ctx: Context<CastVote>,
    support: bool,
) -> Result<()>
```

### Fee Management Program

#### Initialize Fee Config
```rust
pub fn initialize_fee_config(
    ctx: Context<InitializeFeeConfig>,
    trading_fee_bps: u16,
    withdrawal_fee_bps: u16,
    listing_fee: u64,
) -> Result<()>
```

#### Distribute Fees
```rust
pub fn distribute_fees(
    ctx: Context<DistributeFees>,
    amount: u64,
) -> Result<()>
```

## 🔐 Security Considerations

1. **PDA Security**: All program-owned accounts use PDAs for secure authority
2. **Access Control**: Proper authorization checks on all sensitive operations
3. **Overflow Protection**: All arithmetic operations use checked math
4. **Atomic Execution**: Trades execute atomically or roll back completely
5. **Time-based Controls**: Expiry mechanisms for escrows and proposals
6. **Fee Validation**: Maximum fee caps to prevent excessive fees

## 🎯 Key Features

### Order Book Features
- Price-time priority matching
- Partial order fills
- Order modification and cancellation
- Multiple order types (limit, market, post-only, IOC)

### Trading Features
- Atomic settlements via escrow
- Fee collection and distribution
- Trading account management
- Multi-token pair support

### Governance Features
- Token-based voting power
- Multiple proposal types
- Quorum requirements
- Vote delegation
- Treasury management

### Fee Features
- Tiered fee structure
- Volume-based discounts
- Referral rewards
- Staking rewards distribution
- Multi-party fee distribution

## 📊 PDA Architecture

### Exchange Core PDAs
- Exchange Authority: `["exchange"]`
- Order Books: `["order_book", base_mint, quote_mint]`
- Orders: `["order", order_book, order_id]`
- Trading Accounts: `["trading_account", user]`
- Vaults: `["vault", order_book, "base"|"quote"]`

### Escrow PDAs
- Escrow Accounts: `["escrow", trade_id]`
- Vaults: `["vault", escrow, "base"|"quote"]`

### Governance PDAs
- Governance Config: `["governance"]`
- Proposals: `["proposal", governance, proposal_id]`
- Vote Records: `["vote_record", proposal, voter]`
- Treasury: `["treasury", governance]`

### Fee Management PDAs
- Fee Config: `["fee_config"]`
- Fee Tiers: `["fee_tier", tier_level]`
- Staking Pool: `["staking_pool"]`
- Referral Accounts: `["referral", referrer]`

## 🔧 Configuration

### Fee Configuration
- Default trading fee: 0.3% (30 bps)
- Default withdrawal fee: 0.1% (10 bps)
- Maximum fee: 10% (1000 bps)

### Governance Configuration
- Default voting period: 3 days
- Default quorum: 20%
- Default approval threshold: 66%

### Time Constraints
- Minimum escrow duration: 60 seconds
- Maximum escrow duration: 30 days
- Default escrow duration: 1 hour

## 🧪 Testing

The project includes comprehensive integration tests covering:
- Exchange initialization and configuration
- Order book creation and management
- Order placement and execution
- Escrow creation and settlement
- Governance proposal lifecycle
- Fee collection and distribution

Run tests with:
```bash
anchor test
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation in `/docs`
- Review test examples in `/tests`

## 🗺️ Roadmap

- [ ] Advanced order types (stop-loss, take-profit)
- [ ] Liquidity mining rewards
- [ ] Cross-program invocations between programs
- [ ] Oracle integration for price feeds
- [ ] Circuit breakers for extreme volatility
- [ ] Advanced analytics and reporting
- [ ] Mobile SDK support
- [ ] Indexer for historical data

---

Built with ❤️ on Solana
