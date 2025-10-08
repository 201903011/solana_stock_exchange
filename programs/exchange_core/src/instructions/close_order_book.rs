use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseOrderBook<'info> {
    #[account(
        seeds = [EXCHANGE_SEED],
        bump = exchange.bump,
        has_one = authority @ ExchangeError::Unauthorized,
    )]
    pub exchange: Account<'info, Exchange>,

    #[account(
        mut,
        constraint = order_book.exchange == exchange.key() @ ExchangeError::Unauthorized,
    )]
    pub order_book: Account<'info, OrderBook>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<CloseOrderBook>) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;

    // Ensure no active orders before closing
    require!(
        order_book.total_orders == 0,
        ExchangeError::OrderBookInactive
    );

    order_book.is_active = false;

    msg!("Order book {} closed", order_book.key());

    Ok(())
}
