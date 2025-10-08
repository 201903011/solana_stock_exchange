# 🔍 Solana Explorer Guide for Localnet Testing

This guide shows you how to view your test accounts, transactions, and tokens in Solana Explorer while running tests on localnet.

## 🌐 What is Solana Explorer?

Solana Explorer is a web-based blockchain explorer that lets you:
- View account balances and transaction history
- Inspect token mints and holdings
- Track transaction confirmations
- Analyze program interactions
- Monitor block production

**Explorer URL**: https://explorer.solana.com

## 🔧 Setup: Connect Explorer to Your Localnet

### Step 1: Start Your Local Validator

```bash
# In one terminal
solana-test-validator
```

### Step 2: Configure Explorer for Localnet

1. **Open Solana Explorer** in your browser:
   ```
   https://explorer.solana.com
   ```

2. **Click the cluster dropdown** (top right corner, shows "Mainnet Beta" by default)

3. **Select "Custom RPC URL"**

4. **Enter your localnet endpoint**:
   ```
   http://127.0.0.1:8899
   ```

5. **Press Enter** - The explorer is now connected to your localnet!

### Step 3: Verify Connection

- You should see "Custom" in the cluster dropdown
- The block height should be relatively low (under 10,000)
- Recent blocks should be updating every ~400ms

## 📋 How to View Test Accounts

### During Test Execution

When you run the system flow tests, you'll see output like:

```
📍 ADMIN ACCOUNT:
   Admin: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   🔗 Explorer: https://explorer.solana.com/address/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?cluster=custom&customUrl=http://127.0.0.1:8899

Alice:
   Wallet: 9hKVsj8qvqGfBPzQz7KJXvf2vqGfBPzQz7KJXvf2vqGf
   🔗 Explorer: https://explorer.solana.com/address/9hKVsj8qvqGfBPzQz7KJXvf2vqGfBPzQz7KJXvf2vqGf?cluster=custom&customUrl=http://127.0.0.1:8899
```

### View Any Address

Simply **click the Explorer URL** or copy-paste it into your browser to view:

- **SOL Balance** - Current balance in SOL
- **Transaction History** - All incoming/outgoing transactions
- **Token Holdings** - SPL tokens owned by this account
- **Recent Activity** - Latest blockchain interactions

### Alternative: Manual Search

If you have an address without the full URL:

1. Copy the address (e.g., `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`)
2. Open Solana Explorer with Custom RPC (see Step 2 above)
3. Paste the address in the search bar
4. Press Enter

## 🪙 Viewing Token Mints

When stock tokens are created, you'll see:

```
TECH - TechCorp Inc.:
   Token Mint: 8qbHbw2BbbTHBW6to6GcYvNFvpgtqNNbRE7mYSMN4TK
   🔗 Explorer: https://explorer.solana.com/address/8qbHbw2BbbTHBW6to6GcYvNFvpgtqNNbRE7mYSMN4TK?cluster=custom&customUrl=http://127.0.0.1:8899
```

On the token mint page, you can see:
- **Total Supply** - Total number of tokens minted
- **Decimals** - Token precision (usually 9)
- **Mint Authority** - Who can mint new tokens
- **Token Accounts** - All accounts holding this token

## 📜 Viewing Transactions

When transactions are executed:

```
📍 TRANSACTION:
   Tx Signature: 5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   🔗 Explorer: https://explorer.solana.com/tx/5xxxxxxxxxxxxxxxxxxxxxxxxxx?cluster=custom&customUrl=http://127.0.0.1:8899
```

On the transaction page, you can view:
- **Status** - Success/Failed
- **Block** - Which block included this transaction
- **Slot** - Exact slot number
- **Fee** - Transaction fee paid
- **Instructions** - All program instructions executed
- **Account Inputs** - All accounts involved
- **Logs** - Program execution logs

## 🎯 What to Check During Tests

### ✅ User Onboarding Phase

**Check**: User wallet balances increase after airdrops

1. Copy Alice's address from test output
2. View in Explorer
3. Look for transaction history showing airdrop
4. Verify SOL balance matches expected amount (100 SOL)

### ✅ Asset Listing Phase

**Check**: Token mints are created

1. Copy token mint addresses from test output
2. View in Explorer
3. Verify token supply matches company shares
4. Check mint authority is set correctly

### ✅ Trading Phase

**Check**: SOL transfers between users

1. Find Alice's address
2. Look at transaction history
3. Find transfers to Bob (for stock purchases)
4. Verify amounts match expected trade values

