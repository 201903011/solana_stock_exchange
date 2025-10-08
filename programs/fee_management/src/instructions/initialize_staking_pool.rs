use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(
        init,
        payer = authority,
        space = StakingPool::LEN,
        seeds = [STAKING_POOL_SEED],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeStakingPool>) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let current_time = Clock::get()?.unix_timestamp;
    
    staking_pool.fee_config = ctx.accounts.fee_config.key();
    staking_pool.total_staked = 0;
    staking_pool.total_rewards = 0;
    staking_pool.distributed_rewards = 0;
    staking_pool.reward_per_token = 0;
    staking_pool.last_update = current_time;
    staking_pool.bump = ctx.bumps.staking_pool;

    msg!("Staking pool initialized");

    Ok(())
}
