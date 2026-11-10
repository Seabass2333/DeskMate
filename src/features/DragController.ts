/**
 * DragController - Handles pet window dragging and click interactions
 *
 * @module features/DragController
 */

import type { BehaviorEngine } from '../core/BehaviorEngine';
import type { EnergyManager } from '../core/EnergyManager';
import type { NotificationManager } from '../ui/NotificationManager';
import type { ChatManager } from './ChatManager';

interface Point {
    x: number;
    y: number;
}

export class DragController {
    private character: HTMLElement;
    private isDragging: boolean = false;
    private hasMoved: boolean = false;

    private startMouse: Point = { x: 0, y: 0 };
    private startWin: Point = { x: 0, y: 0 };

    private behaviorEngine: BehaviorEngine;
    private energyManager: EnergyManager | null;
    private notificationManager: NotificationManager | null;
    private chatManager: ChatManager | null;

    constructor(
        behaviorEngine: BehaviorEngine,
        energyManager?: EnergyManager | null,
        notificationManager?: NotificationManager | null,
        chatManager?: ChatManager | null
    ) {
        this.behaviorEngine = behaviorEngine;
        this.energyManager = energyManager ?? null;
        this.notificationManager = notificationManager ?? null;
        this.chatManager = chatManager ?? null;

        const el = document.getElementById('character');
        if (!el) throw new Error('Character element not found');
        this.character = el;

        this.init();
    }

    private init(): void {
        this.character.addEventListener('mouseenter', () => {
            window.deskmate?.setIgnoreMouseEvents(false);
        });

        this.character.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                window.deskmate?.setIgnoreMouseEvents(true);
            }
        });

        this.character.addEventListener('mousedown', (e) => this.onMouseDown(e as MouseEvent));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e as MouseEvent));
        window.addEventListener('mouseup', () => this.onMouseUp());

        // Double-click to directly open/close chat input
        this.character.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (this.chatManager) {
                this.chatManager.toggle();
            }
        });
    }

    private async onMouseDown(e: MouseEvent): Promise<void> {
        // Ignore right-click (context menu)
        if (e.button === 2) return;

        this.startMouse = { x: e.screenX, y: e.screenY };

        const [x, y] = await window.deskmate.getWindowPosition();
        this.startWin = { x, y };

        this.isDragging = true;
        this.hasMoved = false;
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.isDragging) return;

        const dx = e.screenX - this.startMouse.x;
        const dy = e.screenY - this.startMouse.y;

        window.deskmate.setWindowPosition(this.startWin.x + dx, this.startWin.y + dy);

        // Distinguish drag (>5px movement) from stationary click
        if (!this.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            this.hasMoved = true;

            if (!this.behaviorEngine.isQuietMode()) {
                this.behaviorEngine.transition('drag');
            }
        }
    }

    private onMouseUp(): void {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Dismiss any active notification when user clicks or drops the pet
        if (this.notificationManager) {
            this.notificationManager.dismiss();
        }

        const isQuiet = this.behaviorEngine.isQuietMode();

        if (this.hasMoved) {
            if (!isQuiet) {
                if (this.energyManager) {
                    this.energyManager.modifyEnergy(5);
                }
                this.behaviorEngine.transition('idle');
            }
        } else {
            if (!isQuiet) {
                if (this.energyManager) {
                    this.energyManager.modifyEnergy(2);
                }
                this.behaviorEngine.transition('interact');
            } else {
                console.log('[DragController] Click ignored (Quiet Mode)');
            }
        }
    }
}
