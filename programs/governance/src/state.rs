use anchor_lang::prelude::*;

#[account]
pub struct GovernanceConfig {
    pub authority: Pubkey,
    pub governance_token_mint: Pubkey,
    pub treasury: Pubkey,
    pub voting_period: i64,     // seconds
    pub quorum_percentage: u8,  // 0-100
    pub approval_threshold: u8, // 0-100
    pub proposal_count: u64,
    pub total_proposals: u64,
    pub bump: u8,
}

impl GovernanceConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // governance_token_mint
        32 + // treasury
        8 + // voting_period
        1 + // quorum_percentage
        1 + // approval_threshold
        8 + // proposal_count
        8 + // total_proposals
        1; // bump
}

#[account]
pub struct Proposal {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,       // Max 100 chars
    pub description: String, // Max 500 chars
    pub proposal_type: ProposalType,
    pub status: ProposalStatus,
    pub votes_for: u64,
    pub votes_against: u64,
    pub votes_abstain: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub executed_at: Option<i64>,
    pub bump: u8,
}

impl Proposal {
    pub const MAX_TITLE_LEN: usize = 100;
    pub const MAX_DESCRIPTION_LEN: usize = 500;

    pub const LEN: usize = 8 + // discriminator
        8 + // proposal_id
        32 + // proposer
        4 + Self::MAX_TITLE_LEN + // title
        4 + Self::MAX_DESCRIPTION_LEN + // description
        1 + // proposal_type
        1 + // status
        8 + // votes_for
        8 + // votes_against
        8 + // votes_abstain
        8 + // start_time
        8 + // end_time
        1 + 8 + // executed_at
        1; // bump

    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == ProposalStatus::Active && current_time <= self.end_time
    }

    pub fn can_execute(
        &self,
        config: &GovernanceConfig,
        total_votes: u64,
        current_time: i64,
    ) -> bool {
        if self.status != ProposalStatus::Active || current_time <= self.end_time {
            return false;
        }

        let total_votes_cast = self.votes_for + self.votes_against + self.votes_abstain;
        let quorum_required = (total_votes * config.quorum_percentage as u64) / 100;

        if total_votes_cast < quorum_required {
            return false;
        }

        let approval_required = (total_votes_cast * config.approval_threshold as u64) / 100;
        self.votes_for >= approval_required
    }
}

#[account]
pub struct VoteRecord {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_choice: VoteChoice,
    pub voting_power: u64,
    pub timestamp: i64,
}

impl VoteRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // proposal
        32 + // voter
        1 + // vote_choice
        8 + // voting_power
        8; // timestamp
}

#[account]
pub struct VoterWeight {
    pub owner: Pubkey,
    pub delegate: Option<Pubkey>,
    pub voting_power: u64,
    pub delegated_power: u64,
    pub bump: u8,
}

impl VoterWeight {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        1 + 32 + // delegate
        8 + // voting_power
        8 + // delegated_power
        1; // bump

    pub fn effective_voting_power(&self) -> u64 {
        self.voting_power + self.delegated_power
    }
}

#[account]
pub struct Treasury {
    pub governance: Pubkey,
    pub authority_bump: u8,
    pub total_allocated: u64,
    pub total_distributed: u64,
}

impl Treasury {
    pub const LEN: usize = 8 + // discriminator
        32 + // governance
        1 + // authority_bump
        8 + // total_allocated
        8; // total_distributed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalType {
    ParameterChange,
    TreasuryAllocation,
    ListingApproval,
    FeeTierAdjustment,
    EmergencyAction,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalStatus {
    Active,
    Succeeded,
    Defeated,
    Executed,
    Cancelled,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}
