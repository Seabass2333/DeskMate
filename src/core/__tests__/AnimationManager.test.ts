import { AnimationManager } from '../AnimationManager';
import { SkinManager } from '../../managers/SkinManager';
import type { LoadedSkin } from '../../types/skin';

describe('AnimationManager & Transitions', () => {
    let element: HTMLElement;
    let skinManager: SkinManager;
    let animManager: AnimationManager;
    let mockAnimation: { cancel: jest.Mock };

    const mockSkin: LoadedSkin = {
        id: 'test-skin',
        name: 'Test Skin',
        version: '1.0.0',
        baseSize: [32, 32],
        scale: 4,
        path: 'assets/skins/test-skin',
        animations: {
            idle: [
                { src: 'idle.png', frames: 10, speed: 1000, weight: 60 },
                { src: 'idle_sleepy.png', frames: 8, speed: 1600, weight: 20 },
                { src: 'idle_laydown.png', frames: 12, speed: 1800, weight: 20 }
            ],
            sleep: { src: 'sleep.png', frames: 4, speed: 2000 },
            sleep_intro: { src: 'idle_sleepy.png', frames: 8, speed: 1600 },
            wake_intro: { src: 'idle_laydown.png', frames: 12, speed: 1800 },
            drag: { src: 'drag.png', frames: 4, speed: 400 }
        }
    };

    beforeEach(() => {
        jest.useFakeTimers();
        mockAnimation = { cancel: jest.fn() };

        element = {
            style: {} as CSSStyleDeclaration,
            dataset: {} as DOMStringMap,
            animate: jest.fn().mockReturnValue(mockAnimation)
        } as unknown as HTMLElement;

        skinManager = new SkinManager();
        skinManager.currentSkin = mockSkin;

        animManager = new AnimationManager(element, skinManager);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('SkinManager animation resolution', () => {
        it('resolves explicit top-level animation config', () => {
            const sleepIntro = skinManager.getAnimation('sleep_intro');
            expect(sleepIntro).not.toBeNull();
            expect(sleepIntro?.src).toBe('idle_sleepy.png');
        });

        it('resolves animation variant nested in array by filename fallback', () => {
            const sleepyVariant = skinManager.getAnimation('idle_sleepy');
            expect(sleepyVariant).not.toBeNull();
            expect(sleepyVariant?.src).toBe('idle_sleepy.png');
            expect(sleepyVariant?.frames).toBe(8);

            const laydownVariant = skinManager.getAnimation('idle_laydown');
            expect(laydownVariant).not.toBeNull();
            expect(laydownVariant?.src).toBe('idle_laydown.png');
        });
    });

    describe('Sleep and Wake gentle transitions', () => {
        it('plays sleep_intro transition when entering sleep from idle', () => {
            const playOnceSpy = jest.spyOn(animManager, 'playOnce');

            animManager.play('sleep', 'idle');

            expect(playOnceSpy).toHaveBeenCalledWith('sleep_intro', expect.any(Function));
            expect(element.dataset.state).toBe('sleep_intro');

            // Complete the intro transition
            jest.advanceTimersByTime(1600);
            expect(element.dataset.state).toBe('sleep');
        });

        it('plays wake_intro transition when waking up from sleep to idle', () => {
            const playOnceSpy = jest.spyOn(animManager, 'playOnce');

            animManager.play('idle', 'sleep');

            expect(playOnceSpy).toHaveBeenCalledWith('wake_intro', expect.any(Function));
            expect(element.dataset.state).toBe('wake_intro');

            // Complete the wake transition
            jest.advanceTimersByTime(1800);
            expect(element.dataset.state).toBe('idle');
        });

        it('cancels pending sleep/wake transition when interrupted by another state', () => {
            animManager.play('sleep', 'idle');
            expect(element.dataset.state).toBe('sleep_intro');

            // Interrupted by drag before sleep_intro completes
            jest.advanceTimersByTime(500);
            animManager.play('drag');

            expect(mockAnimation.cancel).toHaveBeenCalled();
            expect(element.dataset.state).toBe('drag');

            // Advancing past original sleep_intro duration should not revert to sleep
            jest.advanceTimersByTime(2000);
            expect(element.dataset.state).toBe('drag');
        });

        it('plays direct animation when no transition applies', () => {
            const playOnceSpy = jest.spyOn(animManager, 'playOnce');

            animManager.play('drag');

            expect(playOnceSpy).not.toHaveBeenCalled();
            expect(element.dataset.state).toBe('drag');
        });
    });
});
