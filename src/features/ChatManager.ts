/**
 * ChatManager - Handles AI chat input and response bubbles
 *
 * @module features/ChatManager
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import { showBubble } from '../ui/BubbleManager';

export class ChatManager {
    private behaviorEngine: BehaviorEngine;
    private inputContainer: HTMLElement | null;
    private input: HTMLInputElement | null;
    private sendBtn: HTMLElement | null;

    constructor(behaviorEngine: BehaviorEngine) {
        this.behaviorEngine = behaviorEngine;
        this.inputContainer = document.getElementById('chat-input-container');
        this.input = document.getElementById('chat-input') as HTMLInputElement | null;
        this.sendBtn = document.getElementById('chat-send');

        this.init();
    }

    private init(): void {
        if (!this.inputContainer || !this.input || !this.sendBtn) return;

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        window.deskmate?.onTalkToPet?.(() => {
            this.toggle();
        });

        this.inputContainer.addEventListener('mouseenter', () => {
            window.deskmate?.setIgnoreMouseEvents(false);
        });

        this.inputContainer.addEventListener('mouseleave', () => {
            window.deskmate?.setIgnoreMouseEvents(true);
        });

        window.deskmate?.t?.('chatPlaceholder').then((text: string) => {
            if (this.input && text) {
                this.input.placeholder = text;
            }
        }).catch(() => {});
    }

    toggle(): void {
        if (!this.inputContainer) return;
        if (this.inputContainer.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        if (!this.inputContainer || !this.input) return;
        this.inputContainer.classList.add('visible');
        setTimeout(() => this.input?.focus(), 100);
    }

    hide(): void {
        if (!this.inputContainer || !this.input) return;
        this.inputContainer.classList.remove('visible');
        this.input.blur();
    }

    async sendMessage(): Promise<void> {
        if (!this.input || !this.inputContainer) return;
        const text = this.input.value.trim();
        if (!text) return;

        this.input.value = '';
        this.inputContainer.classList.remove('visible');

        const thinkingMsg = await window.deskmate.t('thinking');
        showBubble(thinkingMsg, 0, true);

        this.behaviorEngine.transition('thinking');

        try {
            const result = await window.deskmate.askAI(text);
            showBubble(result?.message || 'Meow?', 5000);

            this.behaviorEngine.transition('interact');
            setTimeout(() => {
                if (this.behaviorEngine.getCurrentState() === 'interact') {
                    this.behaviorEngine.transition('idle');
                }
            }, 3000);
        } catch (e) {
            const failedMsg = await window.deskmate.t('connectionFailed');
            showBubble(failedMsg);
            this.behaviorEngine.transition('idle');
        }
    }
}
