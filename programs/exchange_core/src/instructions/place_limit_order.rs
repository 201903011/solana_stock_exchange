use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(side: OrderSide, price: u64, quantity: u64)]
pub struct PlaceLimitOrder<'info> {
    #[account(
        seeds = [EXCHANGE_SEED],
        bump = exchange.bump,
    )]
    pub exchange: Account<'info, Exchange>,

    #[account(
        mut,
        constraint = order_book.exchange == exchange.key() @ ExchangeError::Unauthorized,
        constraint = order_book.is_active @ ExchangeError::OrderBookInactive,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        init,
        payer = trader,
        space = Order::LEN,
        seeds = [
            ORDER_SEED,
            order_book.key().as_ref(),
            order_book.next_order_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(
        mut,
        seeds = [TRADING_ACCOUNT_SEED, trader.key().as_ref()],
        bump = trading_account.bump,
        constraint = trading_account.owner == trader.key() @ ExchangeError::Unauthorized
    )]
    pub trading_account: Account<'info, TradingAccount>,

    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        mut,
        constraint = trader_token_account.owner == trader.key()
    )]
    pub trader_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PlaceLimitOrder>,
    side: OrderSide,
    price: u64,
    quantity: u64,
) -> Result<()> {
    require!(!ctx.accounts.exchange.paused, ExchangeError::ExchangePaused);
    require!(
        quantity >= ctx.accounts.order_book.min_order_size,
        ExchangeError::QuantityBelowMinimum
    );
    require!(price > 0, ExchangeError::InvalidPrice);
    require!(
        price % ctx.accounts.order_book.tick_size == 0,
        ExchangeError::PriceNotAlignedToTickSize
    );

    let order_book = &mut ctx.accounts.order_book;
    let order = &mut ctx.accounts.order;
    let order_id = order_book.next_order_id;

    // Calculate required tokens to lock
    let amount_to_lock = match side {
        OrderSide::Ask => quantity, // Lock base tokens for sell order
        OrderSide::Bid => price.checked_mul(quantity).ok_or(ExchangeError::Overflow)?, // Lock quote tokens for buy order
    };

    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.trader_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.trader.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount_to_lock)?;

    // Initialize order
    order.order_book = order_book.key();
    order.trader = ctx.accounts.trader.key();
    order.order_id = order_id;
    order.side = side;
    order.order_type = OrderType::Limit;
    order.price = price;
    order.quantity = quantity;
    order.filled_quantity = 0;
    order.timestamp = Clock::get()?.unix_timestamp;
    order.next = None;
    order.prev = None;
    order.is_active = true;

    // Insert order into linked list (simplified - in production use proper price-time priority)
    match side {
        OrderSide::Bid => {
            order.next = order_book.bids_head;
            order_book.bids_head = Some(order_id);
        }
        OrderSide::Ask => {
            order.next = order_book.asks_head;
            order_book.asks_head = Some(order_id);
        }
    }

    order_book.next_order_id = order_book
        .next_order_id
        .checked_add(1)
        .ok_or(ExchangeError::Overflow)?;
    order_book.total_orders = order_book
        .total_orders
        .checked_add(1)
        .ok_or(ExchangeError::Overflow)?;

    msg!(
        "Limit order placed: ID {}, Side {:?}, Price {}, Quantity {}",
        order_id,
        side,
        price,
        quantity
    );

    Ok(())
}
