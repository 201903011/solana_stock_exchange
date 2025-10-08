use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct DistributeFees<'info> {
    #[account(
        mut,
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
        has_one = authority @ FeeError::Unauthorized,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    /// CHECK: Fee collector holding SOL
    #[account(mut)]
    pub fee_collector: AccountInfo<'info>,
    
    /// CHECK: Treasury receives SOL
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    
    /// CHECK: Staking pool receives SOL
    #[account(mut)]
    pub staking_pool: AccountInfo<'info>,
    
    /// CHECK: LP rewards pool receives SOL
    #[account(mut)]
    pub lp_rewards: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DistributeFees>, amount: u64) -> Result<()> {
    require!(amount > 0, FeeError::InsufficientFeeBalance);

    // Calculate distribution amounts
    let treasury_amount = amount
        .checked_mul(DEFAULT_TREASURY_SHARE_BPS as u64)
        .ok_or(FeeError::Overflow)?
        .checked_div(TOTAL_SHARES_BPS as u64)
        .ok_or(FeeError::Overflow)?;

    let staker_amount = amount
        .checked_mul(DEFAULT_STAKER_SHARE_BPS as u64)
        .ok_or(FeeError::Overflow)?
        .checked_div(TOTAL_SHARES_BPS as u64)
        .ok_or(FeeError::Overflow)?;

    let lp_amount = amount
        .checked_mul(DEFAULT_LP_SHARE_BPS as u64)
        .ok_or(FeeError::Overflow)?
        .checked_div(TOTAL_SHARES_BPS as u64)
        .ok_or(FeeError::Overflow)?;

    // Distribute SOL to treasury
    if treasury_amount > 0 {
        **ctx.accounts.fee_collector.try_borrow_mut_lamports()? = ctx
            .accounts
            .fee_collector
            .lamports()
            .checked_sub(treasury_amount)
            .ok_or(FeeError::InsufficientFeeBalance)?;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? = ctx
            .accounts
            .treasury
            .lamports()
            .checked_add(treasury_amount)
            .ok_or(FeeError::Overflow)?;
    }

    // Distribute SOL to stakers
    if staker_amount > 0 {
        **ctx.accounts.fee_collector.try_borrow_mut_lamports()? = ctx
            .accounts
            .fee_collector
            .lamports()
            .checked_sub(staker_amount)
            .ok_or(FeeError::InsufficientFeeBalance)?;
        **ctx.accounts.staking_pool.try_borrow_mut_lamports()? = ctx
            .accounts
            .staking_pool
            .lamports()
            .checked_add(staker_amount)
            .ok_or(FeeError::Overflow)?;
    }

    // Distribute SOL to LPs
    if lp_amount > 0 {
        **ctx.accounts.fee_collector.try_borrow_mut_lamports()? = ctx
            .accounts
            .fee_collector
            .lamports()
            .checked_sub(lp_amount)
            .ok_or(FeeError::InsufficientFeeBalance)?;
        **ctx.accounts.lp_rewards.try_borrow_mut_lamports()? = ctx
            .accounts
            .lp_rewards
            .lamports()
            .checked_add(lp_amount)
            .ok_or(FeeError::Overflow)?;
    }

    let fee_config_mut = &mut ctx.accounts.fee_config;
    fee_config_mut.total_fees_distributed = fee_config_mut.total_fees_distributed
        .checked_add(amount)
        .ok_or(FeeError::Overflow)?;

    msg!(
        "Fees distributed in SOL: Treasury {}, Stakers {}, LPs {}",
        treasury_amount,
        staker_amount,
        lp_amount
    );

    Ok(())
}
