-- Solana Stock Exchange Backend Database Schema
-- Complete schema with all edge cases covered

-- Drop existing tables (be careful in production!)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS transaction_queue;
DROP TABLE IF EXISTS sol_balances;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS exchange_stats;
DROP TABLE IF EXISTS order_book_levels;
DROP TABLE IF EXISTS market_data;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS ipo_applications;
DROP TABLE IF EXISTS ipos;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS kyc_records;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_config;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    wallet_address VARCHAR(44) UNIQUE NOT NULL, -- Solana wallet address (generated at registration)
    wallet_private_key TEXT, -- Encrypted private key (for backend signing if needed)
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status ENUM('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT') DEFAULT 'NOT_SUBMITTED',
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_wallet (wallet_address),
    INDEX idx_kyc_status (kyc_status),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KYC Records Table
CREATE TABLE kyc_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT') DEFAULT 'PENDING',
    document_type VARCHAR(50) NOT NULL, -- AADHAAR, PAN, PASSPORT, etc.
    document_number VARCHAR(100) NOT NULL,
    document_front_url VARCHAR(500),
    document_back_url VARCHAR(500),
    selfie_url VARCHAR(500),
    address_proof_url VARCHAR(500),
    date_of_birth DATE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    rejection_reason TEXT,
    verified_by INT,
    verified_at TIMESTAMP NULL,
    trading_account_address VARCHAR(44), -- Solana trading account PDA (created after KYC approval)
    trading_account_bump INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_user_kyc (user_id),
    INDEX idx_status (status),
    INDEX idx_trading_account (trading_account_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- COMPANIES & TOKENS
-- ============================================================================

-- Companies Table
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    token_mint VARCHAR(44) UNIQUE NOT NULL, -- Solana token mint address
    total_shares BIGINT NOT NULL,
    outstanding_shares BIGINT NOT NULL DEFAULT 0,
    sector VARCHAR(100),
    industry VARCHAR(100),
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    order_book_address VARCHAR(44) UNIQUE, -- Solana order book PDA
    order_book_bump INT,
    base_vault_address VARCHAR(44), -- Solana base vault address (for tokens)
    quote_vault_address VARCHAR(44), -- Solana quote vault address (for SOL)
    tick_size BIGINT NOT NULL DEFAULT 1000000, -- Minimum price increment in lamports (0.001 SOL)
    min_order_size BIGINT NOT NULL DEFAULT 1, -- Minimum order quantity
    is_active BOOLEAN DEFAULT TRUE,
    is_listed BOOLEAN DEFAULT FALSE,
    listed_at TIMESTAMP NULL,
    registered_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES users(id),
    INDEX idx_symbol (symbol),
    INDEX idx_token_mint (token_mint),
    INDEX idx_order_book (order_book_address),
    INDEX idx_is_active (is_active),
    INDEX idx_is_listed (is_listed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ORDERS & TRADES
-- ============================================================================

-- Orders Table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    order_id BIGINT NOT NULL, -- From Solana program
    order_address VARCHAR(44) NOT NULL UNIQUE, -- Solana order PDA
    order_bump INT,
    side ENUM('BUY', 'SELL') NOT NULL,
    order_type ENUM('MARKET', 'LIMIT', 'POST_ONLY', 'IOC') NOT NULL,
    price BIGINT NULL, -- Price in lamports (null for market orders)
    quantity BIGINT NOT NULL,
    filled_quantity BIGINT DEFAULT 0,
    remaining_quantity BIGINT NOT NULL,
    status ENUM('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'FAILED') DEFAULT 'PENDING',
    transaction_signature VARCHAR(100) UNIQUE, -- Solana transaction signature
    error_message TEXT,
    expires_at TIMESTAMP NULL, -- For IOC orders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_user_orders (user_id),
    INDEX idx_company_orders (company_id),
    INDEX idx_order_address (order_address),
    INDEX idx_status (status),
    INDEX idx_side (side),
    INDEX idx_created (created_at),
    INDEX idx_signature (transaction_signature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trades Table
CREATE TABLE trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    buy_order_id INT NOT NULL,
    sell_order_id INT NOT NULL,
    trade_id BIGINT NOT NULL, -- From Solana program
    price BIGINT NOT NULL, -- Execution price in lamports
    quantity BIGINT NOT NULL,
    maker_side ENUM('BUY', 'SELL') NOT NULL,
    maker_fee BIGINT NOT NULL DEFAULT 0,
    taker_fee BIGINT NOT NULL DEFAULT 0,
    transaction_signature VARCHAR(100) NOT NULL UNIQUE, -- Solana transaction signature
    settled BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (buy_order_id) REFERENCES orders(id),
    FOREIGN KEY (sell_order_id) REFERENCES orders(id),
    INDEX idx_company_trades (company_id),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_signature (transaction_signature),
    INDEX idx_executed (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- IPO MANAGEMENT
-- ============================================================================

-- IPO Table
CREATE TABLE ipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_shares BIGINT NOT NULL,
    price_per_share BIGINT NOT NULL, -- Price in lamports
    min_subscription BIGINT NOT NULL, -- Minimum shares per application
    max_subscription BIGINT NOT NULL, -- Maximum shares per application
    total_subscribed BIGINT DEFAULT 0,
    total_applications INT DEFAULT 0,
    allotment_ratio DECIMAL(10, 4) DEFAULT 1.0000, -- 1.0 = 100% allotment
    escrow_address VARCHAR(44), -- Solana escrow account for IPO funds
    escrow_bump INT,
    status ENUM('UPCOMING', 'OPEN', 'CLOSED', 'ALLOTTED', 'CANCELLED') DEFAULT 'UPCOMING',
    open_date TIMESTAMP NOT NULL,
    close_date TIMESTAMP NOT NULL,
    allotment_date TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_ipo (company_id),
    INDEX idx_status (status),
    INDEX idx_dates (open_date, close_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPO Applications Table
CREATE TABLE ipo_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ipo_id INT NOT NULL,
    user_id INT NOT NULL,
    quantity BIGINT NOT NULL, -- Requested quantity
    amount BIGINT NOT NULL, -- Total amount in lamports
    allotted_quantity BIGINT DEFAULT 0,
    refund_amount BIGINT DEFAULT 0,
    status ENUM('PAYMENT_PENDING', 'PENDING', 'ALLOTTED', 'REJECTED', 'REFUNDED', 'PARTIALLY_ALLOTTED') DEFAULT 'PAYMENT_PENDING',
    payment_transaction_signature VARCHAR(100), -- Payment to escrow
    allotment_transaction_signature VARCHAR(100), -- Token transfer or refund
    escrow_address VARCHAR(44), -- Individual user escrow PDA
    escrow_bump INT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_completed_at TIMESTAMP NULL,
    allotted_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ipo_id) REFERENCES ipos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ipo_user (ipo_id, user_id),
    INDEX idx_ipo_apps (ipo_id),
    INDEX idx_user_apps (user_id),
    INDEX idx_status (status),
    INDEX idx_payment_sig (payment_transaction_signature),
    INDEX idx_allotment_sig (allotment_transaction_signature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HOLDINGS & PORTFOLIO
-- ============================================================================

-- User Holdings Table (synced from on-chain)
CREATE TABLE holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    token_account VARCHAR(44) NOT NULL UNIQUE, -- Solana token account address
    quantity BIGINT NOT NULL DEFAULT 0,
    locked_quantity BIGINT NOT NULL DEFAULT 0, -- Quantity locked in open sell orders
    available_quantity BIGINT NOT NULL DEFAULT 0, -- quantity - locked_quantity
    average_price BIGINT, -- Average purchase price in lamports
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE KEY unique_user_company (user_id, company_id),
    INDEX idx_user_holdings (user_id),
    INDEX idx_token_account (token_account),
    INDEX idx_company_holdings (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FUNDS & WALLET MANAGEMENT
-- ============================================================================

-- Wallet Transactions Table (Deposits & Withdrawals)
CREATE TABLE wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('DEPOSIT', 'WITHDRAWAL') NOT NULL,
    amount BIGINT NOT NULL, -- Amount in lamports
    currency VARCHAR(10) DEFAULT 'SOL',
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
    payment_method ENUM('RAZORPAY', 'BANK_TRANSFER', 'UPI', 'ONCHAIN') DEFAULT 'RAZORPAY',
    
    -- Razorpay fields
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(255),
    amount_inr DECIMAL(15,2) NULL COMMENT 'Amount in Indian Rupees',
    sol_rate DECIMAL(15,2) NULL COMMENT 'SOL to INR conversion rate',
    
    -- On-chain fields
    transaction_signature VARCHAR(100), -- Solana transaction signature
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    
    -- Bank transfer fields
    bank_account_id INT,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_account_holder VARCHAR(255),
    utr_number VARCHAR(50), -- For bank transfers
    
    -- Additional fields
    failure_reason TEXT,
    admin_notes TEXT,
    processed_by INT, -- Admin who processed manual withdrawals
    
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id),
    INDEX idx_user_wallet (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_razorpay_order (razorpay_order_id),
    INDEX idx_razorpay_payment (razorpay_payment_id),
    INDEX idx_signature (transaction_signature),
    INDEX idx_initiated (initiated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank Accounts Table (For Withdrawals)
CREATE TABLE bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255),
    branch_name VARCHAR(255),
    account_type ENUM('SAVINGS', 'CURRENT') DEFAULT 'SAVINGS',
    is_verified BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_user_bank (user_id),
    INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SOL Balance Cache Table (Mirror of on-chain balances)
CREATE TABLE sol_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    wallet_address VARCHAR(44) NOT NULL UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0, -- Total balance in lamports
    locked_balance BIGINT NOT NULL DEFAULT 0, -- Balance locked in open buy orders
    available_balance BIGINT NOT NULL DEFAULT 0, -- balance - locked_balance
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_wallet (wallet_address),
    INDEX idx_last_synced (last_synced)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MARKET DATA & ORDER BOOK
-- ============================================================================

-- Market Data Table (Cache for pricing and stats)
CREATE TABLE market_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL UNIQUE,
    last_price BIGINT, -- Last traded price in lamports
    open_price BIGINT, -- Opening price for the day
    high_price BIGINT, -- Highest price for the day
    low_price BIGINT, -- Lowest price for the day
    close_price BIGINT, -- Previous day close
    volume BIGINT DEFAULT 0, -- Trading volume for the day
    turnover BIGINT DEFAULT 0, -- Total turnover in lamports
    trades_count INT DEFAULT 0, -- Number of trades
    bid_price BIGINT, -- Best bid price
    ask_price BIGINT, -- Best ask price
    bid_quantity BIGINT, -- Best bid quantity
    ask_quantity BIGINT, -- Best ask quantity
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_company (company_id),
    INDEX idx_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Book Levels Table (Top 5 bids and asks cache for WebSocket)
CREATE TABLE order_book_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    price BIGINT NOT NULL,
    quantity BIGINT NOT NULL,
    order_count INT NOT NULL DEFAULT 1,
    level_rank INT NOT NULL, -- 1 to 5 (top 5 levels)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_side_level (company_id, side, level_rank),
    INDEX idx_company_side (company_id, side),
    INDEX idx_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AUDIT & NOTIFICATIONS
-- ============================================================================

-- Audit Log Table
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- USER, ORDER, TRADE, IPO, etc.
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_body TEXT,
    response_status INT,
    changes JSON, -- Before/after values
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') DEFAULT 'INFO',
    category ENUM('ACCOUNT', 'KYC', 'ORDER', 'TRADE', 'IPO', 'WALLET', 'SYSTEM') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON, -- Additional contextual data
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notif (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_category (category),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM CONFIGURATION & MANAGEMENT
-- ============================================================================

-- System Configuration Table
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions Table (For login tracking and JWT management)
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_active (is_active),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exchange Statistics Table
CREATE TABLE exchange_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_registrations INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_trades INT DEFAULT 0,
    trading_volume BIGINT DEFAULT 0,
    trading_turnover BIGINT DEFAULT 0,
    total_deposits BIGINT DEFAULT 0,
    total_withdrawals BIGINT DEFAULT 0,
    fees_collected BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction Queue Table (For async processing and retries)
CREATE TABLE transaction_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('ORDER', 'TRADE', 'IPO_ALLOTMENT', 'WITHDRAWAL', 'REFUND', 'OTHER') NOT NULL,
    entity_type VARCHAR(50), -- ORDER, IPO_APPLICATION, etc.
    entity_id INT,
    user_id INT,
    priority INT DEFAULT 0, -- Higher priority processed first
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    transaction_data JSON NOT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    transaction_signature VARCHAR(100),
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate Limits Table (API rate limiting)
CREATE TABLE rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL, -- IP address or user_id
    endpoint VARCHAR(255) NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE KEY unique_identifier_endpoint (identifier, endpoint),
    INDEX idx_identifier (identifier),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DEFAULT SYSTEM CONFIGURATIONS
-- ============================================================================

INSERT INTO system_config (config_key, config_value, description, is_sensitive) VALUES
('EXCHANGE_PROGRAM_ID', 'ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD', 'Solana Exchange Core Program ID', FALSE),
('ESCROW_PROGRAM_ID', 'Estdrnjx9yezLcJZs4nPaciYqt1vUEQyXYeEZZBJ5vRB', 'Solana Escrow Program ID', FALSE),
('FEE_PROGRAM_ID', 'FeK4og5tcnNBKAz41LgFFTXMVWjJcNenk2H7g8cDmAhU', 'Solana Fee Management Program ID', FALSE),
('GOVERNANCE_PROGRAM_ID', 'GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq', 'Solana Governance Program ID', FALSE),
('ADMIN_PUBLIC_KEY', 'DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU', 'Admin Wallet Public Key', FALSE),
('MIN_DEPOSIT_AMOUNT', '1000000000', 'Minimum deposit (1 SOL in lamports)', FALSE),
('MIN_WITHDRAWAL_AMOUNT', '500000000', 'Minimum withdrawal (0.5 SOL in lamports)', FALSE),
('WITHDRAWAL_FEE_PERCENTAGE', '0.1', 'Withdrawal fee percentage', FALSE),
('MAKER_FEE_PERCENTAGE', '0.05', 'Maker trading fee percentage', FALSE),
('TAKER_FEE_PERCENTAGE', '0.10', 'Taker trading fee percentage', FALSE),
('TRADING_ENABLED', 'true', 'Enable/disable trading', FALSE),
('IPO_ENABLED', 'true', 'Enable/disable IPO functionality', FALSE),
('WITHDRAWALS_ENABLED', 'true', 'Enable/disable withdrawals', FALSE),
('DEPOSITS_ENABLED', 'true', 'Enable/disable deposits', FALSE),
('MAX_ORDERS_PER_USER', '100', 'Maximum active orders per user', FALSE),
('MAX_ORDER_SIZE', '1000000', 'Maximum order size', FALSE),
('DEFAULT_TICK_SIZE', '1000000', 'Default tick size (0.001 SOL in lamports)', FALSE),
('DEFAULT_MIN_ORDER_SIZE', '1', 'Default minimum order size', FALSE),
('SESSION_DURATION_HOURS', '168', 'JWT session duration in hours (7 days)', FALSE),
('SOL_TO_INR_RATE', '8000', 'Current SOL to INR exchange rate', FALSE)
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description);

-- ============================================================================
-- CREATE ADMIN USER (Password: admin123)
-- ============================================================================

INSERT INTO users (email, password_hash, full_name, wallet_address, is_admin, is_active, kyc_status, email_verified)
VALUES (
    'admin@stockexchange.com',
    '$2a$10$Xqp8YN.2pGV8gYGxVx2qU.6Y7VQN8TqQbHkLZJ5fHJYBKz3L4fGOu', -- bcrypt hash of 'admin123'
    'System Administrator',
    'DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU',
    TRUE,
    TRUE,
    'APPROVED',
    TRUE
)
ON DUPLICATE KEY UPDATE email = email;

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Trigger to update available_balance in sol_balances
DELIMITER $$

CREATE TRIGGER update_sol_available_balance BEFORE UPDATE ON sol_balances
FOR EACH ROW
BEGIN
    SET NEW.available_balance = NEW.balance - NEW.locked_balance;
END$$

CREATE TRIGGER insert_sol_available_balance BEFORE INSERT ON sol_balances
FOR EACH ROW
BEGIN
    SET NEW.available_balance = NEW.balance - NEW.locked_balance;
END$$

-- Trigger to update available_quantity in holdings
CREATE TRIGGER update_holdings_available_quantity BEFORE UPDATE ON holdings
FOR EACH ROW
BEGIN
    SET NEW.available_quantity = NEW.quantity - NEW.locked_quantity;
END$$

CREATE TRIGGER insert_holdings_available_quantity BEFORE INSERT ON holdings
FOR EACH ROW
BEGIN
    SET NEW.available_quantity = NEW.quantity - NEW.locked_quantity;
END$$

-- Trigger to update order remaining_quantity
CREATE TRIGGER update_order_remaining_quantity BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    SET NEW.remaining_quantity = NEW.quantity - NEW.filled_quantity;
    IF NEW.remaining_quantity = 0 AND NEW.status = 'PARTIAL' THEN
        SET NEW.status = 'FILLED';
    END IF;
END$$

CREATE TRIGGER insert_order_remaining_quantity BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    SET NEW.remaining_quantity = NEW.quantity - NEW.filled_quantity;
END$$

-- Trigger to update kyc_status in users table when kyc_records is updated
CREATE TRIGGER update_user_kyc_status AFTER UPDATE ON kyc_records
FOR EACH ROW
BEGIN
    UPDATE users SET kyc_status = NEW.status WHERE id = NEW.user_id;
END$$

DELIMITER ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_company_status ON orders(company_id, status);
CREATE INDEX idx_trades_company_date ON trades(company_id, executed_at);
CREATE INDEX idx_wallet_txn_user_type_status ON wallet_transactions(user_id, type, status);
CREATE INDEX idx_ipo_apps_ipo_status ON ipo_applications(ipo_id, status);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active orders with user and company details
CREATE OR REPLACE VIEW v_active_orders AS
SELECT 
    o.id,
    o.order_id,
    o.order_address,
    o.user_id,
    u.email,
    u.full_name,
    u.wallet_address,
    o.company_id,
    c.symbol,
    c.name AS company_name,
    o.side,
    o.order_type,
    o.price,
    o.quantity,
    o.filled_quantity,
    o.remaining_quantity,
    o.status,
    o.transaction_signature,
    o.created_at,
    o.updated_at
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN companies c ON o.company_id = c.id
WHERE o.status IN ('PENDING', 'PARTIAL');

-- View for user portfolio with current market value
CREATE OR REPLACE VIEW v_user_portfolio AS
SELECT 
    h.user_id,
    u.email,
    u.full_name,
    h.company_id,
    c.symbol,
    c.name AS company_name,
    h.quantity,
    h.locked_quantity,
    h.available_quantity,
    h.average_price,
    m.last_price AS current_price,
    (h.quantity * m.last_price) AS current_value,
    (h.quantity * h.average_price) AS invested_value,
    ((h.quantity * m.last_price) - (h.quantity * h.average_price)) AS unrealized_pnl,
    h.last_synced
FROM holdings h
JOIN users u ON h.user_id = u.id
JOIN companies c ON h.company_id = c.id
LEFT JOIN market_data m ON h.company_id = m.company_id
WHERE h.quantity > 0;

-- View for IPO applications with details
CREATE OR REPLACE VIEW v_ipo_applications_detail AS
SELECT 
    ia.id,
    ia.ipo_id,
    i.title AS ipo_title,
    i.company_id,
    c.symbol,
    c.name AS company_name,
    ia.user_id,
    u.email,
    u.full_name,
    ia.quantity,
    ia.amount,
    ia.allotted_quantity,
    ia.refund_amount,
    ia.status,
    ia.payment_transaction_signature,
    ia.allotment_transaction_signature,
    ia.applied_at,
    ia.payment_completed_at,
    ia.allotted_at
FROM ipo_applications ia
JOIN ipos i ON ia.ipo_id = i.id
JOIN companies c ON i.company_id = c.id
JOIN users u ON ia.user_id = u.id;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Database schema created successfully!' AS message;
SELECT COUNT(*) AS table_count FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
