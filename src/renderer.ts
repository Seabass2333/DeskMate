/**
 * DeskMate Renderer Process - TypeScript Entry Point
 * 
 * This is the modern TypeScript entry point that will be bundled by Vite.
 * It imports and initializes the new modular architecture.
 * 
 * @module renderer
 */

// Import new modular components
import { BehaviorEngine } from './core/BehaviorEngine';
import { TriggerScheduler } from './core/TriggerScheduler';
import { SoundManager } from './audio/SoundManager';
import { EnergyManager } from './core/EnergyManager';
import { DragController } from './features/DragController';

// Re-export for window global access (legacy compatibility)
declare global {
    interface Window {
        BehaviorEngine: typeof BehaviorEngine;
        TriggerScheduler: typeof TriggerScheduler;
        SoundManager: typeof SoundManager;
        EnergyManager: typeof EnergyManager;
        DragController: typeof DragController;
        deskmate: {
            getSettings: () => Promise<any>;
            getQuietMode: () => Promise<boolean>;
            onQuietModeChanged: (callback: (enabled: boolean) => void) => void;
            trackEvent: (name: string, data?: any) => void;
            getCurrentSkin: () => Promise<any>;
            getPetState: () => Promise<any>;
            savePetState: (state: any) => Promise<any>;
            t: (key: string) => Promise<string>;
            [key: string]: any;
        };
    }
}

// Expose to window for legacy JS modules
window.BehaviorEngine = BehaviorEngine;
window.TriggerScheduler = TriggerScheduler;
window.SoundManager = SoundManager;
window.EnergyManager = EnergyManager;
window.DragController = DragController;

// ============================================
// Global Error Handling (migrated from renderer.js)
// ============================================

window.onerror = function (message, source, lineno, colno, error) {
    console.error('[Renderer Error]', message, '\n  Source:', source, '\n  Line:', lineno);
    if (window.deskmate?.trackEvent) {
        window.deskmate.trackEvent('js_error', { message, source, lineno });
    }
    return false;
};

window.onunhandledrejection = function (event) {
    console.error('[Unhandled Promise Rejection]', event.reason);
    if (window.deskmate?.trackEvent) {
        window.deskmate.trackEvent('promise_rejection', {
            message: event.reason?.message || String(event.reason)
        });
    }
};

// ============================================
// Modern Init Function
// ============================================

/**
 * Initialize the modern behavior system
 * This runs alongside the legacy code during migration
 */
async function initModernSystem(): Promise<void> {
    if ((window as any).__modernSystemInitialized) {
        console.warn('[Renderer.ts] System already initialized, skipping');
        return;
    }
    (window as any).__modernSystemInitialized = true;

    console.log('[Renderer.ts] Initializing modern behavior system...');

    // Get current skin config
    const skinConfig = await window.deskmate.getCurrentSkin?.();

    // Initialize SoundManager if skin has sounds
    const soundManager = new SoundManager();
    if (skinConfig?.sounds) {
        await soundManager.loadSounds(skinConfig.sounds, skinConfig.basePath || '');
        console.log('[Renderer.ts] SoundManager initialized');
    }

    // Initialize BehaviorEngine with skin behaviors
    const behaviorEngine = new BehaviorEngine(skinConfig?.behaviors);
    console.log('[Renderer.ts] BehaviorEngine initialized with states:', behaviorEngine.getValidStates());

    // Initialize TriggerScheduler if triggers defined or for system triggers
    let scheduler: TriggerScheduler | null = null;

    if (skinConfig?.behaviors?.triggers) {
        scheduler = new TriggerScheduler(behaviorEngine, skinConfig.behaviors.triggers);
        console.log('[Renderer.ts] TriggerScheduler started with skin triggers');
    } else {
        // Start scheduler even without skin triggers to support system triggers (Phase 17)
        scheduler = new TriggerScheduler(behaviorEngine, []);
        console.log('[Renderer.ts] TriggerScheduler started (system triggers only)');
    }

    if (scheduler) {
        scheduler.start();
    }

    // Initialize EnergyManager (Phase 17)
    const energyManager = new EnergyManager();
    await energyManager.init();

    // Sync Initial Quiet Mode
    try {
        const isQuiet = await window.deskmate.getQuietMode();
        behaviorEngine.setQuietMode(isQuiet);
        console.log(`[Renderer.ts] Initial Quiet Mode: ${isQuiet}`);
    } catch (e) {
        console.warn('[Renderer.ts] Failed to get initial quiet mode', e);
    }

    // Connect EnergyManager to TriggerScheduler
    if (scheduler) {
        // Set initial energy context
        scheduler.setContext({ energy: energyManager.getEnergy() });

        // Update context on change
        energyManager.on('energyChange', (energy: number) => {
            scheduler!.setContext({ energy });
            // console.log('[Renderer.ts] Energy context updated:', energy);
        });
    }



    // Sound Debounce (Key: soundId, Value: timestamp)
    const lastSoundTime = new Map<string, number>();

    // Listen for stateChange events to play sounds
    behaviorEngine.on('stateChange', (event) => {
        if (event.type === 'stateChange') {
            const data = event.data as { from: string; to: string };
            console.log(`[Renderer.ts] State: ${data.from} -> ${data.to}`);

            // Play state-specific sound if available
            const stateSound = skinConfig?.sounds?.[data.to];

            // Always stop previous loop when changing states
            if (soundManager.isLooping(data.from) || soundManager.isLooping(data.to) || true) {
                // Optimization: Stop loop unless state loop persists (not implemented yet)
            }

            // Check if new state has a configured sound
            if (stateSound) {
                const config = soundManager.getConfig(data.to);
                if (config?.loop) {
                    soundManager.loop(data.to);
                } else {
                    // Prevent duplicate one-shot sounds (Debounce 100ms)
                    const now = Date.now();
                    const lastTime = lastSoundTime.get(data.to) || 0;
                    if (now - lastTime < 300) {
                        console.warn(`[Renderer.ts] Debounced duplicate sound: ${data.to}`);
                        return;
                    }
                    lastSoundTime.set(data.to, now);

                    // New state has non-loop sound (one-shot entry sound)
                    soundManager.stopLoop();
                    soundManager.play(data.to);
                }
            } else {
                // New state has NO sound -> Silence
                soundManager.stopLoop();
            }
        }
    });

    // Initialize DragController (Phase 17)
    // Pass stateMachine placeholder or null if it handles its own transitions via window.BehaviorEngine
    // Note: Legacy passed stateMachine instance. New DragController can try to access window.BehaviorEngine fallback.
    // However, clean architecture suggests we should pass an adapter.
    // For now, let's instantiate it. It relies on DOM elements being present.
    const dragController = new DragController(behaviorEngine);

    // Expose instances for debugging
    (window as any).__modernSystem = {
        soundManager,
        behaviorEngine,
        energyManager,
        scheduler,
        dragController,
    };

    console.log('[Renderer.ts] Modern system ready (legacy system still active)');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModernSystem);
} else {
    initModernSystem();
}

console.log('[Renderer.ts] TypeScript entry point loaded');
