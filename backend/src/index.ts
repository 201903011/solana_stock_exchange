import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config';
import { createPool } from './database/connection';
import { errorHandler, notFoundHandler } from './middleware/validator';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import orderRoutes from './routes/order.routes';
import fundRoutes from './routes/fund.routes';
import holdingRoutes from './routes/holding.routes';
import ipoRoutes from './routes/ipo.routes';

// Import order book engine
import { OrderBookEngine } from './services/orderbook.engine';
import { WebSocketServer } from './services/websocket.service';

const app: Application = express();

// Initialize database
createPool();

// Initialize order book engine
const orderBookEngine = OrderBookEngine.getInstance();
orderBookEngine.initialize().catch((error) => {
    logger.error('Failed to initialize order book engine:', error);
    process.exit(1);
});

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/fund', fundRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/ipo', ipoRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

// Initialize WebSocket server
const wsServer = new WebSocketServer(server);
wsServer.initialize();

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

export default app;
