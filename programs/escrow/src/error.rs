use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is not in pending status")]
    NotPending,

    #[msg("Escrow is not fully funded")]
    NotFullyFunded,

    #[msg("Escrow has expired")]
    EscrowExpired,

    #[msg("Escrow has not expired yet")]
    EscrowNotExpired,

    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,

    #[msg("Escrow already executed")]
    AlreadyExecuted,

    #[msg("Escrow already cancelled")]
    AlreadyCancelled,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid escrow status")]
    InvalidStatus,

    #[msg("Insufficient escrow balance")]
    InsufficientBalance,

    #[msg("Overflow in calculation")]
    Overflow,
}
