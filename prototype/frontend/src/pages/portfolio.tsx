import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { portfolioApi } from '@/services/api';

interface Token {
  mint: string;
  balance: number;
  decimals: number;
  tokenAccount: string;
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const [portfolio, setPortfolio] = useState<{
    userAddress: string;
    solBalance: number;
    tokens: Token[];
  } | null>(null);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Portfolio</h1>
        <p className="text-gray-600">Please connect your wallet to view your portfolio</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600">View your holdings and balances</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      ) : (
        <>
          {/* SOL Balance */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SOL Balance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-indigo-600">
                  {portfolio?.solBalance?.toFixed(4) || '0.0000'}
                </p>
                <p className="text-sm text-gray-500 mt-1">SOL</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Wallet Address</p>
                <p className="text-sm font-mono text-gray-700">
                  {publicKey?.toBase58().slice(0, 16)}...
                </p>
              </div>
            </div>
          </div>

          {/* Token Holdings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Holdings</h2>
            
            {!portfolio?.tokens || portfolio.tokens.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No tokens in your portfolio</p>
                <p className="text-sm text-gray-400 mt-2">
                  Apply for IPOs to receive tokens
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mint Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token Account
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {portfolio.tokens.map((token, index) => (
                      <tr key={token.mint} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                              {index + 1}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Token #{index + 1}
                              </p>
                              <p className="text-xs text-gray-500">
                                {token.decimals} decimals
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-gray-900">
                            {token.balance?.toFixed(4) || '0.0000'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-mono text-gray-600">
                            {token.mint.slice(0, 12)}...
                          </p>
                          <button
                            onClick={() => navigator.clipboard.writeText(token.mint)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                          >
                            Copy
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-mono text-gray-600">
                            {token.tokenAccount.slice(0, 12)}...
                          </p>
                          <button
                            onClick={() => navigator.clipboard.writeText(token.tokenAccount)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                          >
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 bg-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              Portfolio Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {portfolio?.solBalance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-600">SOL Balance</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {portfolio?.tokens?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Token Types</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {portfolio?.tokens?.reduce((sum, t) => sum + (t.balance || 0), 0).toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-600">Total Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-sm text-gray-600">Status</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
