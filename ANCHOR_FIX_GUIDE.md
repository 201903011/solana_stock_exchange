# Quick Fix Guide for Anchor v0.30+ Test Errors

## The Problem

Anchor v0.30+ uses automatic account resolution for PDA accounts. You should NOT pass accounts that are:
1. Derived from PDAs with seeds
2. Already defined in the Rust instruction struct

## The Solution

**Remove PDA accounts from `.accounts()` calls. Only pass:**
- Signer accounts
- Non-PDA accounts
- Accounts that cannot be automatically derived

## Examples

### ❌ OLD WAY (doesn't work):
```typescript
await program.methods
  .initializeExchange(20, 30)
  .accounts({
    exchange: exchangePda,  // ❌ Remove this
    authority: authority.publicKey,
    feeCollector: feeCollector,
    systemProgram: SystemProgram.programId,  // ❌ Remove this
  })
  .signers([authority])
  .rpc();
```

### ✅ NEW WAY (Anchor v0.30+):
```typescript
await program.methods
  .initializeExchange(20, 30)
  .accounts({
    authority: authority.publicKey,  // ✅ Keep (signer)
    feeCollector: feeCollector,      // ✅ Keep (non-PDA)
  })
  .signers([authority])
  .rpc();
```

## How to Fix Each Instruction

### 1. Initialize Exchange
```typescript
// Only pass authority and feeCollector
.accounts({
  authority: exchangeAuthority.publicKey,
  feeCollector: feeCollector,
})
```

### 2. Initialize Trading Account
```typescript
// Only pass owner
.accounts({
  owner: trader.keypair.publicKey,
})
```

### 3. Initialize Fee Config
```typescript
// Only pass authority and feeCollector
.accounts({
  authority: exchangeAuthority.publicKey,
  feeCollector: feeCollector,
})
```

### 4. Initialize Order Book
```typescript
// Pass non-PDA accounts
.accounts({
  baseMint: stockMint,
  quoteMint: usdcMint,
  authority: exchangeAuthority.publicKey,
})
```

### 5. Initialize Escrow
```typescript
// Pass all non-PDA accounts
.accounts({
  buyer: buyerPublicKey,
  seller: sellerPublicKey,
  baseMint: stockMint,
  quoteMint: usdcMint,
  initializer: exchangeAuthority.publicKey,
})
```

## Account Already in Use Error

If you see "Account already in use", it means the account was initialized in a previous test run.

**Solutions:**
1. Reset validator: `solana-test-validator --reset`
2. Or wrap initialization in try-catch:

```typescript
try {
  const existing = await program.account.exchange.fetch(exchangePda);
  console.log("Already initialized, skipping...");
} catch (e) {
  // Account doesn't exist, initialize it
  await program.methods.initializeExchange(...).rpc();
}
```

## Testing Without Validator Reset

To run tests multiple times without resetting:

```typescript
// Check if account exists first
async function initializeIfNeeded() {
  try {
    await program.account.exchange.fetch(pda);
    return false; // Already exists
  } catch {
    await program.methods.initialize().rpc();
    return true; // Just initialized
  }
}
```
