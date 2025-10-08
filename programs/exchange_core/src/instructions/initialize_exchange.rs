use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeExchange<'info> {
    #[account(
        init,
        payer = authority,
        space = Exchange::LEN,
        seeds = [EXCHANGE_SEED],
        bump
    )]
    pub exchange: Account<'info, Exchange>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Fee collector account
    pub fee_collector: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeExchange>,
    maker_fee_bps: u16,
    taker_fee_bps: u16,
) -> Result<()> {
    require!(
        maker_fee_bps <= MAX_FEE_BPS && taker_fee_bps <= MAX_FEE_BPS,
        ExchangeError::InvalidFeePercentage
    );

    let exchange = &mut ctx.accounts.exchange;
    exchange.authority = ctx.accounts.authority.key();
    exchange.fee_collector = ctx.accounts.fee_collector.key();
    exchange.maker_fee_bps = maker_fee_bps;
    exchange.taker_fee_bps = taker_fee_bps;
    exchange.total_markets = 0;
    exchange.paused = false;
    exchange.bump = ctx.bumps.exchange;

    msg!(
        "Exchange initialized with maker fee: {} bps, taker fee: {} bps",
        maker_fee_bps,
        taker_fee_bps
    );

    Ok(())
}
