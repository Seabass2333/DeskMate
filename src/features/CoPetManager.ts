/**
 * CoPetManager - Handles 1v1 shared pet ambient interactions on the desktop
 *
 * @module features/CoPetManager
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import type { EnergyManager } from '../core/EnergyManager';
import type { SoundManager } from '../audio/SoundManager';
import { showBubble } from '../ui/BubbleManager';

export interface CoPetPartnerEvent {
    id?: string;
    actionType: 'touch' | 'feed' | 'water_nudge' | 'pomodoro_cheer';
    partnerNickname: string;
    timestamp?: string;
}

export interface CoPetOutboundFeedback {
    actionType: 'touch' | 'feed' | 'water_nudge' | 'pomodoro_cheer';
    message: string;
}

export class CoPetManager {
    private behaviorEngine: BehaviorEngine;
    private energyManager: EnergyManager | null;
    private soundManager: SoundManager | null;

    constructor(
        behaviorEngine: BehaviorEngine,
        energyManager?: EnergyManager | null,
        soundManager?: SoundManager | null
    ) {
        this.behaviorEngine = behaviorEngine;
        this.energyManager = energyManager ?? null;
        this.soundManager = soundManager ?? null;

        // Listen for incoming events from the remote partner
        window.deskmate?.onCoPetPartnerEvent?.((event: CoPetPartnerEvent) => {
            this.handlePartnerEvent(event);
        });

        // Listen for outbound confirmation when local user triggers a Co-Pet menu item
        window.deskmate?.onCoPetOutboundFeedback?.((feedback: CoPetOutboundFeedback) => {
            this.handleOutboundFeedback(feedback);
        });
    }

    /**
     * Handle an incoming ambient signal from the remote partner
     */
    async handlePartnerEvent(event: CoPetPartnerEvent): Promise<void> {
        if (!event || !event.actionType) return;

        const partner = event.partnerNickname || '远方的 TA';
        const isQuiet = this.behaviorEngine.isQuietMode();

        let bubbleText = '';
        let energyDelta = 0;
        let targetState = 'interact';

        switch (event.actionType) {
            case 'touch':
                bubbleText = `💞 「${partner}」隔空摸了摸我喵~ (+2 体力)`;
                energyDelta = 2;
                targetState = 'interact';
                break;
            case 'feed':
                bubbleText = `🐟 「${partner}」刚投喂了美味小鱼干！(+5 体力)`;
                energyDelta = 5;
                targetState = 'interact';
                break;
            case 'water_nudge':
                bubbleText = `💧 「${partner}」拍了拍我，提醒你喝口水休息一下~`;
                energyDelta = 1;
                targetState = this.behaviorEngine.getValidStates().includes('dance') ? 'dance' : 'interact';
                break;
            case 'pomodoro_cheer':
                bubbleText = `🍅 「${partner}」完成了一次专注，给你加油打气！(+5 体力)`;
                energyDelta = 5;
                targetState = this.behaviorEngine.getValidStates().includes('dance') ? 'dance' : 'interact';
                break;
            default:
                return;
        }

        if (this.energyManager && energyDelta > 0) {
            await this.energyManager.modifyEnergy(energyDelta);
        }

        // Zero-intrusion rule: If in Quiet Mode (pet sleeping), silently absorb energy without waking or making noise
        if (isQuiet) {
            console.log(`[CoPetManager] Quiet mode active; silently absorbed ${event.actionType} from ${partner}`);
            return;
        }

        showBubble(bubbleText, 4500);
        this.behaviorEngine.transition(targetState);

        if (this.soundManager) {
            this.soundManager.play('interact');
        }
    }

    /**
     * Handle visual feedback when the local user sends an action to the partner
     */
    handleOutboundFeedback(feedback: CoPetOutboundFeedback): void {
        if (!feedback || !feedback.message) return;

        showBubble(feedback.message, 3500);

        if (!this.behaviorEngine.isQuietMode()) {
            const state = feedback.actionType === 'water_nudge' && this.behaviorEngine.getValidStates().includes('dance')
                ? 'dance'
                : 'interact';
            this.behaviorEngine.transition(state);
        }
    }
}
