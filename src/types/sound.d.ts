/**
 * Sound Configuration Types
 * Defines the structure for skin-specific sound effects
 */

/**
 * Simple sound reference - just a filename
 */
export type SimpleSoundRef = string;

/**
 * Complex sound configuration with options
 */
export interface SoundConfig {
    /** Path to the audio file (relative to skin folder) */
    src: string;
    /** Whether the sound should loop */
    loop?: boolean;
    /** Volume level (0.0 to 1.0) */
    volume?: number;
    /** Playback rate (0.5 to 2.0, default 1.0) */
    playbackRate?: number;
}

/**
 * Sound reference can be either simple string or full config
 */
export type SoundRef = SimpleSoundRef | SoundConfig;

/**
 * Sound mapping for a skin
 * Maps event names to sound references
 */
export interface SkinSounds {
    /** Sound when pet is clicked */
    click?: SoundRef;
    /** Sound when pet is dragged */
    drag?: SoundRef;
    /** Ambient/idle loop sound */
    idle_loop?: SoundRef;
    /** Sound when pet goes to sleep */
    sleep?: SoundRef;
    /** Sound when pet wakes up */
    wake?: SoundRef;
    /** Sound when pet is happy/interacting */
    happy?: SoundRef;
    /** Custom sounds (extensible) */
    [key: string]: SoundRef | undefined;
}

/**
 * Normalized sound config (always full form, used internally)
 */
export interface NormalizedSoundConfig {
    src: string;
    loop: boolean;
    volume: number;
    playbackRate: number;
}
