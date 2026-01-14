/**
 * State Machine - Manages pet state transitions and idle behavior
 * 
 * Responsibilities:
 * - Manage current/previous state
 * - Handle state transitions
 * - Control quiet mode
 * - Trigger random idle actions
 */

// State constants (inline to avoid module issues in browser)
const STATES = Object.freeze({
    IDLE: 'idle',
    SLEEP: 'sleep',
    DRAG: 'drag',
    WORK: 'working',
    THINKING: 'thinking',
    INTERACT: 'interact',
    DANCE: 'dance'
});

class StateMachine {
    constructor(animationManager) {
        this.anim = animationManager;
        this.state = null; // Start with null to allow initial transition to IDLE
        this.previousState = null;
        this.idleTimer = null;
        this.quietMode = true; // Default quiet mode ON
        this.wakeTimer = null; // Timer for wake-up after click in quiet mode
    }

    transition(newState) {
        if (this.state === newState) return;

        this.previousState = this.state;
        this.state = newState;

        // Play animation
        this.anim.play(newState);

        // Manage Random Idle Actions
        this.manageIdleTimer();

        console.log(`[State] ${this.previousState} -> ${this.state}`);
    }

    /**
     * Force refresh current animation (used after skin change)
     */
    forceRefresh() {
        if (this.state) {
            this.anim.play(this.state);
            console.log(`[State] Force refreshed: ${this.state}`);
        }
    }

    /**
     * Revert to previous state (useful after drag/interact)
     */
    revert() {
        if (this.previousState) {
            this.transition(this.previousState);
        } else {
            this.transition(STATES.IDLE);
        }
    }

    /**
     * Set quiet mode
     */
    setQuietMode(enabled) {
        this.quietMode = enabled;
        console.log(`[State] Quiet mode: ${enabled ? 'ON' : 'OFF'}`);

        // If turning quiet mode ON, transition to sleep
        if (enabled && this.state === STATES.IDLE) {
            this.transition(STATES.SLEEP);
        }
        // If turning quiet mode OFF and sleeping, wake up
        if (!enabled && this.state === STATES.SLEEP) {
            this.transition(STATES.IDLE);
        }
    }

    /**
     * Randomly trigger interactions when IDLE
     */
    manageIdleTimer() {
        // Clear existing timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }

        // In quiet mode, don't schedule random actions
        if (this.quietMode) {
            return;
        }

        // Only schedule random actions if IDLE
        if (this.state === STATES.IDLE) {
            const nextActionDelay = Math.random() * 20000 + 10000; // 10-30s
            this.idleTimer = setTimeout(() => {
                this.triggerRandomAction();
            }, nextActionDelay);
        }
    }

    triggerRandomAction() {
        if (this.state !== STATES.IDLE) return;

        // Pick a random action: Sleep, Dance, or Interact
        const actions = [STATES.SLEEP, STATES.DANCE, STATES.INTERACT];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        // Perform action for a short duration then return to IDLE
        this.transition(randomAction);

        setTimeout(() => {
            if (this.state === randomAction) {
                this.transition(STATES.IDLE);
            }
        }, 4000); // Action duration
    }
}

// Export for browser (window) and potential future module bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateMachine, STATES };
}
if (typeof window !== 'undefined') {
    window.StateMachine = StateMachine;
    window.STATES = STATES;
}
