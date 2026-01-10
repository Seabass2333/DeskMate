/**
 * DeskMate Renderer Process - Phase 2
 * Handles state machine, Pomodoro timer, dragging, AI chat, and UI interactions
 */

// ============================================
// State Machine
// ============================================

const STATES = Object.freeze({
    IDLE: 'idle',
    DRAGGING: 'dragging',
    WORK: 'work',
    BREAK: 'break',
    TALKING: 'talking',
    THINKING: 'thinking'  // Visual feedback while waiting for AI response
});

class StateMachine {
    constructor(initialState = STATES.IDLE) {
        this.state = initialState;
        this.previousState = null;
        this.listeners = new Map();
    }

    /**
     * Transition to a new state
     * @param {string} newState - Target state from STATES
     */
    transition(newState) {
        if (this.state === newState) return;

        this.previousState = this.state;
        this.state = newState;

        console.log(`[StateMachine] ${this.previousState} → ${this.state}`);
        this.emit('stateChange', { current: this.state, previous: this.previousState });
    }

    /**
     * Return to previous state
     */
    revert() {
        if (this.previousState) {
            const target = this.previousState;
            this.previousState = this.state;
            this.state = target;
            this.emit('stateChange', { current: this.state, previous: this.previousState });
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

// ============================================
// Pomodoro Manager
// ============================================

class PomodoroManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.timerId = null;
        this.remainingSeconds = 0;
        this.isActive = false;
    }

    /**
     * Start a focus session
     * @param {number} minutes - Duration in minutes
     */
    start(minutes) {
        if (this.isActive) this.stop(true); // Silent stop if already running

        this.remainingSeconds = minutes * 60;
        this.isActive = true;

        // Notify main process
        window.deskmate.setPomodoroState(true);

        // Transition to work state
        this.stateMachine.transition(STATES.WORK);

        // Show bubble
        showBubble(`Focus: ${minutes}m 💪`, 2000);

        console.log(`[Pomodoro] Started ${minutes} minute session`);

        this.timerId = setInterval(() => {
            this.remainingSeconds--;

            if (this.remainingSeconds <= 0) {
                this.complete();
            }
        }, 1000);
    }

    /**
     * Stop the current session
     * @param {boolean} silent - If true, don't show bubble or revert state
     */
    stop(silent = false) {
        if (!this.isActive) return;

        clearInterval(this.timerId);
        this.timerId = null;
        this.isActive = false;

        // Notify main process
        window.deskmate.setPomodoroState(false);

        if (!silent) {
            this.stateMachine.transition(STATES.IDLE);
            showBubble('Focus stopped', 2000);
        }

        console.log('[Pomodoro] Stopped');
    }

    /**
     * Called when timer completes naturally
     */
    complete() {
        clearInterval(this.timerId);
        this.timerId = null;
        this.isActive = false;

        // Notify main process
        window.deskmate.setPomodoroState(false);

        // Transition to break state
        this.stateMachine.transition(STATES.BREAK);

        // Play notification sound
        playNotificationSound();

        // Show notification
        window.deskmate.showNotification('DeskMate', 'Time to rest! Great work! 🎉');

        // Show bubble
        showBubble('Great work! 🎉', 5000);

        console.log('[Pomodoro] Completed!');

        // Return to idle after a while
        setTimeout(() => {
            if (this.stateMachine.state === STATES.BREAK) {
                this.stateMachine.transition(STATES.IDLE);
            }
        }, 10000);
    }
}

// ============================================
// Drag Manager
// ============================================

class DragManager {
    constructor(element, stateMachine) {
        this.element = element;
        this.stateMachine = stateMachine;
        this.isDragging = false;
        this.startMouseX = 0;
        this.startMouseY = 0;
        this.startWindowX = 0;
        this.startWindowY = 0;
        this.previousState = STATES.IDLE;

        this.init();
    }

