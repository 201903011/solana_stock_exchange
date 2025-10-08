use anchor_lang::prelude::*;

/// Exchange configuration and authority
#[account]
pub struct Exchange {
    pub authority: Pubkey,
    pub fee_collector: Pubkey,
    pub maker_fee_bps: u16, // basis points (1 bps = 0.01%)
    pub taker_fee_bps: u16,
    pub total_markets: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Exchange {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_collector
        2 + // maker_fee_bps
        2 + // taker_fee_bps
        8 + // total_markets
        1 + // paused
        1; // bump
}

/// Order book for a trading pair (base token vs SOL)
#[account]
pub struct OrderBook {
    pub exchange: Pubkey,
    pub base_mint: Pubkey,
    pub base_vault: Pubkey,
    pub sol_vault: Pubkey, // Vault holding SOL (quote currency)
    pub tick_size: u64,
    pub min_order_size: u64,
    pub bids_head: Option<u64>, // linked list head for buy orders
    pub asks_head: Option<u64>, // linked list head for sell orders
    pub next_order_id: u64,
    pub total_orders: u64,
    pub total_volume: u64,
    pub last_price: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl OrderBook {
    pub const LEN: usize = 8 + // discriminator
        32 + // exchange
        32 + // base_mint
        32 + // base_vault
        32 + // sol_vault
        8 + // tick_size
        8 + // min_order_size
        1 + 8 + // bids_head (Option<u64>)
        1 + 8 + // asks_head (Option<u64>)
        8 + // next_order_id
        8 + // total_orders
        8 + // total_volume
        8 + // last_price
        1 + // is_active
        1; // bump
}

/// Individual order in the order book
#[account]
pub struct Order {
    pub order_book: Pubkey,
    pub trader: Pubkey,
    pub order_id: u64,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: u64,
    pub quantity: u64,
    pub filled_quantity: u64,
    pub timestamp: i64,
    pub next: Option<u64>, // next order in linked list
    pub prev: Option<u64>, // previous order in linked list
    pub is_active: bool,
}

impl Order {
    pub const LEN: usize = 8 + // discriminator
        32 + // order_book
        32 + // trader
        8 + // order_id
        1 + // side
        1 + // order_type
        8 + // price
        8 + // quantity
        8 + // filled_quantity
        8 + // timestamp
        1 + 8 + // next (Option<u64>)
        1 + 8 + // prev (Option<u64>)
        1; // is_active
}

/// User trading account for tracking positions
#[account]
pub struct TradingAccount {
    pub owner: Pubkey,
    pub exchange: Pubkey,
    pub total_trades: u64,
    pub total_volume: u64,
    pub fee_tier: u8,
    pub referrer: Option<Pubkey>,
    pub bump: u8,
}

impl TradingAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // exchange
        8 + // total_trades
        8 + // total_volume
        1 + // fee_tier
        1 + 32 + // referrer (Option<Pubkey>)
        1; // bump
}

/// Trade execution record
#[account]
pub struct Trade {
    pub order_book: Pubkey,
    pub trade_id: u64,
    pub maker_order_id: u64,
    pub taker_order_id: u64,
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub price: u64,
    pub quantity: u64,
    pub maker_fee: u64,
    pub taker_fee: u64,
    pub timestamp: i64,
    pub settled: bool,
}

impl Trade {
    pub const LEN: usize = 8 + // discriminator
        32 + // order_book
        8 + // trade_id
        8 + // maker_order_id
        8 + // taker_order_id
        32 + // maker
        32 + // taker
        8 + // price
        8 + // quantity
        8 + // maker_fee
        8 + // taker_fee
        8 + // timestamp
        1; // settled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum OrderSide {
    Bid, // Buy
    Ask, // Sell
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum OrderType {
    Limit,
    Market,
    PostOnly,
    ImmediateOrCancel,
}