### ✅ Settlement Phase

**Check**: Escrow operations

1. Look for escrow account creation
2. Verify funds locked temporarily
3. Check atomic swap completion
4. Confirm fee deductions

### ✅ Withdrawal Phase

**Check**: External transfers

1. View withdrawal transaction
2. Verify net amount after fees
3. Check transaction finalization

## 🔬 Advanced: Inspecting Program Accounts

### View Program Deployed Accounts

Your programs are deployed at specific addresses. To view them:

```bash
# Get program IDs
solana program show --programs

# Copy program ID and view in Explorer
```

### View Program Data Accounts (PDAs)

PDAs are shown in test output when created. These accounts store:
- Order books
- Trading accounts
- Escrow states
- Fee configurations

Click the Explorer link to see the raw account data.

## 📊 Real-time Monitoring

### Watch Blocks Being Produced

1. Go to Explorer homepage (click Solana logo)
2. You'll see the block list updating in real-time
3. Your test transactions will appear in recent blocks

### Monitor Account Changes

1. Open an account page
2. Keep it open during test execution
3. Refresh to see balance updates
4. Transaction history updates automatically

## 🐛 Troubleshooting

### "Account Not Found"

**Cause**: Account doesn't exist yet or you're on wrong network

**Solution**:
- Verify Custom RPC is set to `http://127.0.0.1:8899`
- Check that solana-test-validator is running
- Ensure the test has created the account already

### "Unable to Connect"

**Cause**: Localnet validator not running or wrong endpoint

**Solution**:
```bash
# Check if validator is running
solana cluster-version --url http://127.0.0.1:8899

# Restart validator if needed
solana-test-validator
```

### Explorer Shows Mainnet Data

**Cause**: Still connected to Mainnet instead of localnet

**Solution**:
- Click cluster dropdown (top right)
- Select "Custom RPC URL"
- Re-enter: `http://127.0.0.1:8899`

### Addresses Look Different

**Cause**: Test created new keypairs (normal behavior)

**Solution**:
- Addresses change every test run
- Copy fresh addresses from current test output
- Save specific keypairs if you need persistent addresses

## 💡 Pro Tips

### 1. Bookmark Important Accounts

After running tests:
- Bookmark admin account URL
- Bookmark token mint URLs
- Easy to return later for inspection

### 2. Use Multiple Browser Tabs

Open separate tabs for:
- Alice's account
- Bob's account
- Token mint
- Recent blocks

Watch all update during test execution!

### 3. Compare Before/After States

1. Note account balance before trade
2. Execute trade
3. Refresh Explorer page
4. See balance change immediately

### 4. Inspect Failed Transactions

If a test fails:
1. Find the transaction signature in error logs
2. View in Explorer
3. Check "Logs" tab for error details
4. See which instruction failed

### 5. Export Account Data

From any account page:
- Copy raw account data (JSON format)
- Use for debugging or analysis
- Save program account states

## 📝 Quick Reference

### Common Explorer URLs

| Type | URL Pattern |
|------|-------------|
| Account | `https://explorer.solana.com/address/{ADDRESS}?cluster=custom&customUrl=http://127.0.0.1:8899` |
| Transaction | `https://explorer.solana.com/tx/{SIGNATURE}?cluster=custom&customUrl=http://127.0.0.1:8899` |
| Block | `https://explorer.solana.com/block/{BLOCK_NUMBER}?cluster=custom&customUrl=http://127.0.0.1:8899` |
| Token | `https://explorer.solana.com/address/{MINT_ADDRESS}?cluster=custom&customUrl=http://127.0.0.1:8899` |

### CLI Commands for Account Info

```bash
# Get account info
solana account <ADDRESS> --url http://127.0.0.1:8899

# Get token account info
spl-token accounts --url http://127.0.0.1:8899

# Get transaction info
solana confirm <SIGNATURE> --url http://127.0.0.1:8899
```

## 🎓 Learning Resources

- **Solana Explorer Docs**: https://docs.solana.com/cluster/explorer
- **Understanding Accounts**: https://docs.solana.com/developing/programming-model/accounts
- **Transaction Anatomy**: https://docs.solana.com/developing/programming-model/transactions

---

## 🚀 Try It Now!

1. **Start validator**:
   ```bash
   solana-test-validator
   ```

2. **Run tests**:
   ```bash
   cd /home/rahul/projects/solana_stock_exchange
   ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts
   ```

3. **Copy any Explorer URL** from the test output

4. **Paste into browser** and explore!

Happy exploring! 🔍✨
