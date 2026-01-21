# 🎲 Ashakk - Bluff Domino

A real-time multiplayer web application for the "Doubting Domino" (Bluff Domino) game with strict server-side rule enforcement and anti-cheat guarantees.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Development

```bash
# Run both backend and frontend in development mode
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend (runs on port 3001)
npm run dev:backend

# Terminal 2 - Frontend (runs on port 3000)
npm run dev:frontend
```

Open http://localhost:3000 in your browser.

## 🎮 Game Rules

### Overview
- Use a standard **28-tile domino set** (0|0 → 6|6)
- **2–4 players**
- Tiles are shuffled and distributed equally
- One shared **board pile**, tiles placed **face-down**

### Game Start
- Player holding **6|6** starts
- That player submits **6|6** and chooses the **number to play on** (0–6)

### Turn Rules
- Turns proceed clockwise
- On a turn, a player may:
  - Submit **one or more tiles** (claim they all contain the current number)
  - Tiles are submitted **secretly** (face-down)
  - Player may bluff!

### Matching Rule
If the current number is **N**, every submitted tile must include **N**
- Valid: `5|1`, `5|3` when N=5
- Invalid (bluff): `2|3` when N=5

### Doubt Mechanism
After a submission, the next player may:
- **Accept** the claim → play continues
- **Doubt** the claim → tiles are revealed

If doubted:
- If **any tile is invalid** → submitter collects all board tiles
- If **all tiles are valid** → doubter collects all board tiles

The penalized player then chooses the **next number to play on**.

### No-Tile Claim
A player may claim "I have no tiles with the current number"
- When **all players consecutively** make this claim, the **next player** chooses a **new number**

### Winning Condition
First player to discard **all tiles** wins!

## 🏗 Architecture

### Backend (Node.js + Express + Socket.IO)
```
backend/
├── src/
│   ├── index.ts        # App bootstrap
│   ├── server.ts       # Express setup
│   ├── socket.ts       # Socket.IO handlers
│   ├── rooms.ts        # Room registry
│   └── game/
│       ├── GameRoom.ts # Core authoritative logic
│       └── utils.ts    # Game utilities
│   └── models/
│       ├── Player.ts
│       ├── Tile.ts
│       ├── GameState.ts
│       └── TurnAction.ts
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── socket.ts
│   ├── types.ts
│   ├── screens/
│   │   ├── Lobby.tsx
│   │   └── GameTable.tsx
│   └── components/
│       ├── PlayerHand.tsx
│       ├── Board.tsx
│       └── Controls.tsx
```

## 🔒 Security

- All game logic is **server-authoritative**
- Clients cannot modify hands or reveal tiles
- Turn validation happens server-side
- No client trust - all actions are validated

## 🔌 WebSocket Events

### Client → Server
- `room:create` - Create a new room
- `room:join` - Join existing room
- `game:start` - Start the game
- `turn:submitStarter` - Submit 6|6 and choose number
- `turn:play` - Submit tiles
- `turn:noTile` - Claim no matching tile
- `turn:accept` - Accept previous submission
- `turn:doubt` - Doubt previous submission
- `turn:chooseNumber` - Choose new number

### Server → Client
- `game:stateUpdate` - Private game state (includes your hand)
- `game:update` - Public game state
- `game:started` - Game has started
- `game:doubtResolved` - Doubt result
- `game:ended` - Game over

## 📱 Features

- ✅ Real-time multiplayer (2-4 players)
- ✅ Responsive design (desktop + mobile)
- ✅ Server-side rule enforcement
- ✅ Bluff detection system
- ✅ Turn-based gameplay
- ✅ Visual tile representation
- ✅ Penalty feedback
- ✅ Win detection
