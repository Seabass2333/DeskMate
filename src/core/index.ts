/**
 * Core Module Index
 * Re-exports all core modules
 * 
 * @module core/index
 */

export { AnimationManager } from './AnimationManager';
export { BehaviorEngine } from './BehaviorEngine';
export { TriggerScheduler } from './TriggerScheduler';
export { EnergyManager } from './EnergyManager';

export type {
    BehaviorConfig,
    BehaviorEvent,
    BehaviorEventType,
    BehaviorTrigger,
    IdleAction
} from '../types/behavior';
