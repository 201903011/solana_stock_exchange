// Core TypeScript types and interfaces for the Stock Exchange Backend

import { PublicKey } from '@solana/web3.js';

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    phone?: string;
    wallet_address: string;
    wallet_private_key?: string;
    is_active: boolean;
    is_admin: boolean;
    email_verified: boolean;
    phone_verified: boolean;
    kyc_status: KYCStatus;
    last_login_at?: Date;
    last_login_ip?: string;
    created_at: Date;
    updated_at: Date;
}

export type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';

export interface KYCRecord {
    id: number;
    user_id: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';
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
    trading_account_address?: string;
    trading_account_bump?: number;
    submitted_at: Date;
    updated_at: Date;
}

export interface JWTPayload {
    userId: number;
    email: string;
    walletAddress: string;
    isAdmin: boolean;
    kycStatus: KYCStatus;
    iat?: number;
    exp?: number;
}

export interface UserSession {
    id: number;
    user_id: number;
    token_hash: string;
    ip_address?: string;
    user_agent?: string;
    device_info?: string;
    is_active: boolean;
    expires_at: Date;
    last_activity: Date;
    created_at: Date;
}

// ============================================================================
// COMPANY TYPES
// ============================================================================

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
    order_book_bump?: number;
    base_vault_address?: string;
    quote_vault_address?: string;
    tick_size: bigint;
    min_order_size: bigint;
    is_active: boolean;
    is_listed: boolean;
    listed_at?: Date;
    registered_by?: number;
    created_at: Date;
    updated_at: Date;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'POST_ONLY' | 'IOC';
export type OrderStatus = 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'FAILED';

export interface Order {
    id: number;
    user_id: number;
    company_id: number;
    order_id: bigint;
    order_address: string;
    order_bump?: number;
    side: OrderSide;
    order_type: OrderType;
    price?: bigint;
    quantity: bigint;
    filled_quantity: bigint;
    remaining_quantity: bigint;
    status: OrderStatus;
    transaction_signature?: string;
    error_message?: string;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
}

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
    maker_side: OrderSide;
    maker_fee: bigint;
    taker_fee: bigint;
    transaction_signature: string;
    settled: boolean;
    executed_at: Date;
}

// In-memory order book types
export interface OrderBookEntry {
    orderId: number;
    orderAddress: string;
    userId: number;
    walletAddress: string;
    price: bigint;
    quantity: bigint;
    remainingQuantity: bigint;
    timestamp: Date;
}

export interface OrderBook {
    companyId: number;
    symbol: string;
    bids: OrderBookEntry[]; // Sorted by price DESC
    asks: OrderBookEntry[]; // Sorted by price ASC
    lastUpdated: Date;
}

export interface MarketDepth {
    bids: PriceLevel[]; // Top 5 bids
    asks: PriceLevel[]; // Top 5 asks
}

export interface PriceLevel {
    price: string; // In lamports
    quantity: string;
    orderCount: number;
}

// ============================================================================
// IPO TYPES
// ============================================================================

export type IPOStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'ALLOTTED' | 'CANCELLED';
export type IPOApplicationStatus = 'PAYMENT_PENDING' | 'PENDING' | 'ALLOTTED' | 'REJECTED' | 'REFUNDED' | 'PARTIALLY_ALLOTTED';

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
    total_applications: number;
    allotment_ratio: number;
    escrow_address?: string;
    escrow_bump?: number;
    status: IPOStatus;
    open_date: Date;
    close_date: Date;
    allotment_date?: Date;
    created_by: number;
    created_at: Date;
    updated_at: Date;
}

export interface IPOApplication {
    id: number;
    ipo_id: number;
    user_id: number;
    quantity: bigint;
    amount: bigint;
    allotted_quantity: bigint;
    refund_amount: bigint;
    status: IPOApplicationStatus;
    payment_transaction_signature?: string;
    allotment_transaction_signature?: string;
    escrow_address?: string;
    escrow_bump?: number;
    applied_at: Date;
    payment_completed_at?: Date;
    allotted_at?: Date;
    updated_at: Date;
}

// ============================================================================
// HOLDINGS & PORTFOLIO TYPES
// ============================================================================

export interface Holding {
    id: number;
    user_id: number;
    company_id: number;
    token_account: string;
    quantity: bigint;
    locked_quantity: bigint;
    available_quantity: bigint;
    average_price?: bigint;
    last_synced: Date;
}

export interface PortfolioItem {
    companyId: number;
    symbol: string;
    companyName: string;
    quantity: string;
    lockedQuantity: string;
    availableQuantity: string;
    averagePrice: string;
    currentPrice: string;
    currentValue: string;
    investedValue: string;
    unrealizedPnL: string;
    pnlPercentage: number;
}

// ============================================================================
// WALLET & FUNDS TYPES
// ============================================================================

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type PaymentMethod = 'RAZORPAY' | 'BANK_TRANSFER' | 'UPI' | 'ONCHAIN';

