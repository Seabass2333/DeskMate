/**
 * Manages character skins and assets
 * (Loaded via script tag in renderer)
 */
class SkinManager {
    constructor() {
        this.currentSkin = null;
    }

    /**
     * Load a skin by ID
     * @param {string} skinId 
     * @returns {Promise<Object>} Skin configuration
     */
    async loadSkin(skinId) {
        try {
            // Use bridge to load config from main process
            const config = await window.deskmate.loadSkin(skinId);
            if (!config) throw new Error('Failed to load skin config');

            this.currentSkin = config;
            this.currentSkin.path = `assets/skins/${skinId}`;

            // Preload images
            await this.preloadAssets(config);

            console.log(`[SkinManager] Loaded skin: ${config.name} (${skinId})`);
            return this.currentSkin;
        } catch (error) {
            console.error('[SkinManager] Error loading skin:', error);
            throw error;
        }
    }

    /**
     * Preload all animation frames to prevent flickering
     * @param {Object} config 
     */
    async preloadAssets(config) {
        const promises = [];

        const preloadItem = (anim) => {
            const src = `${config.path}/${anim.src}`;
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = reject;
                img.src = src;
            });
        };

        for (const [key, value] of Object.entries(config.animations)) {
            if (Array.isArray(value)) {
                // Preload all variants
                value.forEach(anim => promises.push(preloadItem(anim)));
            } else {
                promises.push(preloadItem(value));
            }
        }

        try {
            await Promise.all(promises);
            console.log('[SkinManager] Assets preloaded');
        } catch (e) {
            console.warn('[SkinManager] Some assets failed to preload', e);
        }
    }

    /**
     * Get animation configuration by name
     * Supports Weighted Random Selection if config is an array
     * @param {string} name 
     * @returns {Object|null}
     */
    getAnimation(name) {
        if (!this.currentSkin || !this.currentSkin.animations) return null;

        const animConfig = this.currentSkin.animations[name];
        if (!animConfig) return null;

        // Sticky Variant Logic: Optional, if we want consistency during a single state?
        // For now, simple weighted random every time Play is called.

        if (Array.isArray(animConfig)) {
            return this.pickWeighted(animConfig);
        }

        return animConfig;
    }

    /**
     * Pick an item from a weighted array
     * @param {Array} variants 
     */
    pickWeighted(variants) {
        const totalWeight = variants.reduce((sum, item) => sum + (item.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const variant of variants) {
            const weight = variant.weight || 1;
            if (random < weight) {
                return variant;
            }
            random -= weight;
        }
        return variants[0];
    }

    /**
     * Get full URL for an asset
     * @param {string} filename 
     */
    getAssetPath(filename) {
        if (!this.currentSkin) return null;
        return `${this.currentSkin.path}/${filename}`;
    }
}

// Expose to window
window.SkinManager = SkinManager;
