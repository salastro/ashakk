import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import { PlayerHand } from '../components/PlayerHand';
import { Board } from '../components/Board';
import { Controls } from '../components/Controls';
import { PlayerGameState, PublicGameState, Tile, DoubtResolvedEvent, GameEndedEvent } from '../types';
import { soundManager } from '../utils/sounds';
import './GameTable.css';

interface GameTableProps {
    roomId: string;
    playerName: string;
}

export function GameTable({ roomId, playerName }: GameTableProps) {
    const [gameState, setGameState] = useState<PlayerGameState | null>(null);
    const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [winnerAnnouncement, setWinnerAnnouncement] = useState<{ name: string; position: number } | null>(null);
    const prevLeaderboardLength = useRef(0);
    const prevIsMyTurn = useRef(false);

    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Request current room state when component mounts
    useEffect(() => {
        console.log('GameTable mounted, requesting state for room:', roomId);
        socket.emit('room:getState', { roomId }, (response: { success: boolean; error?: string; gameState?: PlayerGameState }) => {
            console.log('room:getState response:', response);
            if (response.success && response.gameState) {
                setGameState(response.gameState);
            } else {
                console.error('Failed to get room state:', response.error);
            }
        });
    }, [roomId]);

    useEffect(() => {
        // Listen for initial room state when created/joined
        socket.on('room:created', (data: { roomId: string; gameState: PlayerGameState }) => {
            console.log('Room created, received state:', data);
            setGameState(data.gameState);
        });

        socket.on('room:joined', (data: { roomId: string; gameState: PlayerGameState }) => {
            console.log('Room joined, received state:', data);
            setGameState(data.gameState);
        });

        socket.on('game:stateUpdate', (state: PlayerGameState) => {
            console.log('Game state update:', state);
            setGameState(state);
            setSelectedTiles([]);
        });

        socket.on('game:update', (state: PublicGameState) => {
            console.log('Game update:', state);
            setGameState(prev => prev ? { ...prev, ...state } : null);
        });

        socket.on('game:started', () => {
            setGameStarted(true);
            showNotification('Game started!');
            soundManager.play('gameStart');
        });

        socket.on('game:doubtResolved', (event: DoubtResolvedEvent) => {
            const penalty = event.penalty === 'SUBMITTER' ? 'Bluffer caught!' : 'Doubter was wrong!';
            showNotification(penalty);
            soundManager.play('penalty');
            // needsNumberChoice is now tracked in server state
        });

        socket.on('game:ended', (event: GameEndedEvent) => {
            showNotification('🏁 Game Over! Check the leaderboard!');
        });

        return () => {
            socket.off('room:created');
            socket.off('room:joined');
            socket.off('game:stateUpdate');
            socket.off('game:update');
            socket.off('game:started');
            socket.off('game:doubtResolved');
            socket.off('game:ended');
        };
    }, [showNotification, gameState?.players]);

    // Show winner announcement when a player finishes (but game isn't over yet)
    useEffect(() => {
        if (gameState && gameState.leaderboard && gameState.leaderboard.length > prevLeaderboardLength.current) {
            const newFinishers = gameState.leaderboard.slice(prevLeaderboardLength.current);
            // Show announcement for each new finisher (usually just one)
            for (const finisherId of newFinishers) {
                const position = gameState.leaderboard.indexOf(finisherId) + 1;
                const finisherName = gameState.players.find(p => p.id === finisherId)?.name || 'Someone';
                // Show modal announcement
                setWinnerAnnouncement({ name: finisherName, position });
                // Play win sound for the finisher, different sound for others
                if (finisherId === socket.id) {
                    soundManager.play('win');
                } else {
                    soundManager.play('playerJoin'); // Acknowledge sound for others
                }
                // Auto-dismiss after 3 seconds
                setTimeout(() => setWinnerAnnouncement(null), 3000);
            }
            prevLeaderboardLength.current = gameState.leaderboard.length;
        }
    }, [gameState?.leaderboard, gameState?.players]);

    // Play "your turn" sound when it becomes the player's turn
    useEffect(() => {
        if (gameState?.isMyTurn && !prevIsMyTurn.current && gameStarted) {
            soundManager.play('yourTurn');
        }
        prevIsMyTurn.current = gameState?.isMyTurn ?? false;
    }, [gameState?.isMyTurn, gameStarted]);

    const toggleSound = () => {
        const newEnabled = !soundEnabled;
        setSoundEnabled(newEnabled);
        soundManager.setEnabled(newEnabled);
    };

    const handleTileSelect = (tile: Tile) => {
        setSelectedTiles(prev => {
            const isSelected = prev.some(
                t => (t.a === tile.a && t.b === tile.b) || (t.a === tile.b && t.b === tile.a)
            );

            if (isSelected) {
                return prev.filter(
                    t => !((t.a === tile.a && t.b === tile.b) || (t.a === tile.b && t.b === tile.a))
                );
            } else {
                return [...prev, tile];
            }
        });
    };

    const handleStartGame = () => {
        socket.emit('game:start', { roomId }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to start game');
            }
        });
    };

    const handlePlay = () => {
        if (selectedTiles.length === 0) return;

        socket.emit('turn:play', { roomId, tiles: selectedTiles }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to play tiles');
            } else {
                soundManager.play('playTile');
            }
            setSelectedTiles([]);
        });
    };

    const handleStarterPlay = (numberChoice: number) => {
        // Starter player plays 6|6 and chooses number
        socket.emit('turn:submitStarter', { roomId, numberChoice }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to submit starter');
            } else {
                soundManager.play('chooseNumber');
            }
        });
    };

    const handleDoubt = () => {
        socket.emit('turn:doubt', { roomId }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to doubt');
            } else {
                soundManager.play('doubt');
            }
        });
    };

    const handleAccept = () => {
        socket.emit('turn:accept', { roomId }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to accept');
            }
        });
    };

    const handleNoTile = () => {
        socket.emit('turn:noTile', { roomId }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to pass');
            } else {
                soundManager.play('pass');
            }
        });
    };

    const handleChooseNumber = (number: number) => {
        // This is called after penalty or when all players pass
        socket.emit('turn:chooseNumber', { roomId, numberChoice: number }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                showNotification(response.error || 'Failed to choose number');
            } else {
                soundManager.play('chooseNumber');
            }
            // needsNumberChoice is now tracked in server state
        });
    };

    const playerNames = new Map(gameState?.players.map(p => [p.id, p.name]) || []);

    // Any active player can doubt except the submitter, while there's a submission to doubt
    const canDoubt = (() => {
        if (!gameState || gameState.phase !== 'PLAY') return false;
        if (!gameState.lastSubmissionPlayerId) return false;
        // Can't doubt your own submission
        if (gameState.lastSubmissionPlayerId === socket.id) return false;
        // Can't doubt if you've already finished
        if (gameState.activePlayers && !gameState.activePlayers.includes(socket.id!)) return false;
        // Can't doubt if you have no tiles (you're waiting for your last play to be accepted)
        const myPlayer = gameState.players.find(p => p.id === socket.id);
        if (myPlayer && myPlayer.handSize === 0) return false;
        return true;
    })();

    if (!gameState) {
        return (
            <div className="game-table">
                <div className="loading">Loading game...</div>
            </div>
        );
    }

    // Waiting room before game starts
    if (!gameStarted && gameState.myHand.length === 0) {
        return (
            <div className="game-table">
                <div className="waiting-room">
                    <h2>🎲 Room: {roomId}</h2>
                    <div className="players-list">
                        <h3>Players ({gameState.players.length}/4)</h3>
                        {gameState.players.map(p => (
                            <div key={p.id} className="player-item">
                                {p.name} {p.id === socket.id && '(You)'}
                            </div>
                        ))}
                    </div>
                    {gameState.players.length >= 2 && gameState.gameMasterId === socket.id && (
                        <button className="start-button" onClick={handleStartGame}>
                            Start Game
                        </button>
                    )}
                    {gameState.players.length >= 2 && gameState.gameMasterId !== socket.id && (
                        <p className="waiting-text">Waiting for room owner to start...</p>
                    )}
                    {gameState.players.length < 2 && (
                        <p className="waiting-text">Waiting for more players...</p>
                    )}
                    <p className="room-code">Share this room ID: <strong>{roomId}</strong></p>
                </div>
            </div>
        );
    }

    return (
        <div className="game-table">
            {notification && (
                <div className="notification">
                    {notification}
                </div>
            )}

            {winnerAnnouncement && gameState?.phase !== 'ENDED' && (
                <div className="winner-announcement-overlay">
                    <div className="winner-announcement">
                        <div className="winner-medal">
                            {winnerAnnouncement.position === 1 ? '🥇' : winnerAnnouncement.position === 2 ? '🥈' : winnerAnnouncement.position === 3 ? '🥉' : `#${winnerAnnouncement.position}`}
                        </div>
                        <h2>{winnerAnnouncement.name}</h2>
                        <p>finished {winnerAnnouncement.position === 1 ? '1st' : winnerAnnouncement.position === 2 ? '2nd' : winnerAnnouncement.position === 3 ? '3rd' : `${winnerAnnouncement.position}th`}!</p>
                        <button className="continue-button" onClick={() => setWinnerAnnouncement(null)}>
                            Continue
                        </button>
                    </div>
                </div>
            )}

            <div className="game-header">
                <h2>Room: {roomId}</h2>
                <button className="sound-toggle" onClick={toggleSound} title={soundEnabled ? 'Mute' : 'Unmute'}>
                    {soundEnabled ? '🔊' : '🔇'}
                </button>
                <div className="turn-indicator">
                    {gameState.phase === 'ENDED'
                        ? 'Game Over'
                        : gameState.isMyTurn
                            ? "Your Turn"
                            : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
                </div>
            </div>

            <div className="players-bar">
                {gameState.players.map((p, idx) => {
                    const finishedPosition = gameState.leaderboard?.indexOf(p.id) ?? -1;
                    const isFinished = finishedPosition !== -1;
                    const isActive = gameState.activePlayers?.includes(p.id) ?? true;
                    return (
                        <div
                            key={p.id}
                            className={`player-badge ${idx === gameState.currentPlayerIndex && isActive ? 'active' : ''} ${p.id === socket.id ? 'you' : ''} ${isFinished ? 'finished' : ''}`}
                        >
                            {isFinished && (
                                <span className="rank-badge">
                                    {finishedPosition === 0 ? '🥇' : finishedPosition === 1 ? '🥈' : finishedPosition === 2 ? '🥉' : `#${finishedPosition + 1}`}
                                </span>
                            )}
                            <span className="player-name">{p.name}</span>
                            <span className="player-tiles">{p.handSize} tiles</span>
                            {idx === gameState.currentPlayerIndex && isActive && <span className="current-turn">Playing</span>}
                            {p.hasPassed && isActive && <span className="passed">Passed</span>}
                        </div>
                    );
                })}
            </div>

            <Board
                boardSize={gameState.boardSize}
                currentNumber={gameState.currentNumber}
                starterTile={gameState.starterTile}
                lastSubmissionSize={gameState.lastSubmissionSize}
                lastSubmissionPlayerId={gameState.lastSubmissionPlayerId}
                playerNames={playerNames}
            />

            <Controls
                phase={gameState.phase}
                isMyTurn={gameState.isMyTurn}
                selectedTiles={selectedTiles}
                currentNumber={gameState.currentNumber}
                canDoubt={canDoubt}
                onPlay={handlePlay}
                onDoubt={handleDoubt}
                onAccept={handleAccept}
                onNoTile={handleNoTile}
                onChooseNumber={handleChooseNumber}
                needsNumberChoice={gameState.needsNumberChoice}
                onStarterPlay={handleStarterPlay}
            />

            <PlayerHand
                tiles={gameState.myHand}
                selectedTiles={selectedTiles}
                onTileSelect={handleTileSelect}
                disabled={!gameState.isMyTurn}
            />

            {gameState.phase === 'ENDED' && (
                <div className="game-over-overlay">
                    <div className="game-over-modal">
                        <h2>🔥 Game Over!</h2>
                        <div className="leaderboard">
                            <h3>Leaderboard</h3>
                            {gameState.leaderboard.map((playerId, index) => {
                                const player = gameState.players.find(p => p.id === playerId);
                                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                                return (
                                    <div key={playerId} className={`leaderboard-entry ${playerId === socket.id ? 'you' : ''}`}>
                                        <span className="position">{medal}</span>
                                        <span className="name">{player?.name || 'Unknown'}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            className="new-game-button"
                            onClick={() => window.location.reload()}
                        >
                            New Game
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
