use anchor_lang::prelude::*;

// PDA Seeds
pub const EXCHANGE_SEED: &[u8] = b"exchange";
pub const ORDER_BOOK_SEED: &[u8] = b"order_book";
pub const ORDER_SEED: &[u8] = b"order";
pub const TRADING_ACCOUNT_SEED: &[u8] = b"trading_account";
pub const TRADE_SEED: &[u8] = b"trade";
pub const VAULT_SEED: &[u8] = b"vault";

// Constraints
pub const MAX_FEE_BPS: u16 = 1000; // 10% maximum fee
pub const MIN_TICK_SIZE: u64 = 1;
pub const MIN_ORDER_SIZE: u64 = 1;
pub const MAX_CRANK_ITERATIONS: u8 = 10;

// Fee tiers based on trading volume
pub const FEE_TIER_RETAIL: u8 = 0;
pub const FEE_TIER_VOLUME_1: u8 = 1;
pub const FEE_TIER_VOLUME_2: u8 = 2;
pub const FEE_TIER_VIP: u8 = 3;

// Decimals
pub const PRICE_DECIMALS: u32 = 6;
pub const BPS_DENOMINATOR: u64 = 10000;
