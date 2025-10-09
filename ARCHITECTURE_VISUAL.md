# Solana Stock Exchange - Complete System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                          │
│                   (Web/Mobile/Desktop Frontends)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS API SERVER                           │
│                    (Node.js + TypeScript)                            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Authentication Layer (JWT)                                   │  │
│  │  • User authentication     • KYC verification                 │  │
│  │  • Role-based access      • Session management                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Business Logic Controllers                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │   Auth   │ │ Company  │ │  Order   │ │Portfolio │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │  │
│  │  │   IPO    │ │  Wallet  │ │  Admin   │                    │  │
│  │  └──────────┘ └──────────┘ └──────────┘                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Integration Layer                                            │  │
│  │  • Solana RPC Client       • Razorpay SDK                    │  │
│  │  • Anchor Program Interface • MySQL Driver                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────┬──────────────────────────┘
                    │                      │
        ┌───────────▼──────────┐  ┌───────▼──────────┐
        │   MySQL Database     │  │ Solana Blockchain│
        │  (Off-chain Data)    │  │  (On-chain Data) │
        └──────────────────────┘  └──────────────────┘
```

## Data Flow Architecture

### Flow 1: User Registration & KYC

```
┌──────┐      ┌─────────┐      ┌───────┐      ┌─────────┐
│Client│      │API Server│      │ MySQL │      │ Solana  │
└──┬───┘      └────┬────┘      └───┬───┘      └────┬────┘
   │               │                │               │
   │ 1. Register   │                │               │
   ├──────────────>│                │               │
   │               │ 2. Store User  │               │
   │               ├───────────────>│               │
   │               │                │               │
   │               │ 3. JWT Token   │               │
   │<──────────────┤                │               │
   │               │                │               │
   │ 4. Submit KYC │                │               │
   ├──────────────>│                │               │
   │               │ 5. Store KYC   │               │
   │               ├───────────────>│               │
   │               │                │               │
   │ [Admin Approves KYC]           │               │
   │               │                │               │
   │               │ 6. Get Wallet  │               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 7. Create Trading Account      │
   │               ├───────────────────────────────>│
   │               │                │               │
   │               │ 8. Trading Account PDA         │
   │               │<───────────────────────────────┤
   │               │                │               │
   │               │ 9. Store PDA   │               │
   │               ├───────────────>│               │
   │               │                │               │
   │ 10. KYC Approved + PDA         │               │
   │<──────────────┤                │               │
```

### Flow 2: Place Order

```
┌──────┐      ┌─────────┐      ┌───────┐      ┌─────────┐
│Client│      │API Server│      │ MySQL │      │ Solana  │
└──┬───┘      └────┬────┘      └───┬───┘      └────┬────┘
   │               │                │               │
   │ 1. Place Order│                │               │
   ├──────────────>│                │               │
   │               │ 2. Verify KYC  │               │
   │               ├───────────────>│               │
   │               │ 3. KYC Status  │               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 4. Get Company (token_mint)    │
   │               ├───────────────>│               │
   │               │ 5. Company Data│               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 6. Place Order on Solana       │
   │               ├───────────────────────────────>│
   │               │                │               │
   │               │ 7. Order PDA + Tx Signature    │
   │               │<───────────────────────────────┤
   │               │                │               │
   │               │ 8. Store Order │               │
   │               ├───────────────>│               │
   │               │                │               │
   │ 9. Order ID + Tx Signature     │               │
   │<──────────────┤                │               │
```

### Flow 3: View Portfolio

```
┌──────┐      ┌─────────┐      ┌───────┐      ┌─────────┐
│Client│      │API Server│      │ MySQL │      │ Solana  │
└──┬───┘      └────┬────┘      └───┬───┘      └────┬────┘
   │               │                │               │
   │ 1. Get Portfolio               │               │
   ├──────────────>│                │               │
   │               │ 2. Get User Wallet             │
   │               ├───────────────>│               │
   │               │ 3. Wallet Addr │               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 4. Get Companies (token_mints) │
   │               ├───────────────>│               │
   │               │ 5. Company List│               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 6. Query Token Balances        │
   │               ├───────────────────────────────>│
   │               │                │               │
   │               │ 7. Balances + Token Accounts   │
   │               │<───────────────────────────────┤
   │               │                │               │
   │               │ 8. Get Trade History           │
   │               ├───────────────>│               │
   │               │ 9. Trade Data  │               │
   │               │<───────────────┤               │
   │               │                │               │
   │               │ 10. Calculate P&L              │
   │               │ 11. Update Holdings Cache      │
   │               ├───────────────>│               │
   │               │                │               │
   │ 12. Portfolio (Solana + SQL Data)              │
   │<──────────────┤                │               │
