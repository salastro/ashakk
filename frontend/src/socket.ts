import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
});

// Debug connection issues
socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
});

export function connectSocket() {
    if (!socket.connected) {
        console.log('Attempting to connect to:', SOCKET_URL);
        socket.connect();
    }
}

export function disconnectSocket() {
    if (socket.connected) {
        socket.disconnect();
    }
}
