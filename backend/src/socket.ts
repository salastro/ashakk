import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomRegistry } from './rooms';
import { createPlayer } from './models/Player';
import { Player } from './models/Player';
import { Tile } from './models/Tile';

export function setupSocketHandlers(io: SocketIOServer, registry: RoomRegistry) {
    io.on('connection', (socket: Socket) => {
        console.log(`Player connected: ${socket.id}`);

        /**
         * Create a new game room
         */
        socket.on('room:create', (data: { roomId: string; playerName: string }, callback) => {
            try {
                const { roomId, playerName } = data;

                if (registry.roomExists(roomId)) {
                    callback({ success: false, error: 'Room already exists' });
                    return;
                }

                const player = createPlayer(socket.id, playerName, [], socket.id);
                const room = registry.createRoom(roomId, [player], socket.id);

                socket.join(roomId);
                socket.emit('room:created', { roomId, gameState: room.getPlayerGameState(socket.id) });
                callback({ success: true, roomId });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Join an existing game room
         */
        socket.on('room:join', (data: { roomId: string; playerName: string }, callback) => {
            try {
                const { roomId, playerName } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const state = room.getState();
                // Can only join if game hasn't started (no hands dealt) and room not full
                if (state.players[0]?.hand.length > 0 || state.players.length >= 4) {
                    callback({ success: false, error: 'Cannot join room' });
                    return;
                }

                const newPlayer = createPlayer(socket.id, playerName, [], socket.id);
                state.players.push(newPlayer);
                state.activePlayers.push(newPlayer.id); // Also add to active players

                socket.join(roomId);
                socket.emit('room:joined', { roomId, gameState: room.getPlayerGameState(socket.id) });
                io.to(roomId).emit('game:update', room.getPublicGameState());
                callback({ success: true, roomId });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Start the game
         */
        socket.on('game:start', (data: { roomId: string }, callback) => {
            try {
                const { roomId } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const state = room.getState();
                if (state.players.length < 2) {
                    callback({ success: false, error: 'Need at least 2 players' });
                    return;
                }

                if (!room.canStartGame(socket.id)) {
                    callback({ success: false, error: 'Only the room creator can start the game' });
                    return;
                }

                room.initializeGame();
                io.to(roomId).emit('game:started', room.getPublicGameState());

                // Send private state (including hand) to each player
                const updatedState = room.getState();
                updatedState.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player submits starting tile (6|6)
         */
        socket.on('turn:submitStarter', (data: { roomId: string; numberChoice: number }, callback) => {
            try {
                const { roomId, numberChoice } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.submitStarter(socket.id, numberChoice);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                io.to(roomId).emit('game:update', room.getPublicGameState());

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player submits tiles
         */
        socket.on('turn:play', (data: { roomId: string; tiles: Tile[] }, callback) => {
            try {
                const { roomId, tiles } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.submitTiles(socket.id, tiles);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                io.to(roomId).emit('game:update', room.getPublicGameState());

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                // Check for game end
                if (state.phase === 'ENDED') {
                    io.to(roomId).emit('game:ended', { leaderboard: state.leaderboard, gameState: room.getPublicGameState() });
                }

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player claims no tile
         */
        socket.on('turn:noTile', (data: { roomId: string }, callback) => {
            try {
                const { roomId } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.submitNoTile(socket.id);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                io.to(roomId).emit('game:update', room.getPublicGameState());

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                // Check for game end (player who played last tiles got accepted)
                if (state.phase === 'ENDED') {
                    io.to(roomId).emit('game:ended', { leaderboard: state.leaderboard, gameState: room.getPublicGameState() });
                }

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player accepts submission
         */
        socket.on('turn:accept', (data: { roomId: string }, callback) => {
            try {
                const { roomId } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.acceptSubmission(socket.id);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                io.to(roomId).emit('game:update', room.getPublicGameState());

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player doubts submission
         */
        socket.on('turn:doubt', (data: { roomId: string }, callback) => {
            try {
                const { roomId } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.doubtSubmission(socket.id);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                const doubtResult = {
                    success: true,
                    penalty: result.penalty,
                    gameState: room.getPublicGameState(),
                };

                io.to(roomId).emit('game:doubtResolved', doubtResult);

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                // Check for game end
                if (state.phase === 'ENDED') {
                    io.to(roomId).emit('game:ended', { leaderboard: state.leaderboard, gameState: room.getPublicGameState() });
                }

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player chooses number after all passed or penalty
         */
        socket.on('turn:chooseNumber', (data: { roomId: string; numberChoice: number }, callback) => {
            try {
                const { roomId, numberChoice } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const result = room.chooseNumber(socket.id, numberChoice);
                if (!result.success) {
                    callback(result);
                    return;
                }

                const state = room.getState();
                io.to(roomId).emit('game:update', room.getPublicGameState());

                // Send private state to each player
                state.players.forEach(p => {
                    const playerSocket = io.sockets.sockets.get(p.socketId || '');
                    if (playerSocket) {
                        playerSocket.emit('game:stateUpdate', room.getPlayerGameState(p.id));
                    }
                });

                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Get current room state (used when rejoining or after navigation)
         */
        socket.on('room:getState', (data: { roomId: string }, callback) => {
            try {
                const { roomId } = data;
                const room = registry.getRoom(roomId);

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                const state = room.getState();
                const isPlayer = state.players.some(p => p.socketId === socket.id);

                if (!isPlayer) {
                    callback({ success: false, error: 'Not a player in this room' });
                    return;
                }

                callback({
                    success: true,
                    gameState: room.getPlayerGameState(socket.id)
                });
            } catch (error) {
                callback({ success: false, error: (error as Error).message });
            }
        });

        /**
         * Player disconnects
         */
        socket.on('disconnect', () => {
            console.log(`Player disconnected: ${socket.id}`);
            // In production, handle player disconnect more gracefully
        });
    });
}
