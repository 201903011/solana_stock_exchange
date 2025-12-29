import { Router, Request, Response } from 'express';
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { connection, getBackendWallet } from '../config/config';

const router = Router();

// In-memory order book (use database in production)
interface Order {
    id: string;
    userAddress: string;
    mintAddress: string;
    side: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    quantity: number;
    price: number;
    status: 'open' | 'matched' | 'settled' | 'cancelled';
    escrowAccount?: string;
    matchedWith?: string;
    createdAt: number;
}

const orders: Map<string, Order> = new Map();

// Place order - Creates unsigned transaction for escrow
router.post('/place', async (req: Request, res: Response) => {
    try {
        const { userAddress, mintAddress, side, orderType, quantity, price } = req.body;

        const orderId = Date.now().toString();
        const order: Order = {
            id: orderId,
            userAddress,
            mintAddress,
            side,
            orderType,
            quantity,
            price,
            status: 'open',
            createdAt: Date.now(),
        };

        orders.set(orderId, order);

        // Create escrow transaction for user to sign
        let transaction: Transaction;
        const userPubkey = new PublicKey(userAddress);
        const backendWallet = getBackendWallet();

        if (side === 'sell') {
            // User needs to transfer tokens to escrow
            const mint = new PublicKey(mintAddress);
            const userTokenAccount = await getAssociatedTokenAddress(
                mint,
                userPubkey
            );

            // Create escrow account owned by backend
            const escrowTokenAccount = await getAssociatedTokenAddress(
                mint,
                backendWallet.publicKey
            );

            transaction = new Transaction();

            // Transfer tokens to backend's token account (acting as escrow)
            transaction.add(
                createTransferInstruction(
                    userTokenAccount,
                    escrowTokenAccount,
                    userPubkey,
                    quantity * Math.pow(10, 9), // 9 decimals
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            order.escrowAccount = escrowTokenAccount.toBase58();
        } else {
            // side === 'buy' - User needs to transfer SOL to escrow
            const totalSOL = quantity * price;

            transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: userPubkey,
                    toPubkey: backendWallet.publicKey,
                    lamports: totalSOL * LAMPORTS_PER_SOL,
                })
            );

            order.escrowAccount = backendWallet.publicKey.toBase58();
        }

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
        });

        res.json({
            success: true,
            order: {
                id: order.id,
                side: order.side,
                orderType: order.orderType,
                quantity: order.quantity,
                price: order.price,
                status: order.status,
            },
            transaction: serializedTransaction.toString('base64'),
            message: 'Sign this transaction to place your order',
        });
    } catch (error: any) {
        console.error('Place order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm order placement after user signs transaction
router.post('/confirm', async (req: Request, res: Response) => {
    try {
        const { orderId, signedTransaction } = req.body;

        const order = orders.get(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Deserialize and send transaction
        const transaction = Transaction.from(
            Buffer.from(signedTransaction, 'base64')
        );

        const signature = await connection.sendRawTransaction(
            transaction.serialize()
        );

        await connection.confirmTransaction(signature);

        res.json({
            success: true,
            orderId: order.id,
            signature,
            message: 'Order placed successfully',
        });
    } catch (error: any) {
        console.error('Confirm order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get order book
router.get('/book/:mintAddress', (req: Request, res: Response) => {
    const { mintAddress } = req.params;

    const orderBook = {
        buy: [] as Order[],
        sell: [] as Order[],
    };

    for (const order of orders.values()) {
        if (order.mintAddress === mintAddress && order.status === 'open') {
            if (order.side === 'buy') {
                orderBook.buy.push(order);
            } else {
                orderBook.sell.push(order);
            }
        }
    }

    // Sort orders
    orderBook.buy.sort((a, b) => b.price - a.price); // Highest bid first
    orderBook.sell.sort((a, b) => a.price - b.price); // Lowest ask first

    res.json({ orderBook });
});

// Get user orders
router.get('/user/:userAddress', (req: Request, res: Response) => {
    const { userAddress } = req.params;

    const userOrders = Array.from(orders.values()).filter(
        (order) => order.userAddress === userAddress
    );

    res.json({ orders: userOrders });
});

// Match orders - Admin function
router.post('/match', async (req: Request, res: Response) => {
    try {
        const { buyOrderId, sellOrderId } = req.body;

        const buyOrder = orders.get(buyOrderId);
        const sellOrder = orders.get(sellOrderId);

        if (!buyOrder || !sellOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (buyOrder.status !== 'open' || sellOrder.status !== 'open') {
            return res.status(400).json({ error: 'Orders must be open' });
        }

        if (buyOrder.mintAddress !== sellOrder.mintAddress) {
            return res.status(400).json({ error: 'Orders must be for the same token' });
        }

        if (buyOrder.quantity !== sellOrder.quantity) {
            return res.status(400).json({ error: 'Order quantities must match' });
        }

        if (buyOrder.price < sellOrder.price) {
            return res.status(400).json({ error: 'Buy price must be >= sell price' });
        }

        // Execute at sell price (market order)
        const executionPrice = sellOrder.orderType === 'market' ? sellOrder.price : sellOrder.price;
        const quantity = buyOrder.quantity;

        // Update orders
        buyOrder.status = 'matched';
        buyOrder.matchedWith = sellOrderId;
        sellOrder.status = 'matched';
        sellOrder.matchedWith = buyOrderId;

        res.json({
            success: true,
            match: {
                buyOrder: buyOrderId,
                sellOrder: sellOrderId,
                executionPrice,
                quantity,
                buyer: buyOrder.userAddress,
                seller: sellOrder.userAddress,
            },
            message: 'Orders matched. Ready for settlement.',
        });
    } catch (error: any) {
        console.error('Match orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Settle matched orders - Admin function
router.post('/settle', async (req: Request, res: Response) => {
    try {
        const { buyOrderId, sellOrderId } = req.body;

        const buyOrder = orders.get(buyOrderId);
        const sellOrder = orders.get(sellOrderId);

        if (!buyOrder || !sellOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (buyOrder.status !== 'matched' || sellOrder.status !== 'matched') {
            return res.status(400).json({ error: 'Orders must be matched first' });
        }

        const backendWallet = getBackendWallet();
        const buyer = new PublicKey(buyOrder.userAddress);
        const seller = new PublicKey(sellOrder.userAddress);
        const mint = new PublicKey(buyOrder.mintAddress);

        const executionPrice = sellOrder.price;
        const quantity = buyOrder.quantity;
        const totalCost = executionPrice * quantity;
        const refund = (buyOrder.price - executionPrice) * quantity;

        // Get token accounts
        const buyerTokenAccount = await getAssociatedTokenAddress(mint, buyer);
        const sellerTokenAccount = await getAssociatedTokenAddress(mint, seller);
        const escrowTokenAccount = await getAssociatedTokenAddress(
            mint,
            backendWallet.publicKey
        );

        const transaction = new Transaction();

        // 1. Transfer tokens from escrow to buyer
        transaction.add(
            createTransferInstruction(
                escrowTokenAccount,
                buyerTokenAccount,
                backendWallet.publicKey,
                quantity * Math.pow(10, 9),
                [],
                TOKEN_PROGRAM_ID
            )
        );

        // 2. Transfer SOL from escrow to seller
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: backendWallet.publicKey,
                toPubkey: seller,
                lamports: totalCost * LAMPORTS_PER_SOL,
            })
        );

        // 3. Refund excess SOL to buyer if any
        if (refund > 0) {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: backendWallet.publicKey,
                    toPubkey: buyer,
                    lamports: refund * LAMPORTS_PER_SOL,
                })
            );
        }

        const signature = await connection.sendTransaction(transaction, [backendWallet]);
        await connection.confirmTransaction(signature);

        // Update orders
        buyOrder.status = 'settled';
        sellOrder.status = 'settled';

        res.json({
            success: true,
            settlement: {
                buyer: buyOrder.userAddress,
                seller: sellOrder.userAddress,
                quantity,
                executionPrice,
                totalCost,
                refund,
                signature,
            },
            message: 'Trade settled successfully',
        });
    } catch (error: any) {
        console.error('Settle orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
