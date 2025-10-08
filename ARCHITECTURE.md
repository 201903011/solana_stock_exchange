# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                    (React/Next.js - Separate)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ RPC Calls
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                          │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Exchange Core   │  │     Escrow       │                  │
│  │    Program       │  │    Program       │                  │
│  │                  │  │                  │                  │
│  │ • Order Books    │  │ • Fund Locking   │                  │
│  │ • Order Matching │  │ • Atomic Swaps   │                  │
│  │ • Trade Execution│  │ • Settlement     │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   Governance     │  │ Fee Management   │                  │
│  │    Program       │  │    Program       │                  │
│  │                  │  │                  │                  │
│  │ • DAO Voting     │  │ • Fee Collection │                  │
│  │ • Proposals      │  │ • Distribution   │                  │
│  │ • Treasury       │  │ • Tier System    │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SPL Token Program (System)                  │  │
│  │         Token Minting, Transfers, Accounts              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ State Queries
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND/INDEXER LAYER                        │
│                   (Node.js/GraphQL - Separate)                  │
│                                                                 │
│  • Historical Data      • Price Feeds      • Analytics         │
│  • User Portfolios      • Market Data      • Notifications     │
└─────────────────────────────────────────────────────────────────┘
```

## Exchange Core Program Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Initialize Trading Account
     ▼
┌──────────────────┐
│ Trading Account  │
│   (PDA)          │
└────┬─────────────┘
     │
     │ 2. Place Order
     ▼
┌──────────────────┐     ┌──────────────────┐
│   Order Book     │────▶│   Vault (Base)   │
│   (PDA)          │     │   (Token Acct)   │
└────┬─────────────┘     └──────────────────┘
     │                   ┌──────────────────┐
     │                   │  Vault (Quote)   │
     │                   │  (Token Acct)    │
     │                   └──────────────────┘
     │ 3. Order Matching
     ▼
┌──────────────────┐
│  Order (PDA)     │
│  - Price         │
│  - Quantity      │
│  - Side          │
└────┬─────────────┘
     │
     │ 4. Trade Execution
     ▼
┌──────────────────┐
│   Trade (PDA)    │
│   - Executed     │
└──────────────────┘
```

## Escrow Program Flow

```
┌─────────┐                         ┌─────────┐
│  Buyer  │                         │ Seller  │
└────┬────┘                         └────┬────┘
     │                                   │
     │ 1. Initialize Escrow              │
     ▼                                   │
┌────────────────────────┐              │
│   Escrow Account       │              │
│   Status: Pending      │              │
└───────────┬────────────┘              │
            │                            │
            │ 2. Deposit Quote           │ 3. Deposit Base
            ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Quote Vault (PDA)  │      │  Base Vault (PDA)   │
│  Locked Funds       │      │  Locked Tokens      │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           │    4. Escrow Fully Funded  │
           │         Status: Funded     │
           └────────────┬───────────────┘
                        │
                        │ 5. Execute Swap (Atomic)
                        ▼
           ┌────────────────────────┐
           │   Transfer Base → Buyer │
           │  Transfer Quote → Seller│
           │   Status: Executed      │
           └─────────────────────────┘
```

## Governance Program Flow

```
┌──────────────┐
│ Governance   │
│ Token Holder │
└──────┬───────┘
       │
       │ 1. Create Proposal
       ▼
┌────────────────────┐
│  Proposal (PDA)    │
│  • Title           │
│  • Description     │
│  • Type            │
│  • Status: Active  │
└─────────┬──────────┘
          │
          │ 2. Cast Votes
          ▼
┌────────────────────┐
│  Vote Records      │
│  • For: X          │
│  • Against: Y      │
│  • Abstain: Z      │
└─────────┬──────────┘
          │
          │ 3. Voting Period Ends
          │    Check Quorum & Threshold
          ▼
    ┌─────────┐
    │ Passed? │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    Yes       No
    │         │
    ▼         ▼
┌──────────┐ ┌─────────┐
│ Execute  │ │ Defeated│
│ Proposal │ │         │
└──────────┘ └─────────┘
```

## Fee Management Flow

```
┌─────────┐
│  Trade  │
└────┬────┘
     │
     │ 1. Calculate Fee (basis points)
     ▼
┌──────────────────┐
│   Fee Amount     │
│   0.3% of Trade  │
└────┬─────────────┘
     │
     │ 2. Collect to Fee Vault
     ▼
┌──────────────────┐
│ Fee Collector    │
│   (Token Acct)   │
└────┬─────────────┘
     │
     │ 3. Distribute Fees
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌──────────┐      ┌──────────┐
│ Treasury │      │ Stakers  │
│  (40%)   │      │  (30%)   │
└──────────┘      └──────────┘
     │                  │
     ▼                  ▼
┌──────────┐      ┌──────────┐
│   LPs    │      │Referrers │
│  (20%)   │      │   (5%)   │
└──────────┘      └──────────┘
     │
     ▼
┌──────────┐
│   Burn   │
│   (5%)   │
└──────────┘
```

