#!/usr/bin/env node

// Script to generate a new Solana wallet or convert existing keypair to base58
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

console.log('\n🔑 Solana Wallet Key Generator\n');
console.log('Choose an option:');
console.log('1. Generate a NEW wallet');
console.log('2. Convert existing keypair JSON to base58');
console.log('3. Use default Solana keypair (~/.config/solana/id.json)\n');

const args = process.argv.slice(2);
const option = args[0] || '1';

switch (option) {
    case '1':
        // Generate new wallet
        const newKeypair = Keypair.generate();
        const newPrivateKey = bs58.encode(newKeypair.secretKey);

        console.log('✅ New wallet generated!\n');
        console.log('Public Key (Address):', newKeypair.publicKey.toString());
        console.log('\n⚠️  SAVE THIS PRIVATE KEY SECURELY:');
        console.log('─────────────────────────────────────────────────────────');
        console.log(newPrivateKey);
        console.log('─────────────────────────────────────────────────────────\n');
        console.log('Add this to your .env file:');
        console.log(`ADMIN_WALLET_PRIVATE_KEY=${newPrivateKey}\n`);

        // Save to file
        const keyPath = path.join(__dirname, 'admin-wallet.json');
        fs.writeFileSync(keyPath, JSON.stringify(Array.from(newKeypair.secretKey)));
        console.log(`💾 Keypair also saved to: ${keyPath}\n`);
        console.log('⚠️  Keep this file secure and never commit it to git!\n');
        break;

    case '2':
        // Convert existing keypair
        const keypairPath = args[1];
        if (!keypairPath) {
            console.error('❌ Please provide path to keypair JSON file');
            console.log('Usage: node generate-wallet.js 2 /path/to/keypair.json\n');
            process.exit(1);
        }

        try {
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
            const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
            const privateKey = bs58.encode(keypair.secretKey);

            console.log('✅ Keypair converted!\n');
            console.log('Public Key:', keypair.publicKey.toString());
            console.log('\nPrivate Key (base58):');
            console.log('─────────────────────────────────────────────────────────');
            console.log(privateKey);
            console.log('─────────────────────────────────────────────────────────\n');
            console.log('Add this to your .env file:');
            console.log(`ADMIN_WALLET_PRIVATE_KEY=${privateKey}\n`);
        } catch (error) {
            console.error('❌ Error reading keypair:', error.message);
            process.exit(1);
        }
        break;

    case '3':
        // Use default Solana keypair
        const defaultPath = path.join(require('os').homedir(), '.config/solana/id.json');

        try {
            const defaultKeypairData = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
            const defaultKeypair = Keypair.fromSecretKey(Uint8Array.from(defaultKeypairData));
            const defaultPrivateKey = bs58.encode(defaultKeypair.secretKey);

            console.log('✅ Using default Solana keypair!\n');
            console.log('Public Key:', defaultKeypair.publicKey.toString());
            console.log('\nPrivate Key (base58):');
            console.log('─────────────────────────────────────────────────────────');
            console.log(defaultPrivateKey);
            console.log('─────────────────────────────────────────────────────────\n');
            console.log('Add this to your .env file:');
            console.log(`ADMIN_WALLET_PRIVATE_KEY=${defaultPrivateKey}\n`);
        } catch (error) {
            console.error('❌ Error reading default keypair:', error.message);
            console.log('Default keypair not found. Generate a new one with option 1.\n');
            process.exit(1);
        }
        break;

    default:
        console.error('❌ Invalid option');
        process.exit(1);
}
