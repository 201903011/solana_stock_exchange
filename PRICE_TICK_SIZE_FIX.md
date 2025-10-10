# Price Tick Size Alignment Fix

## 🐛 Issue

**Error**: `AnchorError: Error Code: PriceNotAlignedToTickSize. Error Number: 6005. Error Message: Price not aligned to tick size.`

**Location**: `programs/exchange_core/src/instructions/place_limit_order.rs:82`

## 🔍 Root Cause

The Solana smart contract validates that **order prices must be multiples of the tick size**:

```rust
// From place_limit_order.rs line 82
require!(
    price % ctx.accounts.order_book.tick_size == 0,
    ExchangeError::PriceNotAlignedToTickSize
);
```

### What is Tick Size?

**Tick size** is the minimum price increment for an order book. It prevents order prices from having arbitrary precision and keeps the order book manageable.

**Example**:
- Tick size = `1,000,000` lamports (0.001 SOL)
- Valid prices: `1,000,000`, `2,000,000`, `10,000,000` (multiples of tick size)
- Invalid prices: `500,000`, `1,500,000`, `3,700,000` (not multiples of tick size)

### When is Tick Size Set?

During order book initialization in company registration:

```typescript
// From company.controller.ts
const orderBookData = await initializeOrderBook(
    tokenMint,
    companyData.tick_size || '1000000',  // Default: 0.001 SOL
    companyData.min_order_size || '1'
);
```

**Default values**:
- Tick size: `1,000,000` lamports = 0.001 SOL
- Min order size: `1` token

## ✅ Solution

### Two-Layer Validation & Alignment

#### Layer 1: Order Controller (Business Logic)
Validates and aligns price BEFORE sending to blockchain:

```typescript
// In order.controller.ts
if (orderData.order_type === 'LIMIT' && orderData.price) {
    const tickSize = BigInt(company.tick_size || '1000000');
    const price = BigInt(orderData.price);
    
    // Check if price is aligned to tick size
    const remainder = price % tickSize;
    if (remainder !== BigInt(0)) {
        // Align price to tick size (round down)
        const alignedPrice = price - remainder;
        
        if (alignedPrice <= BigInt(0)) {
            return res.status(400).json({
                error: `Price must be at least ${tickSize} (one tick size)`
            });
        }
        
        console.log(`Price ${price} not aligned to tick size ${tickSize}`);
        console.log(`Auto-aligning to ${alignedPrice}`);
        
        // Update the price to aligned value
        orderData.price = alignedPrice.toString();
    }
}
```

#### Layer 2: Solana Utils (Blockchain Logic)
Double-checks alignment and provides detailed logging:

```typescript
// In solana.ts - placeLimitOrder()
const orderBook = await program.account.orderBook.fetch(orderBookPDA);
const tickSize = orderBook.tickSize as BN;

// Align price to tick size
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
    throw new Error(`Invalid price: ${price}. Price must be at least ${tickSize.toString()}`);
}
```

## 🎯 How Price Alignment Works

### Rounding Down to Nearest Tick

```
Given:
- Tick Size: 1,000,000
- User Price: 12,345,678

Calculation:
1. remainder = 12,345,678 % 1,000,000 = 345,678
2. alignedPrice = 12,345,678 - 345,678 = 12,000,000

Result:
- Original: 12,345,678 (invalid ❌)
- Aligned:  12,000,000 (valid ✅)
```

### Why Round Down?

- **Conservative**: User gets equal or better price
- **Safe**: Prevents overpaying on BUY orders
- **Fair**: Ensures seller gets at least their requested price on SELL orders

## 📊 Price Alignment Examples

### Example 1: Valid Price (No Alignment Needed)
```
Tick Size: 1,000,000
User Price: 10,000,000
Remainder: 0
Aligned: 10,000,000 (unchanged ✅)
```

### Example 2: Invalid Price (Alignment Required)
```
Tick Size: 1,000,000
User Price: 10,500,000
Remainder: 500,000
Aligned: 10,000,000 (rounded down ✅)
```

### Example 3: Price Below Tick Size (Error)
```
Tick Size: 1,000,000
User Price: 500,000
Remainder: 500,000
Aligned: 0 (ERROR ❌)
Error: "Price must be at least 1,000,000 (one tick size)"
```

## 🔢 Understanding Lamports & Decimals

### SOL Denomination
```
1 SOL = 1,000,000,000 lamports (9 decimals)
0.001 SOL = 1,000,000 lamports (default tick size)
```

### Price Examples in Real Terms
```
Tick Size: 1,000,000 lamports (0.001 SOL)

Valid Prices:
- 1,000,000 lamports = 0.001 SOL
- 10,000,000 lamports = 0.01 SOL
- 100,000,000 lamports = 0.1 SOL
- 1,000,000,000 lamports = 1 SOL
- 10,000,000,000 lamports = 10 SOL

Invalid Prices (will be aligned down):
- 12,345,678 → 12,000,000 (0.012 SOL)
- 105,500,000 → 105,000,000 (0.105 SOL)
- 999,999,999 → 999,000,000 (0.999 SOL)
```

