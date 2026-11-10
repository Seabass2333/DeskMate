/**
 * AnimationManager - Drives sprite sheet animations via the Web Animations API
 *
 * @module core/AnimationManager
 */

import { SkinManager } from '../managers/SkinManager';
import type { LoadedSkin } from '../types/skin';

export class AnimationManager {
    private element: HTMLElement;
    private currentAnimation: Animation | null = null;
    private transitionTimeout: ReturnType<typeof setTimeout> | null = null;
    public skinManager: SkinManager;

    constructor(element: HTMLElement, skinManager?: SkinManager) {
        this.element = element;
        this.skinManager = skinManager ?? new SkinManager();
    }

    async init(): Promise<LoadedSkin | null> {
        try {
            const settings = await window.deskmate.getSettings();
            const skinId = settings?.currentSkin || settings?.skin || 'mochi-v1';
            return await this.skinManager.loadSkin(skinId);
        } catch (e) {
            console.warn('[AnimationManager] Failed to load preferred skin, falling back to mochi-v1:', e);
            try {
                return await this.skinManager.loadSkin('mochi-v1');
            } catch (fallbackError) {
                console.error('[AnimationManager] Fallback skin loading failed:', fallbackError);
                this.applyStaticFallback();
                return null;
            }
        }
    }

    async loadSkin(skinId: string): Promise<LoadedSkin> {
        console.log(`[AnimationManager] Loading skin: ${skinId}`);
        const skin = await this.skinManager.loadSkin(skinId);
        console.log(`[AnimationManager] Skin loaded: ${skinId}`);
        return skin;
    }

    getCurrentSkin(): LoadedSkin | null {
        return this.skinManager.currentSkin;
    }

    /**
     * Play an animation sequence once, then invoke callback
     */
    playOnce(animName: string, onComplete?: () => void): boolean {
        const currentSkin = this.skinManager.currentSkin;
        if (!currentSkin) return false;

        const animConfig = this.skinManager.getAnimation(animName);
        if (!animConfig) return false;

        const { src, frames, speed } = animConfig;
        const baseSize = currentSkin.baseSize[0];
        const scale = currentSkin.scale;

        const spriteWidth = baseSize * scale * frames;
        const spriteHeight = baseSize * scale;

        const assetPath = this.skinManager.getAssetPath(src);
        if (!assetPath) return false;

        if (this.currentAnimation) {
            this.currentAnimation.cancel();
        }
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }

        this.element.style.backgroundImage = `url('${assetPath}')`;
        this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
        this.element.style.width = `${baseSize * scale}px`;
        this.element.style.height = `${baseSize * scale}px`;
        this.element.dataset.state = animName;

        this.currentAnimation = this.element.animate(
            [
                { backgroundPosition: '0 0' },
                { backgroundPosition: `-${spriteWidth}px 0` }
            ],
            {
                duration: speed,
                easing: `steps(${frames}, end)`,
                iterations: 1
            }
        );

        this.transitionTimeout = setTimeout(() => {
            this.transitionTimeout = null;
            if (onComplete) onComplete();
        }, speed);

        return true;
    }

    /**
     * Play continuous animation for a state with optional gentle transition
     */
    play(state: string, fromState?: string): void {
        const currentSkin = this.skinManager.currentSkin;
        if (!currentSkin) return;

        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }

        // Gentle Transition: Entering sleep from any active state
        if (state === 'sleep' && fromState && fromState !== 'sleep') {
            const hasSleepy = this.skinManager.getAnimation('sleep_intro') || this.skinManager.getAnimation('idle_sleepy');
            if (hasSleepy) {
                const animKey = this.skinManager.getAnimation('sleep_intro') ? 'sleep_intro' : 'idle_sleepy';
                console.log(`[Animation] Playing sleep transition: ${animKey}`);
                const started = this.playOnce(animKey, () => {
                    this.playDirect('sleep');
                });
                if (started) return;
            }
        }

        // Gentle Transition: Waking up from sleep to idle
        if (state === 'idle' && fromState === 'sleep') {
            const hasWake = this.skinManager.getAnimation('wake_intro') || this.skinManager.getAnimation('idle_laydown');
            if (hasWake) {
                const animKey = this.skinManager.getAnimation('wake_intro') ? 'wake_intro' : 'idle_laydown';
                console.log(`[Animation] Playing wake transition: ${animKey}`);
                const started = this.playOnce(animKey, () => {
                    this.playDirect('idle');
                });
                if (started) return;
            }
        }

        this.playDirect(state);
    }

    private playDirect(state: string): void {
        const currentSkin = this.skinManager.currentSkin;
        if (!currentSkin) return;

        const animConfig = this.skinManager.getAnimation(state) || this.skinManager.getAnimation('idle');
        if (!animConfig) {
            console.warn(`[Animation] No animation found for state: ${state}`);
            return;
        }

        const { src, frames, speed } = animConfig;
        const baseSize = currentSkin.baseSize[0];
        const scale = currentSkin.scale;

        const spriteWidth = baseSize * scale * frames;
        const spriteHeight = baseSize * scale;

        const assetPath = this.skinManager.getAssetPath(src);
        if (!assetPath) return;

        this.element.style.backgroundImage = `url('${assetPath}')`;
        this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
        this.element.style.width = `${baseSize * scale}px`;
        this.element.style.height = `${baseSize * scale}px`;
        this.element.dataset.state = state;

        if (this.currentAnimation) {
            this.currentAnimation.cancel();
        }

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

    private applyStaticFallback(): void {
        this.element.style.backgroundImage = 'url(assets/skins/mochi-v1/idle.png)';
        this.element.style.backgroundSize = 'contain';
        this.element.style.backgroundRepeat = 'no-repeat';
        this.element.style.width = '128px';
        this.element.style.height = '128px';
    }
}
