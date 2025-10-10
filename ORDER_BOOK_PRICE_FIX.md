# Order Book Price Fix - Quick Reference

## Problem
**Error**: `PriceNotAlignedToTickSize` when placing limit orders

## Root Cause
Order prices must be **multiples of the tick size** (default: 1,000,000 lamports = 0.001 SOL)

## Solution
✅ **Automatic price alignment** - prices are now automatically rounded down to the nearest tick size multiple

## Changes Made

### 1. Order Controller (`/api/src/controllers/order.controller.ts`)
Added price validation BEFORE sending to blockchain:

```typescript
// Validate and align price for limit orders
if (orderData.order_type === 'LIMIT' && orderData.price) {
    const tickSize = BigInt(company.tick_size || '1000000');
    const price = BigInt(orderData.price);
    const remainder = price % tickSize;
    
    if (remainder !== BigInt(0)) {
        const alignedPrice = price - remainder;
        orderData.price = alignedPrice.toString();
    }
}
```

### 2. Solana Utils (`/api/src/utils/solana.ts`)
Added tick size alignment in `placeLimitOrder()`:

```typescript
const orderBook = await program.account.orderBook.fetch(orderBookPDA);
const tickSize = orderBook.tickSize as BN;

// Align price to tick size
const priceNum = new BN(price);
const remainder = priceNum.mod(tickSize);
const alignedPrice = remainder.isZero() ? priceNum : priceNum.sub(remainder);
```

## How It Works

```
User submits price: 10,500,000 lamports
Tick size: 1,000,000 lamports
Remainder: 500,000
Aligned price: 10,000,000 lamports ✅
```

## Testing

### Valid Price (No Alignment)
```json
{
  "companyId": 1,
  "side": "BUY",
  "type": "LIMIT",
  "price": "10000000",     // Aligned ✅
  "quantity": "1000000000"
}
```

### Invalid Price (Auto-Aligned)
```json
{
  "companyId": 1,
  "side": "BUY",
  "type": "LIMIT",
  "price": "10500000",     // Will be aligned to 10000000 ✅
  "quantity": "1000000000"
}
```

**Console Output**:
```
Price 10500000 not aligned to tick size 1000000
Auto-aligning to 10000000
```

## Price Examples

| Input Price | Tick Size | Aligned Price | SOL Value |
|-------------|-----------|---------------|-----------|
| 10,000,000 | 1,000,000 | 10,000,000 ✅ | 0.01 SOL |
| 10,500,000 | 1,000,000 | 10,000,000 ⚙️ | 0.01 SOL |
| 12,345,678 | 1,000,000 | 12,000,000 ⚙️ | 0.012 SOL |
| 999,999,999 | 1,000,000 | 999,000,000 ⚙️ | 0.999 SOL |
| 500,000 | 1,000,000 | ERROR ❌ | Too low |

## Tick Size Configuration

### Default (set during company registration)
```typescript
tick_size: '1000000'  // 0.001 SOL
```

### Custom (optional)
```json
POST /api/companies/register
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "total_shares": "1000000000",
  "tick_size": "5000000",  // 0.005 SOL
  "min_order_size": "10"
}
```

## Status
✅ **Fixed** - Orders now work with automatic price alignment!

## Full Documentation
See `/PRICE_TICK_SIZE_FIX.md` for detailed explanation.
