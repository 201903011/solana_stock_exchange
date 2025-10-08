/**
 * Test Helpers and Utilities
 * Common functions used across integration tests
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
    Connection,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createMint,
    mintTo,
    getAccount,
    createAssociatedTokenAccount,
} from "@solana/spl-token";
import { MockUser, MockCompany } from "./mock-data";

/**
 * Airdrop SOL to a user
 */
export async function airdropSOL(
    connection: Connection,
    publicKey: PublicKey,
    amount: number
): Promise<void> {
    const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);
    console.log(`💰 Airdropped ${amount} SOL to ${publicKey.toString().slice(0, 8)}...`);
}

/**
 * Get SOL balance
 */
export async function getSOLBalance(
    connection: Connection,
    publicKey: PublicKey
): Promise<number> {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
}

/**
 * Get token balance
 */
export async function getTokenBalance(
    connection: Connection,
    tokenAccount: PublicKey
): Promise<number> {
    try {
        const account = await getAccount(connection, tokenAccount);
        return Number(account.amount);
    } catch (e) {
        return 0;
    }
}

/**
 * Create SPL token mint for a stock
 */
export async function createStockToken(
    connection: Connection,
    payer: Keypair,
    company: MockCompany
): Promise<PublicKey> {
    console.log(`🪙 Creating SPL token for ${company.name} (${company.symbol})...`);

    const mintAuthority = payer;
    const freezeAuthority = payer;

    const mint = await createMint(
        connection,
        payer,
        mintAuthority.publicKey,
        freezeAuthority.publicKey,
        9 // 9 decimals
    );

    company.tokenMint = mint;
    console.log(`✅ Token created: ${mint.toString()}`);

    return mint;
}

/**
 * Mint stock tokens to a user
 */
export async function mintStockTokens(
    connection: Connection,
    payer: Keypair,
    mint: PublicKey,
    destination: PublicKey,
    amount: number
): Promise<void> {
    console.log(`🏭 Minting ${amount} tokens to ${destination.toString().slice(0, 8)}...`);

    await mintTo(
        connection,
        payer,
        mint,
        destination,
        payer,
        amount
    );

    console.log(`✅ Minted ${amount} tokens`);
}

/**
 * Get or create associated token account
 */
export async function getOrCreateATA(
    connection: Connection,
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
): Promise<PublicKey> {
    const ata = await getAssociatedTokenAddress(mint, owner);

    try {
        await getAccount(connection, ata);
        return ata;
    } catch (e) {
        console.log(`📦 Creating ATA for ${owner.toString().slice(0, 8)}...`);
        await createAssociatedTokenAccount(
            connection,
            payer,
            mint,
            owner
        );
        return ata;
    }
}

/**
 * Find PDA for exchange config
 */
export function findExchangePDA(
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("exchange")],
        programId
    );
}

/**
 * Find PDA for order book
 */
export function findOrderBookPDA(
    baseMint: PublicKey,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("order_book"), baseMint.toBuffer()],
        programId
    );
}

/**
 * Find PDA for trading account
 */
export function findTradingAccountPDA(
    user: PublicKey,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account"), user.toBuffer()],
        programId
    );
}

/**
 * Find PDA for order
 */
export function findOrderPDA(
    orderBook: PublicKey,
    orderId: anchor.BN,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("order"),
            orderBook.toBuffer(),
            orderId.toArrayLike(Buffer, "le", 8),
        ],
        programId
    );
}

/**
 * Find PDA for escrow
 */
export function findEscrowPDA(
    tradeId: anchor.BN,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            tradeId.toArrayLike(Buffer, "le", 8),
        ],
        programId
    );
}

/**
 * Find PDA for fee config
 */
export function findFeeConfigPDA(
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("fee_config")],
        programId
    );
}

/**
 * Print section header
 */
export function printSection(title: string) {
    console.log("\n" + "=".repeat(70));
    console.log(`  ${title}`);
    console.log("=".repeat(70) + "\n");
}

/**
 * Print subsection header
 */
export function printSubSection(title: string) {
    console.log("\n" + "-".repeat(50));
    console.log(`  ${title}`);
    console.log("-".repeat(50));
}

/**
 * Wait for a specified time
 */
export async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format SOL amount
 */
export function formatSOL(lamports: number): string {
    return `${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`;
}

/**
 * Format token amount
 */
export function formatTokens(amount: number, decimals: number = 9): string {
    return `${(amount / Math.pow(10, decimals)).toFixed(4)}`;
}

/**
 * Generate Solana Explorer URL for an address
 * @param address - Public key or address string
 * @param cluster - Network cluster (localnet, devnet, testnet, mainnet-beta)
 */
export function getExplorerUrl(address: string | PublicKey, cluster: string = "custom"): string {
    const addressStr = typeof address === "string" ? address : address.toString();

    if (cluster === "localnet" || cluster === "custom") {
        // For localnet, return a custom cluster URL
        return `https://explorer.solana.com/address/${addressStr}?cluster=custom&customUrl=http://127.0.0.1:8899`;
    }

    return `https://explorer.solana.com/address/${addressStr}${cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""}`;
}

/**
 * Generate Solana Explorer URL for a transaction
 * @param signature - Transaction signature
 * @param cluster - Network cluster
 */
export function getExplorerTxUrl(signature: string, cluster: string = "custom"): string {
    if (cluster === "localnet" || cluster === "custom") {
        return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http://127.0.0.1:8899`;
    }

    return `https://explorer.solana.com/tx/${signature}${cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""}`;
}

/**
 * Print address with explorer link
 */
export function printAddressWithExplorer(label: string, address: string | PublicKey, cluster: string = "custom") {
    const addressStr = typeof address === "string" ? address : address.toString();
    console.log(`${label}: ${addressStr}`);
    console.log(`   🔗 Explorer: ${getExplorerUrl(addressStr, cluster)}`);
}

/**
 * Print transaction with explorer link
 */
export function printTxWithExplorer(label: string, signature: string, cluster: string = "custom") {
    console.log(`${label}: ${signature}`);
    console.log(`   🔗 Explorer: ${getExplorerTxUrl(signature, cluster)}`);
}
