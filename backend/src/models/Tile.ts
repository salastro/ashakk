export interface Tile {
    a: number;
    b: number;
}

export function tileEquals(tile1: Tile, tile2: Tile): boolean {
    return (tile1.a === tile2.a && tile1.b === tile2.b) ||
        (tile1.a === tile2.b && tile1.b === tile2.a);
}

export function tileContains(tile: Tile, number: number): boolean {
    return tile.a === number || tile.b === number;
}

export function tileToString(tile: Tile): string {
    return `${tile.a}|${tile.b}`;
}
