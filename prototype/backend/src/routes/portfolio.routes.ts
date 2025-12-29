import { Router, Request, Response } from 'express';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { connection } from '../config/config';

const router = Router();

// Get user portfolio
router.get('/:userAddress', async (req: Request, res: Response) => {
    try {
        const { userAddress } = req.params;
        const userPubkey = new PublicKey(userAddress);

        // Get SOL balance
        const solBalance = await connection.getBalance(userPubkey);

        // Get all token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            userPubkey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        const tokens = tokenAccounts.value.map((accountInfo) => {
            const parsedInfo = accountInfo.account.data.parsed.info;
            return {
                mint: parsedInfo.mint,
                balance: parsedInfo.tokenAmount.uiAmount,
                decimals: parsedInfo.tokenAmount.decimals,
                tokenAccount: accountInfo.pubkey.toBase58(),
            };
        });

        res.json({
            userAddress,
            solBalance: solBalance / LAMPORTS_PER_SOL,
            tokens,
        });
    } catch (error: any) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get token balance
router.get('/:userAddress/token/:mintAddress', async (req: Request, res: Response) => {
    try {
        const { userAddress, mintAddress } = req.params;
        const userPubkey = new PublicKey(userAddress);
        const mint = new PublicKey(mintAddress);

        const tokenAccount = await getAssociatedTokenAddress(mint, userPubkey);

        try {
            const accountInfo = await getAccount(connection, tokenAccount);

            res.json({
                userAddress,
                mintAddress,
                tokenAccount: tokenAccount.toBase58(),
                balance: Number(accountInfo.amount) / Math.pow(10, 9), // Assuming 9 decimals
            });
        } catch (error) {
            // Token account doesn't exist
            res.json({
                userAddress,
                mintAddress,
                tokenAccount: tokenAccount.toBase58(),
                balance: 0,
            });
        }
    } catch (error: any) {
        console.error('Get token balance error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
