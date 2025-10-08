pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::{OrderSide, OrderType};

declare_id!("ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD");

#[program]
pub mod exchange_core {
    use super::*;

    /// Initialize the exchange with configuration
    pub fn initialize_exchange(
        ctx: Context<InitializeExchange>,
        maker_fee_bps: u16,
        taker_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_exchange::handler(ctx, maker_fee_bps, taker_fee_bps)
    }

    /// Initialize an order book for a trading pair
    pub fn initialize_order_book(
        ctx: Context<InitializeOrderBook>,
        base_mint: Pubkey,
        quote_mint: Pubkey,
        tick_size: u64,
        min_order_size: u64,
    ) -> Result<()> {
        instructions::initialize_order_book::handler(
            ctx,
            base_mint,
            quote_mint,
            tick_size,
            min_order_size,
        )
    }

    /// Place a limit order
    pub fn place_limit_order(
        ctx: Context<PlaceLimitOrder>,
        side: OrderSide,
        price: u64,
        quantity: u64,
    ) -> Result<()> {
        instructions::place_limit_order::handler(ctx, side, price, quantity)
    }

    /// Place a market order
    pub fn place_market_order(
        ctx: Context<PlaceMarketOrder>,
        side: OrderSide,
        quantity: u64,
        max_quote_amount: u64,
    ) -> Result<()> {
        instructions::place_market_order::handler(ctx, side, quantity, max_quote_amount)
    }

    /// Cancel an existing order
    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        instructions::cancel_order::handler(ctx, order_id)
    }

    /// Modify an existing order
    pub fn modify_order(
        ctx: Context<ModifyOrder>,
        order_id: u64,
        new_price: Option<u64>,
        new_quantity: Option<u64>,
    ) -> Result<()> {
        instructions::modify_order::handler(ctx, order_id, new_price, new_quantity)
    }

    /// Match orders in the order book
    pub fn crank_match_orders(ctx: Context<CrankMatchOrders>, max_iterations: u8) -> Result<()> {
        instructions::crank_match_orders::handler(ctx, max_iterations)
    }

    /// Initialize a user trading account
    pub fn initialize_trading_account(ctx: Context<InitializeTradingAccount>) -> Result<()> {
        instructions::initialize_trading_account::handler(ctx)
    }

    /// Settle a completed trade
    pub fn settle_trade(ctx: Context<SettleTrade>, trade_id: u64) -> Result<()> {
        instructions::settle_trade::handler(ctx, trade_id)
    }

    /// Close an order book (admin only)
    pub fn close_order_book(ctx: Context<CloseOrderBook>) -> Result<()> {
        instructions::close_order_book::handler(ctx)
    }
}
