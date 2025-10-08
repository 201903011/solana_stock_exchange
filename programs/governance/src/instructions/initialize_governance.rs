use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::constants::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeGovernance<'info> {
    #[account(
        init,
        payer = authority,
        space = GovernanceConfig::LEN,
        seeds = [GOVERNANCE_SEED],
        bump
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    pub governance_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury PDA
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeGovernance>,
    voting_period: i64,
    quorum_percentage: u8,
    approval_threshold: u8,
) -> Result<()> {
    require!(
        voting_period >= MIN_VOTING_PERIOD && voting_period <= MAX_VOTING_PERIOD,
        GovernanceError::InvalidVotingPeriod
    );
    require!(
        quorum_percentage >= MIN_QUORUM_PERCENTAGE && quorum_percentage <= MAX_QUORUM_PERCENTAGE,
        GovernanceError::InvalidQuorumPercentage
    );
    require!(
        approval_threshold >= MIN_APPROVAL_THRESHOLD && approval_threshold <= MAX_APPROVAL_THRESHOLD,
        GovernanceError::InvalidApprovalThreshold
    );

    let governance = &mut ctx.accounts.governance;
    governance.authority = ctx.accounts.authority.key();
    governance.governance_token_mint = ctx.accounts.governance_token_mint.key();
    governance.treasury = ctx.accounts.treasury.key();
    governance.voting_period = voting_period;
    governance.quorum_percentage = quorum_percentage;
    governance.approval_threshold = approval_threshold;
    governance.proposal_count = 0;
    governance.total_proposals = 0;
    governance.bump = ctx.bumps.governance;

    msg!(
        "Governance initialized: voting period {} seconds, quorum {}%, approval threshold {}%",
        voting_period,
        quorum_percentage,
        approval_threshold
    );

    Ok(())
}
