/**
 * Drag Controller - Handles pet dragging and click interactions
 * Migrated to TypeScript for Phase 17
 * 
 * @module features/DragController
 */

interface Point {
    x: number;
    y: number;
}

export class DragController {
    private character: HTMLElement;
    private isDragging: boolean = false;
    private hasMoved: boolean = false;

    // Position tracking
    private startMouse: Point = { x: 0, y: 0 };
    private startWin: Point = { x: 0, y: 0 };

    // Dependencies
    // Note: In legacy mode we received StateMachine, but now we use module imports or global access
    private stateMachine: any;

    constructor(stateMachine?: any) {
        this.stateMachine = stateMachine;

        const el = document.getElementById('character');
        if (!el) throw new Error('Character element not found');
        this.character = el;

        this.init();
    }

    private init(): void {
        // Toggle click-through when hovering the character
        this.character.addEventListener('mouseenter', () => {
            window.deskmate.setIgnoreMouseEvents(false);
        });

        this.character.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                window.deskmate.setIgnoreMouseEvents(true);
            }
        });

        this.character.addEventListener('mousedown', (e) => this.onMouseDown(e as MouseEvent));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e as MouseEvent));
        window.addEventListener('mouseup', () => this.onMouseUp());
    }

    private async onMouseDown(e: MouseEvent): Promise<void> {
        // Prevent drag if context menu (right click)
        if (e.button === 2) return;

        this.startMouse = { x: e.screenX, y: e.screenY };

        // Get window position from main process
        const [x, y] = await window.deskmate.getWindowPosition();
        this.startWin = { x, y };

        // Start dragging logic
        this.isDragging = true;
        this.hasMoved = false;

        // Transition to drag state
        this.transitionTo('drag');
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.isDragging) return;

        const dx = e.screenX - this.startMouse.x;
        const dy = e.screenY - this.startMouse.y;

        // Perform move immediately (fixes lag)
        window.deskmate.setWindowPosition(this.startWin.x + dx, this.startWin.y + dy);

        // Mark as moved if threshold exceeded (for sound distinction only)
        if (!this.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            this.hasMoved = true;
        }

        // Reset idle timer in scheduler if available
        if (window.TriggerScheduler) {
            // We can't access instance directly easily, but renderer keeps reference
            // For now, we rely on mouse interaction resetting idle usage elsewhere or add explicit integration later
        }
    }

    private onMouseUp(): void {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Dismiss any active notification
        // Note: notificationManager is global in legacy system
        if ((window as any).notificationManager) {
            (window as any).notificationManager.dismiss();
        }

        // Sound Logic: Click vs Drag (Jump)
        if (this.hasMoved) {
            // Dragged -> Jump loop/land
            // Legacy sound function, should migrate to SoundManager eventually
            if (typeof (window as any).playJumpSound === 'function') {
                (window as any).playJumpSound();
            }
        } else {
            // Stationary -> Click
            if (typeof (window as any).playClickSound === 'function') {
                (window as any).playClickSound();
            }
        }

        // Return to previous state or idle
        this.revertState();
    }

    /**
     * Helper to transition state using whatever engine is available
     */
    private transitionTo(state: string): void {
        if (this.stateMachine && typeof this.stateMachine.transition === 'function') {
            this.stateMachine.transition(state);
        } else if (window.BehaviorEngine) {
            // We'd need the instance here. 
            // For now, assuming drag controller is injected with stateMachine adapter which handles this.
        }
    }

    private revertState(): void {
        const sm = this.stateMachine;
        if (sm) {
            if (typeof sm.revert === 'function') {
                sm.revert();
            } else if (typeof sm.transition === 'function') {
                sm.transition('idle');
            }
        }
    }
}
