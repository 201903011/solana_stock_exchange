import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    transfer,
    getAccount,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { config } from '../config';

export class SolanaService {
    private connection: Connection;
    private adminKeypair?: Keypair;

    constructor() {
        this.connection = new Connection(config.solana.rpcUrl, 'confirmed');

        // Load admin keypair if available
        if (config.solana.adminWalletPrivateKey) {
            try {
                const secretKey = Uint8Array.from(JSON.parse(config.solana.adminWalletPrivateKey));
                this.adminKeypair = Keypair.fromSecretKey(secretKey);
            } catch (error) {
                console.error('Failed to load admin keypair:', error);
            }
        }
    }

    /**
     * Get SOL balance for an address
     */
    async getSOLBalance(address: PublicKey): Promise<number> {
        try {
            const balance = await this.connection.getBalance(address);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Error getting SOL balance:', error);
            throw error;
        }
    }

    /**
     * Get SPL token balance for an account
     */
    async getTokenBalance(tokenAccountAddress: PublicKey): Promise<bigint> {
        try {
            const account = await getAccount(this.connection, tokenAccountAddress);
            return account.amount;
        } catch (error) {
            console.error('Error getting token balance:', error);
            return BigInt(0);
        }
    }

    /**
     * Airdrop SOL to an address (for testing/development)
     */
    async airdropSOL(address: PublicKey, amount: number): Promise<string> {
        try {
            const amountLamports = amount * LAMPORTS_PER_SOL;
            const signature = await this.connection.requestAirdrop(address, amountLamports);
            await this.connection.confirmTransaction(signature);

            console.log(`💰 Airdropped ${amount} SOL to ${address.toString().slice(0, 8)}...`);
            return signature;
        } catch (error) {
            console.error('Error airdropping SOL:', error);
            throw error;
        }
    }

    /**
     * Create a new SPL token mint
     */
    async createToken(
        symbol: string,
        totalSupply: number,
        decimals: number = 9
    ): Promise<{ mintAddress: PublicKey; signature: string }> {
        try {
            if (!this.adminKeypair) {
                throw new Error('Admin keypair not configured');
            }

            console.log(`🏭 Creating ${symbol} token mint...`);

            const mintAddress = await createMint(
                this.connection,
                this.adminKeypair,
                this.adminKeypair.publicKey,
                this.adminKeypair.publicKey,
                decimals
            );

            console.log(`${symbol} Token Mint: ${mintAddress.toString()}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Decimals: ${decimals}`);
            console.log(`Total Supply: ${totalSupply.toLocaleString()}`);
            console.log(`Status: ✅ Created on-chain`);

            return {
                mintAddress,
                signature: 'token_creation_success' // In a real implementation, this would be the transaction signature
            };
        } catch (error) {
            console.error('Error creating token:', error);
            throw error;
        }
    }

