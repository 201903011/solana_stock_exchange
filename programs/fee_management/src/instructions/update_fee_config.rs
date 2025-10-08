use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateFeeConfig<'info> {
    #[account(
        mut,
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
        has_one = authority @ FeeError::Unauthorized,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateFeeConfig>,
    new_trading_fee_bps: Option<u16>,
    new_withdrawal_fee_bps: Option<u16>,
    new_listing_fee: Option<u64>,
) -> Result<()> {
    let fee_config = &mut ctx.accounts.fee_config;

    if let Some(trading_fee) = new_trading_fee_bps {
        require!(trading_fee <= MAX_FEE_BPS, FeeError::FeeTooHigh);
        fee_config.trading_fee_bps = trading_fee;
        msg!("Trading fee updated to {} bps", trading_fee);
    }

    if let Some(withdrawal_fee) = new_withdrawal_fee_bps {
        require!(withdrawal_fee <= MAX_FEE_BPS, FeeError::FeeTooHigh);
        fee_config.withdrawal_fee_bps = withdrawal_fee;
        msg!("Withdrawal fee updated to {} bps", withdrawal_fee);
    }

    if let Some(listing_fee) = new_listing_fee {
        fee_config.listing_fee = listing_fee;
        msg!("Listing fee updated to {}", listing_fee);
    }

    Ok(())
}
