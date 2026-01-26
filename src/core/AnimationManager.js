/**
 * Animation Manager - Handles sprite animations using Web Animations API
 */

class AnimationManager {
    constructor(element) {
        this.element = element;
        this.currentAnimation = null;
        this.skinManager = new window.SkinManager();
    }

    async init() {
        try {
            const settings = await window.deskmate.getSettings();

            // settings:get returns 'currentSkin' (from config.getSkin()), not 'skin' directly
            const skinId = settings?.currentSkin || settings?.skin || 'mochi-v1';
            await this.skinManager.loadSkin(skinId);
        } catch (e) {
            await this.skinManager.loadSkin('mochi-v1');
        }
    }

    async loadSkin(skinId) {
        console.log(`[AnimationManager] Loading skin: ${skinId}`);
        await this.skinManager.loadSkin(skinId);
        console.log(`[AnimationManager] Skin loaded: ${skinId}`);
    }

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

        const spriteWidth = baseSize * scale * frames;
        const spriteHeight = baseSize * scale;

        const assetPath = this.skinManager.getAssetPath(src);

        this.element.style.backgroundImage = `url('${assetPath}')`;
        this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
        this.element.style.width = `${baseSize * scale}px`;
        this.element.style.height = `${baseSize * scale}px`;

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
}

// Expose to window
window.AnimationManager = AnimationManager;
