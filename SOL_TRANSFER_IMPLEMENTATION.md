# Client-Side SOL Transfer Implementation for IPO Applications

This document explains the complete implementation of secure SOL transfers for IPO applications using client-side transaction signing.

## 🏗️ Architecture Overview

The implementation uses a two-step process:

1. **Application Submission**: Creates IPO application in `PAYMENT_PENDING` status
2. **Payment Confirmation**: User signs SOL transfer, backend verifies and confirms

## 🔄 Flow Diagram

```
Frontend                    Backend                     Solana Network
   |                          |                             |
   |------ POST /ipo/apply ---|                             |
   |                          |---- Check balance ---------|
   |                          |<--- Balance OK -------------|
   |<-- PAYMENT_PENDING ------|                             |
   |                          |                             |
   |-- Create SOL transfer ---|                             |
   |-- Sign with wallet ------|                             |
   |-- Send transaction ------|-------------- TX ---------->|
   |                          |                             |<-- Confirmed
   |                          |                             |
   |-- POST /confirm-payment --|                             |
   |                          |---- Verify TX ------------->|
   |                          |<--- TX Details -------------|
   |                          |---- Update Status ---------|
   |<-- Application PENDING --|                             |
```

## 📊 Database Schema Updates

### New Status in IPO Applications
```sql
-- Updated status enum
ALTER TABLE ipo_applications 
MODIFY COLUMN status ENUM('PAYMENT_PENDING', 'PENDING', 'ALLOTTED', 'REJECTED', 'REFUNDED') DEFAULT 'PENDING';

-- New field for SOL payment signature
ALTER TABLE ipo_applications 
ADD COLUMN payment_signature VARCHAR(100) NULL COMMENT 'SOL payment transaction signature';
```

## 🔗 API Endpoints

### 1. Apply to IPO
**POST** `/api/ipo/apply`

**Request:**
```json
{
  "ipo_id": 1,
  "quantity": "1000"
}
```

**Response (Payment Required):**
```json
{
  "success": true,
  "data": {
    "application_id": 123,
    "ipo_symbol": "TATA",
    "quantity": "1000",
    "total_amount_sol": 0.1,
    "token_account": "ABC...XYZ",
    "status": "PAYMENT_PENDING",
    "payment_instruction": {
      "type": "sol_transfer",
      "from": "UserWallet...",
      "to": "AdminWallet...",
      "amount_lamports": 100000000,
      "amount_sol": 0.1
    }
  },
  "message": "IPO application created. Please complete SOL payment to confirm."
}
```

### 2. Confirm Payment
**POST** `/api/ipo/confirm-payment`

**Request:**
```json
{
  "application_id": 123,
  "transaction_signature": "5J7...ABC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "application_id": 123,
    "transaction_signature": "5J7...ABC",
    "company_symbol": "TATA",
    "quantity": "1000",
    "amount_sol": 0.1,
    "status": "PENDING"
  },
  "message": "SOL payment confirmed successfully. IPO application is now pending allocation."
}
```

## 🔒 Security Features

### Transaction Verification
The backend performs comprehensive verification:

1. **Transaction Existence**: Confirms transaction exists on Solana network
2. **Sender Verification**: Ensures transaction is from the correct user wallet
3. **Recipient Verification**: Confirms SOL goes to admin wallet
4. **Amount Verification**: Validates correct SOL amount (with fee tolerance)
5. **Confirmation Status**: Only accepts confirmed transactions

### Error Handling
- **Transaction Not Found**: Invalid or unconfirmed signature
- **Sender Mismatch**: Transaction from wrong wallet
- **Recipient Mismatch**: SOL sent to wrong address
- **Amount Mismatch**: Incorrect transfer amount
- **Already Processed**: Prevents double processing

## 💻 Frontend Implementation

