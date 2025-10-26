/**
 * Frontend Client-Side SOL Transfer Implementation
 * This example shows how to implement the client-side SOL transfer for IPO applications
 */

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction
} from '@solana/web3.js';

// Types for API responses
interface IPOApplicationResponse {
    success: boolean;
    data: {
        application_id: number;
        ipo_symbol: string;
        quantity: string;
        total_amount_sol: number;
        token_account: string;
        status: 'PAYMENT_PENDING';
        payment_instruction: {
            type: 'sol_transfer';
            from: string;
            to: string;
            amount_lamports: number;
            amount_sol: number;
        };
    };
    message: string;
}

interface PaymentConfirmationResponse {
    success: boolean;
    data: {
        application_id: number;
        transaction_signature: string;
        company_symbol: string;
        quantity: string;
        amount_sol: number;
        status: 'PENDING';
    };
    message: string;
}

/**
 * Apply to IPO with automatic SOL payment handling
 * @param ipoId - The IPO ID to apply to
 * @param quantity - Number of shares to apply for
 * @param userWallet - User's Solana wallet adapter (from @solana/wallet-adapter)
 * @param connection - Solana RPC connection
 * @param apiBaseUrl - Backend API base URL
 * @param authToken - JWT authentication token
 */
export async function applyToIPOWithPayment(
    ipoId: number,
    quantity: string,
    userWallet: any, // Wallet adapter instance
    connection: Connection,
    apiBaseUrl: string,
    authToken: string
): Promise<PaymentConfirmationResponse> {

    try {
        // Step 1: Submit IPO application (without payment)
        console.log('📝 Submitting IPO application...');

        const applicationResponse = await fetch(`${apiBaseUrl}/api/companies/ipo/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                ipo_id: ipoId,
                quantity: quantity
            })
        });

        if (!applicationResponse.ok) {
            throw new Error(`Application failed: ${applicationResponse.statusText}`);
        }

        const applicationData: IPOApplicationResponse = await applicationResponse.json();

        if (!applicationData.success) {
            throw new Error(applicationData.message || 'Application failed');
        }

        // Check if payment is required
        if (applicationData.data.status !== 'PAYMENT_PENDING') {
            // Application completed without separate payment (shouldn't happen with new implementation)
            return applicationData as any;
        }

        const paymentInstruction = applicationData.data.payment_instruction;
        console.log(`💰 Payment required: ${paymentInstruction.amount_sol.toFixed(4)} SOL`);

        // Step 2: Create and sign SOL transfer transaction
        console.log('🔐 Creating SOL transfer transaction...');

        if (!userWallet.connected || !userWallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        const fromPublicKey = userWallet.publicKey;
        const toPublicKey = new PublicKey(paymentInstruction.to);
        const lamports = paymentInstruction.amount_lamports;

        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromPublicKey,
                toPubkey: toPublicKey,
                lamports: lamports
            })
        );

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;

        console.log('📤 Requesting wallet signature...');

        // Sign transaction with user's wallet
        const signedTransaction = await userWallet.signTransaction(transaction);

        // Send transaction to Solana network
        console.log('🌐 Sending transaction to Solana network...');
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());

        // Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`✅ SOL transfer confirmed: ${signature}`);

        // Step 3: Confirm payment on backend
        console.log('🔄 Confirming payment with backend...');

        const confirmationResponse = await fetch(`${apiBaseUrl}/api/companies/ipo/confirm-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                application_id: applicationData.data.application_id,
                transaction_signature: signature
            })
        });

        if (!confirmationResponse.ok) {
            throw new Error(`Payment confirmation failed: ${confirmationResponse.statusText}`);
        }

        const confirmationData: PaymentConfirmationResponse = await confirmationResponse.json();

        if (!confirmationData.success) {
            throw new Error(confirmationData.message || 'Payment confirmation failed');
        }

        console.log('🎉 IPO application completed successfully!');
        return confirmationData;

    } catch (error) {
        console.error('❌ IPO application error:', error);
        throw error;
    }
}

/**
 * React Hook example for IPO application with payment
 */
export function useIPOApplication() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyToIPO = async (
        ipoId: number,
        quantity: string,
        wallet: any,
        connection: Connection
    ) => {
        setLoading(true);
        setError(null);

        try {
            const result = await applyToIPOWithPayment(
                ipoId,
                quantity,
                wallet,
                connection,
                process.env.REACT_APP_API_URL || 'http://localhost:3000',
                localStorage.getItem('authToken') || ''
            );

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { applyToIPO, loading, error };
}

/**
 * Vue.js Composable example
 */
export function useIPOApplicationVue() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    const applyToIPO = async (
        ipoId: number,
        quantity: string,
        wallet: any,
        connection: Connection
    ) => {
        loading.value = true;
        error.value = null;

        try {
            const result = await applyToIPOWithPayment(
                ipoId,
                quantity,
                wallet,
                connection,
                import.meta.env.VITE_API_URL || 'http://localhost:3000',
                localStorage.getItem('authToken') || ''
            );

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            error.value = errorMessage;
            throw err;
        } finally {
            loading.value = false;
        }
    };

    return { applyToIPO, loading, error };
}

// Example usage in a React component:
/*
function IPOApplicationComponent({ ipo }: { ipo: any }) {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { applyToIPO, loading, error } = useIPOApplication();
    const [quantity, setQuantity] = useState('');
    
    const handleApply = async () => {
        try {
            const result = await applyToIPO(
                ipo.id,
                quantity,
                wallet,
                connection
            );
            
            alert(`IPO application successful! Transaction: ${result.data.transaction_signature}`);
        } catch (err) {
            console.error('Application failed:', err);
        }
    };
    
    return (
        <div>
            <h3>{ipo.company_name} IPO</h3>
            <p>Price: {ipo.price_per_share_sol} SOL per share</p>
            
            <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
            />
            
            <button 
                onClick={handleApply}
                disabled={loading || !wallet.connected}
            >
                {loading ? 'Processing...' : 'Apply to IPO'}
            </button>
            
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
*/