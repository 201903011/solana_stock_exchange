import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { portfolioApi } from '@/services/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadPortfolio();
    }
  }, [connected, publicKey]);

  const loadPortfolio = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const data = await portfolioApi.getPortfolio(publicKey.toBase58());
      setPortfolio(data);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Solana IPO Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Connect your Phantom wallet to get started
        </p>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="text-left space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">✓</span>
              <span>Apply for IPOs and receive token allocations</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">✓</span>
              <span>Trade tokens with escrow protection</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">✓</span>
              <span>View your portfolio and balances</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">✓</span>
              <span>Sign transactions with your Phantom wallet</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {publicKey?.toBase58().slice(0, 8)}...
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">SOL Balance</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <p className="text-3xl font-bold text-indigo-600">
              {portfolio?.solBalance?.toFixed(4) || '0.0000'} SOL
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Tokens</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <p className="text-3xl font-bold text-indigo-600">
              {portfolio?.tokens?.length || 0}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Status</h3>
          <p className="text-3xl font-bold text-green-600">Active</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/ipo"
            className="block p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 transition"
          >
            <h3 className="font-semibold text-indigo-600 mb-2">Browse IPOs</h3>
            <p className="text-sm text-gray-600">View and apply for available IPOs</p>
          </a>
          <a
            href="/trading"
            className="block p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 transition"
          >
            <h3 className="font-semibold text-indigo-600 mb-2">Start Trading</h3>
            <p className="text-sm text-gray-600">Place buy and sell orders</p>
          </a>
          <a
            href="/portfolio"
            className="block p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 transition"
          >
            <h3 className="font-semibold text-indigo-600 mb-2">View Portfolio</h3>
            <p className="text-sm text-gray-600">Check your holdings and transactions</p>
          </a>
        </div>
      </div>
    </div>
  );
}
