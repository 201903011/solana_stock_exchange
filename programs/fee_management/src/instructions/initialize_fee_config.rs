use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeFeeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = FeeConfig::LEN,
        seeds = [FEE_CONFIG_SEED],
        bump
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Fee collector account
    pub fee_collector: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeFeeConfig>,
    trading_fee_bps: u16,
    withdrawal_fee_bps: u16,
    listing_fee: u64,
) -> Result<()> {
    require!(
        trading_fee_bps <= MAX_FEE_BPS,
        FeeError::FeeTooHigh
    );
    require!(
        withdrawal_fee_bps <= MAX_FEE_BPS,
        FeeError::FeeTooHigh
    );

    let fee_config = &mut ctx.accounts.fee_config;
    fee_config.authority = ctx.accounts.authority.key();
    fee_config.fee_collector = ctx.accounts.fee_collector.key();
    fee_config.trading_fee_bps = trading_fee_bps;
    fee_config.withdrawal_fee_bps = withdrawal_fee_bps;
    fee_config.listing_fee = listing_fee;
    fee_config.total_fees_collected = 0;
    fee_config.total_fees_distributed = 0;
    fee_config.bump = ctx.bumps.fee_config;

    msg!(
        "Fee config initialized: Trading {}bps, Withdrawal {}bps, Listing {}",
        trading_fee_bps,
        withdrawal_fee_bps,
        listing_fee
    );

    Ok(())
}
