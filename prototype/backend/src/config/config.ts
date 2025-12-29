import dotenv from 'dotenv';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as bs58 from 'bs58';

dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899',
    backendWalletSecretKey: process.env.BACKEND_WALLET_SECRET_KEY || '',
};

// Initialize Solana connection
export const connection = new Connection(config.solanaRpcUrl, 'confirmed');

// Load backend wallet
let backendWallet: Keypair;

export const getBackendWallet = (): Keypair => {
    if (!backendWallet) {
        if (!config.backendWalletSecretKey) {
            throw new Error('BACKEND_WALLET_SECRET_KEY not set in .env file');
        }

        try {
            const secretKey = bs58.decode(config.backendWalletSecretKey);
            backendWallet = Keypair.fromSecretKey(secretKey);
            console.log('✅ Backend wallet loaded:', backendWallet.publicKey.toBase58());
        } catch (error) {
            throw new Error('Invalid BACKEND_WALLET_SECRET_KEY format');
        }
    }

    return backendWallet;
};

export default config;