export interface WalletTransaction {
    id: number;
    user_id: number;
    type: TransactionType;
    amount: bigint;
    currency: string;
    status: TransactionStatus;
    payment_method: PaymentMethod;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    amount_inr?: number;
    sol_rate?: number;
    transaction_signature?: string;
    from_address?: string;
    to_address?: string;
    bank_account_id?: number;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_account_holder?: string;
    utr_number?: string;
    failure_reason?: string;
    admin_notes?: string;
    processed_by?: number;
    initiated_at: Date;
    completed_at?: Date;
    updated_at: Date;
}

export interface BankAccount {
    id: number;
    user_id: number;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name?: string;
    branch_name?: string;
    account_type: 'SAVINGS' | 'CURRENT';
    is_verified: boolean;
    is_primary: boolean;
    verified_at?: Date;
    verified_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface SOLBalance {
    id: number;
    user_id: number;
    wallet_address: string;
    balance: bigint;
    locked_balance: bigint;
    available_balance: bigint;
    last_synced: Date;
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

export interface MarketData {
    id: number;
    company_id: number;
    last_price?: bigint;
    open_price?: bigint;
    high_price?: bigint;
    low_price?: bigint;
    close_price?: bigint;
    volume: bigint;
    turnover: bigint;
    trades_count: number;
    bid_price?: bigint;
    ask_price?: bigint;
    bid_quantity?: bigint;
    ask_quantity?: bigint;
    last_updated: Date;
}

export interface OrderBookLevel {
    id: number;
    company_id: number;
    side: OrderSide;
    price: bigint;
    quantity: bigint;
    order_count: number;
    level_rank: number;
    last_updated: Date;
}

// ============================================================================
// NOTIFICATION & AUDIT TYPES
// ============================================================================

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type NotificationCategory = 'ACCOUNT' | 'KYC' | 'ORDER' | 'TRADE' | 'IPO' | 'WALLET' | 'SYSTEM';

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    data?: any;
    is_read: boolean;
    read_at?: Date;
    expires_at?: Date;
    created_at: Date;
}

export interface AuditLog {
    id: number;
    user_id?: number;
    action: string;
    entity_type?: string;
    entity_id?: number;
    ip_address?: string;
    user_agent?: string;
    request_method?: string;
    request_path?: string;
    request_body?: string;
    response_status?: number;
    changes?: any;
    created_at: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface FilterParams {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    [key: string]: any;
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
    message?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Auth API types
export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        wallet_address: string;
        is_admin: boolean;
        kyc_status: KYCStatus;
    };
}

export interface KYCSubmitRequest {
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

// Company API types
export interface CompanyRegisterRequest {
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

// Order API types
export interface PlaceOrderRequest {
    company_id: number;
    side: OrderSide;
    order_type: OrderType;
    price?: string;
    quantity: string;
    transaction_signature: string;
}

// IPO API types
export interface IPOApplyRequest {
    ipo_id: number;
    quantity: string;
}

export interface IPOAllocationRequest {
    application_id: number;
    allotted_quantity: string;
    transaction_signature: string;
}

// Fund API types
export interface DepositRequest {
    amount_inr: number;
}

export interface VerifyDepositRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    transaction_id: number;
}

export interface WithdrawRequest {
    amount: string;
    bank_account_id: number;
}

export interface AddBankAccountRequest {
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    branch_name?: string;
    account_type: 'SAVINGS' | 'CURRENT';
}

// ============================================================================
// SYSTEM CONFIG TYPES
// ============================================================================

export interface SystemConfig {
    id: number;
    config_key: string;
    config_value: string;
    description?: string;
    is_sensitive: boolean;
    updated_by?: number;
    updated_at: Date;
}

// ============================================================================
// TRANSACTION QUEUE TYPES
// ============================================================================

export type QueueType = 'ORDER' | 'TRADE' | 'IPO_ALLOTMENT' | 'WITHDRAWAL' | 'REFUND' | 'OTHER';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface TransactionQueue {
    id: number;
    type: QueueType;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    priority: number;
    status: QueueStatus;
    transaction_data: any;
    retry_count: number;
    max_retries: number;
    error_message?: string;
    transaction_signature?: string;
    scheduled_at: Date;
    started_at?: Date;
    completed_at?: Date;
    created_at: Date;
    updated_at: Date;
}

// ============================================================================
// SOLANA TYPES
// ============================================================================

export interface SolanaTransactionData {
    signature: string;
    blockTime?: number;
    slot?: number;
    confirmationStatus: 'processed' | 'confirmed' | 'finalized';
}

export interface VerifySignatureParams {
    message: string;
    signature: string;
    publicKey: string;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
    type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'MARKET_DEPTH' | 'TRADE' | 'ORDER_UPDATE' | 'ERROR';
    data?: any;
}

export interface MarketDepthUpdate {
    companyId: number;
    symbol: string;
    bids: PriceLevel[];
    asks: PriceLevel[];
    timestamp: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409);
    }
}
