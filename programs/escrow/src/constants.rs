use anchor_lang::prelude::*;

// PDA Seeds
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const ESCROW_AUTHORITY_SEED: &[u8] = b"escrow_authority";
pub const VAULT_SEED: &[u8] = b"vault";

// Time constraints
pub const MIN_ESCROW_DURATION: i64 = 60; // 1 minute
pub const MAX_ESCROW_DURATION: i64 = 86400 * 30; // 30 days
pub const DEFAULT_ESCROW_DURATION: i64 = 3600; // 1 hour
