use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::GovernanceError;
use crate::state::*;

#[derive(Accounts)]
pub struct AllocateTreasuryFunds<'info> {
    #[account(
        seeds = [GOVERNANCE_SEED],
        bump = governance.bump,
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    #[account(
        mut,
        seeds = [TREASURY_SEED, governance.key().as_ref()],
        bump = treasury.authority_bump,
    )]
    pub treasury: Account<'info, Treasury>,
    
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Authority that approves allocation (via governance)
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<AllocateTreasuryFunds>,
    amount: u64,
    recipient: Pubkey,
) -> Result<()> {
    // In production, this would verify that a proposal authorizing this allocation was approved
    require!(
        ctx.accounts.authority.key() == ctx.accounts.governance.authority,
        GovernanceError::Unauthorized
    );

    let governance_key = ctx.accounts.governance.key();
    let signer_seeds = &[
        TREASURY_SEED,
        governance_key.as_ref(),
        &[ctx.accounts.treasury.authority_bump],
    ];

    // Transfer tokens from treasury
    let cpi_accounts = Transfer {
        from: ctx.accounts.treasury_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.treasury.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[signer_seeds]
        ),
        amount
    )?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_allocated = treasury.total_allocated
        .checked_add(amount)
        .ok_or(GovernanceError::Overflow)?;
    treasury.total_distributed = treasury.total_distributed
        .checked_add(amount)
        .ok_or(GovernanceError::Overflow)?;

    msg!(
        "Treasury allocated {} tokens to {}",
        amount,
        recipient
    );

    Ok(())
}