    init() {
        this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    async onMouseDown(e) {
        if (e.button !== 0) return; // Only left click

        this.isDragging = true;
        this.startMouseX = e.screenX;
        this.startMouseY = e.screenY;

        const [winX, winY] = await window.deskmate.getWindowPosition();
        this.startWindowX = winX;
        this.startWindowY = winY;

        this.previousState = this.stateMachine.state;
        this.stateMachine.transition(STATES.DRAGGING);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.screenX - this.startMouseX;
        const deltaY = e.screenY - this.startMouseY;

        const newX = this.startWindowX + deltaX;
        const newY = this.startWindowY + deltaY;

        window.deskmate.setWindowPosition(newX, newY);
    }

    onMouseUp() {
        if (!this.isDragging) return;

        this.isDragging = false;

        // Play jump sound when dropped
        playJumpSound();

        // Return to previous state
        if (this.previousState && this.previousState !== STATES.DRAGGING) {
            this.stateMachine.transition(this.previousState);
        } else {
            this.stateMachine.transition(STATES.IDLE);
        }
    }
}

// ============================================
// Speech Bubble
// ============================================

let bubbleTimeout = null;
const bubbleElement = document.getElementById('speech-bubble');
const bubbleContent = bubbleElement?.querySelector('.bubble-content');

/**
 * Show speech bubble with text
 * @param {string} text - Text to display
 * @param {number} duration - Duration in milliseconds (0 = stay until manually hidden)
 */
function showBubble(text, duration = 3000) {
    if (!bubbleElement || !bubbleContent) return;

    // Clear any existing timeout
    if (bubbleTimeout) {
        clearTimeout(bubbleTimeout);
        bubbleTimeout = null;
    }

    bubbleContent.classList.remove('loading');
    bubbleContent.textContent = text;
    bubbleElement.classList.add('visible');

    if (duration > 0) {
        bubbleTimeout = setTimeout(() => {
            bubbleElement.classList.remove('visible');
            bubbleTimeout = null;
        }, duration);
    }
}

/**
 * Show loading state in bubble
 */
function showBubbleLoading() {
    if (!bubbleElement || !bubbleContent) return;

    if (bubbleTimeout) {
        clearTimeout(bubbleTimeout);
        bubbleTimeout = null;
    }

    bubbleContent.textContent = 'Thinking';
    bubbleContent.classList.add('loading');
    bubbleElement.classList.add('visible');
}

/**
 * Hide the speech bubble
 */
function hideBubble() {
    if (!bubbleElement) return;

    if (bubbleTimeout) {
        clearTimeout(bubbleTimeout);
        bubbleTimeout = null;
    }

    bubbleContent?.classList.remove('loading');
    bubbleElement.classList.remove('visible');
}

// ============================================
// Sound
// ============================================

const notificationSound = document.getElementById('notification-sound');
const clickSound = document.getElementById('click-sound');
const jumpSound = document.getElementById('jump-sound');

/**
 * Play sound with error handling
 * @param {HTMLAudioElement} audioElement
 * @param {number} volume - 0 to 1
 */
function playSound(audioElement, volume = 0.5) {
    if (!audioElement) return;

    try {
        audioElement.currentTime = 0;
        audioElement.volume = volume;

        const playPromise = audioElement.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.warn('[Sound] Failed to play:', error.message);
            });
        }
    } catch (error) {
        console.warn('[Sound] Error:', error.message);
    }
}

/**
 * Play notification sound (when Pomodoro completes)
 */
function playNotificationSound() {
    playSound(notificationSound, 0.6);
}

/**
 * Play click sound (for UI interactions)
 */
function playClickSound() {
    playSound(clickSound, 0.3);
}

/**
 * Play jump sound (when drag ends)
 */
function playJumpSound() {
    playSound(jumpSound, 0.4);
}

// ============================================
// Chat Input Manager
// ============================================

class ChatManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.container = document.getElementById('chat-input-container');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
        this.isVisible = false;
        this.isProcessing = false;

        this.init();
    }

    init() {
        if (!this.container || !this.input || !this.sendBtn) {
            console.warn('[Chat] Chat elements not found');
            return;
        }

        // Send on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Send on Enter key
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Prevent drag when typing
        this.input.addEventListener('mousedown', (e) => e.stopPropagation());
        this.container.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    show() {
        if (this.isVisible) return;

        this.isVisible = true;
        this.container.classList.add('visible');
        hideBubble();

        // Focus input after animation
        setTimeout(() => {
            this.input.focus();
        }, 100);

        console.log('[Chat] Input shown');
    }

    hide() {
        if (!this.isVisible) return;

        this.isVisible = false;
        this.container.classList.remove('visible');
        this.input.value = '';

        console.log('[Chat] Input hidden');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isProcessing) return;

        this.isProcessing = true;
        this.sendBtn.disabled = true;
        this.input.value = '';

        // Hide input, show loading
        this.hide();

        // Change state to thinking (visual feedback)
        const previousState = this.stateMachine.state;
        this.stateMachine.transition(STATES.THINKING);

        // Show loading bubble
        showBubbleLoading();

        try {
            // Call AI service via IPC (uses LLMHandler in main process)
            const response = await window.deskmate.askAI(text);

            // Switch to talking state for response
            this.stateMachine.transition(STATES.TALKING);

            // Show response
            const message = response.success ? response.message : response.message;
            showBubble(message, 6000);

            console.log('[Chat] AI Response:', response);
        } catch (error) {
            console.error('[Chat] Error:', error);
            showBubble("I can't reach the server right now. 🌐", 3000);
        } finally {
            this.isProcessing = false;
            this.sendBtn.disabled = false;

            // Return to previous state after a delay
            setTimeout(() => {
                const currentState = this.stateMachine.state;
                if (currentState === STATES.TALKING || currentState === STATES.THINKING) {
                    this.stateMachine.transition(
                        previousState !== STATES.TALKING && previousState !== STATES.THINKING
                            ? previousState
                            : STATES.IDLE
                    );
                }
            }, 1000);
        }
    }
}

