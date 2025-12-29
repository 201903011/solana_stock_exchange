import {
    Connection,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    ConfirmOptions,
    Commitment,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { config } from '../config';
import logger from './logger';

// Create Solana connection
export const connection = new Connection(config.solana.rpcUrl, 'confirmed' as Commitment);

// Verify transaction signature
export const verifyTransactionSignature = async (
    signature: string,
    commitment: Commitment = 'confirmed'
): Promise<boolean> => {
    try {
        const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
        });

        if (!status || !status.value) {
            return false;
        }

        // Check if transaction was successful
        if (status.value.err) {
            logger.error(`Transaction ${signature} failed:`, status.value.err);
            return false;
        }

        // Check confirmation status
        if (status.value.confirmationStatus === commitment ||
            status.value.confirmationStatus === 'finalized') {
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`Error verifying transaction ${signature}:`, error);
        return false;
    }
};

// Get transaction details
export const getTransactionDetails = async (signature: string) => {
    try {
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });

        return transaction;
    } catch (error) {
        logger.error(`Error getting transaction ${signature}:`, error);
        return null;
    }
};

// Get SOL balance
export const getSOLBalance = async (publicKey: PublicKey): Promise<bigint> => {
    try {
        const balance = await connection.getBalance(publicKey);
        return BigInt(balance);
    } catch (error) {
        logger.error(`Error getting SOL balance for ${publicKey.toString()}:`, error);
        throw error;
    }
};

// Get SPL token balance
export const getTokenBalance = async (
    walletAddress: PublicKey,
    mintAddress: PublicKey
): Promise<bigint> => {
    try {
        const tokenAccountAddress = await getAssociatedTokenAddress(
            mintAddress,
            walletAddress
        );

        const tokenAccount = await getAccount(connection, tokenAccountAddress);
        return BigInt(tokenAccount.amount.toString());
    } catch (error) {
        logger.error(
            `Error getting token balance for wallet ${walletAddress.toString()} and mint ${mintAddress.toString()}:`,
            error
        );
        return BigInt(0);
    }
};

// Verify message signature
export const verifySignature = (
    message: string,
    signature: string,
    publicKey: string
): boolean => {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(publicKey);

        return nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );
    } catch (error) {
        logger.error('Error verifying signature:', error);
        return false;
    }
};

// Convert lamports to SOL
export const lamportsToSOL = (lamports: bigint): number => {
    return Number(lamports) / LAMPORTS_PER_SOL;
};

// Convert SOL to lamports
export const solToLamports = (sol: number): bigint => {
    return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
};

// Parse public key safely
export const parsePublicKey = (publicKeyString: string): PublicKey | null => {
    try {
        return new PublicKey(publicKeyString);
    } catch (error) {
        logger.error(`Invalid public key: ${publicKeyString}`, error);
        return null;
    }
};

// Validate Solana address
export const isValidSolanaAddress = (address: string): boolean => {
    try {
        new PublicKey(address);
        return true;
    } catch (error) {
        return false;
    }
};

// Find Program Derived Address
export const findPDA = (
    seeds: (Buffer | Uint8Array)[],
    programId: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(seeds, programId);
};

// Get associated token address
export const getAssociatedTokenAddressSync = (
    mint: PublicKey,
    owner: PublicKey
): PublicKey => {
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    );

    const [address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return address;
};

// Wait for transaction confirmation
export const confirmTransaction = async (
    signature: string,
    commitment: Commitment = 'confirmed'
): Promise<boolean> => {
    try {
        const latestBlockhash = await connection.getLatestBlockhash();

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            commitment
        );

        if (confirmation.value.err) {
            logger.error(`Transaction ${signature} failed:`, confirmation.value.err);
            return false;
        }

        return true;
    } catch (error) {
        logger.error(`Error confirming transaction ${signature}:`, error);
        return false;
    }
};

// Get recent blockhash
export const getRecentBlockhash = async () => {
    return connection.getLatestBlockhash('finalized');
};

// Airdrop SOL (for testing only)
export const airdropSOL = async (
    publicKey: PublicKey,
    amount: number
): Promise<string> => {
    try {
        const signature = await connection.requestAirdrop(
            publicKey,
            amount * LAMPORTS_PER_SOL
        );

        await confirmTransaction(signature);
        return signature;
    } catch (error) {
        logger.error(`Error airdropping SOL to ${publicKey.toString()}:`, error);
        throw error;
    }
};

// Get transaction fee
export const getTransactionFee = async (transaction: Transaction): Promise<number> => {
    try {
        const fee = await connection.getFeeForMessage(
            transaction.compileMessage(),
            'confirmed'
        );

        return fee.value || 5000; // Default to 5000 lamports if unable to get fee
    } catch (error) {
        logger.error('Error getting transaction fee:', error);
        return 5000; // Default fee
    }
};

// Validate transaction before sending
export const validateTransaction = async (signature: string): Promise<{
    isValid: boolean;
    error?: string;
}> => {
    try {
        const tx = await getTransactionDetails(signature);

        if (!tx) {
            return { isValid: false, error: 'Transaction not found' };
        }

        if (tx.meta?.err) {
            return { isValid: false, error: 'Transaction failed on chain' };
        }

        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: (error as Error).message };
    }
};

// Convert INR to SOL amount
export const convertINRToSOL = (amountInr: number): number => {
    return amountInr / config.exchange.solToInrRate;
};

// Convert SOL to INR amount
export const convertSOLToINR = (amountSOL: number): number => {
    return amountSOL * config.exchange.solToInrRate;
};

export default {
    connection,
    verifyTransactionSignature,
    getTransactionDetails,
    getSOLBalance,
    getTokenBalance,
    verifySignature,
    lamportsToSOL,
    solToLamports,
    parsePublicKey,
    isValidSolanaAddress,
    findPDA,
    getAssociatedTokenAddressSync,
    confirmTransaction,
    getRecentBlockhash,
    airdropSOL,
    getTransactionFee,
    validateTransaction,
    convertINRToSOL,
    convertSOLToINR,
};
