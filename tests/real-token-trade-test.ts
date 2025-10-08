/**
 * Real Token Trading Test
 * 
 * This test creates REAL SPL tokens and performs actual trades between users.
 * All balances are updated on-chain and viewable in Solana Explorer.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
    PublicKey,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Transaction,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    transfer,
    getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

import {
    airdropSOL,
    getSOLBalance,
    getTokenBalance,
    printSection,
    printSubSection,
    formatSOL,
    getExplorerUrl,
    printAddressWithExplorer,
    wait,
} from "./test-helpers";

describe("🪙 Real SPL Token Trading Test", () => {
    const provider = AnchorProvider.env();
    anchor.setProvider(provider);

    // Payer (admin) for creating tokens
    const payer = provider.wallet as anchor.Wallet;

    // Create real users
    const alice = Keypair.generate();
    const bob = Keypair.generate();

    // Token info
    let techTokenMint: PublicKey;
    let finsTokenMint: PublicKey;
    let hlthTokenMint: PublicKey;

    // Token accounts
    let aliceTechAccount: PublicKey;
    let bobTechAccount: PublicKey;
    let aliceFinsAccount: PublicKey;
    let bobFinsAccount: PublicKey;

    before(async () => {
        printSection("🎬 REAL SPL TOKEN TRADING TEST");
        console.log(`Network: ${provider.connection.rpcEndpoint}`);
        console.log(`\n📍 PAYER (ADMIN) ACCOUNT:`);
        printAddressWithExplorer("   Payer", payer.publicKey);
        console.log(`\nBlock Height: ${await provider.connection.getBlockHeight()}`);
        console.log(`\n💡 All tokens created in this test are REAL SPL tokens!`);
        console.log(`   You can view them in Solana Explorer with full details.`);
        console.log(`\n` + "=".repeat(70));
    });

    describe("👥 STEP 1: User Setup", () => {
        it("Create and fund user wallets", async () => {
            printSection("STEP 1: USER WALLET SETUP");

            console.log("\n📱 Creating user wallets...\n");

            // Alice
            console.log("Alice (Buyer):");
            printAddressWithExplorer("   Address", alice.publicKey);
            await airdropSOL(provider.connection, alice.publicKey, 50);
            const aliceBalance = await getSOLBalance(provider.connection, alice.publicKey);
            console.log(`   Balance: ${aliceBalance.toFixed(4)} SOL ✅\n`);

            // Bob
            console.log("Bob (Seller):");
            printAddressWithExplorer("   Address", bob.publicKey);
            await airdropSOL(provider.connection, bob.publicKey, 50);
            const bobBalance = await getSOLBalance(provider.connection, bob.publicKey);
            console.log(`   Balance: ${bobBalance.toFixed(4)} SOL ✅\n`);

            assert.isAtLeast(aliceBalance, 49, "Alice should have SOL");
            assert.isAtLeast(bobBalance, 49, "Bob should have SOL");

            console.log("✅ Users created and funded\n");
        });
    });

    describe("🪙 STEP 2: Create Real SPL Tokens", () => {
        it("Create TECH token (TechCorp Inc.)", async () => {
            printSection("STEP 2: CREATING REAL SPL TOKENS");
            printSubSection("Creating TECH Token");

            console.log("\n🏭 Creating TECH token mint...\n");

            techTokenMint = await createMint(
                provider.connection,
                payer.payer, // fee payer
                payer.publicKey, // mint authority
                payer.publicKey, // freeze authority
                9 // decimals
            );

            console.log("TECH - TechCorp Inc.");
            printAddressWithExplorer("   Token Mint", techTokenMint);
            console.log(`   Symbol: TECH`);
            console.log(`   Decimals: 9`);
            console.log(`   Mint Authority: ${payer.publicKey.toString().slice(0, 16)}...`);
            console.log(`   Status: ✅ Created on-chain\n`);

            console.log("💡 This is a REAL SPL token on Solana localnet!");
            console.log("   View full token details in Explorer\n");

            assert.ok(techTokenMint, "TECH token should be created");
        });

        it("Create FINS token (Finance Solutions Co.)", async () => {
            printSubSection("Creating FINS Token");

            console.log("\n🏭 Creating FINS token mint...\n");

            finsTokenMint = await createMint(
                provider.connection,
                payer.payer,
                payer.publicKey,
                payer.publicKey,
                9
            );

            console.log("FINS - Finance Solutions Co.");
            printAddressWithExplorer("   Token Mint", finsTokenMint);
            console.log(`   Symbol: FINS`);
            console.log(`   Decimals: 9`);
            console.log(`   Status: ✅ Created on-chain\n`);

            assert.ok(finsTokenMint, "FINS token should be created");
        });

        it("Create HLTH token (HealthMed Ltd.)", async () => {
            printSubSection("Creating HLTH Token");

            console.log("\n🏭 Creating HLTH token mint...\n");

            hlthTokenMint = await createMint(
                provider.connection,
                payer.payer,
                payer.publicKey,
                payer.publicKey,
                9
            );

            console.log("HLTH - HealthMed Ltd.");
            printAddressWithExplorer("   Token Mint", hlthTokenMint);
            console.log(`   Symbol: HLTH`);
            console.log(`   Decimals: 9`);
            console.log(`   Status: ✅ Created on-chain\n`);

            console.log("✅ All 3 stock tokens created!\n");

            assert.ok(hlthTokenMint, "HLTH token should be created");
        });
    });

    describe("💰 STEP 3: Create Token Accounts & Mint Initial Supply", () => {
        it("Create Alice's token accounts", async () => {
            printSection("STEP 3: TOKEN ACCOUNTS & INITIAL SUPPLY");
            printSubSection("Alice's Token Accounts");

            console.log("\n📦 Creating associated token accounts for Alice...\n");

            // TECH account
            const aliceTechATA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer.payer,
                techTokenMint,
                alice.publicKey
            );
            aliceTechAccount = aliceTechATA.address;

            console.log("Alice's TECH Token Account:");
            printAddressWithExplorer("   Address", aliceTechAccount);
            console.log(`   Owner: ${alice.publicKey.toString().slice(0, 16)}...`);
            console.log(`   Mint: ${techTokenMint.toString().slice(0, 16)}...`);
            console.log(`   Balance: 0 TECH\n`);

            // FINS account
            const aliceFinsATA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer.payer,
                finsTokenMint,
                alice.publicKey
            );
            aliceFinsAccount = aliceFinsATA.address;

            console.log("Alice's FINS Token Account:");
            printAddressWithExplorer("   Address", aliceFinsAccount);
            console.log(`   Balance: 0 FINS\n`);

            console.log("✅ Alice's token accounts created\n");
        });

        it("Create Bob's token accounts and mint tokens to him", async () => {
            printSubSection("Bob's Token Accounts & Initial Tokens");

            console.log("\n📦 Creating associated token accounts for Bob...\n");

            // TECH account
            const bobTechATA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer.payer,
                techTokenMint,
                bob.publicKey
            );
            bobTechAccount = bobTechATA.address;

            console.log("Bob's TECH Token Account:");
            printAddressWithExplorer("   Address", bobTechAccount);
            console.log(`   Owner: ${bob.publicKey.toString().slice(0, 16)}...`);
            console.log(`   Initial Balance: 0 TECH\n`);

            // Mint 100 TECH tokens to Bob
            console.log("🏭 Minting 100 TECH tokens to Bob...");
            await mintTo(
                provider.connection,
                payer.payer,
                techTokenMint,
                bobTechAccount,
                payer.publicKey,
                100_000_000_000 // 100 tokens with 9 decimals
            );

            const bobTechBalance = await getTokenBalance(provider.connection, bobTechAccount);
            console.log(`   ✅ Minted: 100 TECH tokens`);
            console.log(`   Current Balance: ${(bobTechBalance / 1_000_000_000).toFixed(4)} TECH\n`);

            // FINS account
            const bobFinsATA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer.payer,
                finsTokenMint,
                bob.publicKey
            );
            bobFinsAccount = bobFinsATA.address;

            console.log("Bob's FINS Token Account:");
            printAddressWithExplorer("   Address", bobFinsAccount);

            // Mint 50 FINS tokens to Bob
            console.log("\n🏭 Minting 50 FINS tokens to Bob...");
            await mintTo(
                provider.connection,
                payer.payer,
                finsTokenMint,
                bobFinsAccount,
                payer.publicKey,
                50_000_000_000 // 50 tokens with 9 decimals
            );

            const bobFinsBalance = await getTokenBalance(provider.connection, bobFinsAccount);
            console.log(`   ✅ Minted: 50 FINS tokens`);
            console.log(`   Current Balance: ${(bobFinsBalance / 1_000_000_000).toFixed(4)} FINS\n`);

            console.log("✅ Bob has initial token supply!\n");

            assert.equal(bobTechBalance, 100_000_000_000, "Bob should have 100 TECH");
            assert.equal(bobFinsBalance, 50_000_000_000, "Bob should have 50 FINS");
        });
    });

    describe("🔄 STEP 4: Execute Real Token Trades", () => {
        it("Trade 1: Alice buys 10 TECH from Bob for 10 SOL", async () => {
            printSection("STEP 4: REAL TOKEN TRADING");
            printSubSection("Trade 1: Alice Buys 10 TECH from Bob");

            console.log("\n📊 Trade Details:");
            console.log(`   Buyer: Alice`);
            console.log(`   Seller: Bob`);
            console.log(`   Asset: TECH tokens`);
            console.log(`   Quantity: 10 TECH`);
            console.log(`   Price: 1 SOL per TECH`);
            console.log(`   Total Cost: 10 SOL\n`);

            // Get balances before trade
            const aliceSolBefore = await getSOLBalance(provider.connection, alice.publicKey);
            const bobSolBefore = await getSOLBalance(provider.connection, bob.publicKey);
            const aliceTechBefore = await getTokenBalance(provider.connection, aliceTechAccount);
            const bobTechBefore = await getTokenBalance(provider.connection, bobTechAccount);

            console.log("💰 Balances BEFORE Trade:");
            console.log(`   Alice: ${aliceSolBefore.toFixed(4)} SOL, ${(aliceTechBefore / 1_000_000_000).toFixed(4)} TECH`);
            console.log(`   Bob: ${bobSolBefore.toFixed(4)} SOL, ${(bobTechBefore / 1_000_000_000).toFixed(4)} TECH\n`);

            console.log("🔄 Executing trade...");

            // Step 1: Alice sends 10 SOL to Bob
            console.log("   1. Alice → Bob: 10 SOL");
            const solTransferTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: alice.publicKey,
                    toPubkey: bob.publicKey,
                    lamports: 10 * LAMPORTS_PER_SOL,
                })
            );
            const solTxSig = await provider.connection.sendTransaction(
                solTransferTx,
                [alice],
                { skipPreflight: false }
            );
            await provider.connection.confirmTransaction(solTxSig);
            console.log(`      Tx: ${solTxSig.slice(0, 16)}...`);

            // Step 2: Bob sends 10 TECH tokens to Alice
            console.log("   2. Bob → Alice: 10 TECH tokens");
            const tokenTransferSig = await transfer(
                provider.connection,
                bob, // payer
                bobTechAccount, // source
                aliceTechAccount, // destination
                bob, // owner
                10_000_000_000 // 10 tokens with 9 decimals
            );
            console.log(`      Tx: ${tokenTransferSig.slice(0, 16)}...\n`);

            await wait(1000);

            // Get balances after trade
            const aliceSolAfter = await getSOLBalance(provider.connection, alice.publicKey);
            const bobSolAfter = await getSOLBalance(provider.connection, bob.publicKey);
            const aliceTechAfter = await getTokenBalance(provider.connection, aliceTechAccount);
            const bobTechAfter = await getTokenBalance(provider.connection, bobTechAccount);

            console.log("💰 Balances AFTER Trade:");
            console.log(`   Alice: ${aliceSolAfter.toFixed(4)} SOL, ${(aliceTechAfter / 1_000_000_000).toFixed(4)} TECH ✅`);
            console.log(`   Bob: ${bobSolAfter.toFixed(4)} SOL, ${(bobTechAfter / 1_000_000_000).toFixed(4)} TECH ✅\n`);

            console.log("📈 Balance Changes:");
            console.log(`   Alice: -10 SOL, +10 TECH`);
            console.log(`   Bob: +10 SOL, -10 TECH\n`);

            console.log("✅ Trade executed successfully!\n");
            console.log("💡 View the transactions in Solana Explorer:");
            console.log(`   SOL Transfer: ${getExplorerUrl(solTxSig, "custom").replace('/address/', '/tx/')}`);
            console.log(`   Token Transfer: ${getExplorerUrl(tokenTransferSig, "custom").replace('/address/', '/tx/')}\n`);

            // Verify balances changed correctly
            assert.approximately(aliceSolAfter, aliceSolBefore - 10, 0.1, "Alice SOL decreased by ~10");
            assert.approximately(bobSolAfter, bobSolBefore + 10, 0.1, "Bob SOL increased by ~10");
            assert.equal(aliceTechAfter, 10_000_000_000, "Alice should have 10 TECH");
            assert.equal(bobTechAfter, 90_000_000_000, "Bob should have 90 TECH");
        });

        it("Trade 2: Alice buys 5 FINS from Bob for 10 SOL", async () => {
            printSubSection("Trade 2: Alice Buys 5 FINS from Bob");

            console.log("\n📊 Trade Details:");
            console.log(`   Buyer: Alice`);
            console.log(`   Seller: Bob`);
            console.log(`   Asset: FINS tokens`);
            console.log(`   Quantity: 5 FINS`);
            console.log(`   Price: 2 SOL per FINS`);
            console.log(`   Total Cost: 10 SOL\n`);

            // Get balances before trade
            const aliceSolBefore = await getSOLBalance(provider.connection, alice.publicKey);
            const bobSolBefore = await getSOLBalance(provider.connection, bob.publicKey);
            const aliceFinsBefore = await getTokenBalance(provider.connection, aliceFinsAccount);
            const bobFinsBefore = await getTokenBalance(provider.connection, bobFinsAccount);

            console.log("💰 Balances BEFORE Trade:");
            console.log(`   Alice: ${aliceSolBefore.toFixed(4)} SOL, ${(aliceFinsBefore / 1_000_000_000).toFixed(4)} FINS`);
            console.log(`   Bob: ${bobSolBefore.toFixed(4)} SOL, ${(bobFinsBefore / 1_000_000_000).toFixed(4)} FINS\n`);

            console.log("🔄 Executing trade...");

            // Step 1: Alice sends 10 SOL to Bob
            console.log("   1. Alice → Bob: 10 SOL");
            const solTransferTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: alice.publicKey,
                    toPubkey: bob.publicKey,
                    lamports: 10 * LAMPORTS_PER_SOL,
                })
            );
            const solTxSig = await provider.connection.sendTransaction(
                solTransferTx,
                [alice],
                { skipPreflight: false }
            );
            await provider.connection.confirmTransaction(solTxSig);
            console.log(`      Tx: ${solTxSig.slice(0, 16)}...`);

            // Step 2: Bob sends 5 FINS tokens to Alice
            console.log("   2. Bob → Alice: 5 FINS tokens");
            const tokenTransferSig = await transfer(
                provider.connection,
                bob,
                bobFinsAccount,
                aliceFinsAccount,
                bob,
                5_000_000_000 // 5 tokens with 9 decimals
            );
            console.log(`      Tx: ${tokenTransferSig.slice(0, 16)}...\n`);

            await wait(1000);

            // Get balances after trade
            const aliceSolAfter = await getSOLBalance(provider.connection, alice.publicKey);
            const bobSolAfter = await getSOLBalance(provider.connection, bob.publicKey);
            const aliceFinsAfter = await getTokenBalance(provider.connection, aliceFinsAccount);
            const bobFinsAfter = await getTokenBalance(provider.connection, bobFinsAccount);

            console.log("💰 Balances AFTER Trade:");
            console.log(`   Alice: ${aliceSolAfter.toFixed(4)} SOL, ${(aliceFinsAfter / 1_000_000_000).toFixed(4)} FINS ✅`);
            console.log(`   Bob: ${bobSolAfter.toFixed(4)} SOL, ${(bobFinsAfter / 1_000_000_000).toFixed(4)} FINS ✅\n`);

            console.log("📈 Balance Changes:");
            console.log(`   Alice: -10 SOL, +5 FINS`);
            console.log(`   Bob: +10 SOL, -5 FINS\n`);

            console.log("✅ Trade executed successfully!\n");

            // Verify balances
            assert.approximately(aliceSolAfter, aliceSolBefore - 10, 0.1, "Alice SOL decreased by ~10");
            assert.approximately(bobSolAfter, bobSolBefore + 10, 0.1, "Bob SOL increased by ~10");
            assert.equal(aliceFinsAfter, 5_000_000_000, "Alice should have 5 FINS");
            assert.equal(bobFinsAfter, 45_000_000_000, "Bob should have 45 FINS");
        });
    });

    describe("📊 STEP 5: Final State Verification", () => {
        it("Display final balances and token holdings", async () => {
            printSection("STEP 5: FINAL STATE VERIFICATION");

            const blockHeight = await provider.connection.getBlockHeight();
            const slot = await provider.connection.getSlot();

            console.log("\n🌐 Network State:");
            console.log(`   RPC: ${provider.connection.rpcEndpoint}`);
            console.log(`   Block Height: ${blockHeight}`);
            console.log(`   Slot: ${slot}\n`);

            // Get all final balances
            const aliceSol = await getSOLBalance(provider.connection, alice.publicKey);
            const bobSol = await getSOLBalance(provider.connection, bob.publicKey);
            const aliceTech = await getTokenBalance(provider.connection, aliceTechAccount);
            const bobTech = await getTokenBalance(provider.connection, bobTechAccount);
            const aliceFins = await getTokenBalance(provider.connection, aliceFinsAccount);
            const bobFins = await getTokenBalance(provider.connection, bobFinsAccount);

            console.log("👥 User Accounts:\n");

            console.log("Alice (Buyer):");
            printAddressWithExplorer("   Wallet", alice.publicKey);
            console.log(`   SOL Balance: ${aliceSol.toFixed(4)} SOL`);
            printAddressWithExplorer("   TECH Account", aliceTechAccount);
            console.log(`   TECH Balance: ${(aliceTech / 1_000_000_000).toFixed(4)} TECH`);
            printAddressWithExplorer("   FINS Account", aliceFinsAccount);
            console.log(`   FINS Balance: ${(aliceFins / 1_000_000_000).toFixed(4)} FINS\n`);

            console.log("Bob (Seller):");
            printAddressWithExplorer("   Wallet", bob.publicKey);
            console.log(`   SOL Balance: ${bobSol.toFixed(4)} SOL`);
            printAddressWithExplorer("   TECH Account", bobTechAccount);
            console.log(`   TECH Balance: ${(bobTech / 1_000_000_000).toFixed(4)} TECH`);
            printAddressWithExplorer("   FINS Account", bobFinsAccount);
            console.log(`   FINS Balance: ${(bobFins / 1_000_000_000).toFixed(4)} FINS\n`);

            console.log("🪙 Token Mints:\n");

            console.log("TECH - TechCorp Inc.:");
            printAddressWithExplorer("   Mint", techTokenMint);
            console.log(`   Total Minted: 100 TECH`);
            console.log(`   In Circulation: ${((aliceTech + bobTech) / 1_000_000_000).toFixed(4)} TECH\n`);

            console.log("FINS - Finance Solutions Co.:");
            printAddressWithExplorer("   Mint", finsTokenMint);
            console.log(`   Total Minted: 50 FINS`);
            console.log(`   In Circulation: ${((aliceFins + bobFins) / 1_000_000_000).toFixed(4)} FINS\n`);

            console.log("HLTH - HealthMed Ltd.:");
            printAddressWithExplorer("   Mint", hlthTokenMint);
            console.log(`   Total Minted: 0 HLTH`);
            console.log(`   Status: Created but not distributed\n`);

            console.log("=".repeat(70));
            console.log("📈 TRADING SUMMARY");
            console.log("=".repeat(70));
            console.log(`\n✅ Completed 2 trades:`);
            console.log(`   • Trade 1: 10 TECH for 10 SOL`);
            console.log(`   • Trade 2: 5 FINS for 10 SOL`);
            console.log(`\n✅ Total Volume: 20 SOL\n`);

            console.log("=".repeat(70));
            console.log("🔗 VIEW IN SOLANA EXPLORER");
            console.log("=".repeat(70));
            console.log(`\n💡 To view these accounts and tokens:`);
            console.log(`   1. Open: https://explorer.solana.com`);
            console.log(`   2. Set Custom RPC: http://127.0.0.1:8899`);
            console.log(`   3. Paste any address from above\n`);
            console.log(`📍 Quick Links:`);
            console.log(`   Alice: ${alice.publicKey.toString()}`);
            console.log(`   Bob: ${bob.publicKey.toString()}`);
            console.log(`   TECH Token: ${techTokenMint.toString()}`);
            console.log(`   FINS Token: ${finsTokenMint.toString()}\n`);

            // Verify final state
            assert.equal(aliceTech, 10_000_000_000, "Alice should have 10 TECH");
            assert.equal(aliceFins, 5_000_000_000, "Alice should have 5 FINS");
            assert.equal(bobTech, 90_000_000_000, "Bob should have 90 TECH");
            assert.equal(bobFins, 45_000_000_000, "Bob should have 45 FINS");
        });
    });

    after(() => {
        printSection("🎉 TEST COMPLETE");
        console.log("\n✨ Summary:\n");
        console.log("  ✅ Created 3 real SPL tokens (TECH, FINS, HLTH)");
        console.log("  ✅ Minted initial supply to Bob");
        console.log("  ✅ Executed 2 real trades between Alice and Bob");
        console.log("  ✅ Updated balances on-chain");
        console.log("  ✅ All data viewable in Solana Explorer\n");
        console.log("🚀 All tokens are REAL and exist on localnet!");
        console.log("   View them in Explorer using the URLs above.\n");
    });
});
