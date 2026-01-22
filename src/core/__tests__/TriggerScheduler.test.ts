/**
 * TriggerScheduler Test Suite
 * Tests for the condition-based trigger system
 */

import { TriggerScheduler } from '../TriggerScheduler';
import { BehaviorEngine } from '../BehaviorEngine';
import type { BehaviorTrigger, BehaviorConfig } from '../../types/behavior';

describe('TriggerScheduler', () => {
    let scheduler: TriggerScheduler;
    let engine: BehaviorEngine;

    const mockTriggers: BehaviorTrigger[] = [
        {
            condition: 'idleTime > 5000',
            action: { state: 'sleep', sound: 'yawn' }
        },
        {
            condition: 'hour >= 22 || hour < 6',
            action: { state: 'sleep' }
        },
        {
            condition: 'energy < 20',
            action: { state: 'tired' }
        }
    ];

    const mockConfig: BehaviorConfig = {
        states: ['idle', 'sleep', 'tired', 'dance'],
        triggers: mockTriggers
    };

    beforeEach(() => {
        engine = new BehaviorEngine(mockConfig);
        scheduler = new TriggerScheduler(engine, mockTriggers);
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-22T14:00:00')); // 2PM, normal hours
    });

    afterEach(() => {
        scheduler.dispose();
        engine.dispose();
        jest.useRealTimers();
    });

    describe('initialization', () => {
        it('should create an instance with triggers', () => {
            expect(scheduler).toBeInstanceOf(TriggerScheduler);
        });

        it('should accept empty triggers array', () => {
            const emptyScheduler = new TriggerScheduler(engine, []);
            expect(emptyScheduler).toBeInstanceOf(TriggerScheduler);
            emptyScheduler.dispose();
        });
    });

    describe('start/stop', () => {
        it('should start evaluation loop', () => {
            scheduler.start();
            expect(scheduler.isRunning()).toBe(true);
        });

        it('should stop evaluation loop', () => {
            scheduler.start();
            scheduler.stop();
            expect(scheduler.isRunning()).toBe(false);
        });
    });

    describe('condition evaluation', () => {
        it('should evaluate idleTime condition', () => {
            scheduler.start();
            scheduler.setContext({ idleTime: 6000 });

            // Force evaluation
            scheduler.evaluate();

            expect(engine.getCurrentState()).toBe('sleep');
        });

        it('should not trigger if condition not met', () => {
            scheduler.start();
            scheduler.setContext({ idleTime: 3000 });

            scheduler.evaluate();

            expect(engine.getCurrentState()).toBe('idle');
        });

        it('should evaluate time-based conditions', () => {
            // Set time to 11PM
            jest.setSystemTime(new Date('2026-01-22T23:00:00'));

            scheduler.start();
            scheduler.evaluate();

            expect(engine.getCurrentState()).toBe('sleep');
        });

        it('should evaluate energy condition', () => {
            scheduler.start();
            scheduler.setContext({ energy: 15 });

            scheduler.evaluate();

            expect(engine.getCurrentState()).toBe('tired');
        });
    });

    describe('context management', () => {
        it('should update context values', () => {
            scheduler.setContext({ idleTime: 1000 });
            expect(scheduler.getContext('idleTime')).toBe(1000);
        });

        it('should merge context values', () => {
            scheduler.setContext({ idleTime: 1000 });
            scheduler.setContext({ energy: 50 });

            expect(scheduler.getContext('idleTime')).toBe(1000);
            expect(scheduler.getContext('energy')).toBe(50);
        });

        it('should reset idle time on state change', () => {
            scheduler.setContext({ idleTime: 10000 });
            scheduler.resetIdleTime();

            expect(scheduler.getContext('idleTime')).toBe(0);
        });
    });

    describe('evaluation interval', () => {
        it('should auto-evaluate at interval', () => {
            const evaluateSpy = jest.spyOn(scheduler, 'evaluate');
            scheduler.start(1000); // 1 second interval

            jest.advanceTimersByTime(3000);

            expect(evaluateSpy).toHaveBeenCalledTimes(3);
        });

        it('should stop auto-evaluation when stopped', () => {
            const evaluateSpy = jest.spyOn(scheduler, 'evaluate');
            scheduler.start(1000);
            scheduler.stop();

            jest.advanceTimersByTime(5000);

            // Only the initial calls before stop
            expect(evaluateSpy.mock.calls.length).toBeLessThan(3);
        });
    });

    describe('trigger priority', () => {
        it('should only execute first matching trigger', () => {
            // Both conditions would match
            scheduler.setContext({ idleTime: 6000, energy: 15 });
            scheduler.start();
            scheduler.evaluate();

            // First trigger (idleTime) should take precedence
            expect(engine.getCurrentState()).toBe('sleep');
        });
    });

    describe('dispose', () => {
        it('should clean up all resources', () => {
            scheduler.start();
            scheduler.dispose();

            expect(scheduler.isRunning()).toBe(false);
        });
    });
});
