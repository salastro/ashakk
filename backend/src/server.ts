import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { RoomRegistry } from './rooms';
import { setupSocketHandlers } from './socket';

export function createApp() {
    const app = express();
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Initialize registry
    const registry = new RoomRegistry();

    // Setup Socket.IO handlers
    setupSocketHandlers(io, registry);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // Get active rooms (debug endpoint)
    app.get('/rooms', (req, res) => {
        res.json({ rooms: registry.getAllRooms() });
    });

    return { app, httpServer, io, registry };
}
