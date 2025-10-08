use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ModifyOrder<'info> {
    #[account(
        mut,
        constraint = order_book.is_active @ ExchangeError::OrderBookInactive,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        constraint = order.trader == trader.key() @ ExchangeError::UnauthorizedOrderModification,
        constraint = order.is_active @ ExchangeError::CannotCancelInactiveOrder,
        constraint = order.order_book == order_book.key() @ ExchangeError::Unauthorized,
    )]
    pub order: Account<'info, Order>,

    #[account(mut)]
    pub trader: Signer<'info>,
}

pub fn handler(
    ctx: Context<ModifyOrder>,
    order_id: u64,
    new_price: Option<u64>,
    new_quantity: Option<u64>,
) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let order_book = &ctx.accounts.order_book;

    require!(order.is_active, ExchangeError::OrderNotFound);
    require!(
        order.filled_quantity == 0,
        ExchangeError::OrderAlreadyFilled
    );

    // Update price if provided
    if let Some(price) = new_price {
        require!(price > 0, ExchangeError::InvalidPrice);
        require!(
            price % order_book.tick_size == 0,
            ExchangeError::PriceNotAlignedToTickSize
        );
        order.price = price;
        msg!("Order {} price updated to {}", order_id, price);
    }

    // Update quantity if provided
    if let Some(quantity) = new_quantity {
        require!(
            quantity >= order_book.min_order_size,
            ExchangeError::QuantityBelowMinimum
        );
        require!(quantity > 0, ExchangeError::InvalidQuantity);
        order.quantity = quantity;
        msg!("Order {} quantity updated to {}", order_id, quantity);
    }

    // Update timestamp to reflect modification
    order.timestamp = Clock::get()?.unix_timestamp;

    Ok(())
}
