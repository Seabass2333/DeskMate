/**
 * PomodoroManager - Handles focus timer functionality and celebratory states
 *
 * @module features/PomodoroManager
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import type { EnergyManager } from '../core/EnergyManager';
import type { NotificationManager } from '../ui/NotificationManager';
import { showBubble } from '../ui/BubbleManager';

export class PomodoroManager {
    private behaviorEngine: BehaviorEngine;
    private energyManager: EnergyManager | null;
    private notificationManager: NotificationManager;
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private remainingSeconds: number = 0;
    public isActive: boolean = false;

    constructor(
        behaviorEngine: BehaviorEngine,
        notificationManager: NotificationManager,
        energyManager?: EnergyManager | null
    ) {
        this.behaviorEngine = behaviorEngine;
        this.notificationManager = notificationManager;
        this.energyManager = energyManager ?? null;

        window.deskmate?.onPomodoroStart?.((minutes: number) => {
            this.start(minutes);
        });

        window.deskmate?.onPomodoroStop?.(() => {
            this.stop(false);
        });
    }

    async start(minutes: number): Promise<void> {
        if (this.isActive) {
            this.isActive = false;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
        }

        this.remainingSeconds = Math.round(minutes * 60);
        this.isActive = true;

        this.behaviorEngine.transition('working');

        const msg = await window.deskmate.t('focusStart');
        showBubble(msg.replace('${min}', String(minutes)), 3000);

        this.tick();
    }

    private tick(): void {
        if (!this.isActive) return;

        if (this.remainingSeconds <= 0) {
            this.complete();
            return;
        }

        this.remainingSeconds--;
        this.timerId = setTimeout(() => this.tick(), 1000);
    }

    async stop(completed: boolean = false): Promise<void> {
        this.isActive = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        if (!completed) {
            this.behaviorEngine.transition('idle');
            const msg = await window.deskmate.t('focusStopped');
            showBubble(msg, 2000);
        }
    }

    async complete(): Promise<void> {
        await this.stop(true);

        window.deskmate?.pomodoroComplete?.();

        if (this.energyManager) {
            await this.energyManager.modifyEnergy(10);
            console.log(`[Energy] Pomodoro complete: energy now ${this.energyManager.getEnergy()}`);
        }

        const validStates = this.behaviorEngine.getValidStates();
        const celebrateState = validStates.includes('dance') ? 'dance' : 'interact';
        this.behaviorEngine.transition(celebrateState);

        const msg = await window.deskmate.t('focusComplete');
        await this.notificationManager.notify(msg, 'pomodoro');

        setTimeout(() => {
            if (this.behaviorEngine.getCurrentState() === celebrateState) {
                this.behaviorEngine.transition('idle');
            }
        }, 4000);
    }
}
