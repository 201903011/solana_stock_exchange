use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
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
    
    #[account(mut)]
    pub fee_collector_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub staking_pool_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub lp_rewards_account: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
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

    let fee_config = &ctx.accounts.fee_config;
    let seeds = &[FEE_CONFIG_SEED, &[fee_config.bump]];

    // Distribute to treasury
    if treasury_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.fee_collector_account.to_account_info(),
            to: ctx.accounts.treasury_account.to_account_info(),
            authority: ctx.accounts.fee_config.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[seeds]
            ),
            treasury_amount
        )?;
    }

    // Distribute to stakers
    if staker_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.fee_collector_account.to_account_info(),
            to: ctx.accounts.staking_pool_account.to_account_info(),
            authority: ctx.accounts.fee_config.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[seeds]
            ),
            staker_amount
        )?;
    }

    // Distribute to LPs
    if lp_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.fee_collector_account.to_account_info(),
            to: ctx.accounts.lp_rewards_account.to_account_info(),
            authority: ctx.accounts.fee_config.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[seeds]
            ),
            lp_amount
        )?;
    }

    let fee_config_mut = &mut ctx.accounts.fee_config;
    fee_config_mut.total_fees_distributed = fee_config_mut.total_fees_distributed
        .checked_add(amount)
        .ok_or(FeeError::Overflow)?;

    msg!(
        "Fees distributed: Treasury {}, Stakers {}, LPs {}",
        treasury_amount,
        staker_amount,
        lp_amount
    );

    Ok(())
}
