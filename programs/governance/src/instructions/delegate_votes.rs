use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct DelegateVotes<'info> {
    #[account(
        mut,
        seeds = [VOTER_WEIGHT_SEED, owner.key().as_ref()],
        bump = voter_weight.bump,
        has_one = owner
    )]
    pub voter_weight: Account<'info, VoterWeight>,
    
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<DelegateVotes>, delegate: Pubkey) -> Result<()> {
    let voter_weight = &mut ctx.accounts.voter_weight;
    
    voter_weight.delegate = Some(delegate);

    msg!(
        "Voting power delegated from {} to {}",
        ctx.accounts.owner.key(),
        delegate
    );

    Ok(())
}
