use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.trade_id.to_le_bytes().as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Funded @ EscrowError::NotFullyFunded,
        constraint = !escrow.is_expired(Clock::get()?.unix_timestamp) @ EscrowError::EscrowExpired,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        constraint = base_vault.key() == escrow.base_vault
    )]
    pub base_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = quote_vault.key() == escrow.quote_vault
    )]
    pub quote_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = buyer_base_account.owner == escrow.buyer
    )]
    pub buyer_base_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = seller_quote_account.owner == escrow.seller
    )]
    pub seller_quote_account: Account<'info, TokenAccount>,
    
    /// CHECK: Can be called by anyone once escrow is funded
    pub executor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExecuteSwap>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    
    require!(escrow.is_fully_funded(), EscrowError::NotFullyFunded);
    require!(escrow.status == EscrowStatus::Funded, EscrowError::AlreadyExecuted);

    let trade_id_bytes = escrow.trade_id.to_le_bytes();
    let signer_seeds = &[
        ESCROW_SEED,
        trade_id_bytes.as_ref(),
        &[escrow.bump],
    ];

    // Transfer base tokens to buyer
    let base_transfer = Transfer {
        from: ctx.accounts.base_vault.to_account_info(),
        to: ctx.accounts.buyer_base_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            base_transfer,
            &[signer_seeds]
        ),
        escrow.base_amount
    )?;

    // Transfer quote tokens to seller
    let quote_transfer = Transfer {
        from: ctx.accounts.quote_vault.to_account_info(),
        to: ctx.accounts.seller_quote_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            quote_transfer,
            &[signer_seeds]
        ),
        escrow.quote_amount
    )?;

    // Update escrow status
    escrow.status = EscrowStatus::Executed;

    msg!(
        "Escrow {} executed: {} base tokens to buyer, {} quote tokens to seller",
        escrow.trade_id,
        escrow.base_amount,
        escrow.quote_amount
    );

    Ok(())
}
