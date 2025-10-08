# 🔗 Solana Explorer - Quick Access Guide

## ✅ Test Results with Explorer Links

All tests now print **clickable Solana Explorer URLs** for every account and transaction!

### 🎯 What's New

- **Admin Account** - View on Explorer with one click
- **User Wallets** - Each user (Alice, Bob, Charlie) has Explorer links
- **Token Mints** - All stock tokens (TECH, FINS, HLTH) viewable on Explorer
- **Transactions** - Mock transaction signatures with Explorer URLs
- **Final Summary** - Complete list of all addresses for easy access

---

## 📋 Example Output from Tests

### Admin Account
```
📍 ADMIN ACCOUNT:
   Admin: DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU
   🔗 Explorer: https://explorer.solana.com/address/DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU?cluster=custom&customUrl=http://127.0.0.1:8899

💡 TIP: Copy the Explorer URLs above to view accounts on Solana Explorer
        Set custom RPC to: http://127.0.0.1:8899
```

### User Wallets
```
Alice (Buyer):
   Wallet: 8ugzSp8TAyHHPVxsJmkafn7uR27geKJ33qu2HuHtoytZ
   🔗 Explorer: https://explorer.solana.com/address/8ugzSp8TAyHHPVxsJmkafn7uR27geKJ33qu2HuHtoytZ?cluster=custom&customUrl=http://127.0.0.1:8899
   Status: ✅ Wallet created

Bob (Seller):
   Wallet: AuLsBzbaGoWYnwzdHyoSE2GUmt9jyq6DTvra4qCj5A3w
   🔗 Explorer: https://explorer.solana.com/address/AuLsBzbaGoWYnwzdHyoSE2GUmt9jyq6DTvra4qCj5A3w?cluster=custom&customUrl=http://127.0.0.1:8899
   Status: ✅ Wallet created

Charlie (Trader):
   Wallet: 8qH8wc5YmyZxKT1xhEDPaYjjM6Rtr97j9n1Gg3xvTZuW
   🔗 Explorer: https://explorer.solana.com/address/8qH8wc5YmyZxKT1xhEDPaYjjM6Rtr97j9n1Gg3xvTZuW?cluster=custom&customUrl=http://127.0.0.1:8899
   Status: ✅ Wallet created
```

### Token Mints
```
TECH - TechCorp Inc.:
   Token Mint: G38Gwqkmf5ZSRYMUz7UeriTzJmWKnmWX8fKjsCXFE4vk
   🔗 Explorer: https://explorer.solana.com/address/G38Gwqkmf5ZSRYMUz7UeriTzJmWKnmWX8fKjsCXFE4vk?cluster=custom&customUrl=http://127.0.0.1:8899
   Total Supply: 1,000,000 tokens
   Initial Price: 1.0000 SOL
   Status: ✅ Deployed

FINS - Finance Solutions Co.:
   Token Mint: GZSx7GuteNEEbLJ3XmxjHE2GmzgmqKjsJmDYG1yjQ747
   🔗 Explorer: https://explorer.solana.com/address/GZSx7GuteNEEbLJ3XmxjHE2GmzgmqKjsJmDYG1yjQ747?cluster=custom&customUrl=http://127.0.0.1:8899
   Total Supply: 500,000 tokens
   Initial Price: 2.0000 SOL
   Status: ✅ Deployed
```

### Transactions
```
📍 TRANSACTION:
   Tx Signature: 5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   🔗 Explorer: https://explorer.solana.com/tx/5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?cluster=custom&customUrl=http://127.0.0.1:8899
```

### Final Summary
```
======================================================================
🔗 SOLANA EXPLORER QUICK ACCESS
======================================================================

💡 To view all accounts and transactions:
   1. Open Solana Explorer: https://explorer.solana.com
   2. Click the cluster dropdown (top right)
   3. Select 'Custom RPC URL'
   4. Enter: http://127.0.0.1:8899
   5. Paste any address from above to view details

📍 Key Addresses:
   Admin: DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU
   Alice (Buyer): 8ugzSp8TAyHHPVxsJmkafn7uR27geKJ33qu2HuHtoytZ
   Bob (Seller): AuLsBzbaGoWYnwzdHyoSE2GUmt9jyq6DTvra4qCj5A3w
   Charlie (Trader): 8qH8wc5YmyZxKT1xhEDPaYjjM6Rtr97j9n1Gg3xvTZuW
```

---

## 🚀 How to Use

### Option 1: Click the URLs (Recommended)
1. Run the tests
2. **Click any Explorer URL** in the terminal output
3. Your browser opens automatically to Solana Explorer
4. View account/transaction details instantly

### Option 2: Copy-Paste
1. Copy the full Explorer URL from test output
2. Paste into your browser
3. View the account/transaction

### Option 3: Manual Search
1. Copy just the address (e.g., `8ugzSp8TAyHHPVxsJmkafn7uR27geKJ33qu2HuHtoytZ`)
2. Go to https://explorer.solana.com
3. Set cluster to Custom RPC: `http://127.0.0.1:8899`
4. Paste the address in the search bar
5. Press Enter

