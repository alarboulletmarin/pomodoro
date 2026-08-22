import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIMER_STORAGE_KEY, type TimerState } from '../../types';
import { initialTimerState } from './timer-machine';
import {
  elapsedWhileAway,
  loadElapsedWhileAway,
  loadTimerState,
  restoreTimerState,
  saveTimerState,
} from './timer-storage';

const T0 = 1_700_000_000_000;
const MINUTE = 60_000;

function store(value: unknown): void {
  globalThis.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('restoreTimerState', () => {
  it('replays a running state that has already elapsed', () => {
    const stored: TimerState = {
      phase: 'running',
      mode: 'focus',
      minutes: 25,
      endsAt: T0,
      remainingMs: 5 * MINUTE,
    };
    expect(restoreTimerState(stored, T0 + MINUTE)).toEqual({
      phase: 'finished',
      mode: 'focus',
      minutes: 25,
      endsAt: null,
      remainingMs: 0,
    });
  });

  it('replays a running state that is still ticking', () => {
    const stored: TimerState = {
      phase: 'running',
      mode: 'focus',
      minutes: 25,
      endsAt: T0 + 25 * MINUTE,
      remainingMs: 25 * MINUTE,
    };
    expect(restoreTimerState(stored, T0 + 10 * MINUTE)).toEqual({
      phase: 'running',
      mode: 'focus',
      minutes: 25,
      endsAt: T0 + 25 * MINUTE,
      remainingMs: 15 * MINUTE,
    });
  });

  it('treats a running state without a deadline as re-armed', () => {
    const stored = { phase: 'running', mode: 'focus', minutes: 25, endsAt: null, remainingMs: 1 };
    expect(restoreTimerState(stored, T0)).toEqual(initialTimerState());
  });

  it('brings a paused state back untouched', () => {
    const stored: TimerState = {
      phase: 'paused',
      mode: 'break',
      minutes: 5,
      endsAt: null,
      remainingMs: 2 * MINUTE + 500,
    };
    expect(restoreTimerState(stored, T0 + 48 * 3_600_000)).toEqual(stored);
  });

  it('normalises idle and finished states', () => {
    expect(
      restoreTimerState(
        { phase: 'idle', mode: 'break', minutes: 10, endsAt: 42, remainingMs: 7 },
        T0,
      ),
    ).toEqual({
      phase: 'idle',
      mode: 'break',
      minutes: 10,
      endsAt: null,
      remainingMs: 10 * MINUTE,
    });

    expect(
      restoreTimerState(
        { phase: 'finished', mode: 'focus', minutes: 45, endsAt: 42, remainingMs: 999 },
        T0,
      ),
    ).toEqual({
      phase: 'finished',
      mode: 'focus',
      minutes: 45,
      endsAt: null,
      remainingMs: 0,
    });
  });

  it('clamps stored values that are out of range', () => {
    const restored = restoreTimerState(
      { phase: 'paused', mode: 'focus', minutes: 900, endsAt: null, remainingMs: -5 },
      T0,
    );
    expect(restored.minutes).toBe(90);
    expect(restored.remainingMs).toBe(0);

    const capped = restoreTimerState(
      { phase: 'paused', mode: 'focus', minutes: 5, endsAt: null, remainingMs: 9_999_999 },
      T0,
    );
    expect(capped.remainingMs).toBe(5 * MINUTE);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not json'],
    ['a number', 42],
    ['an array', []],
    ['an empty object', {}],
    [
      'an unknown phase',
      { phase: 'zzz', mode: 'focus', minutes: 25, endsAt: null, remainingMs: 0 },
    ],
    ['an unknown mode', { phase: 'idle', mode: 'nap', minutes: 25, endsAt: null, remainingMs: 0 }],
    [
      'NaN minutes',
      { phase: 'idle', mode: 'focus', minutes: Number.NaN, endsAt: null, remainingMs: 0 },
    ],
    ['missing minutes', { phase: 'idle', mode: 'focus', endsAt: null, remainingMs: 0 }],
    [
      'a string remainder',
      { phase: 'paused', mode: 'focus', minutes: 25, endsAt: null, remainingMs: '10' },
    ],
  ])('falls back to the default for %s', (_label, raw) => {
    expect(restoreTimerState(raw, T0)).toEqual(initialTimerState());
  });
});

describe('loadTimerState', () => {
  it('returns the default when the key is absent', () => {
    expect(loadTimerState(T0)).toEqual(initialTimerState());
  });

  it('returns the default for stored garbage', () => {
    globalThis.localStorage.setItem(TIMER_STORAGE_KEY, 'not json');
    expect(loadTimerState(T0)).toEqual(initialTimerState());

    store({ phase: 'idle' });
    expect(loadTimerState(T0)).toEqual(initialTimerState());
  });

  it('round-trips a paused session', () => {
    const paused: TimerState = {
      phase: 'paused',
      mode: 'focus',
      minutes: 45,
      endsAt: null,
      remainingMs: 12 * MINUTE,
    };
    saveTimerState(paused);
    expect(loadTimerState(T0 + 5 * 3_600_000)).toEqual(paused);
  });

  it('replays the elapsed time on reload', () => {
    saveTimerState({
      phase: 'running',
      mode: 'focus',
      minutes: 25,
      endsAt: T0 + 25 * MINUTE,
      remainingMs: 25 * MINUTE,
    });
    expect(loadTimerState(T0 + 26 * MINUTE).phase).toBe('finished');
    expect(loadTimerState(T0 + MINUTE).remainingMs).toBe(24 * MINUTE);
  });

  it('survives a storage that throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(() => loadTimerState(T0)).not.toThrow();
    expect(loadTimerState(T0)).toEqual(initialTimerState());
  });
});

