/**
 * DeskMate Renderer Process - Phase 2
 * Handles state machine, Skin System, Pomodoro timer, AI chat, and UI interactions
 */

// ============================================
// Constants & State Definitions
// ============================================

const STATES = Object.freeze({
    IDLE: 'idle',
    SLEEP: 'sleep',
    DRAG: 'drag',
    WORK: 'working',
    THINKING: 'thinking',
    INTERACT: 'interact',
    DANCE: 'dance'
});

// ============================================
// Animation Manager (Web Animations API)
// ============================================

class AnimationManager {
    constructor(element) {
        this.element = element;
        this.currentAnimation = null;
        this.skinManager = new window.SkinManager();
    }

    async init() {
        // Load default skin
        await this.skinManager.loadSkin('mochi-v1');
    }

    /**
     * Play an animation based on state
     * @param {string} state - State key mapping to animation
     */
    play(state) {
        if (!this.skinManager.currentSkin) return;

        const animConfig = this.skinManager.getAnimation(state) || this.skinManager.getAnimation('idle');
        if (!animConfig) {
            console.warn(`[Animation] No animation found for state: ${state}`);
            return;
        }

        const { src, frames, speed } = animConfig;
        const baseSize = this.skinManager.currentSkin.baseSize[0];
        const scale = this.skinManager.currentSkin.scale;

        // Final dimensions
        const spriteWidth = baseSize * scale * frames;
        const spriteHeight = baseSize * scale;

        const assetPath = this.skinManager.getAssetPath(src);
        console.log(`[Animation] Loading: ${assetPath} (Size: ${spriteWidth}x${spriteHeight})`);

        // Apply styles
        this.element.style.backgroundImage = `url('${assetPath}')`;
        this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
        this.element.style.width = `${baseSize * scale}px`;
        this.element.style.height = `${baseSize * scale}px`;

        // Cancel previous Web Animation
        if (this.currentAnimation) {
            this.currentAnimation.cancel();
        }

        // Create new animation
        this.currentAnimation = this.element.animate(
            [
                { backgroundPosition: '0 0' },
                { backgroundPosition: `-${spriteWidth}px 0` }
            ],
            {
                duration: speed,
                easing: `steps(${frames}, end)`,
                iterations: Infinity
            }
        );

        console.log(`[Animation] Playing: ${state} (${frames} frames, ${speed}ms)`);
    }
}

// ============================================
// State Machine
// ============================================

class StateMachine {
    constructor(animationManager) {
        this.anim = animationManager;
        this.state = null; // Start with null to allow initial transition to IDLE
        this.previousState = null;
        this.idleTimer = null;
    }

    transition(newState) {
        if (this.state === newState) return;

        this.previousState = this.state;
        this.state = newState;

        // Play animation
        this.anim.play(newState);

        // Manage Random Idle Actions
        this.manageIdleTimer();

        console.log(`[State] ${this.previousState} -> ${this.state}`);
    }

    /**
     * Revert to previous state (useful after drag/interact)
     */
    revert() {
        if (this.previousState) {
            this.transition(this.previousState);
        } else {
            this.transition(STATES.IDLE);
        }
    }

    /**
     * Randomly trigger interactions when IDLE
     */
    manageIdleTimer() {
        // Clear existing timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }

        // Only schedule random actions if IDLE
        if (this.state === STATES.IDLE) {
            const nextActionDelay = Math.random() * 20000 + 10000; // 10-30s
            this.idleTimer = setTimeout(() => {
                this.triggerRandomAction();
            }, nextActionDelay);
        }
    }

    triggerRandomAction() {
        if (this.state !== STATES.IDLE) return;

        // Pick a random action: Sleep, Dance, or stay Idle
        const actions = [STATES.SLEEP, STATES.DANCE, STATES.INTERACT];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        // Perform action for a short duration then return to IDLE
        this.transition(randomAction);

        setTimeout(() => {
            if (this.state === randomAction) {
                this.transition(STATES.IDLE);
            }
        }, 4000); // Action duration
    }
}

// ============================================
// Pomodoro Logic
// ============================================

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

    start(minutes) {
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

        // Main process already knows about this start (it triggered us)
        // No need to call setPomodoroState here

        // Transition to work state
        this.stateMachine.transition(STATES.WORK);
        showBubble(`Focus: ${minutes}m 💪`, 3000);

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

    stop(completed = false) {
        this.isActive = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        // Main process handles its own state - don't notify here
        // This prevents the race condition

        if (!completed) {
            this.stateMachine.transition(STATES.IDLE);
            showBubble("Stopped focus.", 2000);
        }
    }

    complete() {
        this.stop(true);

        // Notify main process that pomodoro completed (for menu state sync)
        window.deskmate.pomodoroComplete();

        // Transition to Dance (celebratory)
        this.stateMachine.transition(STATES.DANCE);

        // Use NotificationManager for looping sound and persistent bubble
        notificationManager.notify("专注完成！休息一下吧~ ☕", 'pomodoro');

        // Return to idle after dance animation
        setTimeout(() => {
            if (this.stateMachine.state === STATES.DANCE) {
                this.stateMachine.transition(STATES.IDLE);
            }
        }, 4000);
    }
}

