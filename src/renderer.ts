/**
 * DeskMate Renderer Process - Unified TypeScript Entry Point
 *
 * Single source of truth for the pet window runtime:
 * - Core: AnimationManager, BehaviorEngine, TriggerScheduler, EnergyManager
 * - Audio: SoundManager
 * - UI: BubbleManager, NotificationManager
 * - Features: DragController, ChatManager, PomodoroManager, ReminderManager
 *
 * @module renderer
 */

import { AnimationManager } from './core/AnimationManager';
import { BehaviorEngine } from './core/BehaviorEngine';
import { TriggerScheduler } from './core/TriggerScheduler';
import { EnergyManager } from './core/EnergyManager';
import { SoundManager } from './audio/SoundManager';
import { SkinManager } from './managers/SkinManager';
import { DragController } from './features/DragController';
import { ChatManager } from './features/ChatManager';
import { PomodoroManager } from './features/PomodoroManager';
import { ReminderManager } from './features/ReminderManager';
import { CoPetManager } from './features/CoPetManager';
import { NotificationManager } from './ui/NotificationManager';
import { initBubbleManager, onBubbleDismiss, showBubble, hideBubble } from './ui/BubbleManager';

declare global {
    interface Window {
        deskmate: {
            setIgnoreMouseEvents: (ignore: boolean) => void;
            showContextMenu: () => void;
            getWindowPosition: () => Promise<[number, number]>;
            setWindowPosition: (x: number, y: number) => void;
            showNotification: (title: string, body: string) => void;
            onPomodoroStart: (callback: (minutes: number) => void) => void;
            onPomodoroStop: (callback: () => void) => void;
            setPomodoroState: (isActive: boolean) => void;
            pomodoroComplete: () => void;
            onTalkToPet: (callback: () => void) => void;
            onReminderToggle: (callback: (type: string) => void) => void;
            onReminderLoopModeChange: (callback: (isLoop: boolean) => void) => void;
            reminderComplete: (type: string) => void;
            askAI: (message: string) => Promise<{ success: boolean; message: string }>;
            getSettings: () => Promise<any>;
            onSettingsUpdated: (callback: (settings: any) => void) => void;
            isSoundEnabled: () => Promise<boolean>;
            getSoundVolume?: () => Promise<number>;
            loadSkin: (skinId: string) => Promise<any>;
            getCurrentSkin: () => Promise<any>;
            onSkinChange: (callback: (skinId: string) => void) => void;
            getQuietMode: () => Promise<boolean>;
            onQuietModeChanged: (callback: (enabled: boolean) => void) => void;
            getPetState: () => Promise<any>;
            savePetState: (state: any) => Promise<any>;
            modifyEnergy: (delta: number) => Promise<number>;
            t: (key: string) => Promise<string>;
            getRandomIdleMessage: (skinId: string) => Promise<string>;
            trackEvent?: (name: string, data?: any) => void;
            [key: string]: any;
        };
    }
}

// ============================================
// Global Error Handling
// ============================================

window.onerror = function (message, source, lineno) {
    console.error('[Renderer Error]', message, '\n  Source:', source, '\n  Line:', lineno);
    window.deskmate?.trackEvent?.('js_error', { message, source, lineno });
    return false;
};

window.onunhandledrejection = function (event) {
    console.error('[Unhandled Promise Rejection]', event.reason);
    window.deskmate?.trackEvent?.('promise_rejection', {
        message: event.reason?.message || String(event.reason)
    });
};

// ============================================
// Main Application Bootstrap
// ============================================

