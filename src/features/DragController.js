/**
 * Drag Controller - Handles pet dragging and click interactions
 */

class DragController {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.character = document.getElementById('character');
        this.isDragging = false;

        this.init();
    }

    init() {
        // Toggle click-through when hovering the character
        this.character.addEventListener('mouseenter', () => {
            window.deskmate.setIgnoreMouseEvents(false);
        });

        this.character.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                window.deskmate.setIgnoreMouseEvents(true);
            }
        });

        this.character.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
    }

    async onMouseDown(e) {
        // Prevent drag if context menu (right click)
        if (e.button === 2) return;

        this.startMouseX = e.screenX;
        this.startMouseY = e.screenY;

        // Get window position from main process
        const [x, y] = await window.deskmate.getWindowPosition();
        this.startWinX = x;
        this.startWinY = y;

        // Start dragging logic
        this.isDragging = true;
        this.hasMoved = false; // Track if actual movement occurred

        this.stateMachine.transition(STATES.DRAG);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.screenX - this.startMouseX;
        const dy = e.screenY - this.startMouseY;

        // Perform move immediately (fixes lag)
        window.deskmate.setWindowPosition(this.startWinX + dx, this.startWinY + dy);

        // Mark as moved if threshold exceeded (for sound distinction only)
        if (!this.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            this.hasMoved = true;
        }
    }

    onMouseUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Dismiss any active notification
        notificationManager.dismiss();

        // Sound Logic: Click vs Drag (Jump)
        if (this.hasMoved) {
            playJumpSound(); // Dragged -> Jump loop/land
        } else {
            playClickSound(); // Stationary -> Click
        }

        if (this.previousState && this.previousState !== STATES.DRAG) {
            this.stateMachine.transition(this.previousState);
        } else {
            this.stateMachine.transition(STATES.IDLE);
        }
    }
}

// Expose to window
window.DragController = DragController;
