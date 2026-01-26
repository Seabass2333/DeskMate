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
            // Check for skin-specific alarm sound
            try {
                const skin = await window.deskmate.getCurrentSkin();
                const defaultSrc = 'assets/sounds/BeepBox-Song.mp3';
                let targetSrc = defaultSrc;

                if (skin && skin.sounds && skin.sounds.alarm) {
                    // Resolve relative path if needed, but skin config usually has relative to skin folder
                    // However, for audio element src, we need the full relative path from app root
                    // The skin loader returns paths relative to skins folder usually?
                    // Let's check how SoundManager handles it.
                    // SoundManager uses `path.join(basePath, src)`.
                    // Here we are in renderer process, using web paths.
                    // If skin.sounds.alarm is "../../sounds/...", receiving it from config means relative to config file.
                    // Config.basePath is "assets/skins/husky-v1".
                    // So we need to construct the URL.

                    // Actually, let's keep it simple: assume path is valid for direct use if clean, 
                    // or construct it if we have basePath.
                    // The `getCurrentSkin` IPC returns `basePath` (absolute path in Node, but maybe we need relative for web).
                    // Actually, `assets/skins/husky-v1/...` works via web request if assets is served.

                    // Let's assume standard relative formatting used in config.
                    // If config says "../../sounds/...", and we are at root index.html...
                    // "assets/skins/husky-v1/../../sounds/..." -> "assets/sounds/..."
                    // We need to know the skin path.

                    // Wait, `getCurrentSkin` relies on main process `skin:getCurrent`.
                    // It returns `basePath` which is OS path. We can't use OS path in src.
                    // We should rely on `skin.id` to construct path `assets/skins/${skin.id}/`.
                    const skinPath = `assets/skins/${skin.id}`;
                    targetSrc = `${skinPath}/${skin.sounds.alarm}`;
                }

                // If src changed, load it
                // Note: simple string comparison of tail might be safer than full URL
                const currentSrc = this.timesUpAudio.getAttribute('src'); // relative path stored in DOM?
                // Audio.src returns absolute.
                // Let's just set it. HTML5 Audio handles same-source opt?
                // To avoid interruption if same, check.
                if (!this.timesUpAudio.src.includes(encodeURI(targetSrc).replace(/\.\.\//g, ''))) {
                    this.timesUpAudio.src = targetSrc;
                }
            } catch (e) {
                console.warn('[NotificationManager] Failed to load custom alarm:', e);
                // Fallback to default is implicit if we don't change src, 
                // BUT if we previously changed it, we must revert!
                // So actually we should always determine targetSrc.
                this.timesUpAudio.src = 'assets/sounds/BeepBox-Song.mp3';
            }

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
