import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { testConnection } from './database/connection';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import orderRoutes from './routes/order.routes';
import portfolioRoutes from './routes/portfolio.routes';
import ipoRoutes from './routes/ipo.routes';
import walletRoutes from './routes/wallet.routes';

// Initialize Express app
const app: Application = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('combined')); // HTTP request logging

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Solana Stock Exchange API is running',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ipos', ipoRoutes);
app.use('/api/wallet', walletRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        await testConnection();

        // Start listening
        app.listen(config.port, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🚀 Solana Stock Exchange API Server Started        ║
║                                                           ║
║  Environment: ${config.nodeEnv.padEnd(42)} ║
║  Port:        ${config.port.toString().padEnd(42)} ║
║  API URL:     ${config.apiUrl.padEnd(42)} ║
║  Database:    ${config.database.database.padEnd(42)} ║
║  Solana:      ${config.solana.network.padEnd(42)} ║
║                                                           ║
║  API Documentation:                                       ║
║  - Health:     GET  /health                              ║
║  - Auth:       POST /api/auth/register                   ║
║  - Auth:       POST /api/auth/login                      ║
║  - Profile:    GET  /api/auth/profile                    ║
║  - KYC:        POST /api/auth/kyc/submit                 ║
║  - Companies:  GET  /api/companies                       ║
║  - Orders:     POST /api/orders                          ║
║  - Portfolio:  GET  /api/portfolio                       ║
║  - IPOs:       GET  /api/ipos                            ║
║  - Wallet:     POST /api/wallet/deposit                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Start the server
startServer();

export default app;