// ============================================
// Reminder Logic
// ============================================

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

        // Reminder messages
        this.messages = {
            test: '⚡ 测试提醒！',
            water: '该喝水啦！💧 保持水分哦~',
            rest: '看看远处，让眼睛休息一下~ 👀',
            stretch: '起来活动活动筋骨吧！🧘'
        };

        // Listen for toggle events from main process
        window.deskmate.onReminderToggle((type) => {
            this.toggle(type);
        });

        // Listen for loop mode change
        window.deskmate.onReminderLoopModeChange((isLoop) => {
            this.isLoopMode = isLoop;
            showBubble(`循环模式: ${isLoop ? '开启 🔁' : '关闭'}`, 2000);
            console.log(`[ReminderManager] Loop mode: ${isLoop ? 'ON' : 'OFF'}`);
        });

        console.log('[ReminderManager] Initialized');
    }

    toggle(type) {
        if (this.activeTimers.has(type)) {
            // Cancel existing timer
            clearTimeout(this.activeTimers.get(type));
            this.activeTimers.delete(type);
            showBubble(`${type} 提醒已关闭`, 2000);
            console.log(`[ReminderManager] Cancelled: ${type}`);
        } else {
            // Start new timer
            this.start(type);
        }
    }

    start(type) {
        const duration = this.durations[type];
        if (!duration) {
            console.warn(`[ReminderManager] Unknown type: ${type}`);
            return;
        }

        showBubble(`${type} 提醒已开启 (${duration}s)`, 2000);

        const timerId = setTimeout(() => {
            this.trigger(type);
        }, duration * 1000);

        this.activeTimers.set(type, timerId);
        console.log(`[ReminderManager] Started: ${type} (${duration}s)`);
    }

    trigger(type) {
        this.activeTimers.delete(type);

        const message = this.messages[type] || `${type} 时间到！`;

        // Use NotificationManager for consistent notification behavior
        notificationManager.notify(message, 'reminder');

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

class DragController {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.character = document.getElementById('character');
        this.isDragging = false;

        this.init();
    }

    init() {
        // Toggle click-through when hovering the character
        this.character.addEventListener('mouseenter', () => {
            window.deskmate.setIgnoreMouseEvents(false);
        });

        this.character.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                window.deskmate.setIgnoreMouseEvents(true);
            }
        });

        this.character.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
    }

    async onMouseDown(e) {
        // Prevent drag if context menu (right click)
        if (e.button === 2) return;

        this.isDragging = true;
        this.startMouseX = e.screenX;
        this.startMouseY = e.screenY;

        // Get window position from main process
        const [x, y] = await window.deskmate.getWindowPosition();
        this.startWinX = x;
        this.startWinY = y;

        this.stateMachine.transition(STATES.DRAG);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        const dx = e.screenX - this.startMouseX;
        const dy = e.screenY - this.startMouseY;
        window.deskmate.setWindowPosition(this.startWinX + dx, this.startWinY + dy);
    }

    onMouseUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Dismiss any active notification (user acknowledged by dragging)
        notificationManager.dismiss();

        // Play jump/land sound
        playJumpSound();

        if (this.previousState && this.previousState !== STATES.DRAG) {
            this.stateMachine.transition(this.previousState);
        } else {
            this.stateMachine.transition(STATES.IDLE);
        }
    }
}

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
        showBubble("Thinking...", 0, true); // Loading state

        // State Transition
        this.stateMachine.transition(STATES.THINKING);

        try {
            const result = await window.deskmate.askAI(text);
            showBubble(result.message || "Meow?", 5000);

            // Interaction visual
            this.stateMachine.transition(STATES.INTERACT);
            setTimeout(() => this.stateMachine.transition(STATES.IDLE), 3000);

        } catch (e) {
            showBubble("Connection failed... 😿");
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
    await animManager.init();

    // 2. Init State Machine
    const stateMachine = new StateMachine(animManager);

    // 3. Init Controllers
    new DragController(stateMachine);
    const chatManager = new ChatManager(stateMachine);
    new PomodoroManager(stateMachine);
    new ReminderManager(stateMachine);

    // 4. Initial State
    stateMachine.transition(STATES.IDLE);

    // 5. Pomodoro Listener (Handled by PomodoroManager)

    // 6. Click Interaction
    charEl.addEventListener('click', () => {
        // Close chat, bubble, and dismiss notification sound
        chatManager.hide();
        hideBubble();
        notificationManager.dismiss();

        if (stateMachine.state === STATES.IDLE) {
            stateMachine.transition(STATES.INTERACT);
            playJumpSound();
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

    console.log('[Renderer] Phase 2 Ready!');
}

init();
