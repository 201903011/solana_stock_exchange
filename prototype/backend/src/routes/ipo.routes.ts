import { Router, Request, Response } from 'express';
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { connection, getBackendWallet } from '../config/config';

const router = Router();

// In-memory storage (use database in production)
interface IPO {
    id: string;
    companyName: string;
    symbol: string;
    mintAddress: string;
    totalShares: number;
    pricePerShare: number;
    applications: Array<{
        userAddress: string;
        sharesRequested: number;
        status: 'pending' | 'allocated' | 'rejected';
        sharesAllocated: number;
    }>;
    status: 'open' | 'closed' | 'settled';
}

const ipos: Map<string, IPO> = new Map();

// Create new IPO
router.post('/create', async (req: Request, res: Response) => {
    try {
        const { companyName, symbol, totalShares, pricePerShare } = req.body;

        const backendWallet = getBackendWallet();

        // Create SPL token mint
        const mint = await createMint(
            connection,
            backendWallet,
            backendWallet.publicKey,
            backendWallet.publicKey,
            9 // 9 decimals
        );

        const ipoId = Date.now().toString();
        const ipo: IPO = {
            id: ipoId,
            companyName,
            symbol,
            mintAddress: mint.toBase58(),
            totalShares,
            pricePerShare,
            applications: [],
            status: 'open',
        };

        ipos.set(ipoId, ipo);

        res.json({
            success: true,
            ipo: {
                id: ipo.id,
                companyName: ipo.companyName,
                symbol: ipo.symbol,
                mintAddress: ipo.mintAddress,
                totalShares: ipo.totalShares,
                pricePerShare: ipo.pricePerShare,
                status: ipo.status,
            },
        });
    } catch (error: any) {
        console.error('Create IPO error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all IPOs
router.get('/list', (req: Request, res: Response) => {
    const ipoList = Array.from(ipos.values()).map((ipo) => ({
        id: ipo.id,
        companyName: ipo.companyName,
        symbol: ipo.symbol,
        mintAddress: ipo.mintAddress,
        totalShares: ipo.totalShares,
        pricePerShare: ipo.pricePerShare,
        status: ipo.status,
        applicationsCount: ipo.applications.length,
    }));

    res.json({ ipos: ipoList });
});

// Get IPO details
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const ipo = ipos.get(id);

    if (!ipo) {
        return res.status(404).json({ error: 'IPO not found' });
    }

    res.json({ ipo });
});

// Apply for IPO - Returns unsigned transaction for user to sign
router.post('/apply', async (req: Request, res: Response) => {
    try {
        const { ipoId, userAddress, sharesRequested } = req.body;

        const ipo = ipos.get(ipoId);
        if (!ipo) {
            return res.status(404).json({ error: 'IPO not found' });
        }

        if (ipo.status !== 'open') {
            return res.status(400).json({ error: 'IPO is not open for applications' });
        }

        // Check if user already applied
        const existingApplication = ipo.applications.find(
            (app) => app.userAddress === userAddress
        );
        if (existingApplication) {
            return res.status(400).json({ error: 'User has already applied to this IPO' });
        }

        // Add application
        ipo.applications.push({
            userAddress,
            sharesRequested,
            status: 'pending',
            sharesAllocated: 0,
        });

        res.json({
            success: true,
            message: 'IPO application submitted successfully',
            application: {
                ipoId,
                userAddress,
                sharesRequested,
                status: 'pending',
            },
        });
    } catch (error: any) {
        console.error('Apply IPO error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Allocate shares - Admin function
router.post('/allocate', async (req: Request, res: Response) => {
    try {
        const { ipoId, allocations } = req.body;
        // allocations: [{ userAddress: string, sharesAllocated: number }]

        const ipo = ipos.get(ipoId);
        if (!ipo) {
            return res.status(404).json({ error: 'IPO not found' });
        }

        const backendWallet = getBackendWallet();
        const mint = new PublicKey(ipo.mintAddress);

        const results = [];

        for (const allocation of allocations) {
            const { userAddress, sharesAllocated } = allocation;

            // Find application
            const application = ipo.applications.find(
                (app) => app.userAddress === userAddress
            );

            if (!application) {
                results.push({
                    userAddress,
                    success: false,
                    error: 'Application not found',
                });
                continue;
            }

            if (sharesAllocated > 0) {
                try {
                    const userPubkey = new PublicKey(userAddress);

                    // Get or create user's token account
                    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
                        connection,
                        backendWallet,
                        mint,
                        userPubkey
                    );

                    // Mint tokens to user
                    await mintTo(
                        connection,
                        backendWallet,
                        mint,
                        userTokenAccount.address,
                        backendWallet,
                        sharesAllocated * Math.pow(10, 9) // 9 decimals
                    );

                    // Update application
                    application.sharesAllocated = sharesAllocated;
                    application.status = 'allocated';

                    results.push({
                        userAddress,
                        success: true,
                        sharesAllocated,
                        tokenAccount: userTokenAccount.address.toBase58(),
                    });
                } catch (error: any) {
                    results.push({
                        userAddress,
                        success: false,
                        error: error.message,
                    });
                }
            } else {
                application.status = 'rejected';
                results.push({
                    userAddress,
                    success: true,
                    sharesAllocated: 0,
                    status: 'rejected',
                });
            }
        }

        res.json({
            success: true,
            results,
        });
    } catch (error: any) {
        console.error('Allocate shares error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
