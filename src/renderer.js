/**
 * DeskMate Renderer Process - v1.1 Modular
 * 
 * External Modules (loaded via script tags in index.html):
 * - Core: AnimationManager, StateMachine, EnergyManager
 * - Features: PomodoroManager, ReminderManager, DragController, ChatManager
 * - UI: BubbleManager, NotificationManager
 */

// ============================================
// Global Error Handling
// ============================================

window.onerror = function (message, source, lineno, colno, error) {
    console.error('[Renderer Error]', message, '\n  Source:', source, '\n  Line:', lineno);
    // Optionally track errors via analytics
    if (window.deskmate?.trackEvent) {
        window.deskmate.trackEvent('js_error', { message, source, lineno });
    }
    return false; // Allow default handling
};

window.onunhandledrejection = function (event) {
    console.error('[Unhandled Promise Rejection]', event.reason);
    if (window.deskmate?.trackEvent) {
        window.deskmate.trackEvent('promise_rejection', {
            message: event.reason?.message || String(event.reason)
        });
    }
};

// Global instances
let energyManager = null;
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
