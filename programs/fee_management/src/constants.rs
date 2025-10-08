use anchor_lang::prelude::*;

// PDA Seeds
pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";
pub const FEE_TIER_SEED: &[u8] = b"fee_tier";
pub const FEE_DISTRIBUTION_SEED: &[u8] = b"fee_distribution";
pub const REFERRAL_ACCOUNT_SEED: &[u8] = b"referral";
pub const STAKING_POOL_SEED: &[u8] = b"staking_pool";
pub const FEE_COLLECTOR_SEED: &[u8] = b"fee_collector";

// Fee constraints
pub const MAX_FEE_BPS: u16 = 1000; // 10% max
pub const DEFAULT_TRADING_FEE_BPS: u16 = 30; // 0.3%
pub const DEFAULT_WITHDRAWAL_FEE_BPS: u16 = 10; // 0.1%
pub const DEFAULT_LISTING_FEE: u64 = 1_000_000_000; // 1 SOL equivalent

// Distribution shares (must total 10000 bps = 100%)
pub const DEFAULT_TREASURY_SHARE_BPS: u16 = 4000; // 40%
pub const DEFAULT_STAKER_SHARE_BPS: u16 = 3000; // 30%
pub const DEFAULT_LP_SHARE_BPS: u16 = 2000; // 20%
pub const DEFAULT_REFERRER_SHARE_BPS: u16 = 500; // 5%
pub const DEFAULT_BURN_SHARE_BPS: u16 = 500; // 5%

pub const TOTAL_SHARES_BPS: u16 = 10000; // 100%

// Fee tiers
pub const TIER_RETAIL: u8 = 0;
pub const TIER_ACTIVE: u8 = 1;
pub const TIER_PRO: u8 = 2;
pub const TIER_VIP: u8 = 3;
pub const TIER_INSTITUTIONAL: u8 = 4;

// Referral rewards
pub const REFERRAL_REWARD_BPS: u16 = 200; // 2% of fees
pub const MIN_REFERRAL_VOLUME: u64 = 1_000_000; // Minimum volume for rewards
