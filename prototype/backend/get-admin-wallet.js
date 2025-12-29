const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

// Check if wallet already exists
if (fs.existsSync('backend-wallet.json')) {
    const data = JSON.parse(fs.readFileSync('backend-wallet.json', 'utf8'));
    console.log('\n🔑 EXISTING BACKEND ADMIN WALLET');
    console.log('='.repeat(80));
    console.log('Public Key (Address):', data.publicKey);
    console.log('Private Key (Base58):', data.secretKey);
    console.log('='.repeat(80));
    console.log('\n✅ Use this private key in your .env file as BACKEND_WALLET_SECRET_KEY\n');
} else {
    // Generate new wallet
    const wallet = Keypair.generate();
    const keypairData = {
        publicKey: wallet.publicKey.toBase58(),
        secretKey: bs58.encode(wallet.secretKey)
    };

    fs.writeFileSync('backend-wallet.json', JSON.stringify(keypairData, null, 2));

    console.log('\n🔑 NEW BACKEND ADMIN WALLET GENERATED');
    console.log('='.repeat(80));
    console.log('Public Key (Address):', keypairData.publicKey);
    console.log('Private Key (Base58):', keypairData.secretKey);
    console.log('='.repeat(80));
    console.log('\n✅ Wallet saved to backend-wallet.json');
    console.log('✅ Use the private key above in your .env file as BACKEND_WALLET_SECRET_KEY');
    console.log('\n⚠️  IMPORTANT: Fund this wallet with SOL before using!');
    console.log('   Command: solana airdrop 100 ' + keypairData.publicKey + ' --url localhost\n');
}
