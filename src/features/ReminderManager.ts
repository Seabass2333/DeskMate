/**
 * ReminderManager - Handles water, rest, and stretch interval reminders
 *
 * @module features/ReminderManager
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import type { EnergyManager } from '../core/EnergyManager';
import type { NotificationManager } from '../ui/NotificationManager';
import { showBubble } from '../ui/BubbleManager';

export type ReminderType = 'test' | 'water' | 'rest' | 'stretch';

export interface ReminderSettings {
    reminders?: {
        intervals?: {
            water?: number;
            rest?: number;
            stretch?: number;
        };
    };
}

export class ReminderManager {
    private behaviorEngine: BehaviorEngine;
    private notificationManager: NotificationManager;
    private energyManager: EnergyManager | null;
    private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private isLoopMode: boolean = true;

    private durations: Record<string, number> = {
        test: 10,
        water: 30 * 60,
        rest: 20 * 60,
        stretch: 45 * 60
    };

    private messageKeys: Record<string, string> = {
        test: 'testReminderMsg',
        water: 'reminderWater',
        rest: 'reminderRest',
        stretch: 'reminderStretch'
    };

    constructor(
        behaviorEngine: BehaviorEngine,
        notificationManager: NotificationManager,
        energyManager?: EnergyManager | null
    ) {
        this.behaviorEngine = behaviorEngine;
        this.notificationManager = notificationManager;
        this.energyManager = energyManager ?? null;

        window.deskmate?.onReminderToggle?.((type: string) => {
            this.toggle(type);
        });

        window.deskmate?.onReminderLoopModeChange?.(async (isLoop: boolean) => {
            this.isLoopMode = isLoop;
            const msg = isLoop
                ? await window.deskmate.t('loopModeOn')
                : await window.deskmate.t('loopModeOff');
            showBubble(msg, 2000);
            console.log(`[ReminderManager] Loop mode: ${isLoop ? 'ON' : 'OFF'}`);
        });

        console.log('[ReminderManager] Initialized');
    }

    updateConfiguration(settings: ReminderSettings): void {
        const intervals = settings?.reminders?.intervals;
        if (!intervals) return;

        if (intervals.water) this.durations.water = intervals.water * 60;
        if (intervals.rest) this.durations.rest = intervals.rest * 60;
        if (intervals.stretch) this.durations.stretch = intervals.stretch * 60;

        console.log('[ReminderManager] Updated durations:', this.durations);
    }

    async toggle(type: string): Promise<void> {
        const existingTimer = this.activeTimers.get(type);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.activeTimers.delete(type);
            const disabled = await window.deskmate.t('reminderDisabled');
            showBubble(disabled, 2000);
            console.log(`[ReminderManager] Cancelled: ${type}`);
        } else {
            await this.start(type);
        }
    }

    async start(type: string): Promise<void> {
        const duration = this.durations[type];
        if (!duration) {
            console.warn(`[ReminderManager] Unknown type: ${type}`);
            return;
        }

        const enabled = await window.deskmate.t('reminderEnabled');
        showBubble(enabled, 2000);

        const timerId = setTimeout(() => {
            this.trigger(type);
        }, duration * 1000);

        this.activeTimers.set(type, timerId);
        console.log(`[ReminderManager] Started: ${type} (${duration}s)`);
    }

    async trigger(type: string): Promise<void> {
        this.activeTimers.delete(type);

        const key = this.messageKeys[type];
        const message = key
            ? await window.deskmate.t(key)
            : `${type} time!`;

        await this.notificationManager.notify(message, 'reminder');

        if (this.energyManager) {
            await this.energyManager.modifyEnergy(3);
            console.log(`[Energy] Reminder: energy now ${this.energyManager.getEnergy()}`);
        }

        this.behaviorEngine.transition('interact');
        setTimeout(() => {
            if (this.behaviorEngine.getCurrentState() === 'interact') {
                this.behaviorEngine.transition('idle');
            }
        }, 3000);

        console.log(`[ReminderManager] Triggered: ${type}`);

        if (this.isLoopMode) {
            console.log(`[ReminderManager] Loop mode ON, restarting: ${type}`);
            await this.start(type);
        } else {
            window.deskmate?.reminderComplete?.(type);
        }
    }
}
