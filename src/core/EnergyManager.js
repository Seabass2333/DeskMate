/**
 * Energy Manager - Handles pet energy/mood system
 */

const ENERGY_TIERS = {
    exhausted: { min: 0, max: 10, animations: ['Dead', 'Dead1', 'Dead2'] },
    tired: { min: 11, max: 30, animations: ['Sleeping'] },
    relaxed: { min: 31, max: 50, animations: ['Chilling', 'Idle'] },
    normal: { min: 51, max: 70, animations: ['Idle', 'Happy'] },
    energetic: { min: 71, max: 85, animations: ['Happy', 'Excited'] },
    hyper: { min: 86, max: 100, animations: ['Dance', 'Excited', 'Running'] }
};

class EnergyManager {
    constructor() {
        this.energy = 75;
        this.lastUpdate = Date.now();
        this.decayInterval = null;
        this.DECAY_RATE = 1;
        this.DECAY_INTERVAL_MS = 10 * 60 * 1000;
        this.MIN_ENERGY = 5;
        this.MAX_ENERGY = 100;
    }

    async init() {
        try {
            const state = await window.deskmate.getPetState();
            this.energy = state.energy || 75;
            this.lastUpdate = new Date(state.lastEnergyUpdate || Date.now()).getTime();

            const timeSinceLastUpdate = Date.now() - this.lastUpdate;
            const decayIntervals = Math.floor(timeSinceLastUpdate / this.DECAY_INTERVAL_MS);
            if (decayIntervals > 0) {
                this.energy = Math.max(this.MIN_ENERGY, this.energy - (decayIntervals * this.DECAY_RATE));
                this.save();
            }

            this.startDecayTimer();
            this.updateUI();

            console.log(`[EnergyManager] Initialized with energy: ${this.energy}`);
        } catch (error) {
            console.warn('[EnergyManager] Init error:', error);
        }
    }

    startDecayTimer() {
        this.decayInterval = setInterval(() => {
            this.modifyEnergy(-this.DECAY_RATE);
            console.log(`[EnergyManager] Decay: energy now ${this.energy}`);
        }, this.DECAY_INTERVAL_MS);
    }

    async modifyEnergy(delta) {
        this.energy = Math.max(this.MIN_ENERGY, Math.min(this.MAX_ENERGY, this.energy + delta));
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
        const bar = document.getElementById('energy-bar');
        if (!bar) return;

        // Update width
        bar.style.width = `${this.energy}%`;

        // Update color based on tier
        bar.classList.remove('tired', 'energetic');
        const tier = this.getTier();
        if (tier === 'exhausted' || tier === 'tired') {
            bar.classList.add('tired');
        } else if (tier === 'energetic' || tier === 'hyper') {
            bar.classList.add('energetic');
        }
    }
}

// Expose to window
window.EnergyManager = EnergyManager;
