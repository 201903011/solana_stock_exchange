import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import config, { getBackendWallet, connection } from './config/config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Routes
import ipoRoutes from './routes/ipo.routes';
import orderRoutes from './routes/order.routes';
import portfolioRoutes from './routes/portfolio.routes';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Solana IPO Backend is running' });
});

// Wallet info
app.get('/api/backend-wallet', async (req: Request, res: Response) => {
    try {
        const wallet = getBackendWallet();
        const balance = await connection.getBalance(wallet.publicKey);

        res.json({
            publicKey: wallet.publicKey.toBase58(),
            balance: balance / LAMPORTS_PER_SOL,
            network: config.solanaRpcUrl,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// API Routes
app.use('/api/ipo', ipoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
    console.log('==========================================');
    console.log('🚀 Solana IPO Backend Server Started');
    console.log('==========================================');
    console.log(`Port: ${PORT}`);
    console.log(`Network: ${config.solanaRpcUrl}`);

    try {
        const wallet = getBackendWallet();
        console.log(`Backend Wallet: ${wallet.publicKey.toBase58()}`);
    } catch (error: any) {
        console.log('⚠️  Backend wallet not configured');
        console.log('   Run: npm run generate-wallet');
    }

    console.log('==========================================\n');
});
