use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        mut,
        seeds = [GOVERNANCE_SEED],
        bump = governance.bump,
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN,
        seeds = [
            PROPOSAL_SEED,
            governance.key().as_ref(),
            governance.total_proposals.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        seeds = [VOTER_WEIGHT_SEED, proposer.key().as_ref()],
        bump = voter_weight.bump,
        constraint = voter_weight.effective_voting_power() > 0 @ GovernanceError::InsufficientVotingPower
    )]
    pub voter_weight: Account<'info, VoterWeight>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProposal>,
    title: String,
    description: String,
    proposal_type: ProposalType,
) -> Result<()> {
    require!(
        title.len() <= Proposal::MAX_TITLE_LEN,
        GovernanceError::TitleTooLong
    );
    require!(
        description.len() <= Proposal::MAX_DESCRIPTION_LEN,
        GovernanceError::DescriptionTooLong
    );

    let governance = &mut ctx.accounts.governance;
    let proposal = &mut ctx.accounts.proposal;
    let current_time = Clock::get()?.unix_timestamp;

    proposal.proposal_id = governance.total_proposals;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.title = title.clone();
    proposal.description = description;
    proposal.proposal_type = proposal_type;
    proposal.status = ProposalStatus::Active;
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.votes_abstain = 0;
    proposal.start_time = current_time;
    proposal.end_time = current_time + governance.voting_period;
    proposal.executed_at = None;
    proposal.bump = ctx.bumps.proposal;

    governance.total_proposals = governance.total_proposals
        .checked_add(1)
        .ok_or(GovernanceError::Overflow)?;
    governance.proposal_count = governance.proposal_count
        .checked_add(1)
        .ok_or(GovernanceError::Overflow)?;

    msg!(
        "Proposal {} created: {} (Type: {:?})",
        proposal.proposal_id,
        title,
        proposal_type
    );

    Ok(())
}
