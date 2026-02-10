// services/feedback.service.ts

class FeedbackService {
    private audioContext: AudioContext | null = null;

    constructor() {
        // Initialize audio context with user interaction (required in modern browsers)
        if (typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
            }
        }
    }

    // 📳 Haptic Vibration
    vibrate(pattern: number | number[] = 200) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // 🔊 Confirmation Sound (Beep)
    beep(type: 'success' | 'error' | 'alert' = 'success') {
        if (!this.audioContext) return;

        // Resume context if it was suspended (common policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        if (type === 'success') {
            // High pitch short beep (cash register style)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, now); // A5
            oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
        } else if (type === 'error') {
            // Low pitch long beep (Windows error style)
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        }
    }

    // Helper for full feedback
    triggerSuccess() {
        this.vibrate([100, 50, 100, 50, 100]); // 🚀 DÍA D: Sequence for SUCCESS
        this.beep('success');
    }

    triggerError() {
        this.vibrate(400); // ❌ DÍA D: Long vibration for ERROR/DUPLICATE
        this.beep('error');
    }
}

export const feedbackService = new FeedbackService();
