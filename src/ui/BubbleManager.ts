/**
 * BubbleManager - Handles speech bubble display and hover/click interactions
 *
 * @module ui/BubbleManager
 */

let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
let onBubbleDismissCallback: (() => void) | null = null;

function getBubbleElements(): { bubbleEl: HTMLElement | null; bubbleContent: HTMLElement | null } {
    const bubbleEl = document.getElementById('speech-bubble');
    const bubbleContent = bubbleEl ? bubbleEl.querySelector<HTMLElement>('.bubble-content') : null;
    return { bubbleEl, bubbleContent };
}

/**
 * Register a callback to be invoked when user clicks the bubble to dismiss it
 */
export function onBubbleDismiss(callback: () => void): void {
    onBubbleDismissCallback = callback;
}

/**
 * Initialize bubble DOM listeners (click to dismiss, hover mouse capture)
 */
export function initBubbleManager(): void {
    const { bubbleEl } = getBubbleElements();
    if (!bubbleEl) return;

    bubbleEl.addEventListener('click', () => {
        hideBubble();
        if (onBubbleDismissCallback) {
            onBubbleDismissCallback();
        }
    });

    bubbleEl.addEventListener('mouseenter', () => {
        window.deskmate?.setIgnoreMouseEvents(false);
    });

    bubbleEl.addEventListener('mouseleave', () => {
        window.deskmate?.setIgnoreMouseEvents(true);
    });
}

/**
 * Show speech bubble with text
 * @param text - Message text to display
 * @param duration - Auto-hide duration in ms (0 = persistent until dismissed)
 * @param isLoading - Whether to show loading state styling
 */
export function showBubble(text: string, duration: number = 3000, isLoading: boolean = false): void {
    if (bubbleTimer) {
        clearTimeout(bubbleTimer);
        bubbleTimer = null;
    }

    const { bubbleEl, bubbleContent } = getBubbleElements();
    if (!bubbleEl || !bubbleContent) return;

    bubbleContent.textContent = text;
    bubbleContent.classList.toggle('loading', isLoading);
    bubbleEl.classList.add('visible');

    if (duration > 0) {
        bubbleTimer = setTimeout(() => {
            hideBubble();
        }, duration);
    }
}

/**
 * Hide speech bubble immediately
 */
export function hideBubble(): void {
    if (bubbleTimer) {
        clearTimeout(bubbleTimer);
        bubbleTimer = null;
    }

    const { bubbleEl } = getBubbleElements();
    if (bubbleEl) {
        bubbleEl.classList.remove('visible');
    }
}