async function initApp(): Promise<void> {
    if ((window as any).__deskmateInitialized) {
        return;
    }
    (window as any).__deskmateInitialized = true;

    const charEl = document.getElementById('character');
    if (!charEl) {
        console.error('[Renderer] #character element not found');
        return;
    }

    // 1. Initialize Bubble UI
    initBubbleManager();

    // 2. Initialize Skin & Animation Manager
    const skinManager = new SkinManager();
    const animManager = new AnimationManager(charEl, skinManager);
    await animManager.init();

    // Fetch full skin config from main process (includes basePath for sound loading)
    let skinConfig = await window.deskmate.getCurrentSkin?.();

    // 3. Initialize SoundManager
    const soundManager = new SoundManager();
    if (skinConfig?.sounds) {
        await soundManager.loadSounds(skinConfig.sounds, skinConfig.basePath || '');
    }

    try {
        const soundEnabled = await window.deskmate.isSoundEnabled();
        soundManager.setMuted(!soundEnabled);
    } catch (e) {
        console.warn('[Renderer] Failed to load initial sound state:', e);
    }

    // 4. Initialize Unified BehaviorEngine
    const behaviorEngine = new BehaviorEngine(skinConfig?.behaviors);
    const lastSoundTime = new Map<string, number>();

    behaviorEngine.on('stateChange', (event) => {
        if (event.type !== 'stateChange') return;
        const data = event.data as { from: string; to: string };

        // Drive sprite animation with gentle transition support
        animManager.play(data.to, data.from);

        // Drive state-specific sound
        const stateSound = skinConfig?.sounds?.[data.to];
        if (stateSound) {
            const config = soundManager.getConfig(data.to);
            if (config?.loop) {
                soundManager.loop(data.to);
            } else {
                const now = Date.now();
                const lastTime = lastSoundTime.get(data.to) || 0;
                if (now - lastTime < 300) {
                    return;
                }
                lastSoundTime.set(data.to, now);
                soundManager.stopLoop();
                soundManager.play(data.to);
            }
        } else {
            soundManager.stopLoop();
        }
    });

    // 5. Initialize EnergyManager & TriggerScheduler
    const energyManager = new EnergyManager();
    await energyManager.init();

    const scheduler = new TriggerScheduler(
        behaviorEngine,
        skinConfig?.behaviors?.triggers || []
    );
    scheduler.setContext({ energy: energyManager.getEnergy() });
    energyManager.on('energyChange', (energy: number) => {
        scheduler.setContext({ energy });
    });
    scheduler.start();

    // 6. Initialize Feature & Notification Controllers
    const notificationManager = new NotificationManager(behaviorEngine);
    onBubbleDismiss(() => notificationManager.dismiss());

    const chatManager = new ChatManager(behaviorEngine);
    const dragController = new DragController(behaviorEngine, energyManager, notificationManager, chatManager);
    const pomodoroManager = new PomodoroManager(behaviorEngine, notificationManager, energyManager);
    const reminderManager = new ReminderManager(behaviorEngine, notificationManager, energyManager);
    const coPetManager = new CoPetManager(behaviorEngine, energyManager, soundManager);

    try {
        const settings = await window.deskmate.getSettings();
        if (settings) {
            reminderManager.updateConfiguration(settings);

            // Apply saved volume setting
            if (typeof settings?.sound?.volume === 'number') {
                soundManager.setMasterVolume(settings.sound.volume);
                notificationManager.setVolume(settings.sound.volume);
            }
        }
    } catch (e) {
        console.warn('[Renderer] Failed to load initial settings:', e);
    }

    // 7. Apply Initial Quiet Mode & Ensure Initial Animation Renders
    try {
        const isQuiet = await window.deskmate.getQuietMode();
        behaviorEngine.setQuietMode(isQuiet);
    } catch (e) {
        console.warn('[Renderer] Failed to get initial quiet mode:', e);
    }
    animManager.play(behaviorEngine.getCurrentState());

    // 8. System IPC Event Listeners
    window.deskmate.onQuietModeChanged?.((enabled: boolean) => {
        behaviorEngine.setQuietMode(enabled);
    });

    window.deskmate.onUpdateAvailable?.((info: any) => {
        if (!info || !info.version) return;
        behaviorEngine.transition('interact');
        showBubble(`🎉 发现新版本 v${info.version}！右键我或顶部图标可一键下载更新~`, 8000);
    });

    window.deskmate.onSettingsUpdated?.((settings: any) => {
        if (!settings) return;
        reminderManager.updateConfiguration(settings);

        if (settings.sound) {
            if (typeof settings.sound.enabled === 'boolean') {
                const enabled = settings.sound.enabled;
                soundManager.setMuted(!enabled);
                const currentState = behaviorEngine.getCurrentState();
                const config = soundManager.getConfig(currentState);
                if (enabled && config?.loop && !soundManager.isLooping(currentState)) {
                    soundManager.loop(currentState);
                }
            }
            if (typeof settings.sound.volume === 'number') {
                soundManager.setMasterVolume(settings.sound.volume);
                notificationManager.setVolume(settings.sound.volume);
            }
        }
    });

    window.deskmate.onSkinChange?.(async (skinId: string) => {
        console.log(`[Renderer] Switching skin to: ${skinId}`);
        await animManager.loadSkin(skinId);

        const newSkinConfig = await window.deskmate.getCurrentSkin();
        if (newSkinConfig) {
            skinConfig = newSkinConfig;

            if (newSkinConfig.sounds) {
                await soundManager.loadSounds(newSkinConfig.sounds, newSkinConfig.basePath || '');
            } else {
                soundManager.dispose();
            }

            behaviorEngine.setConfig(newSkinConfig.behaviors);
        }

        behaviorEngine.forceRefresh();
    });

    // 9. Context Menu & Global Escape Key
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.deskmate.showContextMenu();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            chatManager.hide();
            hideBubble();
            notificationManager.dismiss();
        }
    });

    // 10. Random Idle Bubble System
    let idleBubbleTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleIdleBubble = () => {
        if (idleBubbleTimer) clearTimeout(idleBubbleTimer);

        if (behaviorEngine.getCurrentState() !== 'idle' || behaviorEngine.isQuietMode()) {
            idleBubbleTimer = setTimeout(scheduleIdleBubble, 30000);
            return;
        }

        const delay = Math.random() * 75000 + 45000;
        idleBubbleTimer = setTimeout(async () => {
            if (behaviorEngine.getCurrentState() === 'idle' && !behaviorEngine.isQuietMode()) {
                const skinId = skinConfig?.id || 'default';
                const msg = await window.deskmate.getRandomIdleMessage(skinId);
                if (msg) {
                    showBubble(msg, 4000);
                }
            }
            scheduleIdleBubble();
        }, delay);
    };

    scheduleIdleBubble();

    // 11. Holiday Easter Eggs
    checkHoliday();

    // Expose unified runtime for debugging
    (window as any).__deskmate = {
        animManager,
        skinManager,
        soundManager,
        behaviorEngine,
        energyManager,
        scheduler,
        dragController,
        chatManager,
        pomodoroManager,
        reminderManager,
        coPetManager,
        notificationManager
    };

    console.log('[Renderer] Unified DeskMate runtime initialized');
}

