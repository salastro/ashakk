export interface Tile {
    a: number;
    b: number;
}

export interface PublicPlayer {
    id: string;
    name: string;
    handSize: number;
    hasPassed: boolean;
}

export type GamePhase = 'STARTER' | 'PLAY' | 'ENDED';

export interface PublicGameState {
    roomId: string;
    players: PublicPlayer[];
    gameMasterId: string; // The player who created the room
    currentPlayerIndex: number;
    currentNumber: number;
    needsNumberChoice: boolean; // True when current player must choose a new number
    boardSize: number;
    starterTile?: Tile; // The 6|6 tile shown face-up
    phase: GamePhase;
    lastSubmissionSize?: number;
    lastSubmissionPlayerId?: string;
    consecutiveNoPasses: number;
    winner?: string;
}

export interface PlayerGameState extends PublicGameState {
    myHand: Tile[];
    isMyTurn: boolean;
}

export interface SocketResponse {
    success: boolean;
    error?: string;
}

export interface DoubtResolvedEvent {
    success: boolean;
    penalty: 'SUBMITTER' | 'DOUBTER';
    gameState: PublicGameState;
}

export interface GameEndedEvent {
    winner: string;
    gameState: PublicGameState;
}
