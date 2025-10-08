use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::constants::*;
use crate::error::EscrowError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(trade_id: u64)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = initializer,
        space = EscrowAccount::LEN,
        seeds = [ESCROW_SEED, trade_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    pub buyer: SystemAccount<'info>,
    pub seller: SystemAccount<'info>,
    
    pub base_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = initializer,
        token::mint = base_mint,
        token::authority = escrow,
        seeds = [VAULT_SEED, escrow.key().as_ref(), b"base"],
        bump
    )]
    pub base_vault: Account<'info, TokenAccount>,
    
    /// CHECK: SOL vault PDA for holding SOL
    #[account(
        init,
        payer = initializer,
        space = 0,
        seeds = [b"sol_vault", escrow.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeEscrow>,
    trade_id: u64,
    base_amount: u64,
    sol_amount: u64,
    expiry: i64,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let duration = expiry - current_time;
    
    require!(
        duration >= MIN_ESCROW_DURATION && duration <= MAX_ESCROW_DURATION,
        EscrowError::InvalidStatus
    );
    
    require!(base_amount > 0 && sol_amount > 0, EscrowError::InvalidDepositAmount);

    let escrow = &mut ctx.accounts.escrow;
    escrow.trade_id = trade_id;
    escrow.buyer = ctx.accounts.buyer.key();
    escrow.seller = ctx.accounts.seller.key();
    escrow.base_mint = ctx.accounts.base_mint.key();
    escrow.base_amount = base_amount;
    escrow.sol_amount = sol_amount;
    escrow.base_deposited = 0;
    escrow.sol_deposited = 0;
    escrow.base_vault = ctx.accounts.base_vault.key();
    escrow.sol_vault = ctx.accounts.sol_vault.key();
    escrow.status = EscrowStatus::Pending;
    escrow.created_at = current_time;
    escrow.expiry = expiry;
    escrow.bump = ctx.bumps.escrow;

    msg!(
        "Escrow initialized: Trade ID {}, Base amount: {}, SOL amount: {}, Expiry: {}",
        trade_id,
        base_amount,
        sol_amount,
        expiry
    );

    Ok(())
}
