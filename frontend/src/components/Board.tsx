import { Tile } from '../types';
import './Board.css';

interface BoardProps {
    boardSize: number;
    currentNumber: number;
    starterTile?: Tile;
    lastSubmissionSize?: number;
    lastSubmissionPlayerId?: string;
    playerNames: Map<string, string>;
}

export function Board({
    boardSize,
    currentNumber,
    starterTile,
    lastSubmissionSize,
    lastSubmissionPlayerId,
    playerNames,
}: BoardProps) {
    const renderDots = (count: number) => {
        const positions: { [key: number]: { x: number; y: number }[] } = {
            0: [],
            1: [{ x: 50, y: 50 }],
            2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
            3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
            4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            6: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
        };

        return positions[count].map((pos, i) => (
            <circle key={i} cx={pos.x} cy={pos.y} r="6" fill="#333" />
        ));
    };

    return (
        <div className="board">
            <div className="board-info">
                {/* Show starter tile face-up */}
                {starterTile && (
                    <div className="starter-tile">
                        <span className="label">Starter</span>
                        <svg viewBox="0 0 100 200" className="tile-svg-small">
                            <rect x="2" y="2" width="96" height="196" rx="8" fill="white" stroke="#333" strokeWidth="3" />
                            <line x1="10" y1="100" x2="90" y2="100" stroke="#333" strokeWidth="2" />
                            <g className="tile-top">
                                {renderDots(starterTile.a)}
                            </g>
                            <g className="tile-bottom" transform="translate(0, 100)">
                                {renderDots(starterTile.b)}
                            </g>
                        </svg>
                    </div>
                )}

                <div className="current-number">
                    <span className="label">Current Number</span>
                    <span className="number">{currentNumber >= 0 ? currentNumber : '?'}</span>
                </div>

                <div className="board-pile">
                    <div className="pile-visual">
                        {Array.from({ length: Math.min(boardSize, 10) }).map((_, i) => (
                            <div
                                key={i}
                                className="pile-tile"
                                style={{
                                    transform: `rotate(${(i * 15) - 30}deg) translateY(${i * 2}px)`,
                                    zIndex: i,
                                }}
                            />
                        ))}
                    </div>
                    <span className="pile-count">{boardSize} hidden tiles</span>
                </div>
            </div>

            {lastSubmissionSize !== undefined && lastSubmissionPlayerId && (
                <div className="last-submission">
                    <span className="submission-player">
                        {playerNames.get(lastSubmissionPlayerId) || 'Unknown'}
                    </span>
                    <span className="submission-text">
                        played {lastSubmissionSize} tile{lastSubmissionSize !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </div>
    );
}
