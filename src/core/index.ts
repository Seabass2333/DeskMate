/**
 * Core Module Index
 * Re-exports all core modules for easy importing and window exposure
 * 
 * @module core/index
 */

// Export classes for ES module usage
export { BehaviorEngine } from './BehaviorEngine';
export { TriggerScheduler } from './TriggerScheduler';
export { EnergyManager } from './EnergyManager';

// Export types
export type {
    BehaviorConfig,
    BehaviorEvent,
    BehaviorEventType,
    BehaviorTrigger,
    IdleAction
} from '../types/behavior';

// Browser globals exposure (for non-module script usage)
// This allows gradual migration from script tags
if (typeof window !== 'undefined') {
    // Dynamic import to avoid issues in Node.js test environment
    import('./BehaviorEngine').then(({ BehaviorEngine }) => {
        (window as any).BehaviorEngine = BehaviorEngine;
    });

    import('./TriggerScheduler').then(({ TriggerScheduler }) => {
        (window as any).TriggerScheduler = TriggerScheduler;
    });

    import('./EnergyManager').then(({ EnergyManager }) => {
        (window as any).EnergyManager = EnergyManager;
    });
}
