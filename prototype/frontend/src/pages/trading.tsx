import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { orderApi, ipoApi } from '@/services/api';
import { Transaction } from '@solana/web3.js';

interface Order {
  id: string;
  userAddress: string;
  mintAddress: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  price: number;
  status: string;
  createdAt: number;
}

interface IPO {
  id: string;
  companyName: string;
  symbol: string;
  mintAddress: string;
}

export default function TradingPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [ipos, setIpos] = useState<IPO[]>([{
            id: "1",
            companyName: "Abc fintech",
            symbol: "ABCF",
            mintAddress: "4daA8H1PmiunMSGUsAYxhKFNzGpF9YXDPJQQfhpCiMou",
        }]);
  const [selectedIpo, setSelectedIpo] = useState<string>('4daA8H1PmiunMSGUsAYxhKFNzGpF9YXDPJQQfhpCiMou');
  const [orderBook, setOrderBook] = useState<{ buy: Order[]; sell: Order[] }>({
    buy: [],
    sell: [],
  });
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [orderForm, setOrderForm] = useState({
    side: 'buy' as 'buy' | 'sell',
    orderType: 'market' as 'market' | 'limit',
    quantity: 0,
    price: 0,
  });

  useEffect(() => {
    loadIPOs();
  }, []);

  useEffect(() => {
    if (selectedIpo && connected && publicKey) {
      loadOrderBook();
      loadUserOrders();
    }
  }, [selectedIpo, connected, publicKey]);

  const loadIPOs = async () => {
    try {
      const data = await ipoApi.list();
      setIpos(data.ipos || []);
      if (data.ipos && data.ipos.length > 0) {
        setSelectedIpo(data.ipos[0].mintAddress);
      }
    } catch (error) {
      console.error('Error loading IPOs:', error);
    }
  };

  const loadOrderBook = async () => {
    if (!selectedIpo) return;
    
    try {
      const data = await orderApi.getOrderBook(selectedIpo);
      setOrderBook(data.orderBook);
    } catch (error) {
      console.error('Error loading order book:', error);
    }
  };

  const loadUserOrders = async () => {
    if (!publicKey) return;
    
    try {
      const data = await orderApi.getUserOrders(publicKey.toBase58());
      setUserOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading user orders:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!publicKey || !connected || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    if (!selectedIpo) {
      alert('Please select a token');
      return;
    }

    if (orderForm.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (orderForm.price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setPlacing(true);
    try {
      // Step 1: Create order and get unsigned transaction
      const result = await orderApi.place({
        userAddress: publicKey.toBase58(),
        mintAddress: selectedIpo,
        side: orderForm.side,
        orderType: orderForm.orderType,
        quantity: orderForm.quantity,
        price: orderForm.price,
      });

      // Step 2: Deserialize transaction
      const transaction = Transaction.from(
        Buffer.from(result.transaction, 'base64')
      );

      // Step 3: Sign transaction with Phantom
      const signedTransaction = await signTransaction(transaction);

      // Step 4: Confirm order with signed transaction
      const confirmResult = await orderApi.confirm({
        orderId: result.order.id,
        signedTransaction: Buffer.from(signedTransaction.serialize()).toString('base64'),
      });

      alert(`Order placed successfully! Signature: ${confirmResult.signature.slice(0, 16)}...`);
      
      // Refresh data
      loadOrderBook();
      loadUserOrders();
      
      // Reset form
      setOrderForm({
        ...orderForm,
        quantity: 0,
        price: 0,
      });
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setPlacing(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Trading</h1>
        <p className="text-gray-600">Please connect your wallet to start trading</p>
      </div>
    );
  }

  const selectedIpoData = ipos.find((ipo) => ipo.mintAddress === selectedIpo);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading</h1>
        <p className="text-gray-600">Place buy and sell orders</p>
      </div>

      {/* Token Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Token
        </label>
        <select
          value={selectedIpo}
          onChange={(e) => setSelectedIpo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ipos.map((ipo) => (
            <option key={ipo.mintAddress} value={ipo.mintAddress}>
              {ipo.companyName} ({ipo.symbol})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Place Order</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderForm({ ...orderForm, side: 'buy' })}
                    className={`py-2 px-4 rounded-md ${
                      orderForm.side === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setOrderForm({ ...orderForm, side: 'sell' })}
                    className={`py-2 px-4 rounded-md ${
                      orderForm.side === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <select
                  value={orderForm.orderType}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      orderType: e.target.value as 'market' | 'limit',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={orderForm.quantity || ''}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (SOL)
                </label>
                <input
                  type="number"
                  value={orderForm.price || ''}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4">
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">
                      {(orderForm.quantity * orderForm.price).toFixed(2)} SOL
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className={`w-full py-3 px-4 rounded-md text-white font-semibold ${
                    orderForm.side === 'buy'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:bg-gray-400 disabled:cursor-not-allowed transition`}
                >
                  {placing ? 'Placing Order...' : `Place ${orderForm.side.toUpperCase()} Order`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Order Book */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Order Book {selectedIpoData && `- ${selectedIpoData.symbol}`}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Buy Orders */}
              <div>
                <h3 className="text-sm font-semibold text-green-600 mb-2">
                  BUY ORDERS
                </h3>
                {orderBook.buy.length === 0 ? (
                  <p className="text-sm text-gray-500">No buy orders</p>
                ) : (
                  <div className="space-y-2">
                    {orderBook.buy.map((order) => (
                      <div
                        key={order.id}
                        className="bg-green-50 p-2 rounded text-sm"
                      >
                        <div className="flex justify-between">
                          <span>{order.quantity} @ {order.price} SOL</span>
                          <span className="text-xs text-gray-500">
                            {order.orderType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sell Orders */}
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-2">
                  SELL ORDERS
                </h3>
                {orderBook.sell.length === 0 ? (
                  <p className="text-sm text-gray-500">No sell orders</p>
                ) : (
                  <div className="space-y-2">
                    {orderBook.sell.map((order) => (
                      <div
                        key={order.id}
                        className="bg-red-50 p-2 rounded text-sm"
                      >
                        <div className="flex justify-between">
                          <span>{order.quantity} @ {order.price} SOL</span>
                          <span className="text-xs text-gray-500">
                            {order.orderType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* My Orders */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Orders</h2>
            {userOrders.length === 0 ? (
              <p className="text-gray-500">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Side
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Price
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              order.side === 'buy' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {order.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {order.orderType}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {order.quantity}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {order.price} SOL
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              order.status === 'open'
                                ? 'bg-yellow-100 text-yellow-800'
                                : order.status === 'matched'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
