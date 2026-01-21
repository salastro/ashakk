import { Tile, tileContains } from '../models/Tile';
import { Player } from '../models/Player';
import { GameState } from '../models/GameState';
import {
    generateDominoSet,
    shuffle,
    findStarterIndex,
    validateSubmission,
    removeTilesFromHand,
    addTilesToHand,
    playerHasTile,
} from './utils';

export class GameRoom {
    private gameState: GameState;
    private playerMap: Map<string, Player>;

    constructor(roomId: string, players: Player[], gameMasterId: string) {
        this.playerMap = new Map(players.map(p => [p.id, p]));
        this.gameState = {
            roomId,
            players: [...players],
            gameMasterId,
            currentPlayerIndex: 0,
            currentNumber: 0,
            needsNumberChoice: false,
            board: [],
            phase: 'PLAY',
            consecutiveNoPasses: 0,
        };
    }

    /**
     * Check if a player can start the game (only gamemaster can)
     */
    public canStartGame(playerId: string): boolean {
        return this.gameState.gameMasterId === playerId;
    }

    /**
     * Initialize the game - deal tiles and set starter
     */
    public initializeGame(): void {
        const tiles = shuffle(generateDominoSet());
        const numPlayers = this.gameState.players.length;
        const tilesPerPlayer = Math.floor(tiles.length / numPlayers);

        // Deal tiles to players
        for (let i = 0; i < numPlayers; i++) {
            const startIdx = i * tilesPerPlayer;
            const endIdx = startIdx + tilesPerPlayer;
            this.gameState.players[i].hand = tiles.slice(startIdx, endIdx);
        }

        // Find starter (player with 6|6)
        const starterIndex = findStarterIndex(this.gameState.players.map(p => p.hand));
        this.gameState.currentPlayerIndex = starterIndex;
        this.gameState.phase = 'STARTER'; // Starter phase - player must play 6|6 and choose number
        this.gameState.currentNumber = -1; // Not chosen yet
    }

    /**
     * Get game state for public broadcast (hide hidden information)
     */
    public getPublicGameState() {
        return {
            roomId: this.gameState.roomId,
            players: this.gameState.players.map(p => ({
                id: p.id,
                name: p.name,
                handSize: p.hand.length,
                hasPassed: p.hasPassed,
            })),
            gameMasterId: this.gameState.gameMasterId,
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            currentNumber: this.gameState.currentNumber,
            needsNumberChoice: this.gameState.needsNumberChoice,
            boardSize: this.gameState.board.length,
            starterTile: this.gameState.starterTile, // Show 6|6 face-up
            phase: this.gameState.phase,
            lastSubmissionSize: this.gameState.lastSubmission?.tiles.length,
            lastSubmissionPlayerId: this.gameState.lastSubmission?.playerId,
            consecutiveNoPasses: this.gameState.consecutiveNoPasses,
            winner: this.gameState.winner,
        };
    }

    /**
     * Get full game state for a specific player (includes their private hand)
     */
    public getPlayerGameState(playerId: string) {
        // Find player in gameState.players (not playerMap, which may be stale)
        const player = this.gameState.players.find(p => p.id === playerId);
        return {
            ...this.getPublicGameState(),
            myHand: player?.hand || [],
            isMyTurn: this.gameState.players[this.gameState.currentPlayerIndex]?.id === playerId,
        };
    }

