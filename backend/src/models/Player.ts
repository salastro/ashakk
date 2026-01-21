import { Tile } from './Tile';

export interface Player {
    id: string;
    name: string;
    hand: Tile[];
    hasPassed: boolean;
    socketId?: string;
}

export function createPlayer(id: string, name: string, hand: Tile[], socketId?: string): Player {
    return {
        id,
        name,
        hand,
        hasPassed: false,
        socketId,
    };
}

export function getPlayerPublicData(player: Player) {
    return {
        id: player.id,
        name: player.name,
        handSize: player.hand.length,
        hasPassed: player.hasPassed,
    };
}
