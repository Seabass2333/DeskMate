/**
 * Reminder Manager - Handles water, rest, stretch reminders
 */

class ReminderManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.activeTimers = new Map(); // type -> timerId
        this.isLoopMode = true; // Default ON, synced with main process

        // Reminder durations in seconds
        this.durations = {
            test: 10,      // 10 seconds for testing
            water: 30 * 60, // 30 minutes
            rest: 20 * 60,  // 20 minutes
            stretch: 45 * 60 // 45 minutes
        };

        // Reminder message keys (for i18n)
        this.messageKeys = {
            test: 'testReminderMsg',
            water: 'reminderWater',
            rest: 'reminderRest',
            stretch: 'reminderStretch'
        };

        // Listen for toggle events from main process
        window.deskmate.onReminderToggle((type) => {
            this.toggle(type);
        });

        // Listen for loop mode change
        window.deskmate.onReminderLoopModeChange(async (isLoop) => {
            this.isLoopMode = isLoop;
            const msg = isLoop
                ? await window.deskmate.t('loopModeOn')
                : await window.deskmate.t('loopModeOff');
            showBubble(msg, 2000);
            console.log(`[ReminderManager] Loop mode: ${isLoop ? 'ON' : 'OFF'}`);
        });

        console.log('[ReminderManager] Initialized');
    }

    updateConfiguration(settings) {
        if (!settings || !settings.reminders || !settings.reminders.intervals) return;

        const intervals = settings.reminders.intervals;
        if (intervals.water) this.durations.water = intervals.water * 60;
        if (intervals.rest) this.durations.rest = intervals.rest * 60;
        if (intervals.stretch) this.durations.stretch = intervals.stretch * 60;

        console.log('[ReminderManager] Updated durations:', this.durations);
    }

    async toggle(type) {
        if (this.activeTimers.has(type)) {
            // Cancel existing timer
            clearTimeout(this.activeTimers.get(type));
            this.activeTimers.delete(type);
            const disabled = await window.deskmate.t('reminderDisabled');
            showBubble(disabled, 2000);
            console.log(`[ReminderManager] Cancelled: ${type}`);
        } else {
            // Start new timer
            this.start(type);
        }
    }

    async start(type) {
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

    async trigger(type) {
        this.activeTimers.delete(type);

        // Get localized message
        const key = this.messageKeys[type];
        const message = key
            ? await window.deskmate.t(key)
            : `${type} time!`;

        // Use NotificationManager for consistent notification behavior
        notificationManager.notify(message, 'reminder');

        // Boost energy for acknowledging reminder
        if (energyManager) {
            await energyManager.modifyEnergy(3);
            console.log(`[Energy] Reminder: energy now ${energyManager.getEnergy()}`);
        }

        // Show interact animation
        this.stateMachine.transition(STATES.INTERACT);
        setTimeout(() => {
            if (this.stateMachine.state === STATES.INTERACT) {
                this.stateMachine.transition(STATES.IDLE);
            }
        }, 3000);

        console.log(`[ReminderManager] Triggered: ${type}`);

        // If loop mode is ON, restart the timer
        if (this.isLoopMode) {
            console.log(`[ReminderManager] Loop mode ON, restarting: ${type}`);
            this.start(type);
        } else {
            // Notify main process that reminder completed (for menu state sync)
            window.deskmate.reminderComplete(type);
        }
    }
}

// Expose to window
window.ReminderManager = ReminderManager;
