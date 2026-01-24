// Sound effects using Web Audio API - no external files needed!

type SoundType =
    | 'playTile'
    | 'doubt'
    | 'win'
    | 'lose'
    | 'yourTurn'
    | 'gameStart'
    | 'playerJoin'
    | 'penalty'
    | 'pass'
    | 'chooseNumber';

class SoundManager {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.5;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public getVolume(): number {
        return this.volume;
    }

    private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gainValue?: number): void {
        if (!this.enabled) return;

        try {
            const ctx = this.getContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            const vol = (gainValue ?? this.volume) * 0.3;
            gainNode.gain.setValueAtTime(vol, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Sound playback failed:', e);
        }
    }

    private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine'): void {
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, duration, type), i * 50);
        });
    }

    public play(sound: SoundType): void {
        if (!this.enabled) return;

        switch (sound) {
            case 'playTile':
                // Satisfying "click/place" sound
                this.playTone(800, 0.08, 'square', this.volume * 0.3);
                setTimeout(() => this.playTone(600, 0.05, 'square', this.volume * 0.2), 30);
                break;

            case 'doubt':
                // Dramatic "challenge" sound
                this.playTone(300, 0.15, 'sawtooth');
                setTimeout(() => this.playTone(250, 0.15, 'sawtooth'), 100);
                setTimeout(() => this.playTone(200, 0.2, 'sawtooth'), 200);
                break;

            case 'win':
                // Victory fanfare
                this.playChord([523, 659, 784], 0.3, 'sine'); // C major chord
                setTimeout(() => this.playChord([587, 740, 880], 0.3, 'sine'), 200); // D major
                setTimeout(() => this.playChord([659, 831, 988], 0.5, 'sine'), 400); // E major
                break;

            case 'lose':
                // Sad trombone / penalty sound
                this.playTone(400, 0.3, 'sawtooth');
                setTimeout(() => this.playTone(350, 0.3, 'sawtooth'), 250);
                setTimeout(() => this.playTone(300, 0.3, 'sawtooth'), 500);
                setTimeout(() => this.playTone(250, 0.5, 'sawtooth'), 750);
                break;

            case 'yourTurn':
                // Gentle notification
                this.playTone(880, 0.1, 'sine');
                setTimeout(() => this.playTone(1100, 0.15, 'sine'), 100);
                break;

            case 'gameStart':
                // Exciting game start
                this.playTone(440, 0.1, 'square');
                setTimeout(() => this.playTone(550, 0.1, 'square'), 100);
                setTimeout(() => this.playTone(660, 0.1, 'square'), 200);
                setTimeout(() => this.playTone(880, 0.2, 'square'), 300);
                break;

            case 'playerJoin':
                // Pop sound
                this.playTone(600, 0.08, 'sine');
                setTimeout(() => this.playTone(900, 0.1, 'sine'), 50);
                break;

            case 'penalty':
                // Whomp whomp - caught bluffing!
                this.playTone(200, 0.2, 'triangle');
                setTimeout(() => this.playTone(150, 0.3, 'triangle'), 200);
                break;

            case 'pass':
                // Soft pass sound
                this.playTone(400, 0.05, 'sine', this.volume * 0.2);
                break;

            case 'chooseNumber':
                // Selection sound
                this.playTone(700, 0.08, 'sine');
                setTimeout(() => this.playTone(900, 0.1, 'sine'), 80);
                break;
        }
    }
}

export const soundManager = new SoundManager();
export type { SoundType };
