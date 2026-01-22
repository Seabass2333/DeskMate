/**
 * Energy Manager - Handles pet energy/mood system
 * Migrated to TypeScript for Phase 17
 * 
 * @module core/EnergyManager
 */

// Energy Tiers Configuration
interface EnergyTier {
    min: number;
    max: number;
    animations: string[];
}

const ENERGY_TIERS: Record<string, EnergyTier> = {
    exhausted: { min: 0, max: 10, animations: ['Dead', 'Dead1', 'Dead2'] },
    tired: { min: 11, max: 30, animations: ['Sleeping'] },
    relaxed: { min: 31, max: 50, animations: ['Chilling', 'Idle'] },
    normal: { min: 51, max: 70, animations: ['Idle', 'Happy'] },
    energetic: { min: 71, max: 85, animations: ['Happy', 'Excited'] },
    hyper: { min: 86, max: 100, animations: ['Dance', 'Excited', 'Running'] }
};

export class EnergyManager {
    private energy: number = 75;
    private lastUpdate: number = Date.now();
    private decayInterval: number | null = null;

    // Constants
    private readonly DECAY_RATE = 1;
    private readonly DECAY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
    private readonly MIN_ENERGY = 5;
    private readonly MAX_ENERGY = 100;

    // Event listeners
    private listeners: Map<string, Array<(data: any) => void>> = new Map();

    constructor() {
    }

    /**
     * Subscribe to events
     */
    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback: (data: any) => void): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    private emit(event: string, data: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[EnergyManager] Error in event listener for ${event}:`, err);
                }
            });
        }
    }

    /**
     * Initialize energy system
     * Loads saved state and catches up decay
     */
    async init(): Promise<void> {
        try {
            const state = await window.deskmate.getPetState();
            this.energy = state?.energy ?? 75;
            this.lastUpdate = new Date(state?.lastEnergyUpdate || Date.now()).getTime();

            // Catch up decay if app was closed
            const timeSinceLastUpdate = Date.now() - this.lastUpdate;
            const decayIntervals = Math.floor(timeSinceLastUpdate / this.DECAY_INTERVAL_MS);

            if (decayIntervals > 0) {
                const decayAmount = decayIntervals * this.DECAY_RATE;
                this.energy = Math.max(this.MIN_ENERGY, this.energy - decayAmount);
                await this.save();
            }

            this.startDecayTimer();
            this.updateUI();
            this.emit('energyChange', this.energy);

            console.log(`[EnergyManager] Initialized with energy: ${this.energy}`);
        } catch (error) {
            console.warn('[EnergyManager] Init error:', error);
        }
    }

    /**
     * Start the background decay timer
     */
    private startDecayTimer(): void {
        // Clear existing if any
        if (this.decayInterval) {
            clearInterval(this.decayInterval);
        }

        // Use window.setInterval to avoid Node.js/browser Timer type conflict issues
        this.decayInterval = window.setInterval(() => {
            this.modifyEnergy(-this.DECAY_RATE);
            console.log(`[EnergyManager] Decay: energy now ${this.energy}`);
        }, this.DECAY_INTERVAL_MS);
    }

    /**
     * Modify energy level
     * @param delta Amount to change (-/+)
     * @returns New energy level
     */
    async modifyEnergy(delta: number): Promise<number> {
        const oldTier = this.getTier();

        this.energy = Math.max(this.MIN_ENERGY, Math.min(this.MAX_ENERGY, this.energy + delta));
        this.lastUpdate = Date.now();

        this.updateUI();
        await this.save();

        // Emit events
        this.emit('energyChange', this.energy);

        const newTier = this.getTier();
        if (oldTier !== newTier) {
            this.emit('tierChange', newTier);
        }

        return this.energy;
    }

    /**
     * Save state to persistence layer
     */
    private async save(): Promise<void> {
        try {
            const petState = await window.deskmate.getPetState() || {};
            petState.energy = this.energy;
            petState.lastEnergyUpdate = new Date().toISOString();
            await window.deskmate.savePetState(petState);
        } catch (error) {
            console.warn('[EnergyManager] Save error:', error);
        }
    }

    /**
     * Get current energy tier name
     */
    getTier(): string {
        for (const [tierName, tierData] of Object.entries(ENERGY_TIERS)) {
            if (this.energy >= tierData.min && this.energy <= tierData.max) {
                return tierName;
            }
        }
        return 'normal';
    }

    /**
     * Get localized status message based on tier
     */
    async getStatusMessage(): Promise<string> {
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

    /**
     * Get current energy value
     */
    getEnergy(): number {
        return this.energy;
    }

    /**
     * Update UI elements (Energy Bar)
     */
    private updateUI(): void {
        const bar = document.getElementById('energy-bar');
        if (!bar) return;

        // Update width
        bar.style.width = `${this.energy}%`;

        // Update color class based on tier
        bar.classList.remove('tired', 'energetic');
        const tier = this.getTier();
        if (tier === 'exhausted' || tier === 'tired') {
            bar.classList.add('tired');
        } else if (tier === 'energetic' || tier === 'hyper') {
            bar.classList.add('energetic');
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.decayInterval) {
            clearInterval(this.decayInterval);
            this.decayInterval = null;
        }
        this.listeners.clear();
    }
}
