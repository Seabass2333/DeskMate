/**
 * Notification Manager - Handles timer alerts with sound and bubble
 */

class NotificationManager {
    constructor() {
        this.timesUpAudio = document.getElementById('times-up-sound');
        this.isPlaying = false;
        this.pendingNotifications = []; // Queue for multiple notifications
    }

    /**
     * Queue a notification. If sound is not playing, start it.
     * @param {string} message - The bubble text to show
     * @param {string} type - 'pomodoro' or 'reminder'
     */
    async notify(message, type = 'pomodoro') {
        this.pendingNotifications.push({ message, type });

        // If already playing, just queue - user will see next message on dismiss
        if (this.isPlaying) {
            console.log('[NotificationManager] Queued:', message);
            return;
        }

        await this.playNext();
    }

    async playNext() {
        if (this.pendingNotifications.length === 0) {
            this.isPlaying = false;
            return;
        }

        const { message, type } = this.pendingNotifications.shift();
        this.isPlaying = true;

        // Show bubble (persistent until dismissed)
        showBubble(message, 0);

        // Play looping sound
        const enabled = await window.deskmate.isSoundEnabled();
        if (enabled && this.timesUpAudio) {
            this.timesUpAudio.currentTime = 0;
            this.timesUpAudio.play().catch(e => console.warn('[NotificationManager] Audio error:', e));
        }

        // Trigger excitement animation!
        if (this.stateMachine) {
            this.stateMachine.transition(STATES.DANCE);
        }

        console.log(`[NotificationManager] Playing: ${type} - ${message}`);
    }

    /**
     * Stop current notification sound and show next queued message (if any)
     */
    dismiss() {
        if (!this.isPlaying) return;

        // Stop sound
        if (this.timesUpAudio) {
            this.timesUpAudio.pause();
            this.timesUpAudio.currentTime = 0;
        }

        // Hide current bubble
        hideBubble();

        // Revert to IDLE
        if (this.stateMachine) {
            this.stateMachine.transition(STATES.IDLE);
        }

        // Check for next notification
        if (this.pendingNotifications.length > 0) {
            // Show next message without sound (user already acknowledged)
            const { message } = this.pendingNotifications.shift();
            showBubble(message, 5000); // Auto-dismiss after 5s
            console.log('[NotificationManager] Showing queued:', message);
        }

        this.isPlaying = false;
    }

    /**
     * Check if notification sound is currently playing
     */
    get isActive() {
        return this.isPlaying;
    }

    /**
     * Set state machine reference
     */
    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }
}

// Expose to window
window.NotificationManager = NotificationManager;
