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
window.notificationManager = notificationManager; // Expose for DragController

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
    // DragController is now handled by modern system (renderer.ts)
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
    window.energyManager = energyManager; // Expose for other controllers
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

        // Sync with Modern System (Phase 17 Fix)
        const modernEngine = window.__modernSystem?.behaviorEngine;
        if (modernEngine && typeof modernEngine.setQuietMode === 'function') {
            console.log(`[Renderer] Syncing Quiet Mode to Modern Engine: ${enabled}`);
            modernEngine.setQuietMode(enabled);
        }
    });

    // 5. Pomodoro Listener (Handled by PomodoroManager)

    // 6. Click Interaction
    // 6. Click Interaction (Legacy Disabled - Moved to DragController.ts)
    // 6. Click Interaction (Legacy Disabled - Moved to DragController.ts)
    // Code removed to prevent double-interactions


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
                animManager.play(STATES.SLEEP);
            } else {
                // Fallback to idle if no sleep animation
                stateMachine.transition(STATES.IDLE);
                animManager.play(STATES.IDLE);
            }
        } else {
            const hasIdle = animManager.skinManager.getAnimation('idle');
            if (hasIdle) {
                stateMachine.transition(STATES.IDLE);
                animManager.play(STATES.IDLE);
            } else {
                // Get first available animation key from new skin
                const animations = animManager.skinManager.currentSkin?.animations;
                const firstState = animations ? Object.keys(animations)[0] : 'idle';
                stateMachine.transition(firstState);
                animManager.play(firstState);
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

    // 11. Random Idle Bubble System
    let idleBubbleTimer = null;

    function scheduleIdleBubble() {
        // Clear existing timer
        if (idleBubbleTimer) clearTimeout(idleBubbleTimer);

        // Only show bubbles when in IDLE state and not in quiet mode
        if (stateMachine.state !== STATES.IDLE || stateMachine.quietMode) {
            // Retry check in 30 seconds
            idleBubbleTimer = setTimeout(scheduleIdleBubble, 30000);
            return;
        }

        // Random delay between 45-120 seconds
        const delay = Math.random() * 75000 + 45000;
        idleBubbleTimer = setTimeout(async () => {
            // Double-check still in idle
            if (stateMachine.state === STATES.IDLE && !stateMachine.quietMode) {
                // Get current skin ID to show relevant personality
                const currentSkin = await window.deskmate.getCurrentSkin();
                const skinId = currentSkin ? currentSkin.id : 'default';
                const msg = await window.deskmate.getRandomIdleMessage(skinId);
                showBubble(msg, 4000);
            }
            scheduleIdleBubble(); // Schedule next
        }, delay);
    }

    // Start idle bubble system
    scheduleIdleBubble();

    // 12. Holiday Easter Eggs
    checkHoliday();

    // 13. Bridge Modern System Visuals (Phase 17 Fix)
    // Listen to BehaviorEngine state changes to drive AnimationManager
    const waitForModern = setInterval(() => {
        const engine = window.__modernSystem?.behaviorEngine;
        if (engine) {
            clearInterval(waitForModern);
            console.log('[Renderer] Connected to Modern Behavior Engine');

            engine.on('stateChange', (event) => {
                const newState = event.data.to;
                console.log(`[Renderer] Visual Sync: ${newState}`);

                // Update Legacy StateMachine (to keep sync)
                stateMachine.state = newState;
                stateMachine.previousState = event.data.from;

                // Drive Animation
                animManager.play(newState);
            });
        }
    }, 100);

    console.log('[Renderer] Phase 2 Ready!');
}

function checkHoliday() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const appEl = document.getElementById('app');

    // Remove existing holiday classes/elements first
    appEl.classList.remove('holiday-xmas', 'holiday-cny');
    const existingSnow = document.getElementById('snow-container');
    if (existingSnow) existingSnow.remove();

    // Christmas (Dec 24-26)
    if (month === 12 && (day >= 24 && day <= 26)) {
        console.log('[Renderer] Holiday: Christmas (Active)');
        appEl.classList.add('holiday-xmas');
        spawnSnowflakes();
    }

    // Spring Festival
    if (today.getFullYear() === 2026 && month === 2 && (day >= 15 && day <= 20)) {
        appEl.classList.add('holiday-cny');
        console.log('[Renderer] Holiday: Lunar New Year');
        spawnLanterns();
    }
}

function spawnLanterns() {
    const cnyContainer = document.createElement('div');
    cnyContainer.id = 'cny-container';
    cnyContainer.style.position = 'absolute';
    cnyContainer.style.top = '0';
    cnyContainer.style.left = '0';
    cnyContainer.style.width = '100%';
    cnyContainer.style.height = '100%';
    cnyContainer.style.pointerEvents = 'none';
    cnyContainer.style.zIndex = '10';
    cnyContainer.style.overflow = 'hidden';

    // 1. Dual Lanterns
    const lanternLeft = document.createElement('div');
    lanternLeft.className = 'lantern lantern-left';
    lanternLeft.innerHTML = '🏮';
    cnyContainer.appendChild(lanternLeft);

    const lanternRight = document.createElement('div');
    lanternRight.className = 'lantern lantern-right';
    lanternRight.innerHTML = '🏮';
    cnyContainer.appendChild(lanternRight);

    // 2. Rising Gold Internal Sparkles
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.className = 'gold-sparkle';

        const left = Math.random() * 100;
        const duration = Math.random() * 2 + 3; // 3-5s
        const delay = Math.random() * 5;
        const size = Math.random() * 10 + 5;

        sparkle.style.left = `${left}%`;
        sparkle.style.animationDuration = `${duration}s`;
        sparkle.style.animationDelay = `-${delay}s`;
        sparkle.style.fontSize = `${size}px`;

        cnyContainer.appendChild(sparkle);
    }

    document.getElementById('app').appendChild(cnyContainer);
}

function spawnSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.id = 'snow-container';
    snowContainer.style.position = 'absolute';
    snowContainer.style.top = '0';
    snowContainer.style.left = '0';
    snowContainer.style.width = '100%';
    snowContainer.style.height = '100%';
    snowContainer.style.pointerEvents = 'none';
    snowContainer.style.zIndex = '10';
    snowContainer.style.overflow = 'hidden';

    const particleCount = 25;

    for (let i = 0; i < particleCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';

        const inner = document.createElement('div');
        inner.className = 'snowflake-inner';
        inner.innerHTML = '❄️';

        // Random properties for organic movement
        const left = Math.random() * 100;
        const duration = Math.random() * 3 + 4; // 4-7s (slower fall)
        const delay = Math.random() * -10; // Negative delay for instant start
        const size = Math.random() * 12 + 8; // 8-20px
        const opacity = Math.random() * 0.6 + 0.2;

        // Sway parameters
        const swayDuration = Math.random() * 2 + 3; // 3-5s side to side
        const swayAmplitude = Math.random() * 30 + 10; // 10px-40px sway

        // Set CSS variables
        flake.style.left = `${left}%`;
        flake.style.setProperty('--fall-duration', `${duration}s`);
        flake.style.setProperty('--fall-delay', `${delay}s`);

        inner.style.setProperty('--sway-duration', `${swayDuration}s`);
        inner.style.setProperty('--sway-delay', `${Math.random() * -5}s`);
        inner.style.setProperty('--sway-amplitude', `${swayAmplitude}px`);

        inner.style.fontSize = `${size}px`;
        inner.style.opacity = opacity;

        flake.appendChild(inner);
        snowContainer.appendChild(flake);
    }

    document.getElementById('app').appendChild(snowContainer);
}

init();
