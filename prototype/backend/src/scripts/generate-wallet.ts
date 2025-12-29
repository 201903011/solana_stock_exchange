import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as bs58 from 'bs58';

// Generate a new wallet for the backend
const wallet = Keypair.generate();

// Save keypair to file
const keypairData = {
    publicKey: wallet.publicKey.toBase58(),
    secretKey: bs58.encode(wallet.secretKey)
};

fs.writeFileSync(
    'backend-wallet.json',
    JSON.stringify(keypairData, null, 2)
);

console.log('🔑 Backend Wallet Generated!');
console.log('==========================================');
console.log('Public Key:', wallet.publicKey.toBase58());
console.log('==========================================');
console.log('\n✅ Wallet saved to backend-wallet.json');
console.log('\n⚠️  IMPORTANT:');
console.log('1. Copy the secretKey from backend-wallet.json');
console.log('2. Add it to your .env file as BACKEND_WALLET_SECRET_KEY');
console.log('3. Fund this wallet with SOL for transactions');
console.log('4. NEVER commit backend-wallet.json to git!\n');
