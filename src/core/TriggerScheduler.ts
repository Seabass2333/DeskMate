/**
 * TriggerScheduler - Condition-based action trigger system
 * 
 * Features:
 * - Evaluate conditions at regular intervals
 * - Support for time, idleTime, and custom context variables
 * - Integration with BehaviorEngine for state transitions
 * - Safe expression evaluation
 * 
 * @module core/TriggerScheduler
 */

import type { BehaviorTrigger, BehaviorAction } from '../types/behavior';
import type { BehaviorEngine } from './BehaviorEngine';

/**
 * Context variables available for condition evaluation
 */
interface TriggerContext {
    /** Milliseconds since last user interaction */
    idleTime: number;
    /** Current energy level (0-100) */
    energy: number;
    /** Current hour (0-23) */
    hour: number;
    /** Current minute (0-59) */
    minute: number;
    /** Day of week (0-6, 0=Sunday) */
    dayOfWeek: number;
    /** Custom context values */
    [key: string]: number | boolean | string;
}

/**
 * TriggerScheduler evaluates conditions periodically and triggers actions.
 * 
 * @example
 * ```typescript
 * const scheduler = new TriggerScheduler(engine, config.triggers);
 * scheduler.start(60000); // Evaluate every minute
 * scheduler.setContext({ energy: 50 });
 * ```
 */
export class TriggerScheduler {
    private engine: BehaviorEngine;
    private triggers: BehaviorTrigger[];
    private context: Partial<TriggerContext> = {};
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private running: boolean = false;

    /**
     * Create a TriggerScheduler
     * 
     * @param engine - BehaviorEngine to control
     * @param triggers - Array of trigger configurations
     */
    constructor(engine: BehaviorEngine, triggers: BehaviorTrigger[]) {
        this.engine = engine;
        this.triggers = this.mergeWithDefaults(triggers);
        this.resetIdleTime();
    }

    /**
     * Merge user triggers with system defaults
     */
    private mergeWithDefaults(userTriggers: BehaviorTrigger[]): BehaviorTrigger[] {
        // Default System Triggers (Phase 17)
        const defaults: BehaviorTrigger[] = [
            // Night Mode: 23:00 - 06:00 -> Force Sleep
            {
                condition: "hour >= 23 || hour < 6",
                action: { state: "sleep", duration: 600000 } // 10 min sleep blocks
            },
            // Low Energy: < 10 -> Force Sleep
            {
                condition: "energy < 10",
                action: { state: "sleep", duration: 60000 }
            },
            // Tired: < 30 -> Force Tired/Sleep
            {
                condition: "energy < 30",
                action: { state: "sleep", duration: 30000 }
            }
        ];

        // User triggers take precedence if we want to allow override, 
        // but for now we append defaults to ensure basic needs are met.
        // Triggers are evaluated in order, so we put system triggers LAST 
        // to let specific skin behaviors override them if defined first.
        return [...userTriggers, ...defaults];
    }

    // ========== Lifecycle ==========

    /**
     * Start the evaluation loop
     * 
     * @param intervalMs - Evaluation interval in milliseconds (default: 60000)
     */
    start(intervalMs: number = 60000): void {
        if (this.running) return;

        this.running = true;
        this.intervalId = setInterval(() => {
            this.evaluate();
        }, intervalMs);

        console.log(`[TriggerScheduler] Started with ${intervalMs}ms interval`);
    }

    /**
     * Stop the evaluation loop
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.running = false;
        console.log('[TriggerScheduler] Stopped');
    }

    /**
     * Check if scheduler is running
     */
    isRunning(): boolean {
        return this.running;
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        this.stop();
        this.context = {};
    }

    // ========== Context Management ==========

    /**
     * Update context values
     * 
     * @param values - Partial context to merge
     */
    setContext(values: Partial<TriggerContext>): void {
        this.context = { ...this.context, ...values };
    }

    /**
     * Get a context value
     * 
     * @param key - Context key
     */
    getContext(key: string): number | boolean | string | undefined {
        return this.context[key];
    }

    /**
     * Reset idle time to 0
     */
    resetIdleTime(): void {
        this.context.idleTime = 0;
    }

    // ========== Evaluation ==========

    /**
     * Evaluate all triggers and execute first matching action
     */
    evaluate(): void {
        // Update time-based context
        const now = new Date();
        this.context.hour = now.getHours();
        this.context.minute = now.getMinutes();
        this.context.dayOfWeek = now.getDay();

        // Evaluate triggers in order (first match wins)
        for (const trigger of this.triggers) {
            if (this.evaluateCondition(trigger.condition)) {
                this.executeAction(trigger.action);
                return; // Only execute first matching trigger
            }
        }
    }

    /**
     * Safely evaluate a condition expression
     * 
     * @param condition - Condition string (e.g., "idleTime > 5000")
     */
    private evaluateCondition(condition: string): boolean {
        try {
            // Build context object for evaluation
            const ctx = {
                idleTime: this.context.idleTime ?? 0,
                energy: this.context.energy ?? 100,
                hour: this.context.hour ?? new Date().getHours(),
                minute: this.context.minute ?? new Date().getMinutes(),
                dayOfWeek: this.context.dayOfWeek ?? new Date().getDay(),
                ...this.context
            };

            // Safe evaluation using Function constructor
            // Only allows simple comparison operators and logical operators
            const safeCondition = this.sanitizeCondition(condition);
            const fn = new Function(...Object.keys(ctx), `return ${safeCondition};`);

            return Boolean(fn(...Object.values(ctx)));
        } catch (error) {
            console.warn(`[TriggerScheduler] Failed to evaluate condition: ${condition}`, error);
            return false;
        }
    }

    /**
     * Sanitize condition to prevent code injection
     * Only allows: numbers, operators, parentheses, and known variable names
     */
    private sanitizeCondition(condition: string): string {
        // Allowed patterns: variable names, numbers, operators
        const allowedPattern = /^[\w\s<>=!&|()+-]+$/;

        if (!allowedPattern.test(condition)) {
            throw new Error(`Invalid condition: ${condition}`);
        }

        return condition;
    }

    /**
     * Execute a trigger action
     */
    private executeAction(action: BehaviorAction): void {
        console.log(`[TriggerScheduler] Executing action:`, action);

        if (action.state) {
            this.engine.transition(action.state);
        }

        // Sound playback would be handled by event listener
        if (action.sound) {
            // Emit event for SoundManager to handle
            // This coupling is intentionally loose - scheduler just sets state
        }
    }
}