// ============================================
// Character & Click-Through Logic
// ============================================

const character = document.getElementById('character');

/**
 * Update character appearance based on state
 */
function updateCharacter(state) {
    if (!character) return;
    character.dataset.state = state;
}

/**
 * Check if sprite image loaded successfully
 */
function checkSpriteLoaded() {
    if (!character) return;

    // Get computed background image
    const bgImage = getComputedStyle(character).backgroundImage;

    // If no background image or it's "none", add fallback class
    if (!bgImage || bgImage === 'none') {
        console.log('[Sprite] No sprite found, using fallback');
        character.classList.add('no-sprite');
    } else {
        // Test if image actually loaded by creating a test image
        const url = bgImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        const testImg = new Image();
        testImg.onload = () => {
            console.log('[Sprite] Sprite loaded successfully');
            character.classList.remove('no-sprite');
        };
        testImg.onerror = () => {
            console.log('[Sprite] Sprite failed to load, using fallback');
            character.classList.add('no-sprite');
        };
        testImg.src = url;
    }
}

/**
 * Handle mouse enter/leave for click-through toggle
 */
function setupClickThrough() {
    // When mouse enters the character, disable click-through
    character?.addEventListener('mouseenter', () => {
        window.deskmate.setIgnoreMouseEvents(false);
    });

    // When mouse leaves the character, enable click-through
    character?.addEventListener('mouseleave', () => {
        window.deskmate.setIgnoreMouseEvents(true);
    });

    // Also handle chat input
    const chatContainer = document.getElementById('chat-input-container');
    chatContainer?.addEventListener('mouseenter', () => {
        window.deskmate.setIgnoreMouseEvents(false);
    });
    chatContainer?.addEventListener('mouseleave', () => {
        window.deskmate.setIgnoreMouseEvents(true);
    });
}

// ============================================
// Random Interactions
// ============================================

const RANDOM_MESSAGES = [
    "...zzZ 💤",
    "*yawn* 🥱",
    "Nice weather today! ☀️",
    "*stretches* 😸",
    "Meow~ 🐱",
    "I'm bored... play with me!",
    "*purrs* 😻",
    "Working hard or hardly working? 😏",
    "*stares at something invisible*",
    "Got any snacks? 🍪",
    "What are you up to?",
    "*cleaning paws* 🐾",
    "Time for a break? ☕",
    "*tail swish*",
    "Thinking of fish... 🐟"
];

class RandomInteractionManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.minInterval = 30000;  // 30 seconds minimum
        this.maxInterval = 120000; // 2 minutes maximum
        this.timerId = null;

        this.scheduleNext();

        // Stop random interactions when not idle
        stateMachine.on('stateChange', ({ current }) => {
            if (current !== STATES.IDLE) {
                this.stop();
            } else {
                this.scheduleNext();
            }
        });
    }

    scheduleNext() {
        if (this.timerId) return; // Already scheduled

        const delay = this.minInterval + Math.random() * (this.maxInterval - this.minInterval);

        this.timerId = setTimeout(() => {
            this.timerId = null;
            this.interact();
        }, delay);
    }

    stop() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    interact() {
        // Only interact when idle
        if (this.stateMachine.state !== STATES.IDLE) {
            return;
        }

        // Pick random message
        const message = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];

        // Show bubble
        showBubble(message, 3000);

        // Maybe play a sound (30% chance)
        if (Math.random() < 0.3) {
            playClickSound();
        }

        console.log('[Random] Interaction:', message);

        // Schedule next
        this.scheduleNext();
    }
}

// ============================================
// Reminder Manager
// ============================================

const REMINDER_PRESETS = {
    water: { label: '💧 喝水', interval: 10000, message: '该喝水啦！💧 保持水分哦~' },
    rest: { label: '👀 休息眼睛', interval: 20 * 60 * 1000, message: '看看远处，让眼睛休息一下~ 👀' },
    stretch: { label: '🧘 伸展', interval: 45 * 60 * 1000, message: '起来活动活动筋骨吧！🧘' }
};

class ReminderManager {
    constructor() {
        this.activeReminders = new Map(); // type -> { timerId, repeatCount }
        this.maxRepeats = 3;
        this.repeatInterval = 60 * 1000; // 1 minute between repeats
        this.pendingConfirm = null;
    }

