#!/usr/bin/env node

/**
 * Simple Exchange Initialization Script
 * 
 * Run: node init-exchange.js
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n=== Initializing Solana Stock Exchange ===\n');

    // Load IDL
    const idlPath = path.join(__dirname, '../target/idl/exchange_core.json');
    if (!fs.existsSync(idlPath)) {
        console.error('Error: exchange_core.json not found at', idlPath);
        console.log('Run "anchor build" first');
        process.exit(1);
    }
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

    // Config
    const RPC_URL = process.env.SOLANA_RPC_URL || 'http://localhost:8899';
    const PROGRAM_ID = process.env.EXCHANGE_PROGRAM_ID || 'ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD';
    const ADMIN_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY;

    if (!ADMIN_KEY) {
        console.error('Error: Set ADMIN_WALLET_PRIVATE_KEY in .env');
        process.exit(1);
    }

    console.log('RPC:', RPC_URL);
    console.log('Program ID:', PROGRAM_ID);

    // Setup
    const connection = new Connection(RPC_URL, 'confirmed');
    const admin = Keypair.fromSecretKey(bs58.decode(ADMIN_KEY));
    const wallet = new Wallet(admin);

    console.log('Admin:', admin.publicKey.toString());

    // Check balance
    const balance = await connection.getBalance(admin.publicKey);
    console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL\n');

    if (balance < 0.1 * 1e9) {
        console.error('Error: Need at least 0.1 SOL');
        console.log('Run: solana airdrop 1', admin.publicKey.toString());
        process.exit(1);
    }

    // Create provider and program
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl, provider);

    // Get exchange PDA
    const [exchangePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('exchange')],
        new PublicKey(PROGRAM_ID)
    );

    console.log('Exchange PDA:', exchangePDA.toString());

    // Check if already initialized
    try {
        const account = await program.account.exchange.fetch(exchangePDA);
        console.log('\n✅ Already initialized!');
        console.log('Authority:', account.authority.toString());
        console.log('Maker Fee:', account.makerFeeBps, 'bps');
        console.log('Taker Fee:', account.takerFeeBps, 'bps');
        return;
    } catch (e) {
        console.log('Not initialized, creating...\n');
    }

    // Initialize
    const makerFee = 10;  // 0.1%
    const takerFee = 20;  // 0.2%

    console.log('Sending transaction...');
    const tx = await program.methods
        .initializeExchange(makerFee, takerFee)
        .accounts({
            exchange: exchangePDA,
            authority: admin.publicKey,
            feeCollector: admin.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log('\n✅ Exchange initialized!');
    console.log('Transaction:', tx);
    console.log('\nYou can now start the API server.\n');
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    if (err.logs) {
        console.log('\nLogs:', err.logs.join('\n'));
    }
    process.exit(1);
});
