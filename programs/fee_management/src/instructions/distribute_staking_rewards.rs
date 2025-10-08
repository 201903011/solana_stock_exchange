use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct DistributeStakingRewards<'info> {
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(
        mut,
        seeds = [STAKING_POOL_SEED],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// CHECK: Authority that can distribute rewards
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<DistributeStakingRewards>, amount: u64) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    
    require!(amount > 0, FeeError::InsufficientFeeBalance);
    require!(staking_pool.total_staked > 0, FeeError::InsufficientFeeBalance);

    // Calculate reward per token
    let reward_increase = amount
        .checked_mul(1_000_000_000) // Scale factor for precision
        .ok_or(FeeError::Overflow)?
        .checked_div(staking_pool.total_staked)
        .ok_or(FeeError::Overflow)?;

    staking_pool.reward_per_token = staking_pool.reward_per_token
        .checked_add(reward_increase)
        .ok_or(FeeError::Overflow)?;

    staking_pool.total_rewards = staking_pool.total_rewards
        .checked_add(amount)
        .ok_or(FeeError::Overflow)?;

    staking_pool.last_update = Clock::get()?.unix_timestamp;

    msg!("Distributed {} staking rewards, new reward per token: {}", amount, staking_pool.reward_per_token);

    Ok(())
}
