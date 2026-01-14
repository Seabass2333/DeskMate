/**
 * DeskMate Renderer Process - v1.1 Modular
 * Step 1: AnimationManager extracted to src/core/AnimationManager.js
 */

// AnimationManager is loaded from external file (src/core/AnimationManager.js)
// It's already available as global class from the script tag - no need to redeclare

// STATES and StateMachine are loaded from external file (src/core/StateMachine.js)
// They're already available as globals from the script tag - no need to redeclare
// EnergyManager is loaded from external file (src/core/EnergyManager.js)
// Already available as global from the script tag - no need to redeclare

// Global energy manager instance
let energyManager = null;

// PomodoroManager is loaded from external file (src/features/PomodoroManager.js)
// Already available as global from the script tag
// ReminderManager is loaded from external file (src/features/ReminderManager.js)
// DragController is loaded from external file (src/features/DragController.js)
// Already available as global from the script tag

// ============================================
// Chat & AI Logic
// ============================================

class ChatManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.inputContainer = document.getElementById('chat-input-container');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');

        this.init();
    }

    init() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Toggle chat on IPC event
        window.deskmate.onTalkToPet(() => {
            this.toggle();
        });

        // Toggle click-through when hovering the chat input
        this.inputContainer.addEventListener('mouseenter', () => {
            window.deskmate.setIgnoreMouseEvents(false);
        });

        this.inputContainer.addEventListener('mouseleave', () => {
            window.deskmate.setIgnoreMouseEvents(true);
        });
    }

    toggle() {
        if (this.inputContainer.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.inputContainer.classList.add('visible');
        setTimeout(() => this.input.focus(), 100);
    }

    hide() {
        this.inputContainer.classList.remove('visible');
        this.input.blur();
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        // UI Updates
        this.input.value = '';
        this.inputContainer.classList.remove('visible');

        // Get localized thinking message
        const thinkingMsg = await window.deskmate.t('thinking');
        showBubble(thinkingMsg, 0, true); // Loading state

        // State Transition
        this.stateMachine.transition(STATES.THINKING);

        try {
            const result = await window.deskmate.askAI(text);
            showBubble(result.message || "Meow?", 5000);

            // Interaction visual
            this.stateMachine.transition(STATES.INTERACT);
            setTimeout(() => this.stateMachine.transition(STATES.IDLE), 3000);

        } catch (e) {
            const failedMsg = await window.deskmate.t('connectionFailed');
            showBubble(failedMsg);
            this.stateMachine.transition(STATES.IDLE);
        }
    }
}

// ============================================
// Helper Functions
// ============================================

const bubbleEl = document.getElementById('speech-bubble');
const bubbleContent = bubbleEl.querySelector('.bubble-content');
let bubbleTimer = null;

function showBubble(text, duration = 3000, isLoading = false) {
    if (bubbleTimer) clearTimeout(bubbleTimer);

    bubbleContent.textContent = text;
    bubbleContent.classList.toggle('loading', isLoading);
    bubbleEl.classList.add('visible');

    if (duration > 0) {
        bubbleTimer = setTimeout(() => {
            hideBubble();
        }, duration);
    }
}

function hideBubble() {
    if (bubbleTimer) {
        clearTimeout(bubbleTimer);
        bubbleTimer = null;
    }
    bubbleEl.classList.remove('visible');
}

// Allow clicking on bubble to dismiss it
bubbleEl.addEventListener('click', () => {
    hideBubble();
});

// Allow clicking-through for bubble (mouse events)
bubbleEl.addEventListener('mouseenter', () => {
    window.deskmate.setIgnoreMouseEvents(false);
});
bubbleEl.addEventListener('mouseleave', () => {
    window.deskmate.setIgnoreMouseEvents(true);
});

// Sound Helpers
async function playJumpSound() {
    // Check if sound enabled first
    const enabled = await window.deskmate.isSoundEnabled();
    if (!enabled) return;
    const audio = document.getElementById('jump-sound');

    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(e));
    }
}

async function playClickSound() {
    const enabled = await window.deskmate.isSoundEnabled();
    if (!enabled) return;
    const audio = document.getElementById('click-sound');

    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(e));
    }
}

// ============================================
// Notification Manager (Handles Timer Alerts)
// ============================================

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

// Global instance
const notificationManager = new NotificationManager();

// ============================================
// Main Initialization
// ============================================

