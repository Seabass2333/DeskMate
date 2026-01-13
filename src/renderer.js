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
        // Load saved skin preference or default
        try {
            const petState = await window.deskmate.getPetState();
            const skinId = petState?.skinId || 'mochi-v1';
            await this.skinManager.loadSkin(skinId);
        } catch (e) {
            // Fallback to default skin
            await this.skinManager.loadSkin('mochi-v1');
        }
    }

    /**
     * Load a new skin dynamically
     * @param {string} skinId - Skin folder name
     */
    async loadSkin(skinId) {
        console.log(`[AnimationManager] Loading skin: ${skinId}`);
        await this.skinManager.loadSkin(skinId);
        console.log(`[AnimationManager] Skin loaded: ${skinId}`);
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
     * Force refresh current animation (used after skin change)
     */
    forceRefresh() {
        if (this.state) {
            this.anim.play(this.state);
            console.log(`[State] Force refreshed: ${this.state}`);
        }
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
// Energy Manager (Pet Mood System)
// ============================================

/**
 * Energy tier definitions for animation selection
 */
const ENERGY_TIERS = {
    exhausted: { min: 0, max: 10, animations: ['Dead', 'Dead1', 'Dead2'] },
    tired: { min: 11, max: 30, animations: ['Sleeping'] },
    relaxed: { min: 31, max: 50, animations: ['Chilling', 'Idle'] },
    normal: { min: 51, max: 70, animations: ['Idle', 'Happy'] },
    energetic: { min: 71, max: 85, animations: ['Happy', 'Excited'] },
    hyper: { min: 86, max: 100, animations: ['Dance', 'Excited', 'Running'] }
};

class EnergyManager {
    constructor() {
        this.energy = 75;
        this.lastUpdate = Date.now();
        this.decayInterval = null;
        this.DECAY_RATE = 1; // Energy lost per interval
        this.DECAY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
        this.MIN_ENERGY = 5;
        this.MAX_ENERGY = 100;
    }

    async init() {
        try {
            const state = await window.deskmate.getPetState();
            this.energy = state.energy || 75;
            this.lastUpdate = new Date(state.lastEnergyUpdate || Date.now()).getTime();

            // Calculate energy decay since last session
            const timeSinceLastUpdate = Date.now() - this.lastUpdate;
            const decayIntervals = Math.floor(timeSinceLastUpdate / this.DECAY_INTERVAL_MS);
            if (decayIntervals > 0) {
                this.energy = Math.max(this.MIN_ENERGY, this.energy - (decayIntervals * this.DECAY_RATE));
                this.save();
            }

            // Start decay timer
            this.startDecayTimer();
            this.updateUI();

            console.log(`[EnergyManager] Initialized with energy: ${this.energy}`);
        } catch (error) {
            console.warn('[EnergyManager] Init error:', error);
        }
    }

    startDecayTimer() {
        this.decayInterval = setInterval(() => {
            this.modifyEnergy(-this.DECAY_RATE);
            console.log(`[EnergyManager] Decay: energy now ${this.energy}`);
        }, this.DECAY_INTERVAL_MS);
    }

    async modifyEnergy(delta) {
        this.energy = Math.max(this.MIN_ENERGY, Math.min(this.MAX_ENERGY, this.energy + delta));
        this.lastUpdate = Date.now();
        this.updateUI();
        await this.save();
        return this.energy;
    }

    async save() {
        try {
            const petState = await window.deskmate.getPetState() || {};
            petState.energy = this.energy;
            petState.lastEnergyUpdate = new Date().toISOString();
            await window.deskmate.savePetState(petState);
        } catch (error) {
            console.warn('[EnergyManager] Save error:', error);
        }
    }

    getTier() {
        for (const [tierName, tierData] of Object.entries(ENERGY_TIERS)) {
            if (this.energy >= tierData.min && this.energy <= tierData.max) {
                return tierName;
            }
        }
        return 'normal';
    }

    getIdleAnimation() {
        const tier = this.getTier();
        const animations = ENERGY_TIERS[tier]?.animations || ['Idle'];
        return animations[Math.floor(Math.random() * animations.length)];
    }

    getEnergy() {
        return this.energy;
    }

    async getStatusMessage() {
        const tier = this.getTier();
        switch (tier) {
            case 'hyper': return await window.deskmate.t('statusHyper');
            case 'energetic': return await window.deskmate.t('statusEnergetic');
            case 'normal': return await window.deskmate.t('statusNormal');
            case 'tired': return await window.deskmate.t('statusTired');
            case 'exhausted': return await window.deskmate.t('statusExhausted');
            default: return await window.deskmate.t('statusMeow');
        }
    }

    updateUI() {
        // UI Bar removed per user request
    }
}

// Global energy manager instance
let energyManager = null;

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

        // Main process already knows about this start (it triggered us)
        // No need to call setPomodoroState here

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

        // Main process handles its own state - don't notify here
        // This prevents the race condition

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

        this.startMouseX = e.screenX;
        this.startMouseY = e.screenY;

        // Get window position from main process
        const [x, y] = await window.deskmate.getWindowPosition();
        this.startWinX = x;
        this.startWinY = y;

        // Start dragging logic
        this.isDragging = true;
        this.hasMoved = false; // Track if actual movement occurred

        this.stateMachine.transition(STATES.DRAG);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.screenX - this.startMouseX;
        const dy = e.screenY - this.startMouseY;

        // Perform move immediately (fixes lag)
        window.deskmate.setWindowPosition(this.startWinX + dx, this.startWinY + dy);

        // Mark as moved if threshold exceeded (for sound distinction only)
        if (!this.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            this.hasMoved = true;
        }
    }

    onMouseUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Dismiss any active notification
        notificationManager.dismiss();

        // Sound Logic: Click vs Drag (Jump)
        if (this.hasMoved) {
            playJumpSound(); // Dragged -> Jump loop/land
        } else {
            playClickSound(); // Stationary -> Click
        }

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

    // 4. Initial State
    stateMachine.transition(STATES.IDLE);

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

        if (stateMachine.state === STATES.IDLE) {
            stateMachine.transition(STATES.INTERACT);
            // Sound handled by DragController
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

        // Reset to idle state, or first available animation if idle doesn't exist
        const hasIdle = animManager.skinManager.getAnimation('idle');
        if (hasIdle) {
            stateMachine.state = null; // Force state change
            stateMachine.transition(STATES.IDLE);
        } else {
            // Get first available animation key from new skin
            const animations = animManager.skinManager.currentSkin?.animations;
            const firstState = animations ? Object.keys(animations)[0] : 'idle';
            stateMachine.state = null;
            stateMachine.transition(firstState);
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
