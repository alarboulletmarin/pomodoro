import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INTRO_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  TIMER_STORAGE_KEY,
} from '../../types';
import { markIntroSeen, shouldShowIntro } from './intro-storage';

const NOW = new Date('2026-08-22T09:00:00').getTime();

function storeTimer(phase: string, remainingMs = 600_000): void {
  globalThis.localStorage.setItem(
    TIMER_STORAGE_KEY,
    JSON.stringify({
      phase,
      mode: 'focus',
      minutes: 25,
      endsAt: phase === 'running' ? NOW + remainingMs : null,
      remainingMs,
    }),
  );
}

afterEach(() => {
  globalThis.localStorage.clear();
  vi.restoreAllMocks();
});

describe('shouldShowIntro', () => {
  it('shows on a device that carries nothing of this app', () => {
    expect(shouldShowIntro(false, NOW)).toBe(true);
  });

  it('never shows again once it has been left', () => {
    markIntroSeen();

    expect(globalThis.localStorage.getItem(INTRO_STORAGE_KEY)).toBe('1');
    expect(shouldShowIntro(false, NOW)).toBe(false);
  });

  it.each([SETTINGS_STORAGE_KEY, SESSIONS_STORAGE_KEY])(
    'takes %s as proof the app has been used before',
    (key) => {
      globalThis.localStorage.setItem(key, '{}');

      expect(shouldShowIntro(false, NOW)).toBe(false);
      // Recorded, so the check costs one read on every later launch.
      expect(globalThis.localStorage.getItem(INTRO_STORAGE_KEY)).toBe('1');
    },
  );

  it.each(['running', 'paused', 'finished'])('yields to a session that is %s', (phase) => {
    storeTimer(phase);

    expect(shouldShowIntro(false, NOW)).toBe(false);
  });

  it('survives a reload of the intro itself', () => {
    // Mounting the app rewrites the timer state, idle and untouched. That is not use,
    // and reloading the first screen must not consume it.
    storeTimer('idle', 25 * 60_000);

    expect(shouldShowIntro(false, NOW)).toBe(true);
  });

  it('shows again when it is asked for explicitly', () => {
    markIntroSeen();

    expect(shouldShowIntro(true, NOW)).toBe(true);
  });

  it('stays away when storage cannot answer', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    // A first screen that cannot remember being dismissed would return every visit.
    expect(shouldShowIntro(false, NOW)).toBe(false);
  });

  it('survives storage that refuses to record it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => markIntroSeen()).not.toThrow();
  });
});
