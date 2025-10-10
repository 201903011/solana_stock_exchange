import { PublicKey } from '@solana/web3.js';
import { Request } from 'express';

// User Types
export interface User {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    phone?: string;
    wallet_address?: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface UserRegistration {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    wallet_address?: string;
}

export interface UserLogin {
    email: string;
    password: string;
}

// KYC Types
export enum KYCStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    RESUBMIT = 'RESUBMIT'
}

export interface KYCRecord {
    id: number;
    user_id: number;
    status: KYCStatus;
    document_type: string;
    document_number: string;
    document_front_url?: string;
    document_back_url?: string;
    selfie_url?: string;
    address_proof_url?: string;
    date_of_birth?: Date;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    rejection_reason?: string;
    verified_by?: number;
    verified_at?: Date;
    trade_account_address?: string;
    submitted_at: Date;
    updated_at: Date;
}

export interface KYCSubmission {
    document_type: string;
    document_number: string;
    date_of_birth: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
}

// Company Types
export interface Company {
    id: number;
    symbol: string;
    name: string;
    description?: string;
    token_mint: string;
    total_shares: bigint;
    outstanding_shares: bigint;
    sector?: string;
    industry?: string;
    logo_url?: string;
    website_url?: string;
    order_book_address?: string;
    base_vault_address?: string;
    sol_vault_address?: string;
    tick_size: bigint;
    min_order_size: bigint;
    is_active: boolean;
    listed_at?: Date;
    registered_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface CompanyRegistration {
    symbol: string;
    name: string;
    description?: string;
    total_shares: string;
    sector?: string;
    industry?: string;
    logo_url?: string;
    website_url?: string;
    tick_size?: string;
    min_order_size?: string;
}

// Order Types
export enum OrderSide {
    BUY = 'BUY',
    SELL = 'SELL'
}

export enum OrderType {
    MARKET = 'MARKET',
    LIMIT = 'LIMIT',
    POST_ONLY = 'POST_ONLY',
    IOC = 'IOC'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PARTIAL = 'PARTIAL',
    FILLED = 'FILLED',
    CANCELLED = 'CANCELLED'
}

export interface Order {
    id: number;
    user_id: number;
    company_id: number;
    order_id: bigint;
    order_address: string;
    side: OrderSide;
    order_type: OrderType;
    price?: bigint;
    quantity: bigint;
    filled_quantity: bigint;
    remaining_quantity: bigint;
    status: OrderStatus;
    transaction_signature?: string;
    created_at: Date;
    updated_at: Date;
}

export interface PlaceOrderRequest {
    company_id: number;
    side: OrderSide;
    order_type: OrderType;
    price?: string; // in lamports, required for LIMIT orders
    quantity: string;
    max_quote_amount?: string; // for MARKET orders
}

// Trade Types
export interface Trade {
    id: number;
    company_id: number;
    buyer_id: number;
    seller_id: number;
    buy_order_id: number;
    sell_order_id: number;
    trade_id: bigint;
    price: bigint;
    quantity: bigint;
    maker_fee: bigint;
    taker_fee: bigint;
    transaction_signature: string;
    settled: boolean;
    executed_at: Date;
}

// IPO Types
export enum IPOStatus {
    UPCOMING = 'UPCOMING',
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    ALLOTTED = 'ALLOTTED',
    CANCELLED = 'CANCELLED'
}

export interface IPO {
    id: number;
    company_id: number;
    title: string;
    description?: string;
    total_shares: bigint;
    price_per_share: bigint;
    min_subscription: bigint;
    max_subscription: bigint;
    total_subscribed: bigint;
    escrow_address?: string;
    status: IPOStatus;
    open_date: Date;
    close_date: Date;
    allotment_date?: Date;
    created_by: number;
    created_at: Date;
    updated_at: Date;
}

export interface IPOCreation {
    company_id: number;
    title: string;
    description?: string;
    total_shares: string;
    price_per_share: string;
    min_subscription: string;
    max_subscription: string;
    open_date: string;
    close_date: string;
}

export enum IPOApplicationStatus {
    PENDING = 'PENDING',
    ALLOTTED = 'ALLOTTED',
    REJECTED = 'REJECTED',
    REFUNDED = 'REFUNDED'
}

export interface IPOApplication {
    id: number;
    ipo_id: number;
    user_id: number;
    quantity: bigint;
    amount: bigint;
    allotted_quantity: bigint;
    status: IPOApplicationStatus;
    transaction_signature?: string;
    escrow_address?: string;
    applied_at: Date;
    updated_at: Date;
}

export interface IPOApplicationRequest {
    ipo_id: number;
    quantity: string;
}

// Holdings Types
export interface Holding {
    id: number;
    user_id: number;
    company_id: number;
    token_account: string;
    quantity: bigint;
    average_price?: bigint;
    last_synced: Date;
}

export interface PortfolioHolding {
    company: Company;
    holding: Holding;
    current_price?: bigint;
    market_value?: bigint;
    profit_loss?: bigint;
    profit_loss_percentage?: number;
}

// Wallet Transaction Types
export enum WalletTransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL'
}

