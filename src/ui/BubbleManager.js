/**
 * Bubble Manager - Handles speech bubble display and sound effects
 */

// Bubble elements
const bubbleEl = document.getElementById('speech-bubble');
const bubbleContent = bubbleEl.querySelector('.bubble-content');
let bubbleTimer = null;

/**
 * Show speech bubble with text
 */
function showBubble(text, duration = 3000, isLoading = false) {
    if (bubbleTimer) clearTimeout(bubbleTimer);

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
 * Hide speech bubble
 */
function hideBubble() {
    if (bubbleTimer) {
        clearTimeout(bubbleTimer);
        bubbleTimer = null;
    }
    bubbleEl.classList.remove('visible');
}

// Allow clicking on bubble to dismiss it
bubbleEl.addEventListener('click', () => {
    hideBubble();
});

// Allow clicking-through for bubble (mouse events)
bubbleEl.addEventListener('mouseenter', () => {
    window.deskmate.setIgnoreMouseEvents(false);
});
bubbleEl.addEventListener('mouseleave', () => {
    window.deskmate.setIgnoreMouseEvents(true);
});

// Sound Helpers
async function playJumpSound() {
    const enabled = await window.deskmate.isSoundEnabled();
    if (!enabled) return;
    const audio = document.getElementById('jump-sound');

    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(e));
    }
}

async function playClickSound() {
    const enabled = await window.deskmate.isSoundEnabled();
    if (!enabled) return;
    const audio = document.getElementById('click-sound');

    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(e));
    }
}

// Expose to window
window.showBubble = showBubble;
window.hideBubble = hideBubble;
window.playJumpSound = playJumpSound;
window.playClickSound = playClickSound;
