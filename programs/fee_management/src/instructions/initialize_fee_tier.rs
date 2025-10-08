use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(tier_level: u8)]
pub struct InitializeFeeTier<'info> {
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
        has_one = authority @ FeeError::Unauthorized,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(
        init,
        payer = authority,
        space = FeeTier::LEN,
        seeds = [FEE_TIER_SEED, tier_level.to_le_bytes().as_ref()],
        bump
    )]
    pub fee_tier: Account<'info, FeeTier>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeFeeTier>,
    tier_level: u8,
    volume_threshold: u64,
    discount_bps: u16,
) -> Result<()> {
    require!(tier_level <= 10, FeeError::InvalidTierLevel);
    require!(discount_bps <= 9900, FeeError::InvalidFeePercentage); // Max 99% discount

    let fee_tier = &mut ctx.accounts.fee_tier;
    fee_tier.tier_level = tier_level;
    fee_tier.volume_threshold = volume_threshold;
    fee_tier.discount_bps = discount_bps;
    fee_tier.name = format!("Tier {}", tier_level);
    fee_tier.is_active = true;

    msg!(
        "Fee tier {} initialized: Volume threshold {}, Discount {}bps",
        tier_level,
        volume_threshold,
        discount_bps
    );

    Ok(())
}