export enum WalletTransactionStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
    RAZORPAY = 'RAZORPAY',
    BANK_TRANSFER = 'BANK_TRANSFER',
    UPI = 'UPI'
}

export interface WalletTransaction {
    id: number;
    user_id: number;
    type: WalletTransactionType;
    amount: bigint;
    currency: string;
    status: WalletTransactionStatus;
    payment_method: PaymentMethod;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    transaction_signature?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_account_holder?: string;
    utr_number?: string;
    failure_reason?: string;
    initiated_at: Date;
    completed_at?: Date;
    updated_at: Date;
}

export interface DepositRequest {
    amount: string; // in lamports
    payment_method: PaymentMethod;
}

export interface WithdrawalRequest {
    amount: string; // in lamports
    bank_account_id: number;
}

// Bank Account Types
export enum AccountType {
    SAVINGS = 'SAVINGS',
    CURRENT = 'CURRENT'
}

export interface BankAccount {
    id: number;
    user_id: number;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name?: string;
    branch_name?: string;
    account_type: AccountType;
    is_verified: boolean;
    is_primary: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface BankAccountCreation {
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name?: string;
    branch_name?: string;
    account_type: AccountType;
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// JWT Types
export interface JWTPayload {
    userId: number;
    email: string;
    isAdmin: boolean;
}

// Request with User
export interface AuthRequest extends Request {
    user?: JWTPayload;
}

// Solana Types
export interface SolanaOrderBook {
    baseMint: PublicKey;
    baseVault: PublicKey;
    solVault: PublicKey;
    tickSize: bigint;
    minOrderSize: bigint;
    bidsHead?: bigint;
    asksHead?: bigint;
    nextOrderId: bigint;
    totalOrders: bigint;
    totalVolume: bigint;
    lastPrice: bigint;
    isActive: boolean;
}

export interface SolanaOrder {
    orderBook: PublicKey;
    trader: PublicKey;
    orderId: bigint;
    side: { bid: {} } | { ask: {} };
    orderType: { limit: {} } | { market: {} } | { postOnly: {} } | { immediateOrCancel: {} };
    price: bigint;
    quantity: bigint;
    filledQuantity: bigint;
    timestamp: bigint;
    next?: bigint;
    prev?: bigint;
    isActive: boolean;
}

export interface SolanaTradingAccount {
    owner: PublicKey;
    exchange: PublicKey;
    totalTrades: bigint;
    totalVolume: bigint;
    feeTier: number;
    referrer?: PublicKey;
}

export interface SolanaTrade {
    orderBook: PublicKey;
    tradeId: bigint;
    makerOrderId: bigint;
    takerOrderId: bigint;
    maker: PublicKey;
    taker: PublicKey;
    price: bigint;
    quantity: bigint;
    makerFee: bigint;
    takerFee: bigint;
    timestamp: bigint;
    settled: boolean;
}
