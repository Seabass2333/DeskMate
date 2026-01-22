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

    /** Currently looping sound ID */
    private currentLoopId: string | null = null;

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
     * Play a sound by ID (one-shot)
     * 
     * @param soundId - Sound identifier
     * @returns true if played successfully, false otherwise
     */
    async play(soundId: string): Promise<boolean> {
        const entry = this.sounds.get(soundId);
        if (!entry) {
            console.warn(`[SoundManager] Sound not found: ${soundId}`);
            return false;
        }

        try {
            // Reset to start for re-play
            entry.audio.currentTime = 0;
            await entry.audio.play();
            return true;
        } catch (error) {
            console.error(`[SoundManager] Play failed for ${soundId}:`, error);
            return false;
        }
    }

    /**
     * Start a looping sound
     * Stops any currently looping sound first
     * 
     * @param soundId - Sound identifier
     * @returns true if started successfully
     */
    async loop(soundId: string): Promise<boolean> {
        // Stop current loop if any
        this.stopLoop();

        const entry = this.sounds.get(soundId);
        if (!entry) {
            console.warn(`[SoundManager] Sound not found: ${soundId}`);
            return false;
        }

        try {
            entry.audio.loop = true;
            entry.audio.currentTime = 0;
            await entry.audio.play();
            this.currentLoopId = soundId;
            return true;
        } catch (error) {
            console.error(`[SoundManager] Loop failed for ${soundId}:`, error);
            return false;
        }
    }

    /**
     * Stop the currently looping sound
     */
    stopLoop(): void {
        if (this.currentLoopId) {
            const entry = this.sounds.get(this.currentLoopId);
            if (entry) {
                entry.audio.pause();
                entry.audio.currentTime = 0;
                entry.audio.loop = false;
            }
            this.currentLoopId = null;
        }
    }

    /**
     * Check if a sound is currently looping
     * 
     * @param soundId - Sound identifier
     */
    isLooping(soundId: string): boolean {
        return this.currentLoopId === soundId;
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
    }

    // ========== Private Methods ==========

    /**
     * Normalize a sound reference to full config
     */
    private normalizeConfig(ref: SoundRef, basePath: string): NormalizedSoundConfig {
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
            loop: ref.loop ?? false,
            volume: ref.volume ?? 1,
            playbackRate: ref.playbackRate ?? 1
        };
    }

    /**
     * Create and configure an Audio element
     */
    private createAudioElement(config: NormalizedSoundConfig): HTMLAudioElement {
        const audio = new Audio(config.src);
        audio.volume = config.volume;
        audio.playbackRate = config.playbackRate;
        audio.loop = config.loop;
        return audio;
    }
}
