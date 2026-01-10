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
        if (this.isActive) this.stop(false);

        this.remainingSeconds = minutes * 60;
        this.isActive = true;

        // Notify main process (optional, if needed for tray status)
        // window.deskmate.setPomodoroState(true);

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

        // Update bubble periodically? Or just let it be silent work
        // Maybe every minute update? Nah, distracting.

        this.timerId = setTimeout(() => this.tick(), 1000);
    }

    stop(completed = false) {
        this.isActive = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        // window.deskmate.setPomodoroState(false);

        if (!completed) {
            this.stateMachine.transition(STATES.IDLE);
            showBubble("Stopped focus.", 2000);
        }
    }

    complete() {
        this.stop(true);
        playNotificationSound();

        // Transition to Sleep/Break
        this.stateMachine.transition(STATES.SLEEP);
        showBubble("Time's up! Take a break~ ☕", 0); // Persist until clicked

        // Auto wake up after a visually distinct break time? 
        // Or just let user click to wake up.
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

        // Play jump/land sound (reuse playSound helper check)
        playJumpSound();

        if (this.previousState && this.previousState !== STATES.DRAG) {
            this.stateMachine.transition(this.previousState);
        } else {
            this.stateMachine.transition(STATES.IDLE);
        }

        // Restore transparency check (if mouse left during drag)
        // We generally can't check 'hover' easily here, but usually it's fine 
        // to leave it 'false' until mouse leaves again. 
        // Or strictly set to false (clickable) since we just released it.
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
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Toggle chat on IPC event
        window.deskmate.onTalkToPet(() => {
            this.inputContainer.classList.toggle('visible');
            if (this.inputContainer.classList.contains('visible')) {
                setTimeout(() => this.input.focus(), 100);
            }
        });
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
            bubbleEl.classList.remove('visible');
        }, duration);
    }
}

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

async function playNotificationSound() {
    const enabled = await window.deskmate.isSoundEnabled();
    if (!enabled) return;
    const audio = document.getElementById('notification-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(e));
    }
}

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
    new ChatManager(stateMachine);
    new PomodoroManager(stateMachine);

    // 4. Initial State
    stateMachine.transition(STATES.IDLE);

    // 5. Pomodoro Listener (Handled by PomodoroManager)

    // 6. Click Interaction
    charEl.addEventListener('click', () => {
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

    console.log('[Renderer] Phase 2 Ready!');
}

init();
