import { useState } from 'react';
import { Tile, GamePhase } from '../types';
import './Controls.css';

interface ControlsProps {
    phase: GamePhase;
    isMyTurn: boolean;
    selectedTiles: Tile[];
    currentNumber: number;
    canDoubt: boolean;
    onPlay: (numberChoice?: number) => void;
    onDoubt: () => void;
    onAccept: () => void;
    onNoTile: () => void;
    onChooseNumber: (number: number) => void;
    needsNumberChoice: boolean;
    onStarterPlay: (number: number) => void;
}

export function Controls({
    phase,
    isMyTurn,
    selectedTiles,
    currentNumber,
    canDoubt,
    onPlay,
    onDoubt,
    onAccept,
    onNoTile,
    onChooseNumber,
    needsNumberChoice,
    onStarterPlay,
}: ControlsProps) {
    const [showNumberPicker, setShowNumberPicker] = useState(false);
    const [starterMode, setStarterMode] = useState(false);

    const handlePlayClick = () => {
        if (selectedTiles.length === 0) return;
        onPlay();
    };

    const handleNumberSelect = (number: number) => {
        setShowNumberPicker(false);
        if (starterMode) {
            setStarterMode(false);
            onStarterPlay(number);
        } else {
            onChooseNumber(number);
        }
    };

    const handleStarterClick = () => {
        setStarterMode(true);
        setShowNumberPicker(true);
    };

    const renderNumberPicker = () => (
        <div className="number-picker-overlay" onClick={() => { setShowNumberPicker(false); setStarterMode(false); }}>
            <div className="number-picker" onClick={(e) => e.stopPropagation()}>
                <h3>{starterMode ? 'Play double-six' : 'Choose Number to Play On'}</h3>
                <div className="number-options">
                    {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                            key={num}
                            className="number-option"
                            onClick={() => handleNumberSelect(num)}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    if (phase === 'ENDED') {
        return (
            <div className="controls">
                <p className="game-over">Game Over!</p>
            </div>
        );
    }

    // STARTER phase - player with 6|6 plays it and chooses number
    if (phase === 'STARTER') {
        if (!isMyTurn) {
            return (
                <div className="controls">
                    <p className="waiting">Waiting for starter player to play double-six...</p>
                </div>
            );
        }
        return (
            <div className="controls">
                {showNumberPicker && renderNumberPicker()}
                <p className="controls-hint">You have the double-six! Play it and choose the number to play on.</p>
                <button className="control-button primary" onClick={handleStarterClick}>
                    🎲 Play double-six
                </button>
            </div>
        );
    }

    // Not your turn during play phase - but can still doubt
    if (!isMyTurn) {
        return (
            <div className="controls">
                {canDoubt ? (
                    <>
                        <p className="controls-hint">Waiting for your turn... You can doubt the last play!</p>
                        <button className="control-button doubt" onClick={onDoubt}>
                            🤔 Doubt
                        </button>
                    </>
                ) : (
                    <p className="waiting">Waiting for your turn...</p>
                )}
            </div>
        );
    }

    // Need to choose a number (after all pass or after penalty)
    if (needsNumberChoice) {
        return (
            <div className="controls">
                {showNumberPicker && renderNumberPicker()}
                <p className="controls-hint">Choose a new number to play on</p>
                <div className="controls-buttons">
                    <button
                        className="control-button primary"
                        onClick={() => setShowNumberPicker(true)}
                    >
                        Choose Number
                    </button>
                    {canDoubt && (
                        <button className="control-button doubt" onClick={onDoubt}>
                            🤔 Doubt
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Play phase - your turn
    return (
        <div className="controls">
            {showNumberPicker && renderNumberPicker()}
            <p className="controls-hint">
                Select tiles with {currentNumber} to play (or bluff!)
            </p>
            <div className="controls-buttons">
                <button
                    className="control-button primary"
                    onClick={handlePlayClick}
                    disabled={selectedTiles.length === 0}
                >
                    🎲 Play {selectedTiles.length > 0 ? `(${selectedTiles.length})` : ''}
                </button>
                <button className="control-button secondary" onClick={onNoTile}>
                    ✋ No Matching Tile
                </button>
                {canDoubt && (
                    <button className="control-button doubt" onClick={onDoubt}>
                        🤔 Doubt
                    </button>
                )}
            </div>
        </div>
    );
};
