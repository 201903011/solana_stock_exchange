import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { config } from '../config';
import exchangeCoreIDL from '../../../target/idl/exchange_core.json';
import governanceIDL from '../../../target/idl/governance.json';

// Initialize Solana connection
export const connection = new Connection(config.solana.rpcUrl, 'confirmed');

// Load admin wallet from private key
export function getAdminWallet(): Keypair {
    if (!config.solana.adminWalletPrivateKey) {
        throw new Error('Admin wallet private key not configured');
    }
    const privateKey = bs58.decode(config.solana.adminWalletPrivateKey);
    return Keypair.fromSecretKey(privateKey);
}

// Create Anchor provider
export function createProvider(wallet?: Wallet): AnchorProvider {
    const adminWallet = wallet || new Wallet(getAdminWallet());
    return new AnchorProvider(connection, adminWallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
    });
}

// Get Exchange Core program
export function getExchangeProgram(provider?: AnchorProvider): Program {
    const prov = provider || createProvider();
    return new Program(exchangeCoreIDL as any, prov);
}

// Get Governance program
export function getGovernanceProgram(provider?: AnchorProvider): Program {
    const prov = provider || createProvider();
    return new Program(governanceIDL as any, prov);
}

// Get trading account PDA
export function getTradingAccountPDA(userPublicKey: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('trading_account'), userPublicKey.toBuffer()],
        programId
    );
}

// Get order book PDA
export function getOrderBookPDA(baseMint: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('order_book'), baseMint.toBuffer()],
        programId
    );
}

// Get order PDA
export function getOrderPDA(orderBookAddress: PublicKey, orderId: BN, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('order'), orderBookAddress.toBuffer(), orderId.toArrayLike(Buffer, 'le', 8)],
        programId
    );
}

// Get base vault PDA
export function getBaseVaultPDA(orderBookAddress: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), orderBookAddress.toBuffer(), Buffer.from('base')],
        programId
    );
}

// Get SOL vault PDA
export function getSolVaultPDA(orderBookAddress: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('sol_vault'), orderBookAddress.toBuffer()],
        programId
    );
}

// Get exchange PDA
export function getExchangePDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from('exchange')], programId);
}

// Create trading account transaction for user to sign