    /**
     * Start a reminder
     * @param {string} type - Reminder type (water, rest, stretch)
     */
    start(type) {
        if (!REMINDER_PRESETS[type]) {
            console.warn('[Reminder] Unknown type:', type);
            return;
        }

        // Stop existing reminder of this type
        this.stop(type);

        const preset = REMINDER_PRESETS[type];
        const timerId = setTimeout(() => this.trigger(type), preset.interval);

        this.activeReminders.set(type, { timerId, repeatCount: 0 });
        console.log(`[Reminder] Started: ${type} (${preset.interval / 60000} min)`);
    }

    /**
     * Stop a reminder
     */
    stop(type) {
        const reminder = this.activeReminders.get(type);
        if (reminder) {
            clearTimeout(reminder.timerId);
            this.activeReminders.delete(type);
            console.log(`[Reminder] Stopped: ${type}`);
        }
    }

    /**
     * Trigger a reminder notification
     */
    trigger(type) {
        const preset = REMINDER_PRESETS[type];
        const reminder = this.activeReminders.get(type);

        if (!preset || !reminder) return;

        // Show notification with confirm hint
        playNotificationSound();
        const messageWithButton = `${preset.message}`;
        showBubble(messageWithButton, 0); // Stay until dismissed
        window.deskmate.showNotification('DeskMate 提醒', preset.message);

        // Store pending confirmation
        this.pendingConfirm = type;

        reminder.repeatCount++;
        console.log(`[Reminder] Triggered: ${type} (${reminder.repeatCount}/${this.maxRepeats})`);

        // Schedule repeat if not confirmed
        if (reminder.repeatCount < this.maxRepeats) {
            reminder.timerId = setTimeout(() => this.trigger(type), this.repeatInterval);
        } else {
            // Max repeats reached, restart the cycle
            console.log(`[Reminder] Max repeats reached for ${type}, restarting cycle`);
            this.start(type);
        }
    }

    /**
     * User confirmed the reminder
     */
    confirm() {
        if (this.pendingConfirm) {
            const type = this.pendingConfirm;
            this.pendingConfirm = null;
            hideBubble();

            // IMPORTANT: Stop current timer first to prevent continued repeats
            this.stop(type);

            // Then restart the full cycle from beginning
            this.start(type);

            showBubble('收到！✅', 1500);
            console.log(`[Reminder] Confirmed: ${type}`);
        }
    }

    /**
     * Get active reminder types
     */
    getActive() {
        return Array.from(this.activeReminders.keys());
    }

    /**
     * Toggle a reminder on/off
     */
    toggle(type) {
        if (this.activeReminders.has(type)) {
            this.stop(type);
            return false;
        } else {
            this.start(type);
            return true;
        }
    }
}

// Global reminder manager
let reminderManager = null;

// ============================================
// Context Menu
// ============================================

function setupContextMenu() {
    character?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.deskmate.showContextMenu();
    });
}

// ============================================
// Initialization
// ============================================

/** @type {ChatManager} */
let chatManager = null;

function init() {
    console.log('[DeskMate] Initializing Phase 2...');

    // Check sprite loading
    checkSpriteLoaded();

    // Create state machine
    const stateMachine = new StateMachine(STATES.IDLE);

    // Create pomodoro manager
    const pomodoro = new PomodoroManager(stateMachine);

    // Create drag manager
    if (character) {
        new DragManager(character, stateMachine);
    }

    // Create chat manager
    chatManager = new ChatManager(stateMachine);

    // Setup click-through
    setupClickThrough();

    // Setup context menu
    setupContextMenu();

    // Listen for state changes to update character
    stateMachine.on('stateChange', ({ current }) => {
        updateCharacter(current);
    });

    // Listen for pomodoro events from main process
    window.deskmate.onPomodoroStart((minutes) => {
        pomodoro.start(minutes);
    });

    window.deskmate.onPomodoroStop(() => {
        pomodoro.stop();
    });

    // Listen for "Talk to Pet" event
    window.deskmate.onTalkToPet(() => {
        chatManager?.show();
    });

    // Setup random interactions
    new RandomInteractionManager(stateMachine);

    // Initialize reminder manager
    reminderManager = new ReminderManager();

    // Listen for reminder events from main process
    window.deskmate.onReminderToggle?.((type) => {
        if (reminderManager) {
            const active = reminderManager.toggle(type);
            const preset = REMINDER_PRESETS[type];
            if (active) {
                showBubble(`${preset.label} 提醒已开启 ✅`, 2000);
            } else {
                showBubble(`${preset.label} 提醒已关闭`, 2000);
            }
        }
    });

    // Click on character confirms pending reminder
    character?.addEventListener('click', () => {
        if (reminderManager?.pendingConfirm) {
            reminderManager.confirm();
        }
    });

    // Initial state
    updateCharacter(STATES.IDLE);

    // Welcome message
    setTimeout(() => {
        showBubble('Hey there! 👋', 3000);
    }, 500);

    console.log('[DeskMate] Phase 2 Ready!');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
