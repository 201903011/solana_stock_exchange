use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(trade_id: u64)]
pub struct SettleTrade<'info> {
    #[account(
        mut,
        seeds = [TRADE_SEED, order_book.key().as_ref(), trade_id.to_le_bytes().as_ref()],
        bump,
        constraint = !trade.settled @ ExchangeError::TradeAlreadySettled,
    )]
    pub trade: Account<'info, Trade>,

    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,

    /// CHECK: Trade settler
    pub settler: Signer<'info>,
}

pub fn handler(ctx: Context<SettleTrade>, trade_id: u64) -> Result<()> {
    let trade = &mut ctx.accounts.trade;

    // Mark trade as settled
    trade.settled = true;

    // Update order book statistics
    let order_book = &mut ctx.accounts.order_book;
    order_book.total_volume = order_book
        .total_volume
        .checked_add(trade.quantity)
        .ok_or(ExchangeError::Overflow)?;
    order_book.last_price = trade.price;

    msg!(
        "Trade {} settled: Price {}, Quantity {}, Maker fee: {}, Taker fee: {}",
        trade_id,
        trade.price,
        trade.quantity,
        trade.maker_fee,
        trade.taker_fee
    );

    Ok(())
}
