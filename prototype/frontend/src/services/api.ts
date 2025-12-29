import axios from 'axios';
import { API_BASE_URL } from '@/config/config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// IPO API
export const ipoApi = {
    create: async (data: {
        companyName: string;
        symbol: string;
        totalShares: number;
        pricePerShare: number;
    }) => {
        const response = await api.post('/api/ipo/create', data);
        return response.data;
    },

    list: async () => {
        const response = await api.get('/api/ipo/list');
        return response.data;
    },

    getDetails: async (id: string) => {
        const response = await api.get(`/api/ipo/${id}`);
        return response.data;
    },

    apply: async (data: {
        ipoId: string;
        userAddress: string;
        sharesRequested: number;
    }) => {
        const response = await api.post('/api/ipo/apply', data);
        return response.data;
    },

    allocate: async (data: {
        ipoId: string;
        allocations: Array<{ userAddress: string; sharesAllocated: number }>;
    }) => {
        const response = await api.post('/api/ipo/allocate', data);
        return response.data;
    },
};

// Order API
export const orderApi = {
    place: async (data: {
        userAddress: string;
        mintAddress: string;
        side: 'buy' | 'sell';
        orderType: 'market' | 'limit';
        quantity: number;
        price: number;
    }) => {
        const response = await api.post('/api/orders/place', data);
        return response.data;
    },

    confirm: async (data: { orderId: string; signedTransaction: string }) => {
        const response = await api.post('/api/orders/confirm', data);
        return response.data;
    },

    getOrderBook: async (mintAddress: string) => {
        const response = await api.get(`/api/orders/book/${mintAddress}`);
        return response.data;
    },

    getUserOrders: async (userAddress: string) => {
        const response = await api.get(`/api/orders/user/${userAddress}`);
        return response.data;
    },

    match: async (data: { buyOrderId: string; sellOrderId: string }) => {
        const response = await api.post('/api/orders/match', data);
        return response.data;
    },

    settle: async (data: { buyOrderId: string; sellOrderId: string }) => {
        const response = await api.post('/api/orders/settle', data);
        return response.data;
    },
};

// Portfolio API
export const portfolioApi = {
    getPortfolio: async (userAddress: string) => {
        const response = await api.get(`/api/portfolio/${userAddress}`);
        return response.data;
    },

    getTokenBalance: async (userAddress: string, mintAddress: string) => {
        const response = await api.get(`/api/portfolio/${userAddress}/token/${mintAddress}`);
        return response.data;
    },
};

export default api;
