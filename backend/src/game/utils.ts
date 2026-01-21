import { Tile, tileContains } from '../models/Tile';

/**
 * Generate a complete domino set (0|0 to 6|6)
 * Returns an array of 28 tiles
 */
export function generateDominoSet(): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            tiles.push({ a: i, b: j });
        }
    }
    return tiles;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Find the player with the 6|6 tile
 */
export function findStarterIndex(hands: Tile[][]): number {
    for (let i = 0; i < hands.length; i++) {
        for (const tile of hands[i]) {
            if (tile.a === 6 && tile.b === 6) {
                return i;
            }
        }
    }
    return 0; // Fallback
}

/**
 * Validate if a tile submission is valid for the current number
 */
export function validateSubmission(tiles: Tile[], currentNumber: number): boolean {
    if (tiles.length === 0) return false;

    // All tiles must contain the current number
    for (const tile of tiles) {
        if (!tileContains(tile, currentNumber)) {
            return false;
        }
    }
    return true;
}

/**
 * Check if a player has a tile with the given number
 */
export function playerHasTile(hand: Tile[], number: number): boolean {
    return hand.some(tile => tileContains(tile, number));
}

/**
 * Remove tiles from a hand
 */
export function removeTilesFromHand(hand: Tile[], tilesToRemove: Tile[]): Tile[] {
    const result = [...hand];

    for (const tileToRemove of tilesToRemove) {
        const index = result.findIndex(tile =>
            (tile.a === tileToRemove.a && tile.b === tileToRemove.b) ||
            (tile.a === tileToRemove.b && tile.b === tileToRemove.a)
        );
        if (index !== -1) {
            result.splice(index, 1);
        }
    }

    return result;
}

/**
 * Add tiles to a hand
 */
export function addTilesToHand(hand: Tile[], tilesToAdd: Tile[]): Tile[] {
    return [...hand, ...tilesToAdd];
}
