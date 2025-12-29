import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { publicKey } = useWallet();
  const router = useRouter();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">
                Solana IPO
              </span>
            </Link>
            
            {publicKey && (
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/ipo"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname === '/ipo'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  IPOs
                </Link>
                <Link
                  href="/trading"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname === '/trading'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Trading
                </Link>
                <Link
                  href="/portfolio"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname === '/portfolio'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Portfolio
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