    /**
     * Player plays the 6|6 starter tile and chooses a number
     * After this, the same player gets to play tiles for that number
     */
    public submitStarter(playerId: string, numberChoice: number): { success: boolean; error?: string } {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        if (currentPlayer.id !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.gameState.phase !== 'STARTER') {
            return { success: false, error: 'Not in starter phase' };
        }

        if (numberChoice < 0 || numberChoice > 6) {
            return { success: false, error: 'Invalid number choice' };
        }

        // Verify player has 6|6
        const hasSixSix = currentPlayer.hand.some(t => (t.a === 6 && t.b === 6));
        if (!hasSixSix) {
            return { success: false, error: 'Player does not have 6|6' };
        }

        // Remove 6|6 from hand and set as starter tile (shown face-up)
        currentPlayer.hand = removeTilesFromHand(currentPlayer.hand, [{ a: 6, b: 6 }]);
        this.gameState.starterTile = { a: 6, b: 6 };
        this.gameState.currentNumber = numberChoice;

        // Now the same player can play their tiles - move to PLAY phase
        this.gameState.phase = 'PLAY';
        this.gameState.consecutiveNoPasses = 0;

        // Check for win (if they only had 6|6)
        if (currentPlayer.hand.length === 0) {
            this.gameState.phase = 'ENDED';
            this.gameState.winner = playerId;
        }

        return { success: true };
    }

    /**
     * Player submits tiles (bluffing IS allowed - validation happens on doubt)
     */
    public submitTiles(playerId: string, tiles: Tile[]): { success: boolean; error?: string } {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        if (currentPlayer.id !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.gameState.phase !== 'PLAY') {
            return { success: false, error: 'Not in play phase' };
        }

        if (tiles.length === 0) {
            return { success: false, error: 'Must submit at least one tile' };
        }

        // Verify player actually has these tiles (but don't validate if they match - that's bluffing!)
        for (const tile of tiles) {
            const hasThis = currentPlayer.hand.some(t =>
                (t.a === tile.a && t.b === tile.b) || (t.a === tile.b && t.b === tile.a)
            );
            if (!hasThis) {
                return { success: false, error: 'Player does not have one or more submitted tiles' };
            }
        }

        // Remove tiles from hand and add to board
        currentPlayer.hand = removeTilesFromHand(currentPlayer.hand, tiles);
        this.gameState.board.push(...tiles);

        // If there was a previous submission, it's now auto-accepted (check for win)
        if (this.gameState.lastSubmission) {
            const prevSubmitter = this.gameState.players.find(p => p.id === this.gameState.lastSubmission?.playerId);
            if (prevSubmitter && prevSubmitter.hand.length === 0) {
                // Previous submitter has no tiles and wasn't doubted - they win!
                this.gameState.phase = 'ENDED';
                this.gameState.winner = this.gameState.lastSubmission.playerId;
                return { success: true };
            }
        }

        // Set new last submission
        this.gameState.lastSubmission = {
            playerId,
            tiles,
        };

        // Stay in PLAY phase and advance to next player
        // Anyone can doubt this submission until next player plays
        this.advanceToNextPlayer();
        this.gameState.consecutiveNoPasses = 0;

        return { success: true };
    }

    /**
     * Player claims no tile with current number
     */
    public submitNoTile(playerId: string): { success: boolean; error?: string; action?: string } {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        if (currentPlayer.id !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.gameState.phase !== 'PLAY') {
            return { success: false, error: 'Not in play phase' };
        }

        currentPlayer.hasPassed = true;
        this.gameState.consecutiveNoPasses++;

        // Check if all players consecutively claim no tile
        if (this.gameState.consecutiveNoPasses === this.gameState.players.length) {
            // All players passed - next player chooses new number
            const nextPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
            this.gameState.currentPlayerIndex = nextPlayerIndex;
            this.gameState.needsNumberChoice = true;
            this.resetPassStates();
            return { success: true, action: 'CHOOSE_NUMBER' };
        }

        // Move to next player
        this.advanceToNextPlayer();
        return { success: true };
    }

    /**
     * Player accepts the last submission (deprecated - acceptance is now automatic when next player plays)
     */
    public acceptSubmission(playerId: string): { success: boolean; error?: string } {
        // This is now a no-op since acceptance is automatic
        // Kept for backwards compatibility
        return { success: true };
    }

