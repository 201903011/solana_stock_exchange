/**
 * Initialize Exchange Script
 * 
 * This script initializes the core exchange account on Solana.
 * This needs to be run ONCE before any other operations.
 * 
 * Usage:
 *   ts-node initialize-exchange.ts
 */

import { initializeExchange, isExchangeInitialized } from './src/utils/solana';
import { config } from './src/config';

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║       Solana Stock Exchange - Initialize Exchange        ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Network:', config.solana.network);
    console.log('RPC URL:', config.solana.rpcUrl);
    console.log('Program ID:', config.solana.exchangeProgramId);
    console.log('');

    try {
        // Check if exchange is already initialized
        console.log('Checking if exchange is already initialized...');
        const isInitialized = await isExchangeInitialized();

        if (isInitialized) {
            console.log('✅ Exchange is already initialized!');
            console.log('');
            console.log('You can now:');
            console.log('1. Initialize order books for tokens');
            console.log('2. Start the API server');
            console.log('3. Allow users to create trading accounts');
            return;
        }

        console.log('Exchange not initialized. Initializing now...');
        console.log('');

        // Initialize with default fee structure
        // Maker fee: 10 bps (0.1%)
        // Taker fee: 20 bps (0.2%)
        const signature = await initializeExchange(
            undefined, // Use admin wallet as fee collector
            10,        // Maker fee: 0.1%
            20         // Taker fee: 0.2%
        );

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                                                           ║');
        console.log('║       ✅ Exchange Initialized Successfully!                ║');
        console.log('║                                                           ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('Transaction Signature:', signature);
        console.log('');
        console.log('Next steps:');
        console.log('1. Initialize order books for your tokens');
        console.log('2. Start the API server: npm start');
        console.log('3. Users can now register and create trading accounts');
        console.log('');
    } catch (error: any) {
        console.error('');
        console.error('❌ Error initializing exchange:');
        console.error(error.message || error);
        console.error('');

        if (error.message && error.message.includes('already in use')) {
            console.log('Note: If you see "already in use" error, the exchange might already be initialized.');
            console.log('Try checking the exchange state on Solana explorer.');
        }

        process.exit(1);
    }
}

main().catch(console.error);