## PDA (Program Derived Address) Structure

```
Exchange Core:
├── exchange                    [exchange]
├── order_books/
│   ├── BTC-USDC               [order_book, btc_mint, usdc_mint]
│   ├── ETH-USDC               [order_book, eth_mint, usdc_mint]
│   └── AAPL-USDC              [order_book, aapl_mint, usdc_mint]
├── orders/
│   └── order_123              [order, order_book, order_id]
├── trading_accounts/
│   └── user_account           [trading_account, user_pubkey]
└── vaults/
    ├── base_vault             [vault, order_book, "base"]
    └── quote_vault            [vault, order_book, "quote"]

Escrow:
├── escrows/
│   └── escrow_1               [escrow, trade_id]
└── vaults/
    ├── base_vault             [vault, escrow, "base"]
    └── quote_vault            [vault, escrow, "quote"]

Governance:
├── governance                 [governance]
├── proposals/
│   └── proposal_1             [proposal, governance, proposal_id]
├── vote_records/
│   └── vote_1                 [vote_record, proposal, voter]
├── voter_weights/
│   └── weight_1               [voter_weight, voter]
└── treasury                   [treasury, governance]

Fee Management:
├── fee_config                 [fee_config]
├── fee_tiers/
│   └── tier_1                 [fee_tier, tier_level]
├── staking_pool               [staking_pool]
└── referral_accounts/
    └── referral_1             [referral, referrer]
```

## Data Flow Example: Placing a Limit Order

```
1. User Action
   └─> Frontend calls placeOrder()

2. Wallet Signs Transaction
   └─> Transaction includes:
       • Trader signature
       • Order details (price, quantity, side)
       • Token accounts

3. Program Execution (Exchange Core)
   ├─> Validate inputs
   │   ├─> Check price alignment to tick size
   │   ├─> Check minimum order size
   │   └─> Verify trading account exists
   │
   ├─> Calculate required funds
   │   └─> For Buy: price × quantity
   │       For Sell: quantity
   │
   ├─> Transfer tokens to vault
   │   └─> SPL Token transfer CPI
   │
   ├─> Create Order PDA
   │   ├─> Assign order ID
   │   ├─> Set order parameters
   │   └─> Insert into order book linked list
   │
   └─> Emit OrderPlaced event

4. State Update
   └─> Order book updated with new order

5. Off-chain Indexer (Separate Backend)
   └─> Catches event and updates database
```

## Security Model

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. Program Level                       │
│     • PDA-based authority               │
│     • has_one constraints               │
│     • Signer verification               │
│                                         │
│  2. Account Level                       │
│     • Owner checks                      │
│     • Discriminator validation          │
│     • Space verification                │
│                                         │
│  3. Instruction Level                   │
│     • Input validation                  │
│     • Checked arithmetic                │
│     • State transitions                 │
│                                         │
│  4. Token Level                         │
│     • SPL Token program integration     │
│     • Vault isolation                   │
│     • Atomic transfers                  │
│                                         │
│  5. Economic Level                      │
│     • Fee caps                          │
│     • Circuit breakers (future)         │
│     • Rate limiting (future)            │
│                                         │
└─────────────────────────────────────────┘
```

## Cross-Program Interactions

```
┌──────────────────┐
│ Exchange Core    │
└────────┬─────────┘
         │
         │ CPI: Create Escrow
         ▼
┌──────────────────┐
│     Escrow       │
└────────┬─────────┘
         │
         │ CPI: Transfer Tokens
         ▼
┌──────────────────┐
│   SPL Token      │
└──────────────────┘

┌──────────────────┐
│ Exchange Core    │
└────────┬─────────┘
         │
         │ CPI: Collect Fee
         ▼
┌──────────────────┐
│ Fee Management   │
└────────┬─────────┘
         │
         │ CPI: Transfer to Treasury
         ▼
┌──────────────────┐
│   Governance     │
└──────────────────┘
```

## Scalability Considerations

- **Horizontal Scaling**: Multiple order books operate independently
- **Compute Limits**: Batch operations with crank mechanism
- **State Compression**: Efficient account packing
- **Indexing**: Off-chain indexer for historical data
- **Caching**: Frontend caches frequently accessed data

## Future Enhancements

1. **Oracle Integration**: Real-time price feeds
2. **Advanced Order Types**: Stop-loss, trailing stops
3. **Margin Trading**: Leveraged positions
4. **Liquidity Mining**: Incentivized market making
5. **Cross-chain Bridge**: Multi-chain asset support
6. **Mobile SDK**: Native mobile integration
7. **Advanced Analytics**: ML-based insights
