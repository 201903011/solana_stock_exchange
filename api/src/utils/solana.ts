import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@project-serum/anchor';
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
    return new Program(exchangeCoreIDL as any, config.solana.exchangeProgramId, prov);
}

// Get Governance program
export function getGovernanceProgram(provider?: AnchorProvider): Program {
    const prov = provider || createProvider();
    return new Program(governanceIDL as any, config.solana.governanceProgramId, prov);
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

        // Fetch order book to get next order ID
        const orderBook = await program.account.orderBook.fetch(orderBookPDA);
        const orderId = orderBook.nextOrderId;

        const [orderPDA] = getOrderPDA(orderBookPDA, orderId, programId);
        const [baseVaultPDA] = getBaseVaultPDA(orderBookPDA, programId);
        const [solVaultPDA] = getSolVaultPDA(orderBookPDA, programId);

        const traderBaseAccount = await getOrCreateTokenAccount(userPublicKey, baseMint);

        const orderSide = side === 'BUY' ? { bid: {} } : { ask: {} };

        const tx = await program.methods
            .placeLimitOrder(
                orderSide,
                new BN(price),
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
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
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
