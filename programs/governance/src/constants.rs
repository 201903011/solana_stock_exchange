use anchor_lang::prelude::*;

// PDA Seeds
pub const GOVERNANCE_SEED: &[u8] = b"governance";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const VOTE_RECORD_SEED: &[u8] = b"vote_record";
pub const VOTER_WEIGHT_SEED: &[u8] = b"voter_weight";
pub const TREASURY_SEED: &[u8] = b"treasury";

// Time constraints
pub const MIN_VOTING_PERIOD: i64 = 3600; // 1 hour
pub const MAX_VOTING_PERIOD: i64 = 604800; // 7 days
pub const DEFAULT_VOTING_PERIOD: i64 = 259200; // 3 days

// Percentage constraints
pub const MIN_QUORUM_PERCENTAGE: u8 = 1;
pub const MAX_QUORUM_PERCENTAGE: u8 = 100;
pub const DEFAULT_QUORUM_PERCENTAGE: u8 = 20;

pub const MIN_APPROVAL_THRESHOLD: u8 = 50;
pub const MAX_APPROVAL_THRESHOLD: u8 = 100;
pub const DEFAULT_APPROVAL_THRESHOLD: u8 = 66; // 66% supermajority
