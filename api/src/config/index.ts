import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3000',

    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'solana_stock_exchange',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'change_this_secret_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    // Solana
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'http://localhost:8899',
        network: process.env.SOLANA_NETWORK || 'devnet',
        exchangeProgramId: process.env.EXCHANGE_PROGRAM_ID || 'ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD',
        governanceProgramId: process.env.GOVERNANCE_PROGRAM_ID || 'GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq',
        escrowProgramId: process.env.ESCROW_PROGRAM_ID || '',
        feeManagementProgramId: process.env.FEE_MANAGEMENT_PROGRAM_ID || '',
        adminWalletPrivateKey: process.env.ADMIN_WALLET_PRIVATE_KEY || '5q2GK2K7edZaEkrADHKYWrAKwdzah7NxRLWnTUqm8q84atN4k4aVRDuTZ8nnVC2XmDsBhXcw5kGnepwvqdyJ7F7n',
    },

    // Razorpay
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    // File Upload
    upload: {
        dir: process.env.UPLOAD_DIR || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs',
    },
};

export default config;
