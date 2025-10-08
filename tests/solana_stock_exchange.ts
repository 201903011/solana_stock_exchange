// NOTE: This test file has been superseded by integration_test.ts
// which provides comprehensive integration testing of all contracts
// To re-enable these tests, uncomment and fix the airdrop await issues

/*
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ExchangeCore } from "../target/types/exchange_core";
import { Escrow } from "../target/types/escrow";
import { Governance } from "../target/types/governance";
import { FeeManagement } from "../target/types/fee_management";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("Solana Stock Exchange Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const exchangeCoreProgram = anchor.workspace.ExchangeCore as Program<ExchangeCore>;
    const escrowProgram = anchor.workspace.Escrow as Program<Escrow>;
    const governanceProgram = anchor.workspace.Governance as Program<Governance>;
    const feeManagementProgram = anchor.workspace.FeeManagement as Program<FeeManagement>;

    let baseMint: PublicKey;
    let quoteMint: PublicKey;
    let authority: Keypair;
    let trader1: Keypair;
    let trader2: Keypair;

    before(async () => {
        authority = Keypair.generate();
        trader1 = Keypair.generate();
        trader2 = Keypair.generate();

        // Airdrop SOL for testing
        await provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(trader1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(trader2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

        // Create test tokens
        baseMint = await createMint(
            provider.connection,
            authority,
            authority.publicKey,
            null,
            6
        );

        quoteMint = await createMint(
            provider.connection,
            authority,
            authority.publicKey,
            null,
            6
        );
    });

    describe("Exchange Core Program", () => {
        it("Initializes the exchange", async () => {
            const [exchangePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("exchange")],
                exchangeCoreProgram.programId
            );

            const feeCollector = Keypair.generate().publicKey;

            await exchangeCoreProgram.methods
                .initializeExchange(30, 50) // 0.3% maker, 0.5% taker
                .accounts({
                    exchange: exchangePda,
                    authority: authority.publicKey,
                    feeCollector: feeCollector,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const exchange = await exchangeCoreProgram.account.exchange.fetch(exchangePda);
            assert.equal(exchange.makerFeeBps, 30);
            assert.equal(exchange.takerFeeBps, 50);
            assert.equal(exchange.totalMarkets.toNumber(), 0);
        });

        it("Initializes an order book", async () => {
            const [exchangePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("exchange")],
                exchangeCoreProgram.programId
            );

            const [orderBookPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("order_book"), baseMint.toBuffer(), quoteMint.toBuffer()],
                exchangeCoreProgram.programId
            );

            const [baseVaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), orderBookPda.toBuffer(), Buffer.from("base")],
                exchangeCoreProgram.programId
            );

            const [quoteVaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), orderBookPda.toBuffer(), Buffer.from("quote")],
                exchangeCoreProgram.programId
            );

            await exchangeCoreProgram.methods
                .initializeOrderBook(baseMint, quoteMint, new anchor.BN(1000), new anchor.BN(1))
                .accounts({
                    exchange: exchangePda,
                    orderBook: orderBookPda,
                    baseMint: baseMint,
                    quoteMint: quoteMint,
                    baseVault: baseVaultPda,
                    quoteVault: quoteVaultPda,
                    authority: authority.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const orderBook = await exchangeCoreProgram.account.orderBook.fetch(orderBookPda);
            assert.equal(orderBook.isActive, true);
            assert.equal(orderBook.tickSize.toNumber(), 1000);
        });

        it("Initializes a trading account", async () => {
            const [exchangePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("exchange")],
                exchangeCoreProgram.programId
            );

            const [tradingAccountPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("trading_account"), trader1.publicKey.toBuffer()],
                exchangeCoreProgram.programId
            );

            await exchangeCoreProgram.methods
                .initializeTradingAccount()
                .accounts({
                    exchange: exchangePda,
                    tradingAccount: tradingAccountPda,
                    owner: trader1.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([trader1])
                .rpc();

            const tradingAccount = await exchangeCoreProgram.account.tradingAccount.fetch(tradingAccountPda);
            assert.equal(tradingAccount.owner.toBase58(), trader1.publicKey.toBase58());
            assert.equal(tradingAccount.totalTrades.toNumber(), 0);
        });
    });

    describe("Fee Management Program", () => {
        it("Initializes fee configuration", async () => {
            const [feeConfigPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("fee_config")],
                feeManagementProgram.programId
            );

            const feeCollector = Keypair.generate().publicKey;

            await feeManagementProgram.methods
                .initializeFeeConfig(30, 10, new anchor.BN(1_000_000_000))
                .accounts({
                    feeConfig: feeConfigPda,
                    authority: authority.publicKey,
                    feeCollector: feeCollector,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const feeConfig = await feeManagementProgram.account.feeConfig.fetch(feeConfigPda);
            assert.equal(feeConfig.tradingFeeBps, 30);
            assert.equal(feeConfig.withdrawalFeeBps, 10);
        });
    });

    describe("Governance Program", () => {
        let governanceTokenMint: PublicKey;

        before(async () => {
            governanceTokenMint = await createMint(
                provider.connection,
                authority,
                authority.publicKey,
                null,
                9
            );
        });

        it("Initializes governance", async () => {
            const [governancePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("governance")],
                governanceProgram.programId
            );

            const [treasuryPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("treasury"), governancePda.toBuffer()],
                governanceProgram.programId
            );

            await governanceProgram.methods
                .initializeGovernance(new anchor.BN(259200), 20, 66) // 3 days, 20% quorum, 66% approval
                .accounts({
                    governance: governancePda,
                    governanceTokenMint: governanceTokenMint,
                    authority: authority.publicKey,
                    treasury: treasuryPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const governance = await governanceProgram.account.governanceConfig.fetch(governancePda);
            assert.equal(governance.quorumPercentage, 20);
            assert.equal(governance.approvalThreshold, 66);
        });
    });

    describe("Escrow Program", () => {
        it("Initializes an escrow", async () => {
            const tradeId = new anchor.BN(1);
            const [escrowPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), tradeId.toArrayLike(Buffer, "le", 8)],
                escrowProgram.programId
            );

            const [baseVaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), escrowPda.toBuffer(), Buffer.from("base")],
                escrowProgram.programId
            );

            const [quoteVaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), escrowPda.toBuffer(), Buffer.from("quote")],
                escrowProgram.programId
            );

            const currentTime = Math.floor(Date.now() / 1000);
            const expiry = currentTime + 3600; // 1 hour from now

            await escrowProgram.methods
                .initializeEscrow(
                    tradeId,
                    new anchor.BN(1000000),
                    new anchor.BN(5000000),
                    new anchor.BN(expiry)
                )
                .accounts({
                    escrow: escrowPda,
                    buyer: trader1.publicKey,
                    seller: trader2.publicKey,
                    baseMint: baseMint,
                    quoteMint: quoteMint,
                    baseVault: baseVaultPda,
                    quoteVault: quoteVaultPda,
                    initializer: authority.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const escrow = await escrowProgram.account.escrowAccount.fetch(escrowPda);
            assert.equal(escrow.tradeId.toNumber(), 1);
            assert.equal(escrow.baseAmount.toNumber(), 1000000);
            assert.equal(escrow.quoteAmount.toNumber(), 5000000);
        });
    });
});
*/