    /**
     * Create associated token account for a user
     */
    async createTokenAccount(
        userPublicKey: PublicKey,
        mintAddress: PublicKey,
        payer?: Keypair
    ): Promise<{ tokenAccountAddress: PublicKey; signature?: string }> {
        try {
            const payerKeypair = payer || this.adminKeypair;
            if (!payerKeypair) {
                throw new Error('No payer available for token account creation');
            }

            console.log(`📦 Creating associated token account...`);

            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                payerKeypair,
                mintAddress,
                userPublicKey
            );

            console.log(`Token Account: ${tokenAccount.address.toString()}`);
            console.log(`Owner: ${userPublicKey.toString().slice(0, 16)}...`);
            console.log(`Mint: ${mintAddress.toString().slice(0, 16)}...`);
            console.log(`Status: ✅ Created`);

            return {
                tokenAccountAddress: tokenAccount.address,
                signature: undefined // getOrCreateAssociatedTokenAccount doesn't return signature
            };
        } catch (error) {
            console.error('Error creating token account:', error);
            throw error;
        }
    }

    /**
     * Mint tokens to a user's account
     */
    async mintTokens(
        mintAddress: PublicKey,
        tokenAccountAddress: PublicKey,
        amount: number,
        decimals: number = 9
    ): Promise<string> {
        try {
            if (!this.adminKeypair) {
                throw new Error('Admin keypair not configured');
            }

            console.log(`🏭 Minting ${amount} tokens...`);

            const amountWithDecimals = BigInt(amount * Math.pow(10, decimals));

            const signature = await mintTo(
                this.connection,
                this.adminKeypair,
                mintAddress,
                tokenAccountAddress,
                this.adminKeypair.publicKey,
                amountWithDecimals
            );

            console.log(`✅ Minted: ${amount} tokens`);
            console.log(`Transaction: ${signature}`);

            return signature;
        } catch (error) {
            console.error('Error minting tokens:', error);
            throw error;
        }
    }

    /**
     * Transfer SOL between accounts
     */
    async transferSOL(
        fromKeypair: Keypair,
        toPublicKey: PublicKey,
        amount: number
    ): Promise<string> {
        try {
            console.log(`💸 Transferring ${amount} SOL...`);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toPublicKey,
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [fromKeypair]
            );

            console.log(`✅ SOL Transfer: ${amount} SOL`);
            console.log(`From: ${fromKeypair.publicKey.toString().slice(0, 16)}...`);
            console.log(`To: ${toPublicKey.toString().slice(0, 16)}...`);
            console.log(`Transaction: ${signature}`);

            return signature;
        } catch (error) {
            console.error('Error transferring SOL:', error);
            throw error;
        }
    }

    /**
     * Transfer SPL tokens between accounts
     */
    async transferTokens(
        fromKeypair: Keypair,
        fromTokenAccount: PublicKey,
        toTokenAccount: PublicKey,
        amount: number,
        decimals: number = 9
    ): Promise<string> {
        try {
            console.log(`🔄 Transferring ${amount} tokens...`);

            const amountWithDecimals = BigInt(amount * Math.pow(10, decimals));

            const signature = await transfer(
                this.connection,
                fromKeypair,
                fromTokenAccount,
                toTokenAccount,
                fromKeypair,
                amountWithDecimals
            );

            console.log(`✅ Token Transfer: ${amount} tokens`);
            console.log(`From: ${fromTokenAccount.toString().slice(0, 16)}...`);
            console.log(`To: ${toTokenAccount.toString().slice(0, 16)}...`);
            console.log(`Transaction: ${signature}`);

            return signature;
        } catch (error) {
            console.error('Error transferring tokens:', error);
            throw error;
        }
    }

    /**
     * Get current block height
     */
    async getBlockHeight(): Promise<number> {
        try {
            return await this.connection.getBlockHeight();
        } catch (error) {
            console.error('Error getting block height:', error);
            throw error;
        }
    }

    /**
     * Get current slot
     */
    async getSlot(): Promise<number> {
        try {
            return await this.connection.getSlot();
        } catch (error) {
            console.error('Error getting slot:', error);
            throw error;
        }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForConfirmation(signature: string, commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Promise<void> {
        try {
            await this.connection.confirmTransaction(signature, commitment);
        } catch (error) {
            console.error('Error waiting for confirmation:', error);
            throw error;
        }
    }

    /**
     * Get Solana Explorer URL
     */
    getExplorerUrl(addressOrSignature: string, type: 'address' | 'tx' = 'address'): string {
        const baseUrl = 'https://explorer.solana.com';
        const rpcParam = config.solana.rpcUrl.includes('localhost') || config.solana.rpcUrl.includes('127.0.0.1')
            ? 'cluster=custom&customUrl=' + encodeURIComponent(config.solana.rpcUrl)
            : 'cluster=devnet';

        if (type === 'tx') {
            return `${baseUrl}/tx/${addressOrSignature}?${rpcParam}`;
        } else {
            return `${baseUrl}/address/${addressOrSignature}?${rpcParam}`;
        }
    }

    /**
     * Print address with explorer link
     */
    printAddressWithExplorer(label: string, address: PublicKey | string): void {
        const addressStr = typeof address === 'string' ? address : address.toString();
        console.log(`${label}: ${addressStr}`);
        console.log(`🔗 Explorer: ${this.getExplorerUrl(addressStr)}`);
    }

    /**
     * Generate new keypair
     */
    generateKeypair(): Keypair {
        return Keypair.generate();
    }

    /**
     * Get associated token address
     */
    getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
        return getAssociatedTokenAddressSync(mint, owner);
    }

    /**
     * Check if account exists
     */
    async accountExists(address: PublicKey): Promise<boolean> {
        try {
            const accountInfo = await this.connection.getAccountInfo(address);
            return accountInfo !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Format lamports to SOL
     */
    formatSOL(lamports: number): string {
        return (lamports / LAMPORTS_PER_SOL).toFixed(4);
    }

    /**
     * Format tokens with decimals
     */
    formatTokens(amount: bigint, decimals: number = 9): string {
        const divisor = BigInt(Math.pow(10, decimals));
        const quotient = amount / divisor;
        const remainder = amount % divisor;
        const fractional = remainder.toString().padStart(decimals, '0');

        return `${quotient}.${fractional}`;
    }

    /**
     * Get connection instance
     */
    getConnection(): Connection {
        return this.connection;
    }

    /**
     * Get admin public key
     */
    getAdminPublicKey(): PublicKey | null {
        return this.adminKeypair?.publicKey || null;
    }
}

// Export singleton instance
export const solanaService = new SolanaService();