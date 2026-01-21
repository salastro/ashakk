import { useState } from 'react';
import { socket } from '../socket';
import { SocketResponse } from '../types';
import './Lobby.css';

interface LobbyProps {
    onJoinRoom: (roomId: string, playerName: string) => void;
}

export function Lobby({ onJoinRoom }: LobbyProps) {
    const [playerName, setPlayerName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        const newRoomId = `room-${Math.random().toString(36).substr(2, 6)}`;
        setIsCreating(true);
        setError(null);

        socket.emit('room:create', { roomId: newRoomId, playerName }, (response: SocketResponse & { roomId?: string }) => {
            setIsCreating(false);
            if (response.success && response.roomId) {
                onJoinRoom(response.roomId, playerName);
            } else {
                setError(response.error || 'Failed to create room');
            }
        });
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        setIsCreating(true);
        setError(null);

        socket.emit('room:join', { roomId, playerName }, (response: SocketResponse & { roomId?: string }) => {
            setIsCreating(false);
            if (response.success) {
                onJoinRoom(roomId, playerName);
            } else {
                setError(response.error || 'Failed to join room');
            }
        });
    };

    return (
        <div className="lobby">
            <div className="lobby-card">
                <div className="lobby-header">
                    <img src="/ashakk.png" alt="Ashakk" className="lobby-logo" />
                    <h1 className="lobby-title">Ashakk</h1>
                </div>
                <p className="lobby-subtitle">Bluff Domino</p>

                <div className="lobby-form">
                    <input
                        type="text"
                        placeholder="Your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="lobby-input"
                        maxLength={20}
                    />

                    <div className="lobby-divider">
                    </div>

                    <div className="lobby-actions">
                        <button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="lobby-button lobby-button-primary"
                        >
                            {isCreating ? 'Creating...' : 'Create New Room'}
                        </button>

                        <center>
                            <span>or</span>
                        </center>

                        <input
                            type="text"
                            placeholder="Room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="lobby-input"
                        />

                        <button
                            onClick={handleJoinRoom}
                            disabled={isCreating}
                            className="lobby-button lobby-button-secondary"
                        >
                            {isCreating ? 'Joining...' : 'Join Room'}
                        </button>
                    </div>

                    {error && <p className="lobby-error">{error}</p>}
                </div>

                <div className="lobby-rules">
                    <h3>📜 Quick Rules</h3>
                    <ul>
                        <li>Play tiles face-down, claim they match the current number</li>
                        <li>Bluff to get rid of tiles faster</li>
                        <li>Doubt opponents to catch their bluffs</li>
                        <li>If caught bluffing, collect all board tiles!</li>
                        <li>First to empty their hand wins</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
