/**
 * Behavior Configuration Types
 * Defines the structure for per-skin behavior customization
 */

/**
 * Behavior trigger condition
 */
export interface BehaviorTrigger {
    /** Condition expression (e.g., "idleTime > 300000") */
    condition: string;
    /** Action to execute when condition is met */
    action: BehaviorAction;
}

/**
 * Action to execute (state change and/or sound)
 */
export interface BehaviorAction {
    /** State to transition to */
    state?: string;
    /** Sound to play */
    sound?: string;
    /** Duration before reverting (ms) */
    duration?: number;
}

/**
 * Idle action configuration with weight for random selection
 */
export interface IdleAction {
    /** State to transition to */
    state: string;
    /** Weight for random selection (higher = more likely) */
    weight: number;
    /** Duration before reverting to idle (ms) */
    duration?: number;
    /** Sound to play when entering this state */
    sound?: string;
}

/**
 * Interaction response configuration
 */
export interface InteractionConfig {
    /** Sound to play on interaction */
    sound?: string;
    /** State to transition to (null = no state change) */
    state?: string | null;
    /** Duration before reverting (ms) */
    duration?: number;
}

/**
 * Complete behavior configuration for a skin
 */
export interface BehaviorConfig {
    /** List of states this skin supports */
    states: string[];
    /** Random actions when idle */
    idleActions?: IdleAction[];
    /** Conditional triggers */
    triggers?: BehaviorTrigger[];
    /** Interaction responses */
    interactions?: {
        click?: InteractionConfig;
        drag?: InteractionConfig;
        doubleClick?: InteractionConfig;
        [key: string]: InteractionConfig | undefined;
    };
    /** Idle timeout before triggering random action (ms) */
    idleTimeout?: {
        min: number;
        max: number;
    };
}

/**
 * Default behavior configuration (fallback)
 */
export const DEFAULT_BEHAVIOR_CONFIG: BehaviorConfig = {
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
 * State transition event
 */
export interface StateTransition {
    from: string | null;
    to: string;
    timestamp: number;
}

/**
 * BehaviorEngine event types
 */
export type BehaviorEventType =
    | 'stateChange'
    | 'soundPlay'
    | 'actionTriggered';

/**
 * BehaviorEngine event payload
 */
export interface BehaviorEvent {
    type: BehaviorEventType;
    data: StateTransition | { soundId: string } | { action: IdleAction };
}

/**
 * BehaviorEngine event listener
 */
export type BehaviorEventListener = (event: BehaviorEvent) => void;
