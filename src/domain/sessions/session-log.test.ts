import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSIONS_STORAGE_KEY, type SessionEntry } from '../../types';
import {
  appendSession,
  loadSessions,
  parseSessionStore,
  saveSessions,
  SESSION_RETENTION_DAYS,
} from './session-log';

const NOW = new Date(2026, 1, 5, 10, 0, 0).getTime();
const DAY = 24 * 3_600_000;

function focus(startedAt: number): SessionEntry {
  return { startedAt, minutes: 25, mode: 'focus' };
}

function store(value: unknown): void {
  globalThis.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseSessionStore', () => {
  it('keeps valid entries sorted ascending', () => {
    const entries = parseSessionStore(
      {
        version: 1,
        entries: [focus(NOW - DAY), focus(NOW - 3 * DAY), { ...focus(NOW), mode: 'break' }],
      },
      NOW,
    );
    expect(entries.map((entry) => entry.startedAt)).toEqual([NOW - 3 * DAY, NOW - DAY, NOW]);
    expect(entries.at(-1)?.mode).toBe('break');
  });

  it('drops malformed entries without losing the good ones', () => {
    const entries = parseSessionStore(
      {
        version: 1,
        entries: [
          focus(NOW),
          null,
          'nope',
          {},
          { startedAt: Number.NaN, minutes: 25, mode: 'focus' },
          { startedAt: NOW, minutes: Number.NaN, mode: 'focus' },
          { startedAt: NOW, minutes: 0, mode: 'focus' },
          { startedAt: NOW, minutes: 25 },
          { startedAt: NOW, minutes: 25, mode: 'nap' },
          { startedAt: '2026', minutes: 25, mode: 'focus' },
        ],
      },
      NOW,
    );
    expect(entries).toEqual([focus(NOW)]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not json'],
    ['an empty object', {}],
    ['a bare array', [focus(NOW)]],
    ['a wrong version', { version: 2, entries: [focus(NOW)] }],
    ['a missing version', { entries: [focus(NOW)] }],
    ['entries that are not an array', { version: 1, entries: 'nope' }],
  ])('returns an empty log for %s', (_label, raw) => {
    expect(parseSessionStore(raw, NOW)).toEqual([]);
  });

  it('purges entries older than the retention window', () => {
    const entries = parseSessionStore(
      {
        version: 1,
        entries: [focus(NOW - 401 * DAY), focus(NOW - 399 * DAY), focus(NOW)],
      },
      NOW,
    );
    expect(SESSION_RETENTION_DAYS).toBe(400);
    expect(entries.map((entry) => entry.startedAt)).toEqual([NOW - 399 * DAY, NOW]);
  });
});

describe('appendSession', () => {
  it('returns a new sorted array without mutating the input', () => {
    const existing = [focus(NOW - DAY)];
    const next = appendSession(existing, focus(NOW - 2 * DAY), NOW);

    expect(next.map((entry) => entry.startedAt)).toEqual([NOW - 2 * DAY, NOW - DAY]);
    expect(existing).toHaveLength(1);
    expect(next).not.toBe(existing);
  });

  it('purges while appending', () => {
    const next = appendSession([focus(NOW - 401 * DAY)], focus(NOW), NOW);
    expect(next).toEqual([focus(NOW)]);
  });

  it('ignores an unusable entry', () => {
    const next = appendSession(
      [focus(NOW)],
      { startedAt: Number.NaN, minutes: 25, mode: 'focus' },
      NOW,
    );
    expect(next).toEqual([focus(NOW)]);
  });
});

describe('loadSessions and saveSessions', () => {
  it('returns an empty log when the key is absent', () => {
    expect(loadSessions(NOW)).toEqual([]);
  });

  it('round-trips through storage', () => {
    saveSessions([focus(NOW), focus(NOW - DAY)]);
    expect(loadSessions(NOW)).toEqual([focus(NOW - DAY), focus(NOW)]);
    expect(globalThis.localStorage.getItem(SESSIONS_STORAGE_KEY)).toContain('"version":1');
  });

  it('returns an empty log for stored garbage', () => {
    globalThis.localStorage.setItem(SESSIONS_STORAGE_KEY, 'not json');
    expect(loadSessions(NOW)).toEqual([]);

    store({ version: 1 });
    expect(loadSessions(NOW)).toEqual([]);
  });

  it('purges on read', () => {
    store({ version: 1, entries: [focus(NOW - 401 * DAY), focus(NOW - 10 * DAY)] });
    expect(loadSessions(NOW)).toEqual([focus(NOW - 10 * DAY)]);
  });

  it('survives a storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(loadSessions(NOW)).toEqual([]);
    expect(() => saveSessions([focus(NOW)])).not.toThrow();
  });
});