describe('saveTimerState', () => {
  it('survives a storage that throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => saveTimerState(initialTimerState())).not.toThrow();
  });
});

describe('elapsedWhileAway', () => {
  const running = {
    phase: 'running',
    mode: 'focus',
    minutes: 25,
    endsAt: T0 + 25 * MINUTE,
    remainingMs: 25 * MINUTE,
  };

  it('reports a running deadline that has already passed', () => {
    expect(elapsedWhileAway(running, T0 + 30 * MINUTE)).toEqual({
      endsAt: T0 + 25 * MINUTE,
      minutes: 25,
      mode: 'focus',
    });
  });

  it('reports the deadline reached exactly on time', () => {
    expect(elapsedWhileAway(running, T0 + 25 * MINUTE)?.endsAt).toBe(T0 + 25 * MINUTE);
  });

  it('reports nothing while the deadline is still ahead', () => {
    expect(elapsedWhileAway(running, T0 + 24 * MINUTE)).toBeNull();
  });

  it('reports nothing for a phase that was not running', () => {
    for (const phase of ['idle', 'paused', 'finished']) {
      expect(elapsedWhileAway({ ...running, phase }, T0 + 30 * MINUTE)).toBeNull();
    }
  });

  it('reports nothing for a malformed record', () => {
    expect(elapsedWhileAway(null, T0)).toBeNull();
    expect(elapsedWhileAway({ ...running, endsAt: 'soon' }, T0 + 30 * MINUTE)).toBeNull();
    expect(elapsedWhileAway({ ...running, mode: 'nap' }, T0 + 30 * MINUTE)).toBeNull();
    expect(elapsedWhileAway({ ...running, minutes: 'lots' }, T0 + 30 * MINUTE)).toBeNull();
  });

  it('reads the same verdict back out of storage', () => {
    store(running);
    expect(loadElapsedWhileAway(T0 + 30 * MINUTE)?.minutes).toBe(25);
    expect(loadElapsedWhileAway(T0)).toBeNull();
  });

  it('survives an empty or unreadable storage', () => {
    expect(loadElapsedWhileAway(T0)).toBeNull();
    globalThis.localStorage.setItem(TIMER_STORAGE_KEY, 'not json');
    expect(loadElapsedWhileAway(T0)).toBeNull();
  });
});
