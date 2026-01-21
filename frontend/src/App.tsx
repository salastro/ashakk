import { useState, useEffect } from 'react';
import { socket, connectSocket } from './socket';
import { Lobby } from './screens/Lobby';
import { GameTable } from './screens/GameTable';
import './App.css';

type Screen = 'lobby' | 'game';

function App() {
    const [screen, setScreen] = useState<Screen>('lobby');
    const [roomId, setRoomId] = useState<string>('');
    const [playerName, setPlayerName] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        connectSocket();

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from server');
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    const handleJoinRoom = (room: string, name: string) => {
        setRoomId(room);
        setPlayerName(name);
        setScreen('game');
    };

    if (!isConnected) {
        return (
            <div className="app">
                <div className="connecting">
                    <div className="spinner"></div>
                    <p>Connecting to server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {screen === 'lobby' && <Lobby onJoinRoom={handleJoinRoom} />}
            {screen === 'game' && <GameTable roomId={roomId} playerName={playerName} />}
        </div>
    );
}

export default App;
