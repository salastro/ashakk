import { Tile } from './Tile';
import { Player } from './Player';

export type GamePhase = 'STARTER' | 'PLAY' | 'ENDED';

export interface GameState {
    roomId: string;
    players: Player[];
    gameMasterId: string; // The player who created the room
    currentPlayerIndex: number;
    currentNumber: number;
    needsNumberChoice: boolean; // True when current player must choose a new number
    board: Tile[];
    starterTile?: Tile; // The 6|6 tile shown face-up
    lastSubmission?: {
        playerId: string;
        tiles: Tile[];
    };
    phase: GamePhase;
    winner?: string;
    consecutiveNoPasses: number;
}

export function createGameState(roomId: string, players: Player[], gameMasterId: string): GameState {
    return {
        roomId,
        players,
        gameMasterId,
        currentPlayerIndex: 0,
        currentNumber: -1, // -1 means not chosen yet
        needsNumberChoice: false,
        board: [],
        phase: 'STARTER', // Start in STARTER phase
        consecutiveNoPasses: 0,
    };
}
