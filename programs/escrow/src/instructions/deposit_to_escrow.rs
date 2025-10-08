use anchor_lang::prelude::*;
use anchor_lang::system_program;
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
        constraint = depositor_base_account.owner == depositor.key()
    )]
    pub depositor_base_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub base_vault: Account<'info, TokenAccount>,

    /// CHECK: SOL vault PDA for holding SOL
    #[account(
        mut,
        seeds = [b"sol_vault", escrow.key().as_ref()],
        bump,
    )]
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositToEscrow>, amount: u64, is_base: bool) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidDepositAmount);

    let escrow = &mut ctx.accounts.escrow;
    
    // Verify depositor is buyer or seller
    require!(
        ctx.accounts.depositor.key() == escrow.buyer || ctx.accounts.depositor.key() == escrow.seller,
        EscrowError::Unauthorized
    );

    if is_base {
        // Transfer base tokens (SPL) to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_base_account.to_account_info(),
            to: ctx.accounts.base_vault.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount
        )?;

        escrow.base_deposited = escrow.base_deposited
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;
    } else {
        // Transfer SOL to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.sol_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        escrow.sol_deposited = escrow.sol_deposited
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;
    }

    // Update status if fully funded
    if escrow.is_fully_funded() {
        escrow.status = EscrowStatus::Funded;
        msg!("Escrow {} fully funded and ready for execution", escrow.trade_id);
    }

    msg!(
        "Deposited {} {} to escrow {}",
        amount,
        if is_base { "base tokens" } else { "SOL" },
        escrow.trade_id
    );

    Ok(())
}
