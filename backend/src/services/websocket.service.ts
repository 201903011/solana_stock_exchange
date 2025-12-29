import { Server as HTTPServer } from 'http';
import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { MarketDepthUpdate } from '../types';
import logger from '../utils/logger';

interface ExtendedWebSocket extends WebSocket {
    isAlive: boolean;
    subscriptions: Set<number>;
}

export class WebSocketServer {
    private wss: WSServer;
    private clients: Map<string, ExtendedWebSocket> = new Map();

    constructor(httpServer: HTTPServer) {
        this.wss = new WSServer({ server: httpServer, path: '/ws' });
        logger.info('WebSocket server created');
    }

    public initialize(): void {
        this.wss.on('connection', this.handleConnection.bind(this));

        // Heartbeat to detect broken connections
        setInterval(() => {
            this.wss.clients.forEach((ws: WebSocket) => {
                const extWs = ws as ExtendedWebSocket;
                if (!extWs.isAlive) {
                    logger.info('Terminating inactive WebSocket connection');
                    return extWs.terminate();
                }

                extWs.isAlive = false;
                extWs.ping();
            });
        }, 30000); // 30 seconds

        logger.info('WebSocket server initialized');
    }

    private handleConnection(ws: WebSocket): void {
        const extWs = ws as ExtendedWebSocket;
        const clientId = this.generateClientId();

        extWs.isAlive = true;
        extWs.subscriptions = new Set();

        this.clients.set(clientId, extWs);

        logger.info(`WebSocket client connected: ${clientId}`);

        // Handle pong
        extWs.on('pong', () => {
            extWs.isAlive = true;
        });

        // Handle messages
        extWs.on('message', (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(clientId, extWs, message);
            } catch (error) {
                logger.error('Error parsing WebSocket message:', error);
                this.sendError(extWs, 'Invalid message format');
            }
        });

        // Handle disconnect
        extWs.on('close', () => {
            logger.info(`WebSocket client disconnected: ${clientId}`);
            this.clients.delete(clientId);
        });

        // Handle errors
        extWs.on('error', (error) => {
            logger.error(`WebSocket error for client ${clientId}:`, error);
        });

        // Send welcome message
        this.sendMessage(extWs, {
            type: 'CONNECTED',
            data: { clientId, message: 'Connected to Stock Exchange WebSocket' },
        });
    }

    private handleMessage(
        clientId: string,
        ws: ExtendedWebSocket,
        message: any
    ): void {
        const { type, data } = message;

        switch (type) {
            case 'SUBSCRIBE':
                if (data && data.companyId) {
                    ws.subscriptions.add(data.companyId);
                    logger.info(`Client ${clientId} subscribed to company ${data.companyId}`);
                    this.sendMessage(ws, {
                        type: 'SUBSCRIBED',
                        data: { companyId: data.companyId },
                    });
                } else {
                    this.sendError(ws, 'Invalid subscription data');
                }
                break;

            case 'UNSUBSCRIBE':
                if (data && data.companyId) {
                    ws.subscriptions.delete(data.companyId);
                    logger.info(`Client ${clientId} unsubscribed from company ${data.companyId}`);
                    this.sendMessage(ws, {
                        type: 'UNSUBSCRIBED',
                        data: { companyId: data.companyId },
                    });
                }
                break;

            case 'PING':
                this.sendMessage(ws, { type: 'PONG', data: {} });
                break;

            default:
                this.sendError(ws, 'Unknown message type');
        }
    }

    public broadcastMarketDepth(update: MarketDepthUpdate): void {
        const message = {
            type: 'MARKET_DEPTH',
            data: update,
        };

        let sentCount = 0;

        this.clients.forEach((ws) => {
            if (ws.subscriptions.has(update.companyId) && ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, message);
                sentCount++;
            }
        });

        logger.debug(`Broadcast market depth for company ${update.companyId} to ${sentCount} clients`);
    }

    public broadcastTrade(trade: any): void {
        const message = {
            type: 'TRADE',
            data: trade,
        };

        this.clients.forEach((ws) => {
            if (ws.subscriptions.has(trade.company_id) && ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, message);
            }
        });
    }

    public broadcastOrderUpdate(order: any): void {
        const message = {
            type: 'ORDER_UPDATE',
            data: order,
        };

        // Send to specific user if connected
        this.clients.forEach((ws) => {
            // In a real implementation, we'd track user IDs for each connection
            if (ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, message);
            }
        });
    }

    private sendMessage(ws: ExtendedWebSocket, message: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private sendError(ws: ExtendedWebSocket, error: string): void {
        this.sendMessage(ws, {
            type: 'ERROR',
            data: { error },
        });
    }

    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public getConnectedClients(): number {
        return this.clients.size;
    }

    public getSubscriptions(companyId: number): number {
        let count = 0;
        this.clients.forEach((ws) => {
            if (ws.subscriptions.has(companyId)) {
                count++;
            }
        });
        return count;
    }
}