// Create trading account on Solana
export async function createTradingAccount(userPublicKey: PublicKey): Promise<string> {
    try {
        const program = getExchangeProgram();
        const programId = new PublicKey(config.solana.exchangeProgramId);

        const [exchangePDA] = getExchangePDA(programId);
        const [tradingAccountPDA] = getTradingAccountPDA(userPublicKey, programId);

        const tx = await program.methods
            .initializeTradingAccount()
            .accounts({
                exchange: exchangePDA,
                tradingAccount: tradingAccountPDA,
                owner: userPublicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    } catch (error) {
        console.error('Error creating trading account:', error);
        throw error;
    }
}

// Check if trading account exists, initialize if not
async function ensureTradingAccountInitialized(userPublicKey: PublicKey, programId: PublicKey): Promise<void> {
    try {
        const program = getExchangeProgram();
        const [tradingAccountPDA] = getTradingAccountPDA(userPublicKey, programId);

        // Try to fetch the trading account
        try {
            await (program.account as any).tradingAccount.fetch(tradingAccountPDA);
            // Account exists, no need to initialize
            return;
        } catch (fetchError: any) {
            // Account doesn't exist, initialize it
            if (fetchError.message && (fetchError.message.includes('Account does not exist') || fetchError.message.includes('AccountNotInitialized'))) {
                console.log(`Initializing trading account for user: ${userPublicKey.toString()}`);

                const [exchangePDA] = getExchangePDA(programId);
                const adminWallet = getAdminWallet();

                // Admin wallet initializes the trading account for the user
                await program.methods
                    .initializeTradingAccount()
                    .accounts({
                        exchange: exchangePDA,
                        tradingAccount: tradingAccountPDA,
                        owner: userPublicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([adminWallet])
                    .rpc();

                console.log(`Trading account initialized successfully for user: ${userPublicKey.toString()}`);
                return;
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('Error ensuring trading account initialized:', error);
        throw error;
    }
}

// Get token account or create if doesn't exist
export async function getOrCreateTokenAccount(
    userPublicKey: PublicKey,
    mintPublicKey: PublicKey
): Promise<PublicKey> {
    const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        userPublicKey
    );

    try {
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
        if (accountInfo) {
            return associatedTokenAddress;
        }
    } catch (error) {
        // Account doesn't exist, will create it
    }

    // Create associated token account
    const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
            userPublicKey,
            associatedTokenAddress,
            userPublicKey,
            mintPublicKey
        )
    );

    // This should be signed and sent by the user's wallet
    return associatedTokenAddress;
}

// Initialize order book for a token
export async function initializeOrderBook(
    baseMint: PublicKey,
    tickSize: string = '1000000', // 0.001 SOL with 9 decimals
    minOrderSize: string = '1'
): Promise<{ orderBookAddress: string; baseVaultAddress: string; solVaultAddress: string; signature: string }> {
    try {
        const program = getExchangeProgram();
        const programId = new PublicKey(config.solana.exchangeProgramId);
        const adminWallet = getAdminWallet();

        const [exchangePDA] = getExchangePDA(programId);
        const [orderBookPDA] = getOrderBookPDA(baseMint, programId);
        const [baseVaultPDA] = getBaseVaultPDA(orderBookPDA, programId);
        const [solVaultPDA] = getSolVaultPDA(orderBookPDA, programId);

        console.log('Initializing order book...');
        console.log('Exchange PDA:', exchangePDA.toString());
        console.log('Order Book PDA:', orderBookPDA.toString());
        console.log('Base Vault PDA:', baseVaultPDA.toString());
        console.log('SOL Vault PDA:', solVaultPDA.toString());

        // Get the SYSVAR_RENT_PUBKEY
        const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');

        const tx = await program.methods
            .initializeOrderBook(
                baseMint,
                new BN(tickSize),
                new BN(minOrderSize)
            )
            .accounts({
                exchange: exchangePDA,
                orderBook: orderBookPDA,
                baseMint: baseMint,
                baseVault: baseVaultPDA,
                solVault: solVaultPDA,
                authority: adminWallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log('Order book initialized successfully:', tx);

        return {
            orderBookAddress: orderBookPDA.toString(),
            baseVaultAddress: baseVaultPDA.toString(),
            solVaultAddress: solVaultPDA.toString(),
            signature: tx
        };
    } catch (error) {
        console.error('Error initializing order book:', error);
        throw error;
    }
}

// Place limit order
export async function placeLimitOrder(
    userPublicKey: PublicKey,
    companyTokenMint: string,
    side: 'BUY' | 'SELL',
    price: string,
    quantity: string
): Promise<string> {
    try {
        const program = getExchangeProgram();
        const programId = new PublicKey(config.solana.exchangeProgramId);

        const baseMint = new PublicKey(companyTokenMint);
        const [exchangePDA] = getExchangePDA(programId);
        const [orderBookPDA] = getOrderBookPDA(baseMint, programId);
        const [tradingAccountPDA] = getTradingAccountPDA(userPublicKey, programId);

        // Ensure trading account is initialized
        await ensureTradingAccountInitialized(userPublicKey, programId);

        // Check if order book exists and get tick size
        try {
            const orderBook = await (program.account as any).orderBook.fetch(orderBookPDA);
            if (!orderBook) {
                throw new Error(`Order book does not exist for token ${companyTokenMint}. Please initialize the order book first.`);
            }
            const orderId = orderBook.nextOrderId;
            const tickSize = orderBook.tickSize as BN;

            // Align price to tick size
            // Price must be a multiple of tick size
            const priceNum = new BN(price);
            const remainder = priceNum.mod(tickSize);

            let alignedPrice: BN;
            if (remainder.isZero()) {
                alignedPrice = priceNum;
            } else {
                // Round down to nearest tick size multiple
                alignedPrice = priceNum.sub(remainder);
                console.log(`Price ${price} not aligned to tick size ${tickSize.toString()}`);
                console.log(`Aligned price to ${alignedPrice.toString()}`);
            }

            // Validate aligned price
            if (alignedPrice.isZero() || alignedPrice.isNeg()) {
                throw new Error(`Invalid price: ${price}. Price must be at least ${tickSize.toString()} (one tick size)`);
            }

            const [orderPDA] = getOrderPDA(orderBookPDA, orderId, programId);
            const [baseVaultPDA] = getBaseVaultPDA(orderBookPDA, programId);
            const [solVaultPDA] = getSolVaultPDA(orderBookPDA, programId);

            const traderBaseAccount = await getOrCreateTokenAccount(userPublicKey, baseMint);

            const orderSide = side === 'BUY' ? { bid: {} } : { ask: {} };

            const adminWallet = getAdminWallet();

            const tx = await program.methods
                .placeLimitOrder(
                    orderSide,
                    alignedPrice,
                    new BN(quantity)
                )
                .accounts({
                    exchange: exchangePDA,
                    orderBook: orderBookPDA,
                    order: orderPDA,
                    tradingAccount: tradingAccountPDA,
                    trader: userPublicKey,
                    traderBaseAccount,
                    baseVault: baseVaultPDA,
                    solVault: solVaultPDA,
                    authority: adminWallet.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            return tx;
        } catch (fetchError: any) {
            if (fetchError.message && fetchError.message.includes('Account does not exist')) {
                throw new Error(`Order book not initialized for token ${companyTokenMint}. Please contact admin to initialize the order book.`);
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('Error placing limit order:', error);
        throw error;
    }
}

// Place market order
export async function placeMarketOrder(
    userPublicKey: PublicKey,
    companyTokenMint: string,
    side: 'BUY' | 'SELL',
    quantity: string,
    maxQuoteAmount: string
): Promise<string> {
    try {
        const program = getExchangeProgram();
        const programId = new PublicKey(config.solana.exchangeProgramId);

        const baseMint = new PublicKey(companyTokenMint);
        const [exchangePDA] = getExchangePDA(programId);
        const [orderBookPDA] = getOrderBookPDA(baseMint, programId);
        const [tradingAccountPDA] = getTradingAccountPDA(userPublicKey, programId);
        const [baseVaultPDA] = getBaseVaultPDA(orderBookPDA, programId);
        const [solVaultPDA] = getSolVaultPDA(orderBookPDA, programId);

        // Ensure trading account is initialized
        await ensureTradingAccountInitialized(userPublicKey, programId);

        const traderBaseAccount = await getOrCreateTokenAccount(userPublicKey, baseMint);

        const orderSide = side === 'BUY' ? { bid: {} } : { ask: {} };

        const tx = await program.methods
            .placeMarketOrder(
                orderSide,
                new BN(quantity),
                new BN(maxQuoteAmount)
            )
            .accounts({
                exchange: exchangePDA,
                orderBook: orderBookPDA,
                tradingAccount: tradingAccountPDA,
                trader: userPublicKey,
                traderBaseAccount,
                baseVault: baseVaultPDA,
                solVault: solVaultPDA,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    } catch (error) {
        console.error('Error placing market order:', error);
        throw error;
    }
}

// Cancel order
export async function cancelOrder(
    userPublicKey: PublicKey,
    companyTokenMint: string,
    orderId: string
): Promise<string> {
    try {
        const program = getExchangeProgram();
        const programId = new PublicKey(config.solana.exchangeProgramId);

        const baseMint = new PublicKey(companyTokenMint);
        const [orderBookPDA] = getOrderBookPDA(baseMint, programId);
        const [orderPDA] = getOrderPDA(orderBookPDA, new BN(orderId), programId);
        const [baseVaultPDA] = getBaseVaultPDA(orderBookPDA, programId);
        const [solVaultPDA] = getSolVaultPDA(orderBookPDA, programId);

        const traderBaseAccount = await getOrCreateTokenAccount(userPublicKey, baseMint);

        const tx = await program.methods
            .cancelOrder(new BN(orderId))
            .accounts({
                orderBook: orderBookPDA,
                order: orderPDA,
                trader: userPublicKey,
                traderBaseAccount,
                baseVault: baseVaultPDA,
                solVault: solVaultPDA,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    } catch (error) {
        console.error('Error cancelling order:', error);
        throw error;
    }
}

// Get user token balance
export async function getUserTokenBalance(
    userPublicKey: PublicKey,
    tokenMint: PublicKey
): Promise<bigint> {
    try {
        const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        return BigInt(accountInfo.value.amount);
    } catch (error) {
        return BigInt(0);
    }
}

// Get user SOL balance
export async function getUserSolBalance(userPublicKey: PublicKey): Promise<bigint> {
    try {
        const balance = await connection.getBalance(userPublicKey);
        return BigInt(balance);
    } catch (error) {
        return BigInt(0);
    }
}

// Convert lamports to SOL
export function lamportsToSol(lamports: bigint): number {
    return Number(lamports) / LAMPORTS_PER_SOL;
}

// Convert SOL to lamports
export function solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}
