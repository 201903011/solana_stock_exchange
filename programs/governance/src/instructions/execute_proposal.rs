use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        mut,
        seeds = [GOVERNANCE_SEED],
        bump = governance.bump,
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Active @ GovernanceError::ProposalNotActive,
    )]
    pub proposal: Account<'info, Proposal>,
    
    /// CHECK: Can be executed by anyone after voting period
    pub executor: Signer<'info>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let proposal = &mut ctx.accounts.proposal;
    let governance = &ctx.accounts.governance;

    require!(
        current_time > proposal.end_time,
        GovernanceError::VotingPeriodNotEnded
    );

    // Calculate total voting power (simplified - would need token supply info)
    let total_votes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
    
    // Check if proposal can be executed
    if proposal.can_execute(governance, total_votes, current_time) {
        proposal.status = ProposalStatus::Succeeded;
        proposal.executed_at = Some(current_time);

        // Execute proposal based on type
        match proposal.proposal_type {
            ProposalType::ParameterChange => {
                msg!("Executing parameter change proposal {}", proposal.proposal_id);
                // Implementation would update exchange parameters
            }
            ProposalType::TreasuryAllocation => {
                msg!("Executing treasury allocation proposal {}", proposal.proposal_id);
                // Implementation would allocate treasury funds
            }
            ProposalType::ListingApproval => {
                msg!("Executing listing approval proposal {}", proposal.proposal_id);
                // Implementation would approve new token listing
            }
            ProposalType::FeeTierAdjustment => {
                msg!("Executing fee tier adjustment proposal {}", proposal.proposal_id);
                // Implementation would adjust fee tiers
            }
            ProposalType::EmergencyAction => {
                msg!("Executing emergency action proposal {}", proposal.proposal_id);
                // Implementation would execute emergency action
            }
        }

        let governance_mut = &mut ctx.accounts.governance;
        governance_mut.proposal_count = governance_mut.proposal_count
            .checked_sub(1)
            .ok_or(GovernanceError::Overflow)?;

        msg!("Proposal {} executed successfully", proposal.proposal_id);
    } else {
        proposal.status = ProposalStatus::Defeated;
        msg!("Proposal {} defeated", proposal.proposal_id);
    }

    Ok(())
}
