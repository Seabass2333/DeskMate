/**
 * Chat Manager - Handles AI chat interactions
 */

class ChatManager {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.inputContainer = document.getElementById('chat-input-container');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');

        this.init();
    }

    init() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Toggle chat on IPC event
        window.deskmate.onTalkToPet(() => {
            this.toggle();
        });

        // Toggle click-through when hovering the chat input
        this.inputContainer.addEventListener('mouseenter', () => {
            window.deskmate.setIgnoreMouseEvents(false);
        });

        this.inputContainer.addEventListener('mouseleave', () => {
            window.deskmate.setIgnoreMouseEvents(true);
        });
    }

    toggle() {
        if (this.inputContainer.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.inputContainer.classList.add('visible');
        setTimeout(() => this.input.focus(), 100);
    }

    hide() {
        this.inputContainer.classList.remove('visible');
        this.input.blur();
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        // UI Updates
        this.input.value = '';
        this.inputContainer.classList.remove('visible');

        // Get localized thinking message
        const thinkingMsg = await window.deskmate.t('thinking');
        showBubble(thinkingMsg, 0, true); // Loading state

        // State Transition
        this.stateMachine.transition(STATES.THINKING);

        try {
            const result = await window.deskmate.askAI(text);
            showBubble(result.message || "Meow?", 5000);

            // Interaction visual
            this.stateMachine.transition(STATES.INTERACT);
            setTimeout(() => this.stateMachine.transition(STATES.IDLE), 3000);

        } catch (e) {
            const failedMsg = await window.deskmate.t('connectionFailed');
            showBubble(failedMsg);
            this.stateMachine.transition(STATES.IDLE);
        }
    }
}

// Expose to window
window.ChatManager = ChatManager;
