use anchor_lang::prelude::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(
        mut,
        constraint = proposal.proposer == canceller.key() @ GovernanceError::Unauthorized,
        constraint = proposal.status == ProposalStatus::Active @ GovernanceError::CannotCancelProposal,
    )]
    pub proposal: Account<'info, Proposal>,
    
    pub canceller: Signer<'info>,
}

pub fn handler(ctx: Context<CancelProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Can only cancel if voting hasn't started significantly
    require!(
        current_time < proposal.start_time + 3600, // Within 1 hour of creation
        GovernanceError::CannotCancelProposal
    );

    proposal.status = ProposalStatus::Cancelled;

    msg!("Proposal {} cancelled by proposer", proposal.proposal_id);

    Ok(())
}
