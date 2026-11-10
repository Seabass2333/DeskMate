/**
 * SkinManager - Manages character skins, sprite preloading, and animation resolution
 *
 * @module managers/SkinManager
 */

import type { SkinConfig, LoadedSkin, AnimationConfig, AnimationVariant } from '../types/skin';

export class SkinManager {
    public currentSkin: LoadedSkin | null = null;

    /**
     * Load a skin by ID from the main process and preload its sprite sheets
     */
    async loadSkin(skinId: string): Promise<LoadedSkin> {
        try {
            const config: SkinConfig = await window.deskmate.loadSkin(skinId);
            if (!config) {
                throw new Error(`Failed to load skin config for: ${skinId}`);
            }

            this.currentSkin = {
                ...config,
                path: `assets/skins/${skinId}`
            };

            await this.preloadAssets(this.currentSkin);

            console.log(`[SkinManager] Loaded skin: ${config.name} (${skinId})`);
            return this.currentSkin;
        } catch (error) {
            console.error('[SkinManager] Error loading skin:', error);
            throw error;
        }
    }

    /**
     * Preload all animation sprite sheets to prevent flickering on state transition
     */
    async preloadAssets(config: LoadedSkin): Promise<void> {
        const promises: Promise<void>[] = [];

        const preloadItem = (anim: AnimationConfig) => {
            const src = `${config.path}/${anim.src}`;
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
                img.src = src;
            });
        };

        for (const value of Object.values(config.animations)) {
            if (!value) continue;
            if (Array.isArray(value)) {
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
     * Get animation configuration by state name (supports weighted random variants and nested search)
     */
    getAnimation(name: string): AnimationConfig | null {
        if (!this.currentSkin || !this.currentSkin.animations) return null;

        const animConfig = this.currentSkin.animations[name];
        if (animConfig) {
            if (Array.isArray(animConfig)) {
                return this.pickWeighted(animConfig);
            }
            return animConfig;
        }

        // Fallback: search array animations (e.g. idle or interact) for matching filename/key
        const normalizedTarget = name.toLowerCase();
        for (const value of Object.values(this.currentSkin.animations)) {
            if (Array.isArray(value)) {
                const found = value.find(v => {
                    const baseName = v.src.replace(/\.[^/.]+$/, '').toLowerCase();
                    return baseName === normalizedTarget || v.src.toLowerCase() === normalizedTarget;
                });
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Pick an animation variant using weighted random selection
     */
    private pickWeighted(variants: AnimationVariant[]): AnimationVariant {
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
     * Resolve relative asset path for the active skin
     */
    getAssetPath(filename: string): string | null {
        if (!this.currentSkin) return null;
        return `${this.currentSkin.path}/${filename}`;
    }
}
