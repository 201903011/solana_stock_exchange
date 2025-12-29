import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ipoApi, portfolioApi } from '@/services/api';

interface IPO {
  id: string;
  companyName: string;
  symbol: string;
  mintAddress: string;
  totalShares: number;
  pricePerShare: number;
  status: string;
  applicationsCount: number;
}

export default function IPOPage() {
  const { publicKey, connected } = useWallet();
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [sharesRequested, setSharesRequested] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadIPOs();
  }, []);

  const loadIPOs = async () => {
    setLoading(true);
    try {
      const data = await ipoApi.list();
      setIpos(data.ipos || []);
    } catch (error) {
      console.error('Error loading IPOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (ipoId: string) => {
    if (!publicKey || !connected) {
      alert('Please connect your wallet');
      return;
    }

    const shares = sharesRequested[ipoId];
    if (!shares || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    setApplying(ipoId);
    try {
      const result = await ipoApi.apply({
        ipoId,
        userAddress: publicKey.toBase58(),
        sharesRequested: shares,
      });

      alert(`Application submitted successfully! Status: ${result.application.status}`);
      loadIPOs();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setApplying(null);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">IPO Marketplace</h1>
        <p className="text-gray-600">Please connect your wallet to view IPOs</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">IPO Marketplace</h1>
        <p className="text-gray-600">Apply for initial public offerings</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading IPOs...</p>
        </div>
      ) : ipos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">No IPOs available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ipos.map((ipo) => (
            <div key={ipo.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{ipo.companyName}</h3>
                  <p className="text-sm text-gray-500">{ipo.symbol}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    ipo.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ipo.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price per Share:</span>
                  <span className="font-semibold">{ipo.pricePerShare} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Shares:</span>
                  <span className="font-semibold">{ipo.totalShares}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Applications:</span>
                  <span className="font-semibold">{ipo.applicationsCount}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Mint Address:</p>
                <p className="text-xs font-mono text-gray-700 break-all mb-4">
                  {ipo.mintAddress}
                </p>
              </div>

              {ipo.status === 'open' && (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Number of shares"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={sharesRequested[ipo.id] || ''}
                    onChange={(e) =>
                      setSharesRequested({
                        ...sharesRequested,
                        [ipo.id]: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <button
                    onClick={() => handleApply(ipo.id)}
                    disabled={applying === ipo.id}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {applying === ipo.id ? 'Applying...' : 'Apply for IPO'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