```

## Database Schema (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                          MySQL Tables                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  users                    companies               orders         │
│  ├─ id                    ├─ id                   ├─ id         │
│  ├─ email                 ├─ symbol               ├─ user_id    │
│  ├─ password_hash         ├─ name                 ├─ company_id │
│  ├─ wallet_address ◄──┐   ├─ token_mint ◄──┐     ├─ order_id   │
│  └─ is_admin            │   ├─ order_book_addr│   ├─ order_addr │
│                         │   ├─ base_vault     │   ├─ side       │
│  kyc_records            │   ├─ sol_vault      │   ├─ price      │
│  ├─ id                  │   └─ tick_size      │   ├─ quantity   │
│  ├─ user_id             │                     │   ├─ status     │
│  ├─ status              │   holdings          │   └─ tx_sig     │
│  ├─ trade_account ◄─────┼─  ├─ id             │                 │
│  └─ verified_at         │   ├─ user_id        │   trades        │
│                         │   ├─ company_id     │   ├─ id         │
│  ipos                   │   ├─ token_account◄─┼─  ├─ company_id │
│  ├─ id                  │   ├─ quantity       │   ├─ buyer_id   │
│  ├─ company_id          │   └─ average_price  │   ├─ seller_id  │
│  ├─ total_shares        │                     │   ├─ price      │
│  ├─ price_per_share     │   wallet_txns       │   ├─ quantity   │
│  ├─ escrow_address ◄────┼─  ├─ id             │   ├─ maker_fee  │
│  └─ status              │   ├─ user_id        │   ├─ taker_fee  │
│                         │   ├─ type           │   └─ tx_sig     │
│  ipo_applications       │   ├─ amount         │                 │
│  ├─ id                  │   ├─ status         │   bank_accounts │
│  ├─ ipo_id              │   ├─ tx_sig ◄───────┼─  ├─ id         │
│  ├─ user_id             │   └─ completed_at   │   ├─ user_id    │
│  ├─ quantity            │                     │   ├─ acc_number  │
│  ├─ amount              └───────┬─────────────┘   ├─ ifsc_code  │
│  ├─ escrow_address              │                 └─ acc_type    │
│  └─ status                      │                                │
│                                 │                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                 All addresses verified with ▼
                                  
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Exchange (PDA)           OrderBook (PDA)      Order (PDA)      │
│  ├─ authority             ├─ base_mint         ├─ order_book    │
│  ├─ fee_collector         ├─ base_vault        ├─ trader        │
│  ├─ maker_fee_bps         ├─ sol_vault         ├─ order_id      │
│  ├─ taker_fee_bps         ├─ tick_size         ├─ side          │
│  └─ paused                ├─ min_order_size    ├─ price         │
│                           ├─ bids_head         ├─ quantity      │
│  TradingAccount (PDA)     ├─ asks_head         └─ is_active     │
│  ├─ owner                 └─ next_order_id                      │
│  ├─ exchange                                   Trade (PDA)      │
│  ├─ total_trades          Token Account        ├─ trade_id      │
│  └─ total_volume          ├─ mint              ├─ maker         │
│                           ├─ owner              ├─ taker         │
│  IPO Escrow (PDA)         └─ amount             ├─ price         │
│  ├─ ipo_id                                     └─ settled       │
│  ├─ user                                                        │
│  └─ amount_escrowed                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints Map

```
/api
├── /auth
│   ├── POST   /register                 [Public]
│   ├── POST   /login                    [Public]
│   ├── GET    /profile                  [Authenticated]
│   ├── POST   /kyc/submit               [Authenticated]
│   ├── GET    /kyc/pending              [Admin]
│   ├── POST   /kyc/:id/approve          [Admin]
│   └── POST   /kyc/:id/reject           [Admin]
│
├── /companies
│   ├── GET    /                         [Public]
│   ├── GET    /:id                      [Public]
│   ├── POST   /                         [Admin]
│   └── PUT    /:id                      [Admin]
│
├── /orders
│   ├── POST   /                         [Authenticated + KYC]
│   ├── POST   /:id/cancel               [Authenticated + KYC]
│   ├── GET    /                         [Authenticated]
│   └── GET    /book/:companyId          [Public]
│
├── /portfolio
│   ├── GET    /                         [Authenticated]
│   └── GET    /trades                   [Authenticated]
│
├── /ipos
│   ├── GET    /                         [Public]
│   ├── POST   /                         [Admin]
│   ├── POST   /apply                    [Authenticated + KYC]
│   └── GET    /applications             [Authenticated]
│
└── /wallet
    ├── POST   /deposit                  [Authenticated]
    ├── POST   /deposit/verify           [Authenticated]
    ├── POST   /withdraw                 [Authenticated + Bank]
    ├── GET    /transactions             [Authenticated]
    ├── POST   /bank-accounts            [Authenticated]
    └── GET    /bank-accounts            [Authenticated]
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Backend Framework                                               │
│  ├─ Node.js (v16+)                                              │
│  ├─ Express.js (v4)                                             │
│  └─ TypeScript (v5)                                             │
│                                                                  │
│  Database                                                        │
│  ├─ MySQL (v8.0)                                                │
│  └─ mysql2 (Promise-based driver)                               │
│                                                                  │
│  Blockchain                                                      │
│  ├─ Solana Web3.js                                              │
│  ├─ Anchor Framework                                            │
│  └─ SPL Token                                                   │
│                                                                  │
│  Authentication & Security                                       │
│  ├─ JWT (jsonwebtoken)                                          │
│  ├─ bcrypt (password hashing)                                   │
│  ├─ Helmet (security headers)                                   │
│  ├─ CORS                                                        │
│  └─ express-rate-limit                                          │
│                                                                  │
│  Validation                                                      │
│  └─ express-validator                                           │
│                                                                  │
│  Payments                                                        │
│  └─ Razorpay SDK                                                │
│                                                                  │
│  Development Tools                                               │
│  ├─ ts-node                                                     │
│  ├─ nodemon                                                     │
│  └─ TypeScript Compiler                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network Security                                       │
│  ├─ HTTPS/TLS encryption                                        │
│  ├─ CORS configuration                                          │
│  └─ Rate limiting (100 req/15min)                               │
│                                                                  │
│  Layer 2: Authentication                                         │
│  ├─ JWT tokens (7 day expiry)                                   │
│  ├─ bcrypt password hashing (10 rounds)                         │
│  └─ Secure token transmission                                   │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ├─ Role-based access (User/Admin)                              │
│  ├─ KYC verification checks                                     │
│  └─ Wallet ownership verification                               │
│                                                                  │
│  Layer 4: Input Validation                                       │
│  ├─ express-validator rules                                     │
│  ├─ Type checking (TypeScript)                                  │
│  └─ SQL injection prevention                                    │
│                                                                  │
│  Layer 5: Application Security                                   │
│  ├─ Helmet security headers                                     │
│  ├─ XSS protection                                              │
│  ├─ CSRF protection                                             │
│  └─ Error message sanitization                                  │
│                                                                  │
│  Layer 6: Blockchain Security                                    │
│  ├─ Transaction signature verification                           │
│  ├─ PDA validation                                              │
│  ├─ Balance checks before operations                            │
│  └─ Solana program security                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         Load Balancer                            │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              │                               │                  │
│         API Server 1                    API Server 2            │
│         (Node.js PM2)                   (Node.js PM2)           │
│              │                               │                  │
│              └───────────────┬───────────────┘                  │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │                   │                        │
│              MySQL Master         Solana RPC                    │
│                    │               (Mainnet)                    │
│              MySQL Replica                                      │
│                                                                  │
│  Additional Services:                                            │
│  ├─ Redis (Caching)                                             │
│  ├─ Nginx (Reverse Proxy)                                       │
│  ├─ CloudWatch (Monitoring)                                     │
│  └─ S3 (File Storage)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

This architecture provides a complete, scalable, and secure stock exchange platform!