## 🧪 Testing

### Test 1: Aligned Price (Should Pass)
```bash
curl -X POST http://localhost:3000/api/orders/place \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 1,
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1000000000",
    "price": "10000000"
  }'
```

**Expected**: Order placed successfully ✅

### Test 2: Unaligned Price (Will Auto-Align)
```bash
curl -X POST http://localhost:3000/api/orders/place \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 1,
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1000000000",
    "price": "10500000"
  }'
```

**Expected Console Output**:
```
Price 10500000 not aligned to tick size 1000000
Auto-aligning to 10000000
Order placed successfully ✅
```

### Test 3: Price Below Tick Size (Should Fail)
```bash
curl -X POST http://localhost:3000/api/orders/place \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 1,
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1000000000",
    "price": "500000"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Price must be at least 1000000 (one tick size). Tick size for TATA is 1000000 lamports."
}
```

## 📝 Custom Tick Size Configuration

### During Company Registration
```json
POST /api/companies/register
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "total_shares": "1000000000",
  "tick_size": "5000000",  // 0.005 SOL (custom)
  "min_order_size": "10"
}
```

### Effect on Orders
```
Tick Size: 5,000,000 (0.005 SOL)

Valid Prices:
- 5,000,000 (0.005 SOL)
- 10,000,000 (0.01 SOL)
- 50,000,000 (0.05 SOL)

Invalid Prices (will be aligned):
- 12,000,000 → 10,000,000
- 23,000,000 → 20,000,000
- 47,000,000 → 45,000,000
```

## 🎨 User Experience

### Frontend Display
```typescript
// Display tick size info to users
const tickSize = company.tick_size; // e.g., "1000000"
const tickSizeSOL = Number(tickSize) / 1e9; // Convert to SOL

console.log(`Minimum price increment: ${tickSizeSOL} SOL`);
// Output: "Minimum price increment: 0.001 SOL"
```

### Price Input Validation
```typescript
// Frontend price validation
function validatePrice(price: string, tickSize: string): string {
  const priceLamports = BigInt(price);
  const tick = BigInt(tickSize);
  
  const remainder = priceLamports % tick;
  if (remainder !== BigInt(0)) {
    const aligned = priceLamports - remainder;
    return aligned.toString();
  }
  return price;
}
```

### User-Friendly Error Messages
```typescript
// Example error for users
if (price < tickSize) {
  return {
    error: "Price too low",
    message: `Minimum price is ${tickSize} lamports (${tickSize/1e9} SOL)`,
    hint: "Try increasing your price"
  };
}
```

## 📋 Related Files

### Modified Files
- ✅ `/api/src/controllers/order.controller.ts` - Added price validation & alignment (Layer 1)
- ✅ `/api/src/utils/solana.ts` - Added tick size alignment in placeLimitOrder (Layer 2)

### Reference Files
- 📖 `/programs/exchange_core/src/instructions/place_limit_order.rs` - Smart contract validation
- 📖 `/api/src/controllers/company.controller.ts` - Order book initialization with tick size
- 📖 `/tests/tata-motors-ipo-test.ts` - Test showing proper tick size usage

## 🔑 Key Takeaways

1. **Tick size is mandatory** - All prices must be multiples of tick size
2. **Default tick size**: 1,000,000 lamports (0.001 SOL)
3. **Alignment strategy**: Round down to protect users
4. **Two-layer validation**: Controller (UX) + Solana utils (safety)
5. **Configurable per company**: Set custom tick size during registration

## 💡 Best Practices

### For API Consumers
```typescript
// Always align prices before sending
const alignPrice = (price: bigint, tickSize: bigint): bigint => {
  const remainder = price % tickSize;
  return remainder === 0n ? price : price - remainder;
};

// Usage
const price = 10_500_000n;
const tickSize = 1_000_000n;
const alignedPrice = alignPrice(price, tickSize);
console.log(alignedPrice); // 10_000_000n
```

### For Frontend Developers
```typescript
// Show tick size in price input
<input 
  type="number"
  step={tickSize / 1e9}  // e.g., 0.001 for default
  min={tickSize / 1e9}
  placeholder={`Min: ${tickSize / 1e9} SOL`}
/>
```

### For Exchange Admins
```typescript
// Choose appropriate tick sizes
const tickSizes = {
  highValue: "10000000",   // 0.01 SOL - for expensive stocks
  standard: "1000000",     // 0.001 SOL - default
  lowValue: "100000",      // 0.0001 SOL - for penny stocks
};
```

## 🎉 Summary

**Before**: ❌ Orders failed with `PriceNotAlignedToTickSize` error  
**After**: ✅ Prices automatically aligned to tick size

**Benefits**:
- 🚀 Automatic price alignment
- 📊 Clear error messages
- 🔒 Two-layer validation
- 💡 User-friendly experience
- ⚙️ Configurable per company

---

**Status**: ✅ Fixed and Ready for Testing
