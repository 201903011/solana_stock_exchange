use anchor_lang::prelude::*;

#[account]
pub struct FeeConfig {
    pub authority: Pubkey,
    pub fee_collector: Pubkey,
    pub trading_fee_bps: u16,      // Basis points
    pub withdrawal_fee_bps: u16,
    pub listing_fee: u64,
    pub total_fees_collected: u64,
    pub total_fees_distributed: u64,
    pub bump: u8,
}

impl FeeConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_collector
        2 + // trading_fee_bps
        2 + // withdrawal_fee_bps
        8 + // listing_fee
        8 + // total_fees_collected
        8 + // total_fees_distributed
        1; // bump
}

#[account]
pub struct FeeTier {
    pub tier_level: u8,
    pub volume_threshold: u64,      // Minimum volume to qualify
    pub discount_bps: u16,          // Fee discount in basis points
    pub name: String,               // Max 32 chars
    pub is_active: bool,
}

impl FeeTier {
    pub const MAX_NAME_LEN: usize = 32;
    
    pub const LEN: usize = 8 + // discriminator
        1 + // tier_level
        8 + // volume_threshold
        2 + // discount_bps
        4 + Self::MAX_NAME_LEN + // name
        1; // is_active
}

#[account]
pub struct FeeDistribution {
    pub fee_config: Pubkey,
    pub distribution_id: u64,
    pub treasury_share_bps: u16,
    pub staker_share_bps: u16,
    pub lp_share_bps: u16,
    pub referrer_share_bps: u16,
    pub burn_share_bps: u16,
    pub timestamp: i64,
}

impl FeeDistribution {
    pub const LEN: usize = 8 + // discriminator
        32 + // fee_config
        8 + // distribution_id
        2 + // treasury_share_bps
        2 + // staker_share_bps
        2 + // lp_share_bps
        2 + // referrer_share_bps
        2 + // burn_share_bps
        8; // timestamp

    pub fn total_bps(&self) -> u16 {
        self.treasury_share_bps
            + self.staker_share_bps
            + self.lp_share_bps
            + self.referrer_share_bps
            + self.burn_share_bps
    }
}

#[account]
pub struct ReferralAccount {
    pub referrer: Pubkey,
    pub total_referrals: u64,
    pub total_volume: u64,
    pub earned_rewards: u64,
    pub claimed_rewards: u64,
    pub bump: u8,
}

impl ReferralAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // referrer
        8 + // total_referrals
        8 + // total_volume
        8 + // earned_rewards
        8 + // claimed_rewards
        1; // bump

    pub fn unclaimed_rewards(&self) -> u64 {
        self.earned_rewards.saturating_sub(self.claimed_rewards)
    }
}

#[account]
pub struct StakingPool {
    pub fee_config: Pubkey,
    pub total_staked: u64,
    pub total_rewards: u64,
    pub distributed_rewards: u64,
    pub reward_per_token: u64,
    pub last_update: i64,
    pub bump: u8,
}

impl StakingPool {
    pub const LEN: usize = 8 + // discriminator
        32 + // fee_config
        8 + // total_staked
        8 + // total_rewards
        8 + // distributed_rewards
        8 + // reward_per_token
        8 + // last_update
        1; // bump
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
