use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.trade_id.to_le_bytes().as_ref()],
        bump = escrow.bump,
        constraint = escrow.status != EscrowStatus::Executed @ EscrowError::AlreadyExecuted,
        constraint = escrow.status != EscrowStatus::Cancelled @ EscrowError::AlreadyCancelled,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        constraint = canceller.key() == escrow.buyer || canceller.key() == escrow.seller @ EscrowError::Unauthorized
    )]
    pub canceller: Signer<'info>,
    
    #[account(mut)]
    pub base_vault: Account<'info, TokenAccount>,
    
    /// CHECK: SOL vault PDA
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Seller receives base token refund
    #[account(mut)]
    pub seller_refund_account: Account<'info, TokenAccount>,
    
    /// CHECK: Buyer receives SOL refund
    #[account(mut)]
    pub buyer: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Allow cancellation if expired or by mutual agreement (both parties)
    let can_cancel = escrow.is_expired(current_time) || 
                     escrow.status == EscrowStatus::Pending;
    
    require!(can_cancel, EscrowError::Unauthorized);

    let trade_id_bytes = escrow.trade_id.to_le_bytes();
    let signer_seeds = &[
        ESCROW_SEED,
        trade_id_bytes.as_ref(),
        &[escrow.bump],
    ];

    // Refund base tokens if any deposited
    if escrow.base_deposited > 0 {
        let refund_base = Transfer {
            from: ctx.accounts.base_vault.to_account_info(),
            to: ctx.accounts.seller_refund_account.to_account_info(),
            authority: escrow.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                refund_base,
                &[signer_seeds]
            ),
            escrow.base_deposited
        )?;
    }

    // Refund SOL if any deposited
    if escrow.sol_deposited > 0 {
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? = ctx
            .accounts
            .sol_vault
            .lamports()
            .checked_sub(escrow.sol_deposited)
            .ok_or(EscrowError::InsufficientFunds)?;
        **ctx.accounts.buyer.try_borrow_mut_lamports()? = ctx
            .accounts
            .buyer
            .lamports()
            .checked_add(escrow.sol_deposited)
            .ok_or(EscrowError::Overflow)?;
    }

    // Update status
    escrow.status = if escrow.is_expired(current_time) {
        EscrowStatus::Expired
    } else {
        EscrowStatus::Cancelled
    };

    msg!(
        "Escrow {} cancelled: Refunded {} base tokens and {} SOL",
        escrow.trade_id,
        escrow.base_deposited,
        escrow.sol_deposited
    );

    Ok(())
}
