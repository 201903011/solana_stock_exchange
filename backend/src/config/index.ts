import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    wsPort: parseInt(process.env.WS_PORT || '4001', 10),

    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'solana_stock_exchange',
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    // Solana
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899',
        network: process.env.SOLANA_NETWORK || 'devnet',
        exchangeProgramId: process.env.EXCHANGE_PROGRAM_ID || 'ExU8EoUrjN9xRi9n8af1i83fhALqTMCt5qjrdqMdG9RD',
        escrowProgramId: process.env.ESCROW_PROGRAM_ID || 'Estdrnjx9yezLcJZs4nPaciYqt1vUEQyXYeEZZBJ5vRB',
        feeProgramId: process.env.FEE_PROGRAM_ID || 'FeK4og5tcnNBKAz41LgFFTXMVWjJcNenk2H7g8cDmAhU',
        governanceProgramId: process.env.GOVERNANCE_PROGRAM_ID || 'GoLKeg4YEp3D2rL4PpQpoMHGyZaduWyKWdz1KZqrnbNq',
        adminPublicKey: process.env.ADMIN_PUBLIC_KEY || 'DcjakLshDNnnRdDGRwHcR4BaENKiDXFCy2Pi2vHJB5xU',
    },

    // Razorpay
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    // Exchange Settings
    exchange: {
        solToInrRate: parseFloat(process.env.SOL_TO_INR_RATE || '8000'),
        minDepositAmount: BigInt(process.env.MIN_DEPOSIT_AMOUNT || '1000000000'), // 1 SOL
        minWithdrawalAmount: BigInt(process.env.MIN_WITHDRAWAL_AMOUNT || '500000000'), // 0.5 SOL
        withdrawalFeePercentage: parseFloat(process.env.WITHDRAWAL_FEE_PERCENTAGE || '0.1'),
    },

    // File Upload
    upload: {
        dir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    },
};

export default config;
