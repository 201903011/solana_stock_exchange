use anchor_lang::prelude::*;

#[error_code]
pub enum ExchangeError {
    #[msg("Exchange is currently paused")]
    ExchangePaused,

    #[msg("Order book is not active")]
    OrderBookInactive,

    #[msg("Invalid order price")]
    InvalidPrice,

    #[msg("Invalid order quantity")]
    InvalidQuantity,

    #[msg("Order quantity below minimum")]
    QuantityBelowMinimum,

    #[msg("Price not aligned to tick size")]
    PriceNotAlignedToTickSize,

    #[msg("Order not found")]
    OrderNotFound,

    #[msg("Unauthorized order modification")]
    UnauthorizedOrderModification,

    #[msg("Insufficient funds for order")]
    InsufficientFunds,

    #[msg("Order already filled")]
    OrderAlreadyFilled,

    #[msg("Cannot cancel inactive order")]
    CannotCancelInactiveOrder,

    #[msg("Self-trade not allowed")]
    SelfTradeNotAllowed,

    #[msg("Post-only order would match")]
    PostOnlyWouldMatch,

    #[msg("Market order cannot be fully filled")]
    MarketOrderCannotBeFilled,

    #[msg("Max quote amount exceeded")]
    MaxQuoteAmountExceeded,

    #[msg("Overflow in calculation")]
    Overflow,

    #[msg("Trade already settled")]
    TradeAlreadySettled,

    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,

    #[msg("Unauthorized access")]
    Unauthorized,
}
