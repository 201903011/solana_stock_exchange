use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        seeds = [GOVERNANCE_SEED],
        bump = governance.bump,
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Active @ GovernanceError::ProposalNotActive,
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        init,
        payer = voter,
        space = VoteRecord::LEN,
        seeds = [
            VOTE_RECORD_SEED,
            proposal.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    #[account(
        seeds = [VOTER_WEIGHT_SEED, voter.key().as_ref()],
        bump = voter_weight.bump,
        constraint = voter_weight.effective_voting_power() > 0 @ GovernanceError::InsufficientVotingPower
    )]
    pub voter_weight: Account<'info, VoterWeight>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CastVote>, support: bool) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let proposal = &mut ctx.accounts.proposal;
    
    require!(
        proposal.is_active(current_time),
        GovernanceError::VotingPeriodEnded
    );

    let voting_power = ctx.accounts.voter_weight.effective_voting_power();
    let vote_choice = if support {
        VoteChoice::For
    } else {
        VoteChoice::Against
    };

    // Record the vote
    let vote_record = &mut ctx.accounts.vote_record;
    vote_record.proposal = proposal.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.vote_choice = vote_choice;
    vote_record.voting_power = voting_power;
    vote_record.timestamp = current_time;

    // Update proposal vote counts
    match vote_choice {
        VoteChoice::For => {
            proposal.votes_for = proposal.votes_for
                .checked_add(voting_power)
                .ok_or(GovernanceError::Overflow)?;
        }
        VoteChoice::Against => {
            proposal.votes_against = proposal.votes_against
                .checked_add(voting_power)
                .ok_or(GovernanceError::Overflow)?;
        }
        VoteChoice::Abstain => {
            proposal.votes_abstain = proposal.votes_abstain
                .checked_add(voting_power)
                .ok_or(GovernanceError::Overflow)?;
        }
    }

    msg!(
        "Vote cast on proposal {}: {:?} with {} voting power",
        proposal.proposal_id,
        vote_choice,
        voting_power
    );

    Ok(())
}
