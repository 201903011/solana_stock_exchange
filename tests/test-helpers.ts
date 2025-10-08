import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    getAccount
} from "@solana/spl-token";

/**
 * Test Helper Functions for Solana Stock Exchange Integration Tests
 */

export class TestHelpers {
    provider: anchor.AnchorProvider;

    constructor(provider: anchor.AnchorProvider) {
        this.provider = provider;
    }

    /**
     * Log a section header
     */
    logSection(title: string) {
        console.log("\n" + "=".repeat(80));
        console.log(`  ${title}`);
        console.log("=".repeat(80));
    }

    /**
     * Log an address with Solana Explorer link
     */
    logAddress(label: string, address: PublicKey | string) {
        const addr = typeof address === 'string' ? address : address.toBase58();
        console.log(`  ✓ ${label}: ${addr}`);
        console.log(`    🔍 Explorer: https://explorer.solana.com/address/${addr}?cluster=custom&customUrl=http://localhost:8899`);
    }

    /**
     * Log a transaction with Solana Explorer link
     */
    logTransaction(label: string, signature: string) {
        console.log(`  ✓ ${label}`);
        console.log(`    📝 Signature: ${signature}`);
        console.log(`    🔍 Explorer: https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http://localhost:8899`);
    }

    /**
     * Airdrop SOL to a keypair
     */
    async airdropSol(keypair: Keypair, amount: number = 10): Promise<void> {
        const signature = await this.provider.connection.requestAirdrop(
            keypair.publicKey,
            amount * LAMPORTS_PER_SOL
        );
        await this.provider.connection.confirmTransaction(signature);
        console.log(`  💰 Airdropped ${amount} SOL to ${keypair.publicKey.toBase58()}`);
    }

    /**
     * Create a new SPL token mint
     */
    async createToken(
        authority: Keypair,
        name: string,
        symbol: string,
        decimals: number = 6
    ): Promise<PublicKey> {
        const mint = await createMint(
            this.provider.connection,
            authority,
            authority.publicKey,
            null,
            decimals
        );
        console.log(`  🪙 Created ${name} (${symbol}) token: ${mint.toBase58()}`);
        return mint;
    }

    /**
     * Mint tokens to a user
     */
    async mintTokensTo(
        mint: PublicKey,
        destination: PublicKey,
        authority: Keypair,
        amount: number
    ): Promise<void> {
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            this.provider.connection,
            authority,
            mint,
            destination
        );

