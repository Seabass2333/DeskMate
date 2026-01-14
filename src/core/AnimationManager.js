/**
 * Animation Manager - Handles sprite animations using Web Animations API
 * 
 * Responsibilities:
 * - Load and switch skins
 * - Play animations based on state
 * - Manage animation lifecycle
 */

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

// Export for browser (window) and potential future module bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationManager };
}
if (typeof window !== 'undefined') {
    window.AnimationManager = AnimationManager;
}
