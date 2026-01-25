/**
 * BehaviorEngine - Configuration-driven pet behavior management
 * 
 * Features:
 * - Dynamic state management from skin config
 * - Weighted random idle actions
 * - Event-based architecture
 * - Quiet mode support
 * - Auto-revert timers
 * 
 * @module core/BehaviorEngine
 */

import type {
    BehaviorConfig,
    BehaviorEvent,
    BehaviorEventType,
    BehaviorEventListener,
    IdleAction,
    StateTransition,
    DEFAULT_BEHAVIOR_CONFIG
} from '../types/behavior';

// Re-define default here to avoid circular dependency issues with .d.ts
const DEFAULT_CONFIG: BehaviorConfig = {
    states: ['idle', 'sleep', 'drag', 'working', 'thinking', 'interact', 'dance'],
    idleActions: [
        { state: 'sleep', weight: 30, duration: 4000 },
        { state: 'dance', weight: 20, duration: 4000 },
        { state: 'interact', weight: 20, duration: 4000 }
    ],
    idleTimeout: {
        min: 10000,
        max: 30000
    },
    interactions: {
        click: { state: null },
        drag: { state: 'drag' }
    }
};

/**
 * BehaviorEngine manages pet state and behavior based on skin configuration.
 * Replaces the hardcoded StateMachine with a data-driven approach.
 * 
 * @example
 * ```typescript
 * const engine = new BehaviorEngine(skinConfig.behaviors);
 * engine.on('stateChange', (e) => animation.play(e.data.to));
 * engine.transition('sleep');
 * ```
 */
export class BehaviorEngine {
    private config: BehaviorConfig;
    private currentState: string = 'idle';
    private previousState: string | null = null;
    private quietMode: boolean = false;

    // Timers
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private revertTimer: ReturnType<typeof setTimeout> | null = null;

    // Event listeners
    private listeners: Map<BehaviorEventType, Set<BehaviorEventListener>> = new Map();

    /**
     * Create a BehaviorEngine with optional behavior configuration
     * 
     * @param config - Behavior configuration from skin, uses defaults if not provided
     */
    constructor(config?: BehaviorConfig) {
        this.config = config ?? DEFAULT_CONFIG;

        // Ensure 'idle' is always in states
        if (!this.config.states.includes('idle')) {
            this.config.states.unshift('idle');
        }

        // Initialize listener maps
        this.listeners.set('stateChange', new Set());
        this.listeners.set('soundPlay', new Set());
        this.listeners.set('actionTriggered', new Set());
    }

    // ========== State Management ==========

    /**
     * Get current state
     */
    getCurrentState(): string {
        return this.currentState;
    }

    /**
     * Get previous state
     */
    getPreviousState(): string | null {
        return this.previousState;
    }

    /**
     * Get all valid states for this behavior config
     */
    getValidStates(): string[] {
        return [...this.config.states];
    }

    /**
     * Transition to a new state
     * 
     * @param newState - State to transition to
     * @returns true if transition successful, false otherwise
     */
    transition(newState: string): boolean {
        // Validate state
        if (!this.config.states.includes(newState)) {
            console.warn(`[BehaviorEngine] Invalid state: ${newState}`);
            return false;
        }

        // Strict Quiet Mode: Block all transitions except TO 'sleep'
        if (this.quietMode && newState !== 'sleep') {
            console.log(`[BehaviorEngine] Transition blocked by Quiet Mode: ${newState}`);
            return false;
        }

        // Skip if same state, UNLESS it's a non-idle state (e.g. interact) 
        // which implies the user wants to re-trigger the action/sound/timer
        if (this.currentState === newState && newState === 'idle') {
            return true;
        }

        // Perform transition (or re-entry)
        const isReentry = this.currentState === newState;
        this.previousState = this.currentState;
        this.currentState = newState;

        // Emit event (force timestamp update to distinguish events)
        this.emit('stateChange', {
            from: this.previousState,
            to: newState,
            timestamp: Date.now()
        });

        if (!isReentry) {
            console.log(`[BehaviorEngine] ${this.previousState} -> ${newState}`);
        } else {
            // console.log(`[BehaviorEngine] Re-entry: ${newState}`);
        }

        // Reset idle timer if transitioning back to idle
        if (newState === 'idle' && !this.quietMode) {
            this.scheduleIdleAction();
        } else if (newState !== 'idle' && !this.quietMode) {
            // Check if this state has a duration (transient state)
            // Look up in idleActions config
            const actionConfig = this.config.idleActions?.find(a => a.state === newState);
            if (actionConfig?.duration) {
                console.log(`[BehaviorEngine] Auto-revert scheduled for ${newState}: ${actionConfig.duration}ms`);
                this.scheduleRevert(actionConfig.duration);
            }

            // Safety Fallback: Interactive states should NEVER stick
            // If configuration lookup failed but we are in a known transient state, enforce revert
            if (!this.revertTimer && ['interact', 'dance', 'submissive', 'angry'].includes(newState)) {
                console.warn(`[BehaviorEngine] Safety Revert triggered for stuck state: ${newState}`);
                this.scheduleRevert(3000);
            }
        }

        return true;
    }

