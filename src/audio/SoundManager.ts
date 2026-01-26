/**
 * SoundManager - Manages audio playback for pet sounds
 * 
 * Features:
 * - Load multiple sounds from skin configuration
 * - Play one-shot sounds
 * - Manage looping ambient sounds
 * - Graceful error handling
 * 
 * @module audio/SoundManager
 */

import type {
    SkinSounds,
    SoundRef,
    NormalizedSoundConfig
} from '../types/sound';

/**
 * Internal sound entry with Audio element and config
 */
interface SoundEntry {
    audio: HTMLAudioElement;
    config: NormalizedSoundConfig;
}

/**
 * SoundManager handles all audio playback for a pet skin.
 * Supports both simple sound references and complex configurations.
 * 
 * @example
 * ```typescript
 * const sm = new SoundManager();
 * await sm.loadSounds({ click: 'meow.mp3' }, '/assets/skins/mochi');
 * await sm.play('click');
 * ```
 */
export class SoundManager {
    /** Map of sound ID to entry */
    private sounds: Map<string, SoundEntry> = new Map();

    /** Currently looping sound ID (Ambience Channel) */
    private currentAmbienceId: string | null = null;

    /** Currently playing SFX Audio (SFX Channel) */
    private activeSfx: HTMLAudioElement | null = null;

    /** Global Mute State */
    private muted: boolean = false;

    /**
     * Load sounds from skin configuration
     * Clears any previously loaded sounds
     * 
     * @param soundConfig - Sound configuration from skin config.json
     * @param basePath - Base path to skin folder
     */
    async loadSounds(soundConfig: SkinSounds, basePath: string): Promise<void> {
        // Clean up existing sounds
        this.dispose();

        // Load each sound
        for (const [id, ref] of Object.entries(soundConfig)) {
            if (ref === undefined) continue;

            const normalized = this.normalizeConfig(ref, basePath);
            const audio = this.createAudioElement(normalized);

            this.sounds.set(id, { audio, config: normalized });
        }



        console.log(`[SoundManager] Loaded ${this.sounds.size} sounds`);
    }

    /**
     * Set global mute state
     * Stops all sounds if muted
     */
    setMuted(muted: boolean): void {
        this.muted = muted;
        console.log(`[SoundManager] Global Mute: ${muted}`);
        if (muted) {
            this.stopLoop();
            // Stop any active SFX if we were tracking them (we currently don't track persistent SFX references well, 
            // but short SFX usually don't need force stop. If needed, we can track them).
        }
    }

    /**
     * Play a sound by ID (one-shot)
     * 
     * @param soundId - Sound identifier
     * @returns true if played successfully, false otherwise
     */
    async play(soundId: string): Promise<boolean> {
        if (this.muted) return false;
        const entry = this.sounds.get(soundId);
        if (!entry) {
            console.warn(`[SoundManager] Sound not found: ${soundId}`);
            return false;
        }

        try {
            // Randomize source if variations exist
            if (entry.config.srcs && entry.config.srcs.length > 1) {
                const newSrc = entry.config.srcs[Math.floor(Math.random() * entry.config.srcs.length)];
                entry.audio.src = newSrc;
            }

            // Reset to start for re-play
            entry.audio.currentTime = 0;
            console.log(`[SoundManager] Attempting to play: ${soundId} (${entry.audio.src})`);
            const promise = entry.audio.play();

            if (promise !== undefined) {
                promise.then(() => {
                    console.log(`[SoundManager] Playing: ${soundId}`);
                }).catch(error => {
                    console.error(`[SoundManager] Play failed for ${soundId}:`, error);
                });
            }
            return true;
        } catch (error) {
            console.error(`[SoundManager] Play failed for ${soundId}:`, error);
            return false;
        }
    }

    /** Ambience Loop Timer */
    private ambienceTimer: number | null = null;

    /**
     * Start a looping sound (Ambience)
     * Stops any currently looping sound first
     * 
     * @param soundId - Sound identifier
     * @returns true if started successfully
     */
    async loop(soundId: string): Promise<boolean> {
        if (this.muted) return false;
        // Stop current loop if any
        this.stopLoop();

        const entry = this.sounds.get(soundId);
        if (!entry) {
            console.warn(`[SoundManager] Sound not found: ${soundId}`);
            return false;
        }

        this.currentAmbienceId = soundId;
        const audio = entry.audio;
        const config = entry.config;

        // Handler for intermittent loops
        const playNext = async () => {
            if (this.currentAmbienceId !== soundId) return; // Stop if changed

            try {
                audio.currentTime = 0;
                await audio.play();
            } catch (err) {
                console.warn('[SoundManager] Ambience play error:', err);
            }
        };

        if (config.loopDelay) {
            // Intermittent Loop
            audio.loop = false; // Native loop OFF

            // Cleanup old listeners if any (though we usually create fresh audio, 
            // but here we reuse entry.audio, so we must be careful with 'ended' listeners)
            // Ideally we'd wrap this cleanly, but for now:
            audio.onended = () => {
                if (this.currentAmbienceId !== soundId) return;

                const delay = Math.random() * (config.loopDelay!.max - config.loopDelay!.min) + config.loopDelay!.min;
                this.ambienceTimer = window.setTimeout(playNext, delay);
            };

            await playNext(); // Start first play
        } else {
            // Standard continuous loop
            try {
                audio.loop = true;
                audio.onended = null; // Clear listener
                audio.currentTime = 0;
                await audio.play();
            } catch (error) {
                console.error(`[SoundManager] Loop failed for ${soundId}:`, error);
                return false;
            }
        }

        return true;
    }