    /**
     * Player doubts the last submission
     * Any player (except the submitter) can doubt at any time while there's a submission to doubt
     */
    public doubtSubmission(playerId: string): { success: boolean; error?: string; penalty?: 'SUBMITTER' | 'DOUBTER' } {
        if (this.gameState.phase !== 'PLAY') {
            return { success: false, error: 'Cannot doubt in this phase' };
        }

        if (!this.gameState.lastSubmission) {
            return { success: false, error: 'No submission to doubt' };
        }

        const { tiles, playerId: submitterId } = this.gameState.lastSubmission;

        // Cannot doubt your own submission
        if (submitterId === playerId) {
            return { success: false, error: 'Cannot doubt your own submission' };
        }

        // Check if submission is valid (all tiles contain current number)
        const isValid = validateSubmission(tiles, this.gameState.currentNumber);

        let penalizedPlayerId: string;
        let nextPlayerId: string;
        if (isValid) {
            // Submitter was honest - doubter gets penalty, submitter plays next
            penalizedPlayerId = playerId; // doubter
            nextPlayerId = submitterId; // submitter plays next
        } else {
            // Submitter bluffed - submitter gets penalty, doubter plays next
            penalizedPlayerId = submitterId; // bluffer
            nextPlayerId = playerId; // doubter plays next
        }
        this.gameState.currentPlayerIndex = this.gameState.players.findIndex(p => p.id === nextPlayerId);

        // Check if submitter wins (they played all tiles and were NOT bluffing)
        const submitter = this.gameState.players.find(p => p.id === submitterId);
        if (isValid && submitter && submitter.hand.length === 0) {
            // Submitter was honest and has no tiles - they win!
            this.gameState.phase = 'ENDED';
            this.gameState.winner = submitterId;
            return { success: true, penalty: 'DOUBTER' };
        }

        // Apply penalty: collect all board tiles (including starter tile if present)
        const penalizedPlayer = this.gameState.players.find(p => p.id === penalizedPlayerId);
        if (penalizedPlayer) {
            // Add board tiles to penalized player's hand
            penalizedPlayer.hand = addTilesToHand(penalizedPlayer.hand, this.gameState.board);
            // Also add starter tile (6|6) if it exists - it becomes a normal tile after first penalty
            if (this.gameState.starterTile) {
                penalizedPlayer.hand = addTilesToHand(penalizedPlayer.hand, [this.gameState.starterTile]);
            }
        }

        // Reset board and game state
        this.gameState.board = [];
        this.gameState.starterTile = undefined; // Starter tile is now part of someone's hand
        this.gameState.lastSubmission = undefined;
        this.gameState.phase = 'PLAY';
        this.gameState.needsNumberChoice = true; // Next player must choose a new number
        this.gameState.consecutiveNoPasses = 0;
        this.resetPassStates();

        return { success: true, penalty: isValid ? 'DOUBTER' : 'SUBMITTER' };
    }

    /**
     * Set the next number to play (called after all players pass or after penalty)
     */
    public chooseNumber(playerId: string, numberChoice: number): { success: boolean; error?: string } {
        if (this.gameState.phase !== 'PLAY') {
            return { success: false, error: 'Cannot choose number in this phase' };
        }

        if (!this.gameState.needsNumberChoice) {
            return { success: false, error: 'Number choice not needed' };
        }

        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (currentPlayer.id !== playerId) {
            return { success: false, error: 'Not your turn to choose number' };
        }

        if (numberChoice < 0 || numberChoice > 6) {
            return { success: false, error: 'Invalid number choice' };
        }

        this.gameState.currentNumber = numberChoice;
        this.gameState.needsNumberChoice = false; // Number has been chosen
        this.gameState.consecutiveNoPasses = 0;

        return { success: true };
    }

    /**
     * Get the next player in turn order
     */
    private getNextPlayer(): Player {
        const nextIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        return this.gameState.players[nextIndex];
    }

    /**
     * Advance to the next player
     */
    private advanceToNextPlayer(): void {
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    }

    /**
     * Reset all player pass states
     */
    private resetPassStates(): void {
        this.gameState.players.forEach(p => {
            p.hasPassed = false;
        });
    }

    public getState(): GameState {
        return this.gameState;
    }
}
