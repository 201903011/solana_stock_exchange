use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        seeds = [GOVERNANCE_SEED],
        bump = governance.bump,
        has_one = authority,
    )]
    pub governance: Account<'info, GovernanceConfig>,
    
    #[account(
        init,
        payer = authority,
        space = Treasury::LEN,
        seeds = [TREASURY_SEED, governance.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTreasury>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    
    treasury.governance = ctx.accounts.governance.key();
    treasury.authority_bump = ctx.bumps.treasury;
    treasury.total_allocated = 0;
    treasury.total_distributed = 0;

    msg!("Treasury initialized for governance {}", ctx.accounts.governance.key());

    Ok(())
}
