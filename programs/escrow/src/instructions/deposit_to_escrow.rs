use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
    #[account(
        mut,
        constraint = escrow.status == EscrowStatus::Pending @ EscrowError::InvalidStatus,
        constraint = !escrow.is_expired(Clock::get()?.unix_timestamp) @ EscrowError::EscrowExpired,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key()
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DepositToEscrow>, amount: u64, is_base: bool) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidDepositAmount);

    let escrow = &mut ctx.accounts.escrow;
    
    // Verify depositor is buyer or seller
    require!(
        ctx.accounts.depositor.key() == escrow.buyer || ctx.accounts.depositor.key() == escrow.seller,
        EscrowError::Unauthorized
    );

    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.depositor_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        amount
    )?;

    // Update deposited amounts
    if is_base {
        escrow.base_deposited = escrow.base_deposited
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;
    } else {
        escrow.quote_deposited = escrow.quote_deposited
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;
    }

    // Update status if fully funded
    if escrow.is_fully_funded() {
        escrow.status = EscrowStatus::Funded;
        msg!("Escrow {} fully funded and ready for execution", escrow.trade_id);
    }

    msg!(
        "Deposited {} {} tokens to escrow {}",
        amount,
        if is_base { "base" } else { "quote" },
        escrow.trade_id
    );

    Ok(())
}
