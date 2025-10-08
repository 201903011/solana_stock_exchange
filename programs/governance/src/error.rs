use anchor_lang::prelude::*;

#[error_code]
pub enum GovernanceError {
    #[msg("Invalid voting period")]
    InvalidVotingPeriod,
    
    #[msg("Invalid quorum percentage")]
    InvalidQuorumPercentage,
    
    #[msg("Invalid approval threshold")]
    InvalidApprovalThreshold,
    
    #[msg("Proposal is not active")]
    ProposalNotActive,
    
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    
    #[msg("Voting period has not ended")]
    VotingPeriodNotEnded,
    
    #[msg("Proposal has not met quorum")]
    QuorumNotMet,
    
    #[msg("Proposal has not been approved")]
    ProposalNotApproved,
    
    #[msg("Proposal already executed")]
    ProposalAlreadyExecuted,
    
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    
    #[msg("Insufficient voting power")]
    InsufficientVotingPower,
    
    #[msg("Unauthorized action")]
    Unauthorized,
    
    #[msg("Title too long")]
    TitleTooLong,
    
    #[msg("Description too long")]
    DescriptionTooLong,
    
    #[msg("Cannot cancel proposal")]
    CannotCancelProposal,
    
    #[msg("Overflow in calculation")]
    Overflow,
}
