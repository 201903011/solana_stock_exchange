use anchor_lang::prelude::*;
use anchor_lang::system_program;
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
    pub trader: Signer<'info>,
    
    /// CHECK: Fee collector receives SOL
    #[account(
        mut,
        constraint = fee_collector.key() == fee_config.fee_collector
    )]
    pub fee_collector: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CollectTradingFee>, trade_amount: u64) -> Result<()> {
    let fee_config = &mut ctx.accounts.fee_config;
    
    // Calculate fee in SOL
    let fee_amount = trade_amount
        .checked_mul(fee_config.trading_fee_bps as u64)
        .ok_or(FeeError::Overflow)?
        .checked_div(10000)
        .ok_or(FeeError::Overflow)?;

    if fee_amount > 0 {
        // Transfer SOL fee to collector
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.trader.to_account_info(),
                    to: ctx.accounts.fee_collector.to_account_info(),
                },
            ),
            fee_amount,
        )?;

        // Update total fees collected
        fee_config.total_fees_collected = fee_config.total_fees_collected
            .checked_add(fee_amount)
            .ok_or(FeeError::Overflow)?;

        msg!("Collected trading fee: {} SOL ({}bps on {})", fee_amount, fee_config.trading_fee_bps, trade_amount);
    }

    Ok(())
}
