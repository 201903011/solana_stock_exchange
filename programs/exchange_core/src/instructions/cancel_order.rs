use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
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

pub fn handler(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
    let order = &mut ctx.accounts.order;

    require!(order.is_active, ExchangeError::CannotCancelInactiveOrder);

    // Calculate unfilled quantity
    let unfilled_quantity = order
        .quantity
        .checked_sub(order.filled_quantity)
        .ok_or(ExchangeError::Overflow)?;

    // Return locked tokens/SOL to trader based on order side
    if unfilled_quantity > 0 {
        match order.side {
            OrderSide::Ask => {
                // Return base tokens for sell order
                let base_mint = ctx.accounts.order_book.base_mint;
                let bump = ctx.accounts.order_book.bump;
                
                let signer_seeds = &[
                    ORDER_BOOK_SEED,
                    base_mint.as_ref(),
                    &[bump],
                ];

                let cpi_accounts = Transfer {
                    from: ctx.accounts.base_vault.to_account_info(),
                    to: ctx.accounts.trader_base_account.to_account_info(),
                    authority: ctx.accounts.order_book.to_account_info(),
                };

                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        cpi_accounts,
                        &[signer_seeds],
                    ),
                    unfilled_quantity,
                )?;
            }
            OrderSide::Bid => {
                // Return SOL for buy order
                let sol_amount = order
                    .price
                    .checked_mul(unfilled_quantity)
                    .ok_or(ExchangeError::Overflow)?;

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
        "Order {} cancelled, returned unfilled quantity: {}",
        order_id,
        unfilled_quantity
    );

    Ok(())
}
