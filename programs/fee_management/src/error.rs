use anchor_lang::prelude::*;

#[error_code]
pub enum FeeError {
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    
    #[msg("Fee too high")]
    FeeTooHigh,
    
    #[msg("Invalid distribution shares")]
    InvalidDistributionShares,
    
    #[msg("Insufficient fee balance")]
    InsufficientFeeBalance,
    
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    
    #[msg("Invalid tier level")]
    InvalidTierLevel,
    
    #[msg("Volume threshold too low")]
    VolumeThresholdTooLow,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Overflow in calculation")]
    Overflow,
    
    #[msg("Fee distribution shares must total 10000 bps")]
    InvalidTotalShares,
}
