use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CancelOrder<'info> {
    #[account(
        mut,
        constraint = order_book.is_active @ ExchangeError::OrderBookInactive,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        seeds = [
            ORDER_SEED,
            order_book.key().as_ref(),
            order_id.to_le_bytes().as_ref()
        ],
        bump,
        constraint = order.trader == trader.key() @ ExchangeError::UnauthorizedOrderModification,
        constraint = order.is_active @ ExchangeError::CannotCancelInactiveOrder,
    )]
    pub order: Account<'info, Order>,

    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(mut)]
    pub trader_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
    let order = &mut ctx.accounts.order;

    require!(order.is_active, ExchangeError::CannotCancelInactiveOrder);

    // Calculate unfilled quantity
    let unfilled_quantity = order
        .quantity
        .checked_sub(order.filled_quantity)
        .ok_or(ExchangeError::Overflow)?;

    // Calculate amount to return
    let amount_to_return = match order.side {
        OrderSide::Ask => unfilled_quantity,
        OrderSide::Bid => order
            .price
            .checked_mul(unfilled_quantity)
            .ok_or(ExchangeError::Overflow)?,
    };

    // Return locked tokens to trader
    if amount_to_return > 0 {
        // Get order book data needed for seeds
        let base_mint = ctx.accounts.order_book.base_mint;
        let quote_mint = ctx.accounts.order_book.quote_mint;
        let bump = ctx.accounts.order_book.bump;
        
        let signer_seeds = &[
            ORDER_BOOK_SEED,
            base_mint.as_ref(),
            quote_mint.as_ref(),
            &[bump],
        ];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.trader_token_account.to_account_info(),
            authority: ctx.accounts.order_book.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[signer_seeds],
            ),
            amount_to_return,
        )?;
    }

    // Mark order as inactive
    order.is_active = false;

    // Update order book statistics
    let order_book = &mut ctx.accounts.order_book;
    order_book.total_orders = order_book
        .total_orders
        .checked_sub(1)
        .ok_or(ExchangeError::Overflow)?;

    msg!(
        "Order {} cancelled, returned {} tokens",
        order_id,
        amount_to_return
    );

    Ok(())
}
