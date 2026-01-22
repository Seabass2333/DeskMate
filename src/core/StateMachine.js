/**
 * State Machine - Adapter for BehaviorEngine
 * 
 * This is a compatibility layer that maintains the original StateMachine API
 * while internally delegating to the new BehaviorEngine.
 * 
 * Migration: Phase 16 - StateMachine → BehaviorEngine
 */

// State constants (kept for backward compatibility)
const STATES = Object.freeze({
    IDLE: 'idle',
    SLEEP: 'sleep',
    DRAG: 'drag',
    WORK: 'working',
    THINKING: 'thinking',
    INTERACT: 'interact',
    DANCE: 'dance'
});

/**
 * StateMachine - Adapter wrapping BehaviorEngine
 * 
 * Maintains full backward compatibility with existing code while
 * using the new TypeScript BehaviorEngine internally.
 */
class StateMachine {
    constructor(animationManager) {
        this.anim = animationManager;
        this.state = null;
        this.previousState = null;
        this.idleTimer = null;
        this.quietMode = true;
        this.wakeTimer = null;

        // Try to use BehaviorEngine if available (loaded via Vite bundle)
        this.engine = null;
        this._initEngine();
    }

    /**
     * Initialize BehaviorEngine integration
     */
    _initEngine() {
        // BehaviorEngine is exposed by src/dist/renderer.js
        if (typeof window.BehaviorEngine !== 'undefined') {
            try {
                // Get skin config for behavior configuration
                const skinConfig = this.anim?.skinManager?.currentSkin;
                const behaviorConfig = skinConfig?.behaviors || undefined;

                this.engine = new window.BehaviorEngine(behaviorConfig);

                // Subscribe to engine events
                this.engine.on('stateChange', (event) => {
                    const { from, to } = event.data;
                    // Sync internal state
                    this.previousState = from;
                    this.state = to;
                    // Play animation
                    this.anim.play(to);
                    console.log(`[State] ${from} -> ${to}`);
                });

                console.log('[StateMachine] Using BehaviorEngine adapter');
            } catch (error) {
                console.warn('[StateMachine] BehaviorEngine init failed, using legacy:', error);
                this.engine = null;
            }
        } else {
            console.log('[StateMachine] BehaviorEngine not available, using legacy mode');
        }
    }

    /**
     * Transition to a new state
     */
    transition(newState) {
        if (this.engine) {
            // Delegate to BehaviorEngine
            return this.engine.transition(newState);
        }

        // Legacy fallback
        if (this.state === newState) return;

        this.previousState = this.state;
        this.state = newState;

        this.anim.play(newState);
        this.manageIdleTimer();

        console.log(`[State] ${this.previousState} -> ${this.state}`);
    }

    /**
     * Force refresh current animation
     */
    forceRefresh() {
        const currentState = this.engine
            ? this.engine.getCurrentState()
            : this.state;

        if (currentState) {
            this.anim.play(currentState);
            console.log(`[State] Force refreshed: ${currentState}`);
        }
    }

    /**
     * Revert to previous state
     */
    revert() {
        if (this.engine) {
            this.engine.revert();
            return;
        }

        // Legacy fallback
        if (this.previousState) {
            this.transition(this.previousState);
        } else {
            this.transition(STATES.IDLE);
        }
    }

    /**
     * Enable or disable quiet mode
     */
    setQuietMode(enabled) {
        this.quietMode = enabled;
        console.log(`[State] Quiet mode: ${enabled ? 'ON' : 'OFF'}`);

        if (this.engine) {
            this.engine.setQuietMode(enabled);
            return;
        }

        // Legacy fallback
        if (enabled && this.state === STATES.IDLE) {
            this.transition(STATES.SLEEP);
        }
        if (!enabled && this.state === STATES.SLEEP) {
            this.transition(STATES.IDLE);
        }
    }

    /**
     * Manage idle timer (for legacy mode or when engine not available)
     */
    manageIdleTimer() {
        // If engine is active, it handles idle timing
        if (this.engine) return;

        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }

        if (this.quietMode) return;

        if (this.state === STATES.IDLE) {
            const nextActionDelay = Math.random() * 20000 + 10000;
            this.idleTimer = setTimeout(() => {
                this.triggerRandomAction();
            }, nextActionDelay);
        }
    }

    /**
     * Trigger random action (legacy mode only)
     */
    triggerRandomAction() {
        // If engine is active, it handles random actions
        if (this.engine) return;

        if (this.state !== STATES.IDLE) return;

        const actions = [STATES.SLEEP, STATES.DANCE, STATES.INTERACT];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        this.transition(randomAction);

        setTimeout(() => {
            if (this.state === randomAction) {
                this.transition(STATES.IDLE);
            }
        }, 4000);
    }

    /**
     * Get current state (for external queries)
     */
    getCurrentState() {
        return this.engine
            ? this.engine.getCurrentState()
            : this.state;
    }

    /**
     * Get previous state
     */
    getPreviousState() {
        return this.engine
            ? this.engine.getPreviousState()
            : this.previousState;
    }
}

// Expose to window for legacy compatibility
window.STATES = STATES;
window.StateMachine = StateMachine;