    /**
     * Revert to previous state (or idle if none)
     */
    revert(): void {
        const targetState = this.previousState ?? 'idle';
        this.transition(targetState);
    }

    // ========== Quiet Mode ==========

    /**
     * Enable or disable quiet mode
     * In quiet mode, pet sleeps and no random actions trigger
     * 
     * @param enabled - Whether to enable quiet mode
     */
    setQuietMode(enabled: boolean): void {
        this.quietMode = enabled;
        console.log(`[BehaviorEngine] Quiet mode: ${enabled ? 'ON' : 'OFF'}`);

        if (enabled) {
            // Go to sleep, stop all timers
            this.clearTimers();
            if (this.currentState !== 'sleep' && this.config.states.includes('sleep')) {
                this.transition('sleep');
            }
        } else {
            // Wake up
            if (this.currentState === 'sleep') {
                this.transition('idle');
            }
        }
    }

    /**
     * Check if quiet mode is enabled
     */
    isQuietMode(): boolean {
        return this.quietMode;
    }

    // ========== Idle Timer ==========

    /**
     * Start the idle action timer
     */
    startIdleTimer(): void {
        if (this.quietMode) return;
        this.scheduleIdleAction();
    }

    /**
     * Schedule a random idle action
     */
    private scheduleIdleAction(): void {
        this.clearIdleTimer();

        if (this.quietMode || this.currentState !== 'idle') return;

        const { min, max } = this.config.idleTimeout ?? { min: 10000, max: 30000 };
        const delay = Math.random() * (max - min) + min;

        this.idleTimer = setTimeout(() => {
            this.triggerRandomAction();
        }, delay);
    }

    /**
     * Trigger a weighted random idle action
     */
    private triggerRandomAction(): void {
        if (this.quietMode || this.currentState !== 'idle') return;

        const actions = this.config.idleActions;
        if (!actions || actions.length === 0) return;

        // Weighted random selection
        const action = this.pickWeightedAction(actions);
        if (!action) return;

        // Emit event
        this.emit('actionTriggered', { action });

        // Transition to action state
        this.transition(action.state);

        // Schedule auto-revert
        if (action.duration) {
            this.scheduleRevert(action.duration);
        }
    }

    /**
     * Pick a random action based on weights
     */
    private pickWeightedAction(actions: IdleAction[]): IdleAction | null {
        const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
        let random = Math.random() * totalWeight;

        for (const action of actions) {
            if (random < action.weight) {
                return action;
            }
            random -= action.weight;
        }

        return actions[0];
    }

    /**
     * Schedule a revert to idle after duration
     */
    private scheduleRevert(duration: number): void {
        this.clearRevertTimer();

        this.revertTimer = setTimeout(() => {
            if (this.currentState !== 'idle') {
                this.transition('idle');
            }
        }, duration);
    }

    // ========== Event System ==========

    /**
     * Subscribe to an event
     * 
     * @param event - Event type to listen to
     * @param listener - Callback function
     */
    on(event: BehaviorEventType, listener: BehaviorEventListener): void {
        this.listeners.get(event)?.add(listener);
    }

    /**
     * Unsubscribe from an event
     * 
     * @param event - Event type
     * @param listener - Callback to remove
     */
    off(event: BehaviorEventType, listener: BehaviorEventListener): void {
        this.listeners.get(event)?.delete(listener);
    }

    /**
     * Emit an event to all listeners
     */
    private emit(type: BehaviorEventType, data: StateTransition | { soundId: string } | { action: IdleAction }): void {
        const event: BehaviorEvent = { type, data };
        this.listeners.get(type)?.forEach(listener => listener(event));
    }

    // ========== Cleanup ==========

    /**
     * Clear all timers
     */
    private clearTimers(): void {
        this.clearIdleTimer();
        this.clearRevertTimer();
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    private clearRevertTimer(): void {
        if (this.revertTimer) {
            clearTimeout(this.revertTimer);
            this.revertTimer = null;
        }
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        this.clearTimers();
        this.listeners.forEach(set => set.clear());
    }
}
