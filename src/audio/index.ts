/**
 * Audio Module Index
 * Re-exports all audio modules for easy importing and window exposure
 * 
 * @module audio/index
 */

// Export classes for ES module usage
export { SoundManager } from './SoundManager';

// Export types
export type {
    SkinSounds,
    SoundRef,
    SoundConfig,
    NormalizedSoundConfig
} from '../types/sound';

// Browser globals exposure (for non-module script usage)
if (typeof window !== 'undefined') {
    import('./SoundManager').then(({ SoundManager }) => {
        (window as any).SoundManager = SoundManager;
    });
}