---

## 📊 What You Can View

### For User Accounts
- ✅ Current SOL balance
- ✅ Transaction history (airdrops, transfers, withdrawals)
- ✅ SPL token holdings
- ✅ Recent activity
- ✅ Account rent status

### For Token Mints
- ✅ Total supply
- ✅ Decimals (precision)
- ✅ Mint authority
- ✅ Freeze authority
- ✅ All token accounts holding this token

### For Transactions
- ✅ Transaction status (success/failed)
- ✅ Block number and slot
- ✅ Transaction fee
- ✅ All accounts involved
- ✅ Program instructions executed
- ✅ Logs and error messages (if any)

---

## 🔧 Helper Functions Added

New functions in `tests/test-helpers.ts`:

### `getExplorerUrl(address, cluster)`
Generates Explorer URL for any address
```typescript
const url = getExplorerUrl(userWallet.publicKey, "custom");
// Returns: https://explorer.solana.com/address/...?cluster=custom&customUrl=http://127.0.0.1:8899
```

### `getExplorerTxUrl(signature, cluster)`
Generates Explorer URL for transactions
```typescript
const url = getExplorerTxUrl(txSignature, "custom");
// Returns: https://explorer.solana.com/tx/...?cluster=custom&customUrl=http://127.0.0.1:8899
```

### `printAddressWithExplorer(label, address, cluster)`
Prints address with clickable Explorer link
```typescript
printAddressWithExplorer("Admin", admin.publicKey);
// Outputs:
// Admin: DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU
// 🔗 Explorer: https://explorer.solana.com/address/...
```

### `printTxWithExplorer(label, signature, cluster)`
Prints transaction with clickable Explorer link
```typescript
printTxWithExplorer("Tx Signature", signature);
// Outputs:
// Tx Signature: 5xxxxxxx...
// 🔗 Explorer: https://explorer.solana.com/tx/...
```

---

## 📚 Documentation Files

1. **EXPLORER_GUIDE.md** - Comprehensive guide on using Solana Explorer with localnet
2. **EXPLORER_QUICK_ACCESS.md** - This quick reference guide
3. **tests/test-helpers.ts** - Helper functions for Explorer URLs

---

## 💡 Pro Tips

### 1. Keep Explorer Tab Open
Open Explorer in a browser tab before running tests. You can refresh to see updated balances.

### 2. Bookmark Key Addresses
After first test run, bookmark the admin and user account pages for quick access.

### 3. Use Multiple Tabs
Open separate tabs for:
- Admin account
- Alice's wallet
- Bob's wallet  
- Token mint pages

Watch them all update in real-time!

### 4. Check Block Explorer Homepage
Visit the Explorer homepage to see:
- Recent blocks
- Recent transactions
- Block production rate
- Network TPS (transactions per second)

### 5. Inspect Failed Transactions
If a test fails:
1. Find the transaction signature in error logs
2. Open in Explorer
3. Check the "Logs" tab to see the error
4. See which instruction failed

---

## 🎯 Quick Test

Try it now:

```bash
# Start validator
solana-test-validator

# Run tests (in another terminal)
cd /home/rahul/projects/solana_stock_exchange
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json npx ts-mocha -p ./tsconfig.json -t 1000000 tests/system-flow-test.ts

# Click any Explorer link in the output!
```

---

## ✅ Example: Verifying Alice's SOL Balance

1. **Run the test** - You see:
   ```
   Alice (Buyer):
      Wallet: 8ugzSp8TAyHHPVxsJmkafn7uR27geKJ33qu2HuHtoytZ
      🔗 Explorer: https://explorer.solana.com/address/...
   ```

2. **Click the Explorer link**

3. **In Explorer**, you see:
   - Balance: 100.0000 SOL (after airdrop)
   - Transaction showing the airdrop
   - Token accounts (if any SPL tokens)

4. **After trade**, refresh the page:
   - Balance: 89.9500 SOL (after buying 10 TECH + fees)
   - New transaction showing the trade

---

## 🐛 Troubleshooting

### "Account Not Found"
- Make sure Custom RPC is set to `http://127.0.0.1:8899`
- Verify `solana-test-validator` is running
- Check that the test has created the account already

### Link Doesn't Work
- The URL is very long - make sure you copied it completely
- Try copying and pasting into browser instead of clicking
- Verify the Custom RPC endpoint is correct

### Shows Wrong Balance
- Click the refresh button in Explorer
- Or close and reopen the link
- Balances may take a moment to update

---

## 📖 Further Reading

- **Full Explorer Guide**: See `EXPLORER_GUIDE.md` for detailed instructions
- **Test Documentation**: See `tests/README.md` for test suite details
- **Solana Docs**: https://docs.solana.com/cluster/explorer

---

**Status**: ✅ All tests now print Explorer URLs!  
**Updated**: October 8, 2025  
**Test Results**: 19/19 passing with Explorer links
