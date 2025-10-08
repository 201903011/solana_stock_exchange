use anchor_lang::prelude::*;

#[account]
pub struct EscrowAccount {
    pub trade_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub base_mint: Pubkey,
    pub base_amount: u64,
    pub sol_amount: u64, // Changed from quote_amount - now stores SOL
    pub base_deposited: u64,
    pub sol_deposited: u64, // Changed from quote_deposited
    pub base_vault: Pubkey,
    pub sol_vault: Pubkey, // Changed from quote_vault - PDA holding SOL
    pub status: EscrowStatus,
    pub created_at: i64,
    pub expiry: i64,
    pub bump: u8,
}

impl EscrowAccount {
    pub const LEN: usize = 8 + // discriminator
        8 + // trade_id
        32 + // buyer
        32 + // seller
        32 + // base_mint
        8 + // base_amount
        8 + // sol_amount
        8 + // base_deposited
        8 + // sol_deposited
        32 + // base_vault
        32 + // sol_vault
        1 + // status
        8 + // created_at
        8 + // expiry
        1; // bump

    pub fn is_fully_funded(&self) -> bool {
        self.base_deposited >= self.base_amount && self.sol_deposited >= self.sol_amount
    }

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expiry
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

#[account]
pub struct EscrowAuthority {
    pub authority: Pubkey,
    pub total_escrows: u64,
    pub total_volume: u64,
    pub bump: u8,
}

impl EscrowAuthority {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // total_escrows
        8 + // total_volume
        1; // bump
}
