/**
 * State Machine - Manages pet state transitions and idle behavior
 */

// State constants
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
        this.state = null;
        this.previousState = null;
        this.idleTimer = null;
        this.quietMode = true;
        this.wakeTimer = null;
    }

    transition(newState) {
        if (this.state === newState) return;

        this.previousState = this.state;
        this.state = newState;

        this.anim.play(newState);
        this.manageIdleTimer();

        console.log(`[State] ${this.previousState} -> ${this.state}`);
    }

    forceRefresh() {
        if (this.state) {
            this.anim.play(this.state);
            console.log(`[State] Force refreshed: ${this.state}`);
        }
    }

    revert() {
        if (this.previousState) {
            this.transition(this.previousState);
        } else {
            this.transition(STATES.IDLE);
        }
    }

    setQuietMode(enabled) {
        this.quietMode = enabled;
        console.log(`[State] Quiet mode: ${enabled ? 'ON' : 'OFF'}`);

        if (enabled && this.state === STATES.IDLE) {
            this.transition(STATES.SLEEP);
        }
        if (!enabled && this.state === STATES.SLEEP) {
            this.transition(STATES.IDLE);
        }
    }

    manageIdleTimer() {
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

    triggerRandomAction() {
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
}

// Expose to window
window.STATES = STATES;
window.StateMachine = StateMachine;
