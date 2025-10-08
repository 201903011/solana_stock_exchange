use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimFromEscrow<'info> {
    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.trade_id.to_le_bytes().as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Executed @ EscrowError::InvalidStatus,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    pub claimer: Signer<'info>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = claimer_token_account.owner == claimer.key()
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimFromEscrow>) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    
    // Verify claimer is authorized (buyer or seller)
    require!(
        ctx.accounts.claimer.key() == escrow.buyer || ctx.accounts.claimer.key() == escrow.seller,
        EscrowError::Unauthorized
    );

    // This is a simplified claim function
    // In production, you'd track what each party can claim
    
    msg!("Claim from escrow {} by {}", escrow.trade_id, ctx.accounts.claimer.key());

    Ok(())
}