    /**
     * Stop the currently looping sound
     */
    stopLoop(): void {
        // Clear timer
        if (this.ambienceTimer) {
            clearTimeout(this.ambienceTimer);
            this.ambienceTimer = null;
        }

        if (this.currentAmbienceId) {
            const entry = this.sounds.get(this.currentAmbienceId);
            if (entry) {
                entry.audio.pause();
                entry.audio.currentTime = 0;
                entry.audio.loop = false;
                entry.audio.onended = null; // Clear intermittent listener
            }
            this.currentAmbienceId = null;
        }
    }

    /**
     * Check if a sound is currently looping
     * 
     * @param soundId - Sound identifier
     */
    isLooping(soundId: string): boolean {
        return this.currentAmbienceId === soundId;
    }

    /**
     * Get all loaded sound IDs
     */
    getSoundIds(): string[] {
        return Array.from(this.sounds.keys());
    }

    /**
     * Get normalized config for a sound
     * Used for testing and debugging
     * 
     * @param soundId - Sound identifier
     */
    getConfig(soundId: string): NormalizedSoundConfig | null {
        return this.sounds.get(soundId)?.config ?? null;
    }

    /**
     * Clean up all audio resources
     */
    dispose(): void {
        this.stopLoop();

        for (const entry of this.sounds.values()) {
            entry.audio.pause();
            entry.audio.src = '';
        }

        this.sounds.clear();
        this.activeSfx = null;
        this.currentAmbienceId = null;
    }

    // ========== Private Methods ==========

    /**
     * Normalize a sound reference to full config
     */
    private normalizeConfig(ref: SoundRef, basePath: string): NormalizedSoundConfig {
        // String array: Random variations
        if (Array.isArray(ref)) {
            // Pick random one to start, but store all
            // Ideally we'd store the list and pick on play, 
            // but for simple normalization we map to a list-capable config
            // Note: The type system needs update to support 'srcs'.
            // For now, we'll pick one random source for the initial element
            // A better architecture would perform randomization at play time.

            // Actually, let's just pick one random one for now to keep type compatibility simple,
            // or better: treat string[] as multiple valid sources.
            // But wait, Audio element takes one src.
            // To support variations properly, we need to change how we store sounds.
            // Let's modify the Entry to hold a list of sources.
            return {
                src: `${basePath}/${ref[0]}`, // Fallback compliant
                srcs: ref.map(r => `${basePath}/${r}`), // New property
                loop: false,
                volume: 1,
                playbackRate: 1
            };
        }

        if (typeof ref === 'string') {
            return {
                src: `${basePath}/${ref}`,
                loop: false,
                volume: 1,
                playbackRate: 1
            };
        }

        return {
            src: `${basePath}/${ref.src}`,
            srcs: ref.srcs?.map(r => `${basePath}/${r}`), // Handle array in config object too if present
            loop: ref.loop ?? false,
            loopDelay: ref.loopDelay,
            volume: ref.volume ?? 1,
            playbackRate: ref.playbackRate ?? 1
        };
    }

    /**
     * Create and configure an Audio element
     */
    private createAudioElement(config: NormalizedSoundConfig): HTMLAudioElement {
        // If config has multiple sources, pick one random
        let src = config.src;
        if (config.srcs && config.srcs.length > 0) {
            src = config.srcs[Math.floor(Math.random() * config.srcs.length)];
        }

        const audio = new Audio(src);
        audio.volume = config.volume;
        audio.playbackRate = config.playbackRate;
        audio.loop = config.loop;

        // Debug listeners
        audio.addEventListener('error', (e) => {
            console.error(`[SoundManager] Audio Error for ${src}:`, e, audio.error);
        });
        audio.addEventListener('canplay', () => {
            console.log(`[SoundManager] Audio loaded: ${src.split('/').pop()}`);
        });

        return audio;
    }
}
