import { Tile } from '../types';
import './PlayerHand.css';

interface PlayerHandProps {
    tiles: Tile[];
    selectedTiles: Tile[];
    onTileSelect: (tile: Tile) => void;
    disabled: boolean;
}

export function PlayerHand({
    tiles,
    selectedTiles,
    onTileSelect,
    disabled,
}: PlayerHandProps) {
    const isTileSelected = (tile: Tile) => {
        return selectedTiles.some(
            (t) => (t.a === tile.a && t.b === tile.b) || (t.a === tile.b && t.b === tile.a)
        );
    };

    const renderDots = (count: number) => {
        const dots: JSX.Element[] = [];
        const positions: { [key: number]: { x: number; y: number }[] } = {
            0: [],
            1: [{ x: 50, y: 50 }],
            2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
            3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
            4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            6: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
        };

        positions[count].forEach((pos, i) => {
            dots.push(
                <circle key={i} cx={pos.x} cy={pos.y} r="8" fill="currentColor" />
            );
        });

        return dots;
    };

    return (
        <div className="player-hand">
            <h3>Your Hand ({tiles.length} tiles)</h3>
            <div className="hand-tiles">
                {tiles.map((tile, index) => (
                    <button
                        key={`${tile.a}-${tile.b}-${index}`}
                        className={`tile ${isTileSelected(tile) ? 'selected' : ''}`}
                        onClick={() => onTileSelect(tile)}
                        disabled={disabled}
                    >
                        <svg viewBox="0 0 100 200" className="tile-svg">
                            <rect x="2" y="2" width="96" height="196" rx="8" fill="white" stroke="#333" strokeWidth="3" />
                            <line x1="10" y1="100" x2="90" y2="100" stroke="#333" strokeWidth="2" />
                            <g className="tile-top">
                                {renderDots(tile.a)}
                            </g>
                            <g className="tile-bottom" transform="translate(0, 100)">
                                {renderDots(tile.b)}
                            </g>
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
};