        await mintTo(
            this.provider.connection,
            authority,
            mint,
            tokenAccount.address,
            authority,
            amount
        );
    }

    /**
     * Get token balance for a user
     */
    async getTokenBalance(user: PublicKey, mint: PublicKey): Promise<number> {
        try {
            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.provider.connection,
                Keypair.generate(), // dummy payer, won't be used since account exists
                mint,
                user,
                true // allowOwnerOffCurve
            );
            const accountInfo = await getAccount(this.provider.connection, tokenAccount.address);
            return Number(accountInfo.amount);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get SOL balance for a user
     */
    async getSolBalance(user: PublicKey): Promise<number> {
        const balance = await this.provider.connection.getBalance(user);
        return balance / LAMPORTS_PER_SOL;
    }

    /**
     * Log comprehensive user balances
     */
    async logUserBalances(
        userName: string,
        userPubkey: PublicKey,
        tokens: Array<{ symbol: string; mint: PublicKey; decimals: number }>
    ): Promise<void> {
        console.log(`\n  📊 ${userName} Balances:`);

        // SOL balance
        const solBalance = await this.getSolBalance(userPubkey);
        console.log(`    - SOL: ${solBalance.toFixed(4)}`);

        // Token balances
        for (const token of tokens) {
            const balance = await this.getTokenBalance(userPubkey, token.mint);
            const displayBalance = balance / Math.pow(10, token.decimals);
            console.log(`    - ${token.symbol}: ${displayBalance.toFixed(2)}`);
        }
    }

    /**
     * Create a mock user with SOL
     */
    async createMockUser(name: string, solAmount: number = 10): Promise<MockUser> {
        const keypair = Keypair.generate();
        await this.airdropSol(keypair, solAmount);

        return {
            name,
            keypair,
            publicKey: keypair.publicKey,
            verified: true
        };
    }

    /**
     * Create a mock company with token
     */
    async createMockCompany(
        name: string,
        symbol: string,
        supply: number
    ): Promise<MockCompany> {
        const keypair = Keypair.generate();
        await this.airdropSol(keypair, 10);

        const mint = await this.createToken(keypair, name, symbol, 6);

        return {
            name,
            symbol,
            keypair,
            publicKey: keypair.publicKey,
            mint,
            totalSupply: supply
        };
    }

    /**
     * Wait for a transaction to confirm
     */
    async confirmTransaction(signature: string): Promise<void> {
        await this.provider.connection.confirmTransaction(signature);
    }

    /**
     * Format large numbers with commas
     */
    formatNumber(num: number): string {
        return num.toLocaleString('en-US');
    }

    /**
     * Format token amount with decimals
     */
    formatTokenAmount(amount: number, decimals: number): string {
        return (amount / Math.pow(10, decimals)).toFixed(decimals);
    }

    /**
     * Log a success message
     */
    logSuccess(message: string) {
        console.log(`  ✅ ${message}`);
    }

    /**
     * Log an info message
     */
    logInfo(message: string) {
        console.log(`  ℹ️  ${message}`);
    }

    /**
     * Log a warning message
     */
    logWarning(message: string) {
        console.log(`  ⚠️  ${message}`);
    }

    /**
     * Log an error message
     */
    logError(message: string) {
        console.log(`  ❌ ${message}`);
    }

    /**
     * Display a table of orders
     */
    logOrderBook(
        symbol: string,
        bids: Array<{ price: number; quantity: number }>,
        asks: Array<{ price: number; quantity: number }>
    ) {
        console.log(`\n  📖 ${symbol} Order Book:`);
        console.log(`\n  🟢 BIDS (Buy Orders):`);
        if (bids.length === 0) {
            console.log(`     No bids`);
        } else {
            bids.forEach((bid, i) => {
                console.log(`     ${i + 1}. $${bid.price.toFixed(2)} × ${bid.quantity}`);
            });
        }

        console.log(`\n  🔴 ASKS (Sell Orders):`);
        if (asks.length === 0) {
            console.log(`     No asks`);
        } else {
            asks.forEach((ask, i) => {
                console.log(`     ${i + 1}. $${ask.price.toFixed(2)} × ${ask.quantity}`);
            });
        }
    }

    /**
     * Display trade summary
     */
    logTradeSummary(trade: {
        buyer: string;
        seller: string;
        symbol: string;
        quantity: number;
        price: number;
        total: number;
        fee: number;
    }) {
        console.log(`\n  🤝 Trade Executed:`);
        console.log(`     Symbol: ${trade.symbol}`);
        console.log(`     Buyer: ${trade.buyer}`);
        console.log(`     Seller: ${trade.seller}`);
        console.log(`     Quantity: ${trade.quantity}`);
        console.log(`     Price: $${trade.price.toFixed(2)}`);
        console.log(`     Total: $${trade.total.toFixed(2)}`);
        console.log(`     Fee: $${trade.fee.toFixed(2)}`);
    }
}

/**
 * Type definitions for test data
 */
export interface MockUser {
    name: string;
    keypair: Keypair;
    publicKey: PublicKey;
    verified: boolean;
    tradingAccount?: PublicKey;
}

export interface MockCompany {
    name: string;
    symbol: string;
    keypair: Keypair;
    publicKey: PublicKey;
    mint: PublicKey;
    totalSupply: number;
}

export interface OrderBookData {
    pda: PublicKey;
    baseVault: PublicKey;
    quoteVault: PublicKey;
    baseMint: PublicKey;
    quoteMint: PublicKey;
}
