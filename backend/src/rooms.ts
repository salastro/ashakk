import { GameRoom } from './game/GameRoom';
import { Player } from './models/Player';

export class RoomRegistry {
    private rooms: Map<string, GameRoom> = new Map();
    private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

    /**
     * Create a new game room
     */
    public createRoom(roomId: string, players: Player[], gameMasterId: string): GameRoom {
        if (this.rooms.has(roomId)) {
            throw new Error(`Room ${roomId} already exists`);
        }

        const room = new GameRoom(roomId, players, gameMasterId);
        this.rooms.set(roomId, room);

        // Track players to rooms
        players.forEach(p => {
            this.playerRoomMap.set(p.id, roomId);
        });

        return room;
    }

    /**
     * Get a room by ID
     */
    public getRoom(roomId: string): GameRoom | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get the room a player is in
     */
    public getPlayerRoom(playerId: string): GameRoom | undefined {
        const roomId = this.playerRoomMap.get(playerId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }

    /**
     * Delete a room
     */
    public deleteRoom(roomId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        // Remove player mappings
        const state = room.getState();
        state.players.forEach(p => {
            this.playerRoomMap.delete(p.id);
        });

        return this.rooms.delete(roomId);
    }

    /**
     * Check if a room exists
     */
    public roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    /**
     * Get all active room IDs
     */
    public getAllRooms(): string[] {
        return Array.from(this.rooms.keys());
    }
}
