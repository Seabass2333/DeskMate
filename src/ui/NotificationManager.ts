/**
 * NotificationManager - Handles timer alerts with sound and persistent bubble queue
 *
 * @module ui/NotificationManager
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import { showBubble, hideBubble } from './BubbleManager';

export type NotificationType = 'pomodoro' | 'reminder';

interface QueuedNotification {
    message: string;
    type: NotificationType;
}

export class NotificationManager {
    private timesUpAudio: HTMLAudioElement | null;
    private isPlaying: boolean = false;
    private pendingNotifications: QueuedNotification[] = [];
    private behaviorEngine: BehaviorEngine | null = null;
    private volume: number = 0.3;

    constructor(behaviorEngine?: BehaviorEngine) {
        this.timesUpAudio = document.getElementById('times-up-sound') as HTMLAudioElement | null;
        if (this.timesUpAudio) {
            this.timesUpAudio.volume = this.volume;
        }
        this.behaviorEngine = behaviorEngine ?? null;
    }

    setBehaviorEngine(engine: BehaviorEngine): void {
        this.behaviorEngine = engine;
    }

    setVolume(volume: number): void {
        const normalized = volume > 1 ? Math.min(Math.max(volume / 100, 0), 1) : Math.min(Math.max(volume, 0), 1);
        this.volume = normalized;
        if (this.timesUpAudio) {
            this.timesUpAudio.volume = normalized;
        }
    }

    /**
     * Queue a notification. If sound is not currently playing, start it immediately.
     */
    async notify(message: string, type: NotificationType = 'pomodoro'): Promise<void> {
        this.pendingNotifications.push({ message, type });

        if (this.isPlaying) {
            console.log('[NotificationManager] Queued:', message);
            return;
        }

        await this.playNext();
    }

    private async playNext(): Promise<void> {
        const nextItem = this.pendingNotifications.shift();
        if (!nextItem) {
            this.isPlaying = false;
            return;
        }

        const { message, type } = nextItem;
        this.isPlaying = true;

        // Show persistent bubble until dismissed
        showBubble(message, 0);

        // Play looping alarm sound if sound is enabled
        const enabled = await window.deskmate?.isSoundEnabled?.();
        if (enabled && this.timesUpAudio) {
            try {
                const skin = await window.deskmate.getCurrentSkin();
                const defaultSrc = 'assets/sounds/BeepBox-Song.mp3';
                let targetSrc = defaultSrc;

                if (skin?.sounds?.alarm && typeof skin.sounds.alarm === 'string') {
                    const skinPath = `assets/skins/${skin.id}`;
                    targetSrc = `${skinPath}/${skin.sounds.alarm}`;
                }

                if (!this.timesUpAudio.src.includes(encodeURI(targetSrc).replace(/\.\.\//g, ''))) {
                    this.timesUpAudio.src = targetSrc;
                }
            } catch (e) {
                console.warn('[NotificationManager] Failed to load custom alarm:', e);
                this.timesUpAudio.src = 'assets/sounds/BeepBox-Song.mp3';
            }

            this.timesUpAudio.currentTime = 0;
            this.timesUpAudio.play().catch(e => console.warn('[NotificationManager] Audio error:', e));
        }

        // Trigger celebratory animation (use 'dance' if supported by skin, otherwise 'interact')
        if (this.behaviorEngine) {
            const validStates = this.behaviorEngine.getValidStates();
            const targetState = validStates.includes('dance') ? 'dance' : 'interact';
            this.behaviorEngine.transition(targetState);
        }

        console.log(`[NotificationManager] Playing: ${type} - ${message}`);
    }

    /**
     * Stop current notification sound and display next queued message (if any)
     */
    dismiss(): void {
        if (!this.isPlaying) return;

        if (this.timesUpAudio) {
            this.timesUpAudio.pause();
            this.timesUpAudio.currentTime = 0;
        }

        hideBubble();

        if (this.behaviorEngine && !this.behaviorEngine.isQuietMode()) {
            this.behaviorEngine.transition('idle');
        }

        if (this.pendingNotifications.length > 0) {
            const next = this.pendingNotifications.shift()!;
            showBubble(next.message, 5000);
            console.log('[NotificationManager] Showing queued:', next.message);
        }

        this.isPlaying = false;
    }

    get isActive(): boolean {
        return this.isPlaying;
    }
}
