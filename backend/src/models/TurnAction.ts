import { Tile } from './Tile';

export interface TurnAction {
    playerId: string;
    actionType: 'PLAY' | 'NO_TILE' | 'ACCEPT' | 'DOUBT';
    tiles?: Tile[];
    timestamp: number;
}

export function createPlayAction(playerId: string, tiles: Tile[]): TurnAction {
    return {
        playerId,
        actionType: 'PLAY',
        tiles,
        timestamp: Date.now(),
    };
}

export function createNoTileAction(playerId: string): TurnAction {
    return {
        playerId,
        actionType: 'NO_TILE',
        timestamp: Date.now(),
    };
}

export function createAcceptAction(playerId: string): TurnAction {
    return {
        playerId,
        actionType: 'ACCEPT',
        timestamp: Date.now(),
    };
}

export function createDoubtAction(playerId: string): TurnAction {
    return {
        playerId,
        actionType: 'DOUBT',
        timestamp: Date.now(),
    };
}
