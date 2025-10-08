use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeTradingAccount<'info> {
    #[account(
        seeds = [EXCHANGE_SEED],
        bump = exchange.bump,
    )]
    pub exchange: Account<'info, Exchange>,

    #[account(
        init,
        payer = owner,
        space = TradingAccount::LEN,
        seeds = [TRADING_ACCOUNT_SEED, owner.key().as_ref()],
        bump
    )]
    pub trading_account: Account<'info, TradingAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTradingAccount>) -> Result<()> {
    let trading_account = &mut ctx.accounts.trading_account;

    trading_account.owner = ctx.accounts.owner.key();
    trading_account.exchange = ctx.accounts.exchange.key();
    trading_account.total_trades = 0;
    trading_account.total_volume = 0;
    trading_account.fee_tier = FEE_TIER_RETAIL;
    trading_account.referrer = None;
    trading_account.bump = ctx.bumps.trading_account;

    msg!(
        "Trading account initialized for {}",
        ctx.accounts.owner.key()
    );

    Ok(())
}
