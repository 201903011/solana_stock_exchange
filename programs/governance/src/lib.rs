pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::{ProposalStatus, ProposalType, VoteChoice};

declare_id!("GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq");

#[program]
pub mod governance {
    use super::*;

    /// Initialize governance with parameters
    pub fn initialize_governance(
        ctx: Context<InitializeGovernance>,
        voting_period: i64,
        quorum_percentage: u8,
        approval_threshold: u8,
    ) -> Result<()> {
        instructions::initialize_governance::handler(
            ctx,
            voting_period,
            quorum_percentage,
            approval_threshold,
        )
    }

    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: ProposalType,
    ) -> Result<()> {
        instructions::create_proposal::handler(ctx, title, description, proposal_type)
    }

    /// Cast a vote on a proposal
    pub fn cast_vote(ctx: Context<CastVote>, support: bool) -> Result<()> {
        instructions::cast_vote::handler(ctx, support)
    }

    /// Execute an approved proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    /// Cancel a proposal
    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        instructions::cancel_proposal::handler(ctx)
    }

    /// Delegate voting power
    pub fn delegate_votes(ctx: Context<DelegateVotes>, delegate: Pubkey) -> Result<()> {
        instructions::delegate_votes::handler(ctx, delegate)
    }

    /// Initialize treasury account
    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        instructions::initialize_treasury::handler(ctx)
    }

    /// Allocate funds from treasury
    pub fn allocate_treasury_funds(
        ctx: Context<AllocateTreasuryFunds>,
        amount: u64,
        recipient: Pubkey,
    ) -> Result<()> {
        instructions::allocate_treasury_funds::handler(ctx, amount, recipient)
    }
}
