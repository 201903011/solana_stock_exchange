/**
 * Mock Backend Services
 * Simulates off-chain services like KYC verification and compliance reviews
 */

import { PublicKey } from "@solana/web3.js";
import { MockUser, MockCompany } from "./mock-data";

/**
 * Mock KYC Service
 * Simulates off-chain KYC verification process
 */
export class MockKYCService {
    private verifiedUsers: Set<string> = new Set();

    /**
     * Simulate KYC verification process
     * In real system, this would connect to an external KYC provider
     */
    async verifyUser(user: MockUser): Promise<{
        success: boolean;
        verified: boolean;
        message: string;
    }> {
        // Simulate async verification delay
        await this.delay(500);

        // Simple mock logic: verify based on name (all users pass in mock)
        const publicKey = user.keypair.publicKey.toString();

        console.log(`🔍 KYC Verification: Checking ${user.name} (${publicKey.slice(0, 8)}...)`);

        // In mock, everyone passes KYC after delay
        this.verifiedUsers.add(publicKey);
        user.kycVerified = true;

        console.log(`✅ KYC Verified: ${user.name}`);

        return {
            success: true,
            verified: true,
            message: `KYC verification completed for ${user.name}`,
        };
    }

    /**
     * Check if user is verified
     */
    isVerified(userPublicKey: PublicKey): boolean {
        return this.verifiedUsers.has(userPublicKey.toString());
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Mock Compliance Service
 * Simulates off-chain compliance review for company listings
 */
export class MockComplianceService {
    private approvedCompanies: Set<string> = new Set();
    private rejectedCompanies: Set<string> = new Set();

    /**
     * Review company listing application
     * In real system, this would involve legal, financial, and regulatory checks
     */
    async reviewListing(company: MockCompany): Promise<{
        success: boolean;
        approved: boolean;
        message: string;
        complianceScore?: number;
    }> {
        // Simulate async review delay
        await this.delay(1000);

        console.log(`📋 Compliance Review: Analyzing ${company.name} (${company.symbol})`);
        console.log(`   Industry: ${company.industry}`);
        console.log(`   Total Shares: ${company.totalShares.toLocaleString()}`);
        console.log(`   Price per Share: ${company.pricePerShare / 1e9} SOL`);

        // Mock compliance score (random for realism)
        const complianceScore = Math.floor(Math.random() * 20) + 80; // 80-100

        // In mock, approve all companies with score >= 75
        const approved = complianceScore >= 75;

        if (approved) {
            this.approvedCompanies.add(company.symbol);
            company.complianceStatus = "approved";
            console.log(`✅ Compliance Approved: ${company.name} (Score: ${complianceScore}/100)`);
        } else {
            this.rejectedCompanies.add(company.symbol);
            company.complianceStatus = "rejected";
            console.log(`❌ Compliance Rejected: ${company.name} (Score: ${complianceScore}/100)`);
        }

        return {
            success: true,
            approved,
            message: approved
                ? `${company.name} approved for listing`
                : `${company.name} failed compliance review`,
            complianceScore,
        };
    }

    /**
     * Check if company is approved
     */
    isApproved(symbol: string): boolean {
        return this.approvedCompanies.has(symbol);
    }

    /**
     * Get approval status
     */
    getStatus(symbol: string): "approved" | "rejected" | "pending" {
        if (this.approvedCompanies.has(symbol)) return "approved";
        if (this.rejectedCompanies.has(symbol)) return "rejected";
        return "pending";
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Mock Notification Service
 * Simulates sending notifications to users
 */
export class MockNotificationService {
    private notifications: Array<{
        userId: string;
        type: string;
        message: string;
        timestamp: Date;
    }> = [];

    /**
     * Send notification to user
     */
    async notify(userId: string, type: string, message: string): Promise<void> {
        console.log(`📧 Notification [${type}] → ${userId}: ${message}`);

        this.notifications.push({
            userId,
            type,
            message,
            timestamp: new Date(),
        });
    }

    /**
     * Get all notifications for a user
     */
    getNotifications(userId: string) {
        return this.notifications.filter(n => n.userId === userId);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications = [];
    }
}

/**
 * Mock Price Oracle Service
 * Provides price feeds for stocks (in real system, this would be external data)
 */
export class MockPriceOracle {
    private prices: Map<string, number> = new Map();

    /**
     * Set initial price for a stock
     */
    setPrice(symbol: string, price: number) {
        this.prices.set(symbol, price);
    }

    /**
     * Get current price for a stock
     */
    getPrice(symbol: string): number {
        return this.prices.get(symbol) || 0;
    }

    /**
     * Simulate price fluctuation
     */
    updatePrice(symbol: string, changePercent: number) {
        const currentPrice = this.prices.get(symbol) || 0;
        const newPrice = currentPrice * (1 + changePercent / 100);
        this.prices.set(symbol, newPrice);
        console.log(`📊 Price Update: ${symbol} ${currentPrice / 1e9} SOL → ${newPrice / 1e9} SOL (${changePercent > 0 ? '+' : ''}${changePercent}%)`);
    }
}
