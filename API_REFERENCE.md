# API Reference - Solana Stock Exchange

Complete reference for all program instructions and their usage.

## Table of Contents

1. [Exchange Core Program](#exchange-core-program)
2. [Escrow Program](#escrow-program)
3. [Governance Program](#governance-program)
4. [Fee Management Program](#fee-management-program)

---

## Exchange Core Program

Program ID: `ExCoreProgram11111111111111111111111111111`

### initialize_exchange

Initializes the exchange with fee configuration.

**Parameters:**
- `maker_fee_bps: u16` - Maker fee in basis points (1 bps = 0.01%)
- `taker_fee_bps: u16` - Taker fee in basis points

**Accounts:**
- `exchange` - Exchange PDA (init, seeds: ["exchange"])
- `authority` - Exchange authority (signer, mut)
- `fee_collector` - Fee collector account
- `system_program` - System program

**Example:**
```typescript
await program.methods
  .initializeExchange(30, 50) // 0.3% maker, 0.5% taker
  .accounts({
    exchange: exchangePda,
    authority: wallet.publicKey,
    feeCollector: feeCollectorPubkey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

---

### initialize_order_book

Creates an order book for a trading pair.

**Parameters:**
- `base_mint: Pubkey` - Base token mint address
- `quote_mint: Pubkey` - Quote token mint address
- `tick_size: u64` - Minimum price increment
- `min_order_size: u64` - Minimum order quantity

**Accounts:**
- `exchange` - Exchange PDA
- `order_book` - Order book PDA (init, seeds: ["order_book", base_mint, quote_mint])
- `base_mint` - Base token mint
- `quote_mint` - Quote token mint
- `base_vault` - Base token vault (init)
- `quote_vault` - Quote token vault (init)
- `authority` - Exchange authority (signer, mut)
- `token_program` - SPL Token program
- `system_program` - System program
- `rent` - Rent sysvar

**Example:**
```typescript
await program.methods
  .initializeOrderBook(
    baseMintPubkey,
    quoteMintPubkey,
    new anchor.BN(1000),    // tick_size: 0.001
    new anchor.BN(1)        // min_order_size: 1
  )
  .accounts({
    exchange: exchangePda,
    orderBook: orderBookPda,
    baseMint: baseMintPubkey,
    quoteMint: quoteMintPubkey,
    baseVault: baseVaultPda,
    quoteVault: quoteVaultPda,
    authority: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

---

### place_limit_order

Places a limit order in the order book.

**Parameters:**
- `side: OrderSide` - Bid (buy) or Ask (sell)
- `price: u64` - Order price
- `quantity: u64` - Order quantity

**Accounts:**
- `exchange` - Exchange PDA
- `order_book` - Order book PDA (mut)
- `order` - Order PDA (init, seeds: ["order", order_book, order_id])
- `trading_account` - User's trading account PDA (mut)
- `trader` - Trader (signer, mut)
- `trader_token_account` - Trader's token account (mut)
- `vault` - Order book vault (mut)
- `token_program` - SPL Token program
- `system_program` - System program

**Example:**
```typescript
await program.methods
  .placeLimitOrder(
    { bid: {} },                    // Buy order
    new anchor.BN(50000),          // Price: 50.000
    new anchor.BN(100)             // Quantity: 100
  )
  .accounts({
    exchange: exchangePda,
    orderBook: orderBookPda,
    order: orderPda,
    tradingAccount: tradingAccountPda,
    trader: wallet.publicKey,
    traderTokenAccount: traderTokenAccount,
    vault: quoteVaultPda,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

---

### place_market_order

Executes a market order immediately at best available price.

**Parameters:**
- `side: OrderSide` - Bid (buy) or Ask (sell)
- `quantity: u64` - Order quantity
- `max_quote_amount: u64` - Maximum quote amount willing to pay

**Accounts:**
- `exchange` - Exchange PDA
- `order_book` - Order book PDA (mut)
- `trading_account` - Trading account PDA (mut)
- `trader` - Trader (signer, mut)
- `trader_base_account` - Trader's base token account (mut)
- `trader_quote_account` - Trader's quote token account (mut)
- `base_vault` - Base token vault (mut)
- `quote_vault` - Quote token vault (mut)
- `token_program` - SPL Token program
- `system_program` - System program

---

### cancel_order

Cancels an active order and returns locked funds.

**Parameters:**
- `order_id: u64` - ID of order to cancel

**Accounts:**
- `order_book` - Order book PDA (mut)
- `order` - Order PDA (mut, seeds: ["order", order_book, order_id])
- `trader` - Trader (signer, mut)
- `trader_token_account` - Trader's token account (mut)
- `vault` - Order book vault (mut)
- `token_program` - SPL Token program

---

### modify_order

Modifies price and/or quantity of an unfilled order.

**Parameters:**
- `order_id: u64` - Order ID
- `new_price: Option<u64>` - New price (None to keep current)
- `new_quantity: Option<u64>` - New quantity (None to keep current)

**Accounts:**
- `order_book` - Order book PDA (mut)
- `order` - Order PDA (mut)
- `trader` - Trader (signer, mut)

---

### initialize_trading_account

Creates a trading account for a user.

**Accounts:**
- `exchange` - Exchange PDA
- `trading_account` - Trading account PDA (init, seeds: ["trading_account", owner])
- `owner` - Account owner (signer, mut)
- `system_program` - System program

---

### crank_match_orders

Matches orders in the order book (permissionless).

**Parameters:**
- `max_iterations: u8` - Maximum number of matches to process

**Accounts:**
- `order_book` - Order book PDA (mut)
- `cranker` - Cranker (signer)

---

### settle_trade

Settles a completed trade.

**Parameters:**
- `trade_id: u64` - Trade ID to settle

**Accounts:**
- `trade` - Trade PDA (mut)
- `order_book` - Order book PDA (mut)
- `settler` - Settler (signer)

---

### close_order_book

Closes an order book (admin only).

**Accounts:**
- `exchange` - Exchange PDA
- `order_book` - Order book PDA (mut)
- `authority` - Exchange authority (signer)

---

## Escrow Program

Program ID: `EscrowProgram11111111111111111111111111111`

### initialize_escrow

Creates an escrow account for atomic settlement.

**Parameters:**
- `trade_id: u64` - Unique trade identifier
- `base_amount: u64` - Amount of base tokens
- `quote_amount: u64` - Amount of quote tokens
- `expiry: i64` - Unix timestamp for expiry

**Accounts:**
- `escrow` - Escrow PDA (init, seeds: ["escrow", trade_id])
- `buyer` - Buyer pubkey
- `seller` - Seller pubkey
- `base_mint` - Base token mint
- `quote_mint` - Quote token mint
- `base_vault` - Base token vault (init)
- `quote_vault` - Quote token vault (init)
- `initializer` - Initializer (signer, mut)
- `token_program` - SPL Token program
- `system_program` - System program
- `rent` - Rent sysvar

**Example:**
```typescript
const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour

await escrowProgram.methods
  .initializeEscrow(
    new anchor.BN(1),              // trade_id
    new anchor.BN(1000000),        // base_amount
    new anchor.BN(5000000),        // quote_amount
    new anchor.BN(expiry)
  )
  .accounts({
    escrow: escrowPda,
    buyer: buyerPubkey,
    seller: sellerPubkey,
    baseMint: baseMintPubkey,
    quoteMint: quoteMintPubkey,
    baseVault: baseVaultPda,
    quoteVault: quoteVaultPda,
    initializer: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

---

### deposit_to_escrow

Deposits tokens into escrow.

**Parameters:**
- `amount: u64` - Amount to deposit
- `is_base: bool` - True for base tokens, false for quote tokens

**Accounts:**
- `escrow` - Escrow PDA (mut)
- `depositor` - Depositor (signer, mut)
- `depositor_token_account` - Depositor's token account (mut)
- `vault` - Escrow vault (mut)
- `token_program` - SPL Token program

---

### execute_swap

Executes the atomic swap when escrow is fully funded.

**Accounts:**
- `escrow` - Escrow PDA (mut)
- `base_vault` - Base token vault (mut)
- `quote_vault` - Quote token vault (mut)
- `buyer_base_account` - Buyer's base token account (mut)
- `seller_quote_account` - Seller's quote token account (mut)
- `executor` - Executor (signer)
- `token_program` - SPL Token program

---

### cancel_escrow

Cancels escrow and refunds depositors.

**Accounts:**
- `escrow` - Escrow PDA (mut)
- `canceller` - Canceller (signer)
- `base_vault` - Base token vault (mut)
- `quote_vault` - Quote token vault (mut)
- `buyer_refund_account` - Buyer's refund account (mut)
- `seller_refund_account` - Seller's refund account (mut)
- `token_program` - SPL Token program

---

### emergency_withdraw

Emergency withdrawal by admin (expired escrows only).

**Accounts:**
- `escrow` - Escrow PDA (mut)
- `escrow_authority` - Escrow authority PDA
- `authority` - Authority (signer)
- `vault` - Token vault (mut)
- `destination` - Destination account (mut)
- `token_program` - SPL Token program

---

## Governance Program

Program ID: `GovernProgram11111111111111111111111111111`

### initialize_governance

Initializes governance with voting parameters.

**Parameters:**
- `voting_period: i64` - Voting period in seconds
- `quorum_percentage: u8` - Required quorum (0-100)
- `approval_threshold: u8` - Required approval (0-100)

**Accounts:**
- `governance` - Governance PDA (init, seeds: ["governance"])
- `governance_token_mint` - Governance token mint
- `authority` - Governance authority (signer, mut)
- `treasury` - Treasury PDA
- `system_program` - System program

**Example:**
```typescript
await governanceProgram.methods
  .initializeGovernance(
    new anchor.BN(259200),  // 3 days
    20,                     // 20% quorum
    66                      // 66% approval
  )
  .accounts({
    governance: governancePda,
    governanceTokenMint: govTokenMint,
    authority: wallet.publicKey,
    treasury: treasuryPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

---

### create_proposal

Creates a new governance proposal.

**Parameters:**
- `title: String` - Proposal title (max 100 chars)
- `description: String` - Proposal description (max 500 chars)
- `proposal_type: ProposalType` - Type of proposal

**Proposal Types:**
- `ParameterChange` - Change exchange parameters
- `TreasuryAllocation` - Allocate treasury funds
- `ListingApproval` - Approve token listing
- `FeeTierAdjustment` - Adjust fee tiers
- `EmergencyAction` - Emergency actions

**Accounts:**
- `governance` - Governance PDA (mut)
- `proposal` - Proposal PDA (init)
- `voter_weight` - Voter weight PDA
- `proposer` - Proposer (signer, mut)
- `system_program` - System program

---

### cast_vote

Casts a vote on a proposal.

**Parameters:**
- `support: bool` - True for yes, false for no

**Accounts:**
- `governance` - Governance PDA
- `proposal` - Proposal PDA (mut)
- `vote_record` - Vote record PDA (init)
- `voter_weight` - Voter weight PDA
- `voter` - Voter (signer, mut)
- `system_program` - System program

---

### execute_proposal

Executes an approved proposal after voting period.

**Accounts:**
- `governance` - Governance PDA (mut)
- `proposal` - Proposal PDA (mut)
- `executor` - Executor (signer)

---

### cancel_proposal

Cancels a proposal (proposer only, early stage).

**Accounts:**
- `proposal` - Proposal PDA (mut)
- `canceller` - Canceller (signer)

---

### delegate_votes

Delegates voting power to another account.

**Parameters:**
- `delegate: Pubkey` - Delegate's pubkey

**Accounts:**
- `voter_weight` - Voter weight PDA (mut)
- `owner` - Owner (signer)

---

### initialize_treasury

Initializes governance treasury.

**Accounts:**
- `governance` - Governance PDA
- `treasury` - Treasury PDA (init)
- `authority` - Authority (signer, mut)
- `system_program` - System program

---

### allocate_treasury_funds

Allocates funds from treasury (governance approved).

**Parameters:**
- `amount: u64` - Amount to allocate
- `recipient: Pubkey` - Recipient pubkey

**Accounts:**
- `governance` - Governance PDA
- `treasury` - Treasury PDA (mut)
- `treasury_token_account` - Treasury token account (mut)
- `recipient_token_account` - Recipient token account (mut)
- `authority` - Authority (signer)
- `token_program` - SPL Token program

---

## Fee Management Program

Program ID: `FeeManagement1111111111111111111111111111`

### initialize_fee_config

Initializes fee configuration.

**Parameters:**
- `trading_fee_bps: u16` - Trading fee in basis points
- `withdrawal_fee_bps: u16` - Withdrawal fee in basis points
- `listing_fee: u64` - Token listing fee amount

**Accounts:**
- `fee_config` - Fee config PDA (init, seeds: ["fee_config"])
- `authority` - Authority (signer, mut)
- `fee_collector` - Fee collector account
- `system_program` - System program

---

### update_fee_config

Updates fee configuration parameters.

**Parameters:**
- `new_trading_fee_bps: Option<u16>` - New trading fee (None to keep)
- `new_withdrawal_fee_bps: Option<u16>` - New withdrawal fee (None to keep)
- `new_listing_fee: Option<u64>` - New listing fee (None to keep)

**Accounts:**
- `fee_config` - Fee config PDA (mut)
- `authority` - Authority (signer)

---

### collect_trading_fee

Collects fee from a trade.

**Parameters:**
- `trade_amount: u64` - Trade amount to calculate fee on

**Accounts:**
- `fee_config` - Fee config PDA (mut)
- `trader_token_account` - Trader's token account (mut)
- `fee_collector_account` - Fee collector account (mut)
- `trader` - Trader (signer)
- `token_program` - SPL Token program

---

### distribute_fees

Distributes collected fees to stakeholders.

**Parameters:**
- `amount: u64` - Amount to distribute

**Accounts:**
- `fee_config` - Fee config PDA (mut)
- `fee_collector_account` - Fee collector account (mut)
- `treasury_account` - Treasury account (mut)
- `staking_pool_account` - Staking pool account (mut)
- `lp_rewards_account` - LP rewards account (mut)
- `authority` - Authority (signer)
- `token_program` - SPL Token program

---

### initialize_fee_tier

Creates a fee tier for volume-based discounts.

**Parameters:**
- `tier_level: u8` - Tier level (0-10)
- `volume_threshold: u64` - Minimum volume to qualify
- `discount_bps: u16` - Fee discount in basis points

**Accounts:**
- `fee_config` - Fee config PDA
- `fee_tier` - Fee tier PDA (init)
- `authority` - Authority (signer, mut)
- `system_program` - System program

---

### claim_referral_rewards

Claims accumulated referral rewards.

**Accounts:**
- `fee_config` - Fee config PDA
- `referral_account` - Referral account PDA (mut)
- `fee_collector_account` - Fee collector account (mut)
- `referrer_token_account` - Referrer's token account (mut)
- `referrer` - Referrer (signer)
- `token_program` - SPL Token program

---

### initialize_staking_pool

Initializes staking rewards pool.

**Accounts:**
- `fee_config` - Fee config PDA
- `staking_pool` - Staking pool PDA (init)
- `authority` - Authority (signer, mut)
- `system_program` - System program

---

### distribute_staking_rewards

Distributes rewards to staking pool.

**Parameters:**
- `amount: u64` - Amount of rewards to distribute

**Accounts:**
- `fee_config` - Fee config PDA
- `staking_pool` - Staking pool PDA (mut)
- `authority` - Authority (signer)

---

## Common Data Types

### OrderSide
```rust
enum OrderSide {
    Bid,  // Buy order
    Ask,  // Sell order
}
```

### OrderType
```rust
enum OrderType {
    Limit,
    Market,
    PostOnly,
    ImmediateOrCancel,
}
```

### ProposalType
```rust
enum ProposalType {
    ParameterChange,
    TreasuryAllocation,
    ListingApproval,
    FeeTierAdjustment,
    EmergencyAction,
}
```

### ProposalStatus
```rust
enum ProposalStatus {
    Active,
    Succeeded,
    Defeated,
    Executed,
    Cancelled,
    Expired,
}
```

### EscrowStatus
```rust
enum EscrowStatus {
    Pending,
    Funded,
    Executed,
    Cancelled,
    Expired,
}
```

---

## Error Codes

### Exchange Core Errors
- `ExchangePaused` - Exchange is paused
- `OrderBookInactive` - Order book not active
- `InvalidPrice` - Invalid order price
- `InvalidQuantity` - Invalid order quantity
- `QuantityBelowMinimum` - Below minimum order size
- `PriceNotAlignedToTickSize` - Price not aligned
- `OrderNotFound` - Order doesn't exist
- `UnauthorizedOrderModification` - Not order owner
- `InsufficientFunds` - Insufficient balance
- `OrderAlreadyFilled` - Order fully filled
- `SelfTradeNotAllowed` - Cannot trade with self

### Escrow Errors
- `NotPending` - Escrow not pending
- `NotFullyFunded` - Escrow not funded
- `EscrowExpired` - Escrow expired
- `AlreadyExecuted` - Already executed
- `Unauthorized` - Unauthorized access

### Governance Errors
- `InvalidVotingPeriod` - Invalid voting period
- `InvalidQuorumPercentage` - Invalid quorum
- `ProposalNotActive` - Proposal not active
- `VotingPeriodEnded` - Voting ended
- `QuorumNotMet` - Quorum not reached
- `AlreadyVoted` - Already voted

### Fee Management Errors
- `InvalidFeePercentage` - Invalid fee %
- `FeeTooHigh` - Fee exceeds maximum
- `InsufficientFeeBalance` - Insufficient fees
- `NoRewardsToClaim` - No rewards available

---

For more examples and integration patterns, see the test files in `tests/` directory.
