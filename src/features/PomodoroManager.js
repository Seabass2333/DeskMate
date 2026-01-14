/**
 * Pomodoro Manager - Handles focus timer functionality
 */

class PomodoroManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.timerId = null;
        this.remainingSeconds = 0;
        this.isActive = false;

        // Listen for start event from main process context menu
        window.deskmate.onPomodoroStart((minutes) => {
            this.start(minutes);
        });
    }

    async start(minutes) {
        // Stop any existing timer first (without notifying main - it already knows)
        if (this.isActive) {
            this.isActive = false;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
        }

        this.remainingSeconds = minutes * 60;
        this.isActive = true;

        // Transition to work state
        this.stateMachine.transition(STATES.WORK);

        // Get localized message
        const msg = await window.deskmate.t('focusStart');
        showBubble(msg.replace('${min}', minutes), 3000);

        this.tick();
    }

    tick() {
        if (!this.isActive) return;

        if (this.remainingSeconds <= 0) {
            this.complete();
            return;
        }

        this.remainingSeconds--;

        this.timerId = setTimeout(() => this.tick(), 1000);
    }

    async stop(completed = false) {
        this.isActive = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        if (!completed) {
            this.stateMachine.transition(STATES.IDLE);
            const msg = await window.deskmate.t('focusStopped');
            showBubble(msg, 2000);
        }
    }

    async complete() {
        this.stop(true);

        // Notify main process that pomodoro completed (for menu state sync)
        window.deskmate.pomodoroComplete();

        // Boost energy for completing focus session
        if (energyManager) {
            await energyManager.modifyEnergy(10);
            console.log(`[Energy] Pomodoro complete: energy now ${energyManager.getEnergy()}`);
        }

        // Transition to Dance (celebratory)
        this.stateMachine.transition(STATES.DANCE);

        // Use NotificationManager for looping sound and persistent bubble
        const msg = await window.deskmate.t('focusComplete');
        notificationManager.notify(msg, 'pomodoro');

        // Return to idle after dance animation
        setTimeout(() => {
            if (this.stateMachine.state === STATES.DANCE) {
                this.stateMachine.transition(STATES.IDLE);
            }
        }, 4000);
    }
}

// Expose to window
window.PomodoroManager = PomodoroManager;
