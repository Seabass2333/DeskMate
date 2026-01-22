/**
 * Skin Configuration Types
 * Defines the structure for pet skin configuration files
 */

import { SkinSounds } from './sound';

/**
 * Animation variant with weight for random selection
 */
export interface AnimationVariant {
    src: string;
    frames: number;
    speed: number;
    weight?: number;
}

/**
 * Single animation configuration
 */
export interface AnimationConfig {
    src: string;
    frames: number;
    speed: number;
}

/**
 * Animation can be single config or weighted variants
 */
export type AnimationEntry = AnimationConfig | AnimationVariant[];

/**
 * Animation mapping for all states
 */
export interface SkinAnimations {
    idle: AnimationEntry;
    sleep?: AnimationEntry;
    drag?: AnimationEntry;
    working?: AnimationEntry;
    thinking?: AnimationEntry;
    interact?: AnimationEntry;
    dance?: AnimationEntry;
    /** Custom animations (extensible) */
    [key: string]: AnimationEntry | undefined;
}

/**
 * Behavior trigger condition
 */
export interface BehaviorTrigger {
    /** Condition expression (e.g., "idleTime > 300000") */
    condition: string;
    /** Action to execute when condition is met */
    action: {
        state?: string;
        sound?: string;
    };
}

/**
 * Idle action configuration
 */
export interface IdleAction {
    state: string;
    weight: number;
    duration?: number;
    sound?: string;
}

/**
 * Interaction response configuration
 */
export interface InteractionConfig {
    sound?: string;
    state?: string | null;
    duration?: number;
}

/**
 * Behavior configuration for a skin
 */
export interface SkinBehaviors {
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
}

/**
 * Complete skin configuration (config.json structure)
 */
export interface SkinConfig {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Creator */
    author: string;
    /** Version string */
    version: string;
    /** Description */
    description?: string;
    /** Preview image filename */
    preview?: string;
    /** Pet type (cat, dog, robot, etc.) */
    type?: string;
    /** Personality tag */
    personality?: string;
    /** Feature flags */
    features?: string[];
    /** Base sprite size [width, height] */
    baseSize: [number, number];
    /** Display scale multiplier */
    scale: number;
    /** Animation configurations */
    animations: SkinAnimations;
    /** Sound configurations (v2.0) */
    sounds?: SkinSounds;
    /** Behavior configurations (v2.0) */
    behaviors?: SkinBehaviors;
}

/**
 * Runtime skin data (after loading)
 */
export interface LoadedSkin extends SkinConfig {
    /** Full path to skin folder */
    path: string;
    /** Loaded Audio element for legacy sound */
    sound?: HTMLAudioElement | null;
}
