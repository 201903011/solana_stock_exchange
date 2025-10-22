# Razorpay Integration for SOL Deposits

## Overview
This integration implements a complete Razorpay payment flow for depositing SOL into user wallets. Users pay in INR through Razorpay, and upon successful payment verification, SOL is airdropped to their wallet.

## Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Request Deposit (amount in SOL)
       ▼
┌──────────────────────────────────────┐
│  POST /api/wallet/deposit/create     │
│  - Convert SOL to INR                │
│  - Create Razorpay Order             │
│  - Save transaction (PENDING)        │
└──────┬───────────────────────────────┘
       │
       │ 2. Return Razorpay Order ID
       ▼
┌──────────────────────────────────────┐
│  Frontend Razorpay Checkout          │
│  - User completes payment            │
│  - Razorpay returns payment details  │
└──────┬───────────────────────────────┘
       │
       │ 3. Payment Success (order_id, payment_id, signature)
       ▼
┌──────────────────────────────────────┐
│  POST /api/wallet/deposit/verify     │
│  - Verify Razorpay signature         │
│  - Update transaction (PROCESSING)   │
│  - Airdrop SOL to wallet            │
│  - Update transaction (COMPLETED)    │
└──────┬───────────────────────────────┘
       │
       │ 4. Return success with Solana tx signature
       ▼
┌─────────────┐
│   User      │
│ (SOL in     │
│  wallet)    │
└─────────────┘
```

## Database Changes

### Schema Updates

The following columns have been added to the `wallet_transactions` table in `api/database/schema.sql`:

- `amount_inr` (DECIMAL(15,2)) - Amount in Indian Rupees for Razorpay payment
- `sol_rate` (DECIMAL(15,2)) - SOL to INR conversion rate at time of transaction
- Added index on `razorpay_payment_id` for better query performance

### Setting up the Database

If you already have the database created, run this SQL to add the new columns:

```sql
-- Add new columns to existing wallet_transactions table
ALTER TABLE wallet_transactions 
ADD COLUMN amount_inr DECIMAL(15,2) NULL COMMENT 'Amount in Indian Rupees for Razorpay payment',
ADD COLUMN sol_rate DECIMAL(15,2) NULL COMMENT 'SOL to INR conversion rate at time of transaction';

-- Add index for better performance
CREATE INDEX idx_razorpay_payment ON wallet_transactions(razorpay_payment_id);
```

If you're setting up fresh, simply run:

```bash
# Create database and load schema
mysql -u root -p solana_stock_exchange < api/database/schema.sql
```

## API Endpoints

### 1. Create Deposit Order

**Endpoint:** `POST /api/wallet/deposit/create`

**Request Body:**
```json
{
  "amount": "1.5"  // Amount in SOL
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "razorpay_order_id": "order_MN12345",
    "amount_sol": 1.5,
    "amount_inr": 18000,
    "currency": "INR",
    "razorpay_key_id": "rzp_test_xxxxx",
    "sol_rate": 12000,
    "user": {
      "name": "John Doe",
      "wallet_address": "En4riywe6GfC47jRwAGm5RHcEnt9EUGwzN3vPQ1vTGv2"
    }
  },
  "message": "Razorpay order created. Please complete payment."
}
```

### 2. Verify Payment and Airdrop SOL

**Endpoint:** `POST /api/wallet/deposit/verify`

**Request Body:**
```json
{
  "razorpay_order_id": "order_MN12345",
  "razorpay_payment_id": "pay_MN67890",
  "razorpay_signature": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "amount_sol": 1.5,
    "solana_signature": "5Kx7...",
    "explorer_url": "https://explorer.solana.com/tx/5Kx7...?cluster=devnet"
  },
  "message": "Payment verified and SOL deposited successfully"
}
```

## Frontend Integration Example

```javascript
// Step 1: Create deposit order
const createDeposit = async (solAmount) => {
  const response = await fetch('/api/wallet/deposit/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: solAmount })
  });
  
  const data = await response.json();
  return data;
};

// Step 2: Open Razorpay Checkout
const openRazorpay = (orderData) => {
  const options = {
    key: orderData.razorpay_key_id,
    amount: orderData.amount_inr * 100, // paise
    currency: orderData.currency,
    name: 'Solana Stock Exchange',
    description: `Deposit ${orderData.amount_sol} SOL`,
    order_id: orderData.razorpay_order_id,
    handler: async (response) => {
      // Step 3: Verify payment
      await verifyPayment(response);
    },
    prefill: {
      name: orderData.user.name,
    },
    theme: {
      color: '#14F195' // Solana green
    }
  };
  
  const razorpay = new Razorpay(options);
  razorpay.open();
};

// Step 3: Verify payment and get SOL
const verifyPayment = async (razorpayResponse) => {
  const response = await fetch('/api/wallet/deposit/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayResponse.razorpay_order_id,
      razorpay_payment_id: razorpayResponse.razorpay_payment_id,
      razorpay_signature: razorpayResponse.razorpay_signature
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('SOL deposited!', data.data);
    // Show success message with Solana explorer link
    window.open(data.data.explorer_url, '_blank');
  }
};

