use crate::constants::*;
use crate::error::ExchangeError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CrankMatchOrders<'info> {
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,

    /// CHECK: Cranker account that calls the matching engine
    pub cranker: Signer<'info>,
}

pub fn handler(ctx: Context<CrankMatchOrders>, max_iterations: u8) -> Result<()> {
    require!(
        max_iterations <= MAX_CRANK_ITERATIONS,
        ExchangeError::Overflow
    );

    let order_book = &mut ctx.accounts.order_book;
    require!(order_book.is_active, ExchangeError::OrderBookInactive);

    // In a full implementation, this would:
    // 1. Load the top bid and ask orders
    // 2. Check if they can match (bid price >= ask price)
    // 3. Execute the trade atomically
    // 4. Update both orders (filled quantity, etc.)
    // 5. Create trade records
    // 6. Repeat for max_iterations or until no more matches

    // Simplified version - just log the crank operation
    msg!(
        "Crank matching executed for order book: {} (max iterations: {})",
        order_book.key(),
        max_iterations
    );

    // This is a placeholder. A real implementation would need:
    // - Access to bid and ask order accounts
    // - Token transfer logic for settlements
    // - Fee calculations and distributions
    // - Trade event emissions

    Ok(())
}