### React Example with Wallet Adapter
```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram } from '@solana/web3.js';

function IPOApplication({ ipo }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  const handleApply = async (quantity: string) => {
    setLoading(true);
    
    try {
      // Step 1: Submit application
      const appResponse = await fetch('/api/ipo/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ipo_id: ipo.id,
          quantity: quantity
        })
      });

      const appData = await appResponse.json();
      
      if (appData.data.status === 'PAYMENT_PENDING') {
        // Step 2: Create and sign SOL transfer
        const paymentInst = appData.data.payment_instruction;
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey!,
            toPubkey: new PublicKey(paymentInst.to),
            lamports: paymentInst.amount_lamports
          })
        );

        // Get recent blockhash and sign
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey!;

        const signed = await wallet.signTransaction!(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        // Step 3: Confirm payment
        const confirmResponse = await fetch('/api/ipo/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            application_id: appData.data.application_id,
            transaction_signature: signature
          })
        });

        const confirmData = await confirmResponse.json();
        
        if (confirmData.success) {
          alert('IPO application successful!');
        }
      }
    } catch (error) {
      console.error('Application failed:', error);
      alert('Application failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={() => handleApply(quantity)}
      disabled={loading || !wallet.connected}
    >
      {loading ? 'Processing...' : 'Apply to IPO'}
    </button>
  );
}
```

### Vue.js Example
```vue
<template>
  <button @click="applyToIPO" :disabled="loading || !wallet.connected">
    {{ loading ? 'Processing...' : 'Apply to IPO' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { useWallet } from '@solana/wallet-adapter-vue';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const wallet = useWallet();
const connection = new Connection(process.env.VUE_APP_SOLANA_RPC_URL);
const loading = ref(false);

const applyToIPO = async () => {
  loading.value = true;
  
  try {
    // Same implementation as React example
    // ... (implementation details)
  } catch (error) {
    console.error('Application failed:', error);
  } finally {
    loading.value = false;
  }
};
</script>
```

## 🧪 Testing

### Unit Tests
```typescript
describe('IPO SOL Transfer', () => {
  it('should create application with PAYMENT_PENDING status', async () => {
    const response = await request(app)
      .post('/api/ipo/apply')
      .send({ ipo_id: 1, quantity: '1000' })
      .expect(202);
    
    expect(response.body.data.status).toBe('PAYMENT_PENDING');
    expect(response.body.data.payment_instruction).toBeDefined();
  });

  it('should verify and confirm SOL payment', async () => {
    // Mock Solana transaction verification
    jest.spyOn(solanaService, 'getConnection').mockReturnValue({
      getTransaction: jest.fn().mockResolvedValue(mockTxInfo)
    });

    const response = await request(app)
      .post('/api/ipo/confirm-payment')
      .send({
        application_id: 123,
        transaction_signature: 'mock_signature'
      })
      .expect(200);
    
    expect(response.body.data.status).toBe('PENDING');
  });
});
```

### Integration Tests
1. **End-to-end flow testing** with real Solana devnet
2. **Transaction verification** with various scenarios
3. **Error handling** for failed transactions
4. **Security testing** for malicious attempts

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_WALLET_PRIVATE_KEY=base58_encoded_private_key

# Database
DB_HOST=localhost
DB_NAME=solana_stock_exchange
```

### Production Checklist
- [ ] Configure mainnet RPC endpoints
- [ ] Set up monitoring for transaction failures
- [ ] Implement rate limiting for payment confirmations
- [ ] Add transaction fee estimation
- [ ] Set up admin wallet balance monitoring
- [ ] Configure error alerting

## 🔧 Troubleshooting

### Common Issues

1. **Transaction Not Found**
   - Check if transaction is confirmed
   - Verify RPC endpoint connectivity
   - Ensure sufficient confirmation level

2. **Amount Mismatch**
   - Account for transaction fees (typically 5000 lamports)
   - Check for proper lamports conversion
   - Verify fee tolerance settings

3. **Wallet Connection Issues**
   - Ensure wallet adapter is properly configured
   - Check for network mismatches
   - Verify wallet permissions

### Debug Tools
- **Solana Explorer**: View transactions in real-time
- **RPC Logs**: Monitor connection issues
- **Database Logs**: Track application status changes

## 📈 Performance Optimization

### Caching Strategy
- Cache admin wallet public key
- Store RPC connection instance
- Cache transaction verification results

### Batch Processing
- Process multiple payment confirmations together
- Implement queue for high-volume scenarios
- Add retry mechanism for failed verifications

## 🔄 Migration Guide

### Existing Applications
1. Run database migration script
2. Update API clients to handle new flow
3. Test with existing pending applications
4. Monitor for any data inconsistencies

### Rollback Plan
- Keep old payment flow as fallback
- Feature flag for new implementation
- Database rollback scripts ready

This implementation provides a secure, scalable solution for SOL payments in IPO applications while maintaining excellent user experience and security standards.