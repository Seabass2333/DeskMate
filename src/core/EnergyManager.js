/**
 * Energy Manager - Handles pet energy/mood system
 * 
 * Responsibilities:
 * - Track energy level (5-100)
 * - Energy decay over time
 * - Persist energy state
 * - Get status messages based on tier
 */

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

// Configuration constants
const ENERGY_CONFIG = {
    DECAY_RATE: 1,              // Energy lost per interval
    DECAY_INTERVAL_MS: 10 * 60 * 1000,  // 10 minutes
    MIN_ENERGY: 5,
    MAX_ENERGY: 100,
    DEFAULT_ENERGY: 75
};

class EnergyManager {
    constructor() {
        this.energy = ENERGY_CONFIG.DEFAULT_ENERGY;
        this.lastUpdate = Date.now();
        this.decayInterval = null;
    }

    async init() {
        try {
            const state = await window.deskmate.getPetState();
            this.energy = state.energy || ENERGY_CONFIG.DEFAULT_ENERGY;
            this.lastUpdate = new Date(state.lastEnergyUpdate || Date.now()).getTime();

            // Calculate energy decay since last session
            const timeSinceLastUpdate = Date.now() - this.lastUpdate;
            const decayIntervals = Math.floor(timeSinceLastUpdate / ENERGY_CONFIG.DECAY_INTERVAL_MS);
            if (decayIntervals > 0) {
                this.energy = Math.max(ENERGY_CONFIG.MIN_ENERGY, this.energy - (decayIntervals * ENERGY_CONFIG.DECAY_RATE));
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
            this.modifyEnergy(-ENERGY_CONFIG.DECAY_RATE);
            console.log(`[EnergyManager] Decay: energy now ${this.energy}`);
        }, ENERGY_CONFIG.DECAY_INTERVAL_MS);
    }

    stopDecayTimer() {
        if (this.decayInterval) {
            clearInterval(this.decayInterval);
            this.decayInterval = null;
        }
    }

    async modifyEnergy(delta) {
        this.energy = Math.max(
            ENERGY_CONFIG.MIN_ENERGY,
            Math.min(ENERGY_CONFIG.MAX_ENERGY, this.energy + delta)
        );
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
        // UI Bar removed per user request - placeholder for future use
    }
}

// Export for browser (window) and potential future module bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnergyManager, ENERGY_TIERS, ENERGY_CONFIG };
}
if (typeof window !== 'undefined') {
    window.EnergyManager = EnergyManager;
}
