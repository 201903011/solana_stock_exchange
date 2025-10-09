-- Solana Stock Exchange Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    wallet_address VARCHAR(44) UNIQUE, -- Solana wallet address
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_wallet (wallet_address)
);

-- KYC Records Table
CREATE TABLE IF NOT EXISTS kyc_records (
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
    country VARCHAR(100),
    rejection_reason TEXT,
    verified_by INT,
    verified_at TIMESTAMP NULL,
    trade_account_address VARCHAR(44), -- Solana trading account PDA
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_user_kyc (user_id),
    INDEX idx_status (status),
    INDEX idx_trade_account (trade_account_address)
);

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
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
    base_vault_address VARCHAR(44), -- Solana base vault address
    sol_vault_address VARCHAR(44), -- Solana SOL vault address
    tick_size BIGINT NOT NULL DEFAULT 1000000, -- in lamports
    min_order_size BIGINT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    listed_at TIMESTAMP NULL,
    registered_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES users(id),
    INDEX idx_symbol (symbol),
    INDEX idx_token_mint (token_mint),
    INDEX idx_order_book (order_book_address)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    order_id BIGINT NOT NULL, -- From Solana program
    order_address VARCHAR(44) NOT NULL, -- Solana order PDA
    side ENUM('BUY', 'SELL') NOT NULL,
    order_type ENUM('MARKET', 'LIMIT', 'POST_ONLY', 'IOC') NOT NULL,
    price BIGINT, -- in lamports (null for market orders)
    quantity BIGINT NOT NULL,
    filled_quantity BIGINT DEFAULT 0,
    remaining_quantity BIGINT,
    status ENUM('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED') DEFAULT 'PENDING',
    transaction_signature VARCHAR(100), -- Solana transaction signature
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_user_orders (user_id),
    INDEX idx_company_orders (company_id),
    INDEX idx_order_address (order_address),
    INDEX idx_status (status),
    INDEX idx_side (side),
    INDEX idx_created (created_at)
);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    buy_order_id INT NOT NULL,
    sell_order_id INT NOT NULL,
    trade_id BIGINT NOT NULL, -- From Solana program
    price BIGINT NOT NULL, -- in lamports
    quantity BIGINT NOT NULL,
    maker_fee BIGINT NOT NULL,
    taker_fee BIGINT NOT NULL,
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
    INDEX idx_tx_signature (transaction_signature),
    INDEX idx_executed (executed_at)
);

-- IPO Table
CREATE TABLE IF NOT EXISTS ipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_shares BIGINT NOT NULL,
    price_per_share BIGINT NOT NULL, -- in lamports
    min_subscription BIGINT NOT NULL,
    max_subscription BIGINT NOT NULL,
    total_subscribed BIGINT DEFAULT 0,
    escrow_address VARCHAR(44), -- Solana escrow account
    status ENUM('UPCOMING', 'OPEN', 'CLOSED', 'ALLOTTED', 'CANCELLED') DEFAULT 'UPCOMING',
    open_date TIMESTAMP NOT NULL,
    close_date TIMESTAMP NOT NULL,
    allotment_date TIMESTAMP,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_ipo (company_id),
    INDEX idx_status (status),
    INDEX idx_dates (open_date, close_date)
);

-- IPO Applications Table
CREATE TABLE IF NOT EXISTS ipo_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ipo_id INT NOT NULL,
    user_id INT NOT NULL,
    quantity BIGINT NOT NULL,
    amount BIGINT NOT NULL, -- in lamports
    allotted_quantity BIGINT DEFAULT 0,
    status ENUM('PENDING', 'ALLOTTED', 'REJECTED', 'REFUNDED') DEFAULT 'PENDING',
    transaction_signature VARCHAR(100) UNIQUE, -- Solana transaction signature
    escrow_address VARCHAR(44), -- Individual escrow PDA
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ipo_id) REFERENCES ipos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ipo_user (ipo_id, user_id),
    INDEX idx_ipo_apps (ipo_id),
    INDEX idx_user_apps (user_id),
    INDEX idx_status (status)
);

-- User Holdings Table (Cache from Solana)
CREATE TABLE IF NOT EXISTS holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    token_account VARCHAR(44) NOT NULL, -- Solana token account address
    quantity BIGINT NOT NULL DEFAULT 0,
    average_price BIGINT, -- Average purchase price in lamports
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE KEY unique_user_company (user_id, company_id),
    INDEX idx_user_holdings (user_id),
    INDEX idx_token_account (token_account)
);

-- Wallet Transactions Table (Deposits & Withdrawals)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('DEPOSIT', 'WITHDRAWAL') NOT NULL,
    amount BIGINT NOT NULL, -- in lamports
    currency VARCHAR(10) DEFAULT 'SOL',
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    payment_method ENUM('RAZORPAY', 'BANK_TRANSFER', 'UPI') DEFAULT 'RAZORPAY',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    transaction_signature VARCHAR(100), -- Solana transaction signature
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_account_holder VARCHAR(255),
    utr_number VARCHAR(50), -- For bank transfers
    failure_reason TEXT,
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_wallet (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_razorpay_order (razorpay_order_id)
);

-- Bank Accounts Table (For Withdrawals)
CREATE TABLE IF NOT EXISTS bank_accounts (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_account (user_id, account_number),
    INDEX idx_user_bank (user_id)
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_audit (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(500),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, description) VALUES
('EXCHANGE_ADDRESS', 'ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD', 'Solana Exchange Core Program Address'),
('GOVERNANCE_ADDRESS', 'GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq', 'Solana Governance Program Address'),
('MIN_DEPOSIT_AMOUNT', '1000000000', 'Minimum deposit amount in lamports (1 SOL)'),
('MIN_WITHDRAWAL_AMOUNT', '500000000', 'Minimum withdrawal amount in lamports (0.5 SOL)'),
('RAZORPAY_ENABLED', 'true', 'Enable Razorpay payments'),
('TRADING_ENABLED', 'true', 'Enable trading functionality'),
('IPO_ENABLED', 'true', 'Enable IPO functionality');
