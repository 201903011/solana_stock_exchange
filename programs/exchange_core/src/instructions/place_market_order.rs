use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
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

    #[account(mut)]
    pub base_vault: Account<'info, TokenAccount>,

    /// CHECK: SOL vault PDA for holding quote currency (SOL)
    #[account(
        mut,
        seeds = [b"sol_vault", order_book.key().as_ref()],
        bump,
    )]
    pub sol_vault: AccountInfo<'info>,

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
    let sol_amount = price.checked_mul(quantity).ok_or(ExchangeError::Overflow)?;

    require!(
        sol_amount <= max_quote_amount,
        ExchangeError::MaxQuoteAmountExceeded
    );

    // Execute trade based on side
    match side {
        OrderSide::Bid => {
            // Buyer pays SOL, receives base tokens
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.trader.to_account_info(),
                        to: ctx.accounts.sol_vault.to_account_info(),
                    },
                ),
                sol_amount,
            )?;

            // Transfer base tokens from vault to buyer
            let seeds = &[
                ORDER_BOOK_SEED,
                order_book.base_mint.as_ref(),
                &[order_book.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let cpi_accounts_base = Transfer {
                from: ctx.accounts.base_vault.to_account_info(),
                to: ctx.accounts.trader_base_account.to_account_info(),
                authority: ctx.accounts.order_book.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts_base,
                    signer_seeds,
                ),
                quantity,
            )?;
        }
        OrderSide::Ask => {
            // Seller pays base tokens, receives SOL
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

            // Transfer SOL from vault to seller
            **ctx.accounts.sol_vault.try_borrow_mut_lamports()? = ctx
                .accounts
                .sol_vault
                .lamports()
                .checked_sub(sol_amount)
                .ok_or(ExchangeError::InsufficientFunds)?;
            **ctx.accounts.trader.try_borrow_mut_lamports()? = ctx
                .accounts
                .trader
                .lamports()
                .checked_add(sol_amount)
                .ok_or(ExchangeError::Overflow)?;
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
        "Market order executed: Side {:?}, Quantity {}, Price {} SOL",
        side,
        quantity,
        price
    );

    Ok(())
}
