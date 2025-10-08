pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("Estdrnjx9yezLcJZs4nPaciYqt1vUEQyXYeEZZBJ5vRB");

#[program]
pub mod escrow {
    use super::*;

    /// Initialize an escrow account for a trade (using SOL as quote currency)
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        trade_id: u64,
        base_amount: u64,
        sol_amount: u64,
        expiry: i64,
    ) -> Result<()> {
        instructions::initialize_escrow::handler(ctx, trade_id, base_amount, sol_amount, expiry)
    }

    /// Deposit tokens into escrow
    pub fn deposit_to_escrow(
        ctx: Context<DepositToEscrow>,
        amount: u64,
        is_base: bool,
    ) -> Result<()> {
        instructions::deposit_to_escrow::handler(ctx, amount, is_base)
    }

    /// Execute atomic swap from escrow
    pub fn execute_swap(ctx: Context<ExecuteSwap>) -> Result<()> {
        instructions::execute_swap::handler(ctx)
    }

    /// Cancel escrow and return funds
    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        instructions::cancel_escrow::handler(ctx)
    }

    /// Claim tokens from completed escrow
    pub fn claim_from_escrow(ctx: Context<ClaimFromEscrow>) -> Result<()> {
        instructions::claim_from_escrow::handler(ctx)
    }

    /// Emergency withdrawal (admin only)
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        instructions::emergency_withdraw::handler(ctx)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Pending,
    Funded,
    Executed,
    Cancelled,
    Expired,
}
