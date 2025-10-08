use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct PlaceMarketOrder<'info> {
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
        mut,
        seeds = [TRADING_ACCOUNT_SEED, trader.key().as_ref()],
        bump = trading_account.bump,
    )]
    pub trading_account: Account<'info, TradingAccount>,

    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        mut,
        constraint = trader_base_account.owner == trader.key()
    )]
    pub trader_base_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = trader_quote_account.owner == trader.key()
    )]
    pub trader_quote_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub base_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PlaceMarketOrder>,
    side: OrderSide,
    quantity: u64,
    max_quote_amount: u64,
) -> Result<()> {
    require!(!ctx.accounts.exchange.paused, ExchangeError::ExchangePaused);
    require!(quantity > 0, ExchangeError::InvalidQuantity);

    let order_book = &ctx.accounts.order_book;

    // Market orders execute immediately against the best available price
    // In a real implementation, this would match against existing orders
    // For simplicity, we'll use the last_price or fail if no liquidity

    require!(
        order_book.last_price > 0,
        ExchangeError::MarketOrderCannotBeFilled
    );

    let price = order_book.last_price;
    let quote_amount = price.checked_mul(quantity).ok_or(ExchangeError::Overflow)?;

    require!(
        quote_amount <= max_quote_amount,
        ExchangeError::MaxQuoteAmountExceeded
    );

    // Execute trade based on side
    match side {
        OrderSide::Bid => {
            // Buyer pays quote, receives base
            let cpi_accounts_quote = Transfer {
                from: ctx.accounts.trader_quote_account.to_account_info(),
                to: ctx.accounts.quote_vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            };
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts_quote,
                ),
                quote_amount,
            )?;

            let cpi_accounts_base = Transfer {
                from: ctx.accounts.base_vault.to_account_info(),
                to: ctx.accounts.trader_base_account.to_account_info(),
                authority: ctx.accounts.order_book.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts_base,
                    &[&[
                        ORDER_BOOK_SEED,
                        order_book.base_mint.as_ref(),
                        order_book.quote_mint.as_ref(),
                        &[order_book.bump],
                    ]],
                ),
                quantity,
            )?;
        }
        OrderSide::Ask => {
            // Seller pays base, receives quote
            let cpi_accounts_base = Transfer {
                from: ctx.accounts.trader_base_account.to_account_info(),
                to: ctx.accounts.base_vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            };
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts_base,
                ),
                quantity,
            )?;

            let cpi_accounts_quote = Transfer {
                from: ctx.accounts.quote_vault.to_account_info(),
                to: ctx.accounts.trader_quote_account.to_account_info(),
                authority: ctx.accounts.order_book.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts_quote,
                    &[&[
                        ORDER_BOOK_SEED,
                        order_book.base_mint.as_ref(),
                        order_book.quote_mint.as_ref(),
                        &[order_book.bump],
                    ]],
                ),
                quote_amount,
            )?;
        }
    }

    let trading_account = &mut ctx.accounts.trading_account;
    trading_account.total_trades = trading_account
        .total_trades
        .checked_add(1)
        .ok_or(ExchangeError::Overflow)?;
    trading_account.total_volume = trading_account
        .total_volume
        .checked_add(quantity)
        .ok_or(ExchangeError::Overflow)?;

    msg!(
        "Market order executed: Side {:?}, Quantity {}, Price {}",
        side,
        quantity,
        price
    );

    Ok(())
}