// ============================================
// Holiday Visual Effects
// ============================================

function checkHoliday(): void {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.classList.remove('holiday-xmas', 'holiday-cny');
    document.getElementById('snow-container')?.remove();
    document.getElementById('cny-container')?.remove();

    if (month === 12 && day >= 24 && day <= 26) {
        appEl.classList.add('holiday-xmas');
        spawnSnowflakes(appEl);
    }

    if (today.getFullYear() === 2026 && month === 2 && day >= 15 && day <= 20) {
        appEl.classList.add('holiday-cny');
        spawnLanterns(appEl);
    }
}

function spawnLanterns(appEl: HTMLElement): void {
    const cnyContainer = document.createElement('div');
    cnyContainer.id = 'cny-container';
    cnyContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;';

    const lanternLeft = document.createElement('div');
    lanternLeft.className = 'lantern lantern-left';
    lanternLeft.innerHTML = '🏮';
    cnyContainer.appendChild(lanternLeft);

    const lanternRight = document.createElement('div');
    lanternRight.className = 'lantern lantern-right';
    lanternRight.innerHTML = '🏮';
    cnyContainer.appendChild(lanternRight);

    for (let i = 0; i < 12; i++) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.className = 'gold-sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.animationDuration = `${Math.random() * 2 + 3}s`;
        sparkle.style.animationDelay = `-${Math.random() * 5}s`;
        sparkle.style.fontSize = `${Math.random() * 10 + 5}px`;
        cnyContainer.appendChild(sparkle);
    }

    appEl.appendChild(cnyContainer);
}

function spawnSnowflakes(appEl: HTMLElement): void {
    const snowContainer = document.createElement('div');
    snowContainer.id = 'snow-container';
    snowContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;';

    for (let i = 0; i < 25; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';

        const inner = document.createElement('div');
        inner.className = 'snowflake-inner';
        inner.innerHTML = '❄️';

        flake.style.left = `${Math.random() * 100}%`;
        flake.style.setProperty('--fall-duration', `${Math.random() * 3 + 4}s`);
        flake.style.setProperty('--fall-delay', `${Math.random() * -10}s`);

        inner.style.setProperty('--sway-duration', `${Math.random() * 2 + 3}s`);
        inner.style.setProperty('--sway-delay', `${Math.random() * -5}s`);
        inner.style.setProperty('--sway-amplitude', `${Math.random() * 30 + 10}px`);
        inner.style.fontSize = `${Math.random() * 12 + 8}px`;
        inner.style.opacity = String(Math.random() * 0.6 + 0.2);

        flake.appendChild(inner);
        snowContainer.appendChild(flake);
    }

    appEl.appendChild(snowContainer);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
