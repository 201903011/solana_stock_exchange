use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct CollectTradingFee<'info> {
    #[account(
        mut,
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(mut)]
    pub trader_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = fee_collector_account.key() == fee_config.fee_collector
    )]
    pub fee_collector_account: Account<'info, TokenAccount>,
    
    pub trader: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CollectTradingFee>, trade_amount: u64) -> Result<()> {
    let fee_config = &mut ctx.accounts.fee_config;
    
    // Calculate fee
    let fee_amount = trade_amount
        .checked_mul(fee_config.trading_fee_bps as u64)
        .ok_or(FeeError::Overflow)?
        .checked_div(10000)
        .ok_or(FeeError::Overflow)?;

    if fee_amount > 0 {
        // Transfer fee to collector
        let cpi_accounts = Transfer {
            from: ctx.accounts.trader_token_account.to_account_info(),
            to: ctx.accounts.fee_collector_account.to_account_info(),
            authority: ctx.accounts.trader.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            fee_amount
        )?;

        // Update total fees collected
        fee_config.total_fees_collected = fee_config.total_fees_collected
            .checked_add(fee_amount)
            .ok_or(FeeError::Overflow)?;

        msg!("Collected trading fee: {} ({}bps on {})", fee_amount, fee_config.trading_fee_bps, trade_amount);
    }

    Ok(())
}
