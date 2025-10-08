use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(base_mint: Pubkey, quote_mint: Pubkey)]
pub struct InitializeOrderBook<'info> {
    #[account(
        mut,
        seeds = [EXCHANGE_SEED],
        bump = exchange.bump,
        has_one = authority
    )]
    pub exchange: Account<'info, Exchange>,

    #[account(
        init,
        payer = authority,
        space = OrderBook::LEN,
        seeds = [
            ORDER_BOOK_SEED,
            base_mint.key().as_ref(),
            quote_mint.key().as_ref()
        ],
        bump
    )]
    pub order_book: Account<'info, OrderBook>,

    pub base_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = base_mint,
        token::authority = order_book,
        seeds = [
            VAULT_SEED,
            order_book.key().as_ref(),
            b"base"
        ],
        bump
    )]
    pub base_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = quote_mint,
        token::authority = order_book,
        seeds = [
            VAULT_SEED,
            order_book.key().as_ref(),
            b"quote"
        ],
        bump
    )]
    pub quote_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeOrderBook>,
    base_mint: Pubkey,
    quote_mint: Pubkey,
    tick_size: u64,
    min_order_size: u64,
) -> Result<()> {
    require!(tick_size >= MIN_TICK_SIZE, ExchangeError::InvalidPrice);
    require!(
        min_order_size >= MIN_ORDER_SIZE,
        ExchangeError::InvalidQuantity
    );
    require!(!ctx.accounts.exchange.paused, ExchangeError::ExchangePaused);

    let order_book = &mut ctx.accounts.order_book;
    order_book.exchange = ctx.accounts.exchange.key();
    order_book.base_mint = base_mint;
    order_book.quote_mint = quote_mint;
    order_book.base_vault = ctx.accounts.base_vault.key();
    order_book.quote_vault = ctx.accounts.quote_vault.key();
    order_book.tick_size = tick_size;
    order_book.min_order_size = min_order_size;
    order_book.bids_head = None;
    order_book.asks_head = None;
    order_book.next_order_id = 1;
    order_book.total_orders = 0;
    order_book.total_volume = 0;
    order_book.last_price = 0;
    order_book.is_active = true;
    order_book.bump = ctx.bumps.order_book;

    let exchange = &mut ctx.accounts.exchange;
    exchange.total_markets = exchange.total_markets.checked_add(1).unwrap();

    msg!(
        "Order book initialized for {}/{} with tick size: {}, min order: {}",
        base_mint,
        quote_mint,
        tick_size,
        min_order_size
    );

    Ok(())
}
