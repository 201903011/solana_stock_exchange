use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::FeeError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimReferralRewards<'info> {
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump = fee_config.bump,
    )]
    pub fee_config: Account<'info, FeeConfig>,
    
    #[account(
        mut,
        seeds = [REFERRAL_ACCOUNT_SEED, referrer.key().as_ref()],
        bump = referral_account.bump,
        has_one = referrer,
    )]
    pub referral_account: Account<'info, ReferralAccount>,
    
    #[account(mut)]
    pub fee_collector_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub referrer_token_account: Account<'info, TokenAccount>,
    
    pub referrer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimReferralRewards>) -> Result<()> {
    let referral_account = &mut ctx.accounts.referral_account;
    let unclaimed = referral_account.unclaimed_rewards();
    
    require!(unclaimed > 0, FeeError::NoRewardsToClaim);

    let fee_config = &ctx.accounts.fee_config;
    let seeds = &[FEE_CONFIG_SEED, &[fee_config.bump]];

    // Transfer rewards to referrer
    let cpi_accounts = Transfer {
        from: ctx.accounts.fee_collector_account.to_account_info(),
        to: ctx.accounts.referrer_token_account.to_account_info(),
        authority: ctx.accounts.fee_config.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[seeds]
        ),
        unclaimed
    )?;

    referral_account.claimed_rewards = referral_account.claimed_rewards
        .checked_add(unclaimed)
        .ok_or(FeeError::Overflow)?;

    msg!("Referral rewards claimed: {} by {}", unclaimed, ctx.accounts.referrer.key());

    Ok(())
}