async function init() {
    const charEl = document.getElementById('character');

    // 1. Init Animation Manager & Load Skin
    const animManager = new AnimationManager(charEl);
    try {
        await animManager.init();
    } catch (skinError) {
        console.error('[Renderer] Skin loading failed, using fallback:', skinError);
        // Show a basic fallback image so the app isn't invisible
        charEl.style.backgroundImage = 'url(assets/skins/mochi-v1/idle.png)';
        charEl.style.backgroundSize = 'contain';
        charEl.style.backgroundRepeat = 'no-repeat';
        charEl.style.width = '128px';
        charEl.style.height = '128px';
    }

    // 2. Init State Machine
    const stateMachine = new StateMachine(animManager);

    // Inject state machine into notification manager
    notificationManager.setStateMachine(stateMachine);

    // 3. Init Controllers
    new DragController(stateMachine);
    const chatManager = new ChatManager(stateMachine);
    new PomodoroManager(stateMachine);
    const reminderManager = new ReminderManager(stateMachine);
    try {
        const settings = await window.deskmate.getSettings();
        if (settings) reminderManager.updateConfiguration(settings);
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }

    // 3.5. Init Energy Manager
    energyManager = new EnergyManager();
    await energyManager.init();

    // 4. Initial State - Check quiet mode
    const isQuiet = await window.deskmate.getQuietMode();
    stateMachine.setQuietMode(isQuiet);
    if (isQuiet) {
        stateMachine.transition(STATES.SLEEP);
    } else {
        stateMachine.transition(STATES.IDLE);
    }

    // 4.5. Listen for quiet mode changes
    window.deskmate.onQuietModeChanged((enabled) => {
        stateMachine.setQuietMode(enabled);
    });

    // 5. Pomodoro Listener (Handled by PomodoroManager)

    // 6. Click Interaction
    charEl.addEventListener('click', async () => {
        // Close chat, bubble, and dismiss notification sound
        chatManager.hide();
        hideBubble();
        notificationManager.dismiss();

        // Boost energy on interaction
        if (energyManager) {
            await energyManager.modifyEnergy(2);
            // Show status bubble
            const msg = await energyManager.getStatusMessage();
            showBubble(msg, 2000);
        }

        // In quiet mode: brief wake-up then return to sleep
        if (stateMachine.quietMode) {
            // Clear any existing wake timer
            if (stateMachine.wakeTimer) {
                clearTimeout(stateMachine.wakeTimer);
            }
            stateMachine.transition(STATES.INTERACT);
            stateMachine.wakeTimer = setTimeout(() => {
                stateMachine.transition(STATES.SLEEP);
            }, 3000);
        } else if (stateMachine.state === STATES.IDLE) {
            stateMachine.transition(STATES.INTERACT);
            setTimeout(() => stateMachine.transition(STATES.IDLE), 2000);
        }
    });

    // 7. Context Menu
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.deskmate.showContextMenu();
    });

    // 8. Escape key to dismiss bubble, chat, and notification
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            chatManager.hide();
            hideBubble();
            notificationManager.dismiss();
        }
    });
    // 9. Skin change listener
    window.deskmate.onSkinChange(async (skinId) => {
        console.log(`[Renderer] Skin change requested: ${skinId}`);
        await animManager.loadSkin(skinId);

        // Respect quiet mode: if quiet, stay in sleep; otherwise go to idle
        stateMachine.state = null; // Force state change
        if (stateMachine.quietMode) {
            const hasSleep = animManager.skinManager.getAnimation('sleep');
            if (hasSleep) {
                stateMachine.transition(STATES.SLEEP);
            } else {
                // Fallback to idle if no sleep animation
                stateMachine.transition(STATES.IDLE);
            }
        } else {
            const hasIdle = animManager.skinManager.getAnimation('idle');
            if (hasIdle) {
                stateMachine.transition(STATES.IDLE);
            } else {
                // Get first available animation key from new skin
                const animations = animManager.skinManager.currentSkin?.animations;
                const firstState = animations ? Object.keys(animations)[0] : 'idle';
                stateMachine.transition(firstState);
            }
        }
        console.log(`[Renderer] Skin changed to: ${skinId}, state: ${stateMachine.state}`);
    });

    // 10. Settings change listener (Real-time sync)
    window.deskmate.onSettingsUpdated((settings) => {
        console.log('[Renderer] Settings updated:', settings);
        if (settings) {
            reminderManager.updateConfiguration(settings);
        }
    });

    console.log('[Renderer] Phase 2 Ready!');
}

init();
