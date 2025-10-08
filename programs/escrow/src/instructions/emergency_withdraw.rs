use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.trade_id.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED],
        bump = escrow_authority.bump,
        has_one = authority @ EscrowError::Unauthorized,
    )]
    pub escrow_authority: Account<'info, EscrowAuthority>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<EmergencyWithdraw>) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    
    // Emergency withdrawal only for stuck funds
    require!(
        escrow.is_expired(Clock::get()?.unix_timestamp),
        EscrowError::EscrowNotExpired
    );

    let balance = ctx.accounts.vault.amount;
    
    if balance > 0 {
        let trade_id_bytes = escrow.trade_id.to_le_bytes();
        let signer_seeds = &[
            ESCROW_SEED,
            trade_id_bytes.as_ref(),
            &[escrow.bump],
        ];

        let transfer = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: escrow.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer,
                &[signer_seeds]
            ),
            balance
        )?;

        msg!("Emergency withdrawal: {} tokens from escrow {}", balance, escrow.trade_id);
    }

    Ok(())
}
