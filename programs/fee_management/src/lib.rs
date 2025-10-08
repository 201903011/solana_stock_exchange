pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("FeK4og5tcnNBKAz41LgFFTXMVWjJcNenk2H7g8cDmAhU");

#[program]
pub mod fee_management {
    use super::*;

    /// Initialize fee configuration
    pub fn initialize_fee_config(
        ctx: Context<InitializeFeeConfig>,
        trading_fee_bps: u16,
        withdrawal_fee_bps: u16,
        listing_fee: u64,
    ) -> Result<()> {
        instructions::initialize_fee_config::handler(
            ctx,
            trading_fee_bps,
            withdrawal_fee_bps,
            listing_fee,
        )
    }

    /// Update fee parameters
    pub fn update_fee_config(
        ctx: Context<UpdateFeeConfig>,
        new_trading_fee_bps: Option<u16>,
        new_withdrawal_fee_bps: Option<u16>,
        new_listing_fee: Option<u64>,
    ) -> Result<()> {
        instructions::update_fee_config::handler(
            ctx,
            new_trading_fee_bps,
            new_withdrawal_fee_bps,
            new_listing_fee,
        )
    }

    /// Collect trading fees
    pub fn collect_trading_fee(
        ctx: Context<CollectTradingFee>,
        trade_amount: u64,
    ) -> Result<()> {
        instructions::collect_trading_fee::handler(ctx, trade_amount)
    }

    /// Distribute fees to stakeholders
    pub fn distribute_fees(
        ctx: Context<DistributeFees>,
        amount: u64,
    ) -> Result<()> {
        instructions::distribute_fees::handler(ctx, amount)
    }

    /// Initialize fee tier
    pub fn initialize_fee_tier(
        ctx: Context<InitializeFeeTier>,
        tier_level: u8,
        volume_threshold: u64,
        discount_bps: u16,
    ) -> Result<()> {
        instructions::initialize_fee_tier::handler(ctx, tier_level, volume_threshold, discount_bps)
    }

    /// Claim referral rewards
    pub fn claim_referral_rewards(ctx: Context<ClaimReferralRewards>) -> Result<()> {
        instructions::claim_referral_rewards::handler(ctx)
    }

    /// Initialize staking rewards pool
    pub fn initialize_staking_pool(ctx: Context<InitializeStakingPool>) -> Result<()> {
        instructions::initialize_staking_pool::handler(ctx)
    }

    /// Distribute staking rewards
    pub fn distribute_staking_rewards(
        ctx: Context<DistributeStakingRewards>,
        amount: u64,
    ) -> Result<()> {
        instructions::distribute_staking_rewards::handler(ctx, amount)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum FeeType {
    Trading,
    Withdrawal,
    Listing,
    Subscription,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DistributionTarget {
    Treasury,
    Stakers,
    LiquidityProviders,
    Referrers,
    BurnAddress,
}
