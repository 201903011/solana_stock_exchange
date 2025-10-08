/**
 * Mock Data for Integration Tests
 * Contains mock users, companies, and order data for testing the stock exchange
 */

import { Keypair, PublicKey } from "@solana/web3.js";

export interface MockUser {
    name: string;
    keypair: Keypair;
    kycVerified: boolean;
    balance: number; // SOL balance
    tradingAccountInitialized: boolean;
}

export interface MockCompany {
    name: string;
    symbol: string;
    totalShares: number;
    pricePerShare: number; // in lamports
    industry: string;
    complianceStatus: "pending" | "approved" | "rejected";
    tokenMint?: PublicKey;
}

export interface MockOrder {
    userId: string;
    side: "buy" | "sell";
    type: "limit" | "market";
    quantity: number;
    price?: number; // lamports per token (for limit orders)
    maxQuoteAmount?: number; // for market buy orders
}

// Mock Users
export const MOCK_USERS: Record<string, MockUser> = {
    alice: {
        name: "Alice (Buyer)",
        keypair: Keypair.generate(),
        kycVerified: false,
        balance: 100, // 100 SOL
        tradingAccountInitialized: false,
    },
    bob: {
        name: "Bob (Seller)",
        keypair: Keypair.generate(),
        kycVerified: false,
        balance: 100, // 100 SOL
        tradingAccountInitialized: false,
    },
    charlie: {
        name: "Charlie (Trader)",
        keypair: Keypair.generate(),
        kycVerified: false,
        balance: 50, // 50 SOL
        tradingAccountInitialized: false,
    },
};

// Mock Companies for Listing
export const MOCK_COMPANIES: Record<string, MockCompany> = {
    techCorp: {
        name: "TechCorp Inc.",
        symbol: "TECH",
        totalShares: 1_000_000,
        pricePerShare: 1_000_000_000, // 1 SOL per share
        industry: "Technology",
        complianceStatus: "pending",
    },
    financeCo: {
        name: "Finance Solutions Co.",
        symbol: "FINS",
        totalShares: 500_000,
        pricePerShare: 2_000_000_000, // 2 SOL per share
        industry: "Finance",
        complianceStatus: "pending",
    },
    healthMed: {
        name: "HealthMed Ltd.",
        symbol: "HLTH",
        totalShares: 750_000,
        pricePerShare: 1_500_000_000, // 1.5 SOL per share
        industry: "Healthcare",
        complianceStatus: "pending",
    },
};

// Mock Orders for Testing
export const MOCK_ORDERS: MockOrder[] = [
    // Alice wants to buy 10 TECH shares at 1 SOL each
    {
        userId: "alice",
        side: "buy",
        type: "limit",
        quantity: 10,
        price: 1_000_000_000,
    },
    // Bob wants to sell 5 TECH shares at 1 SOL each
    {
        userId: "bob",
        side: "sell",
        type: "limit",
        quantity: 5,
        price: 1_000_000_000,
    },
    // Charlie places market buy for 3 TECH shares
    {
        userId: "charlie",
        side: "buy",
        type: "market",
        quantity: 3,
        maxQuoteAmount: 4_000_000_000, // willing to pay up to 4 SOL
    },
];

// Mock Trade Scenarios
export interface TradeScenario {
    description: string;
    buyer: string;
    seller: string;
    stockSymbol: string;
    quantity: number;
    price: number;
}

export const TRADE_SCENARIOS: TradeScenario[] = [
    {
        description: "Alice buys 5 TECH shares from Bob at 1 SOL each",
        buyer: "alice",
        seller: "bob",
        stockSymbol: "TECH",
        quantity: 5,
        price: 1_000_000_000,
    },
    {
        description: "Charlie buys 3 FINS shares from Alice at 2 SOL each",
        buyer: "charlie",
        seller: "alice",
        stockSymbol: "FINS",
        quantity: 3,
        price: 2_000_000_000,
    },
];
