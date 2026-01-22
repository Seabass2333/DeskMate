/**
 * SoundManager Test Suite
 * Tests for the audio management module
 */

import { SoundManager } from '../SoundManager';
import type { SkinSounds } from '../../types/sound';

// Mock HTMLAudioElement
class MockAudio {
    src = '';
    volume = 1;
    loop = false;
    playbackRate = 1;
    paused = true;
    currentTime = 0;

    play = jest.fn().mockResolvedValue(undefined);
    pause = jest.fn();
    load = jest.fn();

    addEventListener = jest.fn();
    removeEventListener = jest.fn();
}

// Replace global Audio with mock
(global as any).Audio = MockAudio;

describe('SoundManager', () => {
    let soundManager: SoundManager;

    beforeEach(() => {
        soundManager = new SoundManager();
        jest.clearAllMocks();
    });

    afterEach(() => {
        soundManager.dispose();
    });

    describe('initialization', () => {
        it('should create an instance with empty sound map', () => {
            expect(soundManager).toBeInstanceOf(SoundManager);
            expect(soundManager.getSoundIds()).toEqual([]);
        });
    });

    describe('loadSounds', () => {
        const mockSounds: SkinSounds = {
            click: 'meow.mp3',
            drag: {
                src: 'drag.mp3',
                volume: 0.5,
                loop: false
            },
            idle_loop: {
                src: 'purr.mp3',
                loop: true,
                volume: 0.3
            }
        };

        const basePath = '/assets/skins/mochi-v1';

        it('should load simple sound references', async () => {
            await soundManager.loadSounds(mockSounds, basePath);

            const ids = soundManager.getSoundIds();
            expect(ids).toContain('click');
        });

        it('should load complex sound configurations', async () => {
            await soundManager.loadSounds(mockSounds, basePath);

            const ids = soundManager.getSoundIds();
            expect(ids).toContain('drag');
            expect(ids).toContain('idle_loop');
        });

        it('should normalize simple refs to full config', async () => {
            await soundManager.loadSounds(mockSounds, basePath);

            const config = soundManager.getConfig('click');
            expect(config).toMatchObject({
                src: `${basePath}/meow.mp3`,
                loop: false,
                volume: 1,
                playbackRate: 1
            });
        });

        it('should preserve custom config values', async () => {
            await soundManager.loadSounds(mockSounds, basePath);

            const config = soundManager.getConfig('drag');
            expect(config?.volume).toBe(0.5);

            const loopConfig = soundManager.getConfig('idle_loop');
            expect(loopConfig?.loop).toBe(true);
            expect(loopConfig?.volume).toBe(0.3);
        });

        it('should clear previous sounds when loading new set', async () => {
            await soundManager.loadSounds(mockSounds, basePath);
            expect(soundManager.getSoundIds().length).toBe(3);

            await soundManager.loadSounds({ click: 'bark.mp3' }, basePath);
            expect(soundManager.getSoundIds()).toEqual(['click']);
        });
    });

    describe('play', () => {
        beforeEach(async () => {
            await soundManager.loadSounds({
                click: 'meow.mp3',
                idle_loop: { src: 'purr.mp3', loop: true }
            }, '/assets');
        });

        it('should play a loaded sound', async () => {
            const result = await soundManager.play('click');
            expect(result).toBe(true);
        });

        it('should return false for unknown sound id', async () => {
            const result = await soundManager.play('unknown');
            expect(result).toBe(false);
        });

        it('should verify successful play returns true', async () => {
            const result = await soundManager.play('click');
            expect(result).toBe(true);
        });
    });

    describe('loop', () => {
        beforeEach(async () => {
            await soundManager.loadSounds({
                idle_loop: { src: 'purr.mp3', loop: true, volume: 0.3 }
            }, '/assets');
        });

        it('should start a looping sound', async () => {
            await soundManager.loop('idle_loop');
            expect(soundManager.isLooping('idle_loop')).toBe(true);
        });

        it('should stop looping when stopLoop is called', async () => {
            await soundManager.loop('idle_loop');
            soundManager.stopLoop();
            expect(soundManager.isLooping('idle_loop')).toBe(false);
        });

        it('should only allow one loop at a time', async () => {
            await soundManager.loadSounds({
                loop1: { src: 'a.mp3', loop: true },
                loop2: { src: 'b.mp3', loop: true }
            }, '/assets');

            await soundManager.loop('loop1');
            await soundManager.loop('loop2');

            // First loop should be stopped
            expect(soundManager.isLooping('loop1')).toBe(false);
            expect(soundManager.isLooping('loop2')).toBe(true);
        });
    });

    describe('dispose', () => {
        it('should clean up all resources', async () => {
            await soundManager.loadSounds({ click: 'meow.mp3' }, '/assets');
            soundManager.dispose();

            expect(soundManager.getSoundIds()).toEqual([]);
        });
    });
});