// Usage
const depositSOL = async () => {
  try {
    const orderData = await createDeposit('1.5'); // 1.5 SOL
    openRazorpay(orderData.data);
  } catch (error) {
    console.error('Deposit failed:', error);
  }
};
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx

# SOL Rate (optional, can be hardcoded or fetched from API)
SOL_TO_INR_RATE=12000
```

### SOL to INR Rate Configuration

Currently uses a static rate defined in `wallet.controller.ts`:

```typescript
const SOL_TO_INR_RATE = 12000; // 1 SOL = ₹12,000
```

**For Production:** Implement dynamic rate fetching from price APIs:

```typescript
async function getSolToInrRate(): Promise<number> {
    const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=inr'
    );
    const data = await response.json();
    return data.solana.inr;
}
```

## Transaction States

| Status | Description |
|--------|-------------|
| `PENDING` | Razorpay order created, awaiting payment |
| `PROCESSING` | Payment verified, airdrop in progress |
| `COMPLETED` | SOL successfully airdropped to wallet |
| `FAILED` | Payment verified but airdrop failed |
| `CANCELLED` | User cancelled payment |

## Error Handling

### Payment Signature Verification Failed
```json
{
  "success": false,
  "error": "Payment signature verification failed"
}
```

### Airdrop Failed
```json
{
  "success": false,
  "error": "Payment verified but SOL airdrop failed. Please contact support."
}
```

In case of airdrop failure:
1. Payment is verified and saved
2. Transaction marked as `FAILED` with reason
3. User should contact support with transaction ID
4. Admin can manually retry airdrop

## Testing

### Test Razorpay Cards (Test Mode)

For successful payment:
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

### Test Flow

1. Start with test environment:
```bash
# Ensure test validator is running
solana-test-validator

# Ensure your API is running
npm run dev
```

2. Create deposit order:
```bash
curl -X POST http://localhost:3000/api/wallet/deposit/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": "0.5"}'
```

3. Complete payment using Razorpay test mode

4. Verify payment:
```bash
curl -X POST http://localhost:3000/api/wallet/deposit/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx"
  }'
```

5. Check wallet balance on Solana Explorer

## Security Considerations

1. **Signature Verification**: Always verify Razorpay signatures server-side
2. **HTTPS Required**: Use HTTPS in production for Razorpay integration
3. **Rate Limiting**: Implement rate limiting on deposit endpoints
4. **Amount Validation**: Validate min/max deposit amounts
5. **Idempotency**: Prevent duplicate airdrops for same payment
6. **Webhook Validation**: Optionally implement Razorpay webhooks for backup verification

## Monitoring

### Key Metrics to Track

1. **Deposit Success Rate**: Percentage of successful SOL airdrops
2. **Average Deposit Time**: Time from payment to SOL in wallet
3. **Failed Airdrops**: Track and alert on airdrop failures
4. **Transaction Volume**: Monitor INR and SOL volumes
5. **Rate Fluctuations**: Track SOL/INR rate changes

### Database Queries for Monitoring

```sql
-- Failed airdrops requiring manual intervention
SELECT * FROM wallet_transactions 
WHERE type = 'DEPOSIT' 
  AND status = 'FAILED' 
  AND razorpay_payment_id IS NOT NULL
ORDER BY initiated_at DESC;

-- Deposit success rate (last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM wallet_transactions
WHERE type = 'DEPOSIT' 
  AND initiated_at >= NOW() - INTERVAL 24 HOUR
GROUP BY status;

-- Total volume
SELECT 
  COUNT(*) as total_deposits,
  SUM(amount) / 1000000000 as total_sol,
  SUM(amount_inr) as total_inr
FROM wallet_transactions
WHERE type = 'DEPOSIT' 
  AND status = 'COMPLETED';
```

## Production Checklist

- [ ] Switch to production Razorpay keys
- [ ] Implement dynamic SOL/INR rate fetching
- [ ] Set up Razorpay webhooks for payment notifications
- [ ] Configure proper error alerting (email/Slack)
- [ ] Set up monitoring dashboard
- [ ] Implement retry logic for failed airdrops
- [ ] Add transaction notification emails
- [ ] Configure proper rate limits
- [ ] Test with real small amounts
- [ ] Set up backup wallet for airdrops
- [ ] Document recovery procedures

## Support

For issues related to:
- **Razorpay Integration**: Check Razorpay dashboard and logs
- **SOL Airdrop Failures**: Check Solana explorer and validator logs
- **Database Issues**: Check `wallet_transactions` table

## Additional Resources

- [Razorpay Payment Gateway Docs](https://razorpay.com/docs/payments/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [CoinGecko API Docs](https://www.coingecko.com/en/api)
