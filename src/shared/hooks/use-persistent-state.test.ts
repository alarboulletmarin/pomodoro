import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePersistentState } from './use-persistent-state';

interface Shape {
  count: number;
}

const KEY = 'test.key';
const FALLBACK: Shape = { count: 0 };

const normalise = (raw: unknown): Shape | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { count } = raw as Partial<Shape>;
  return typeof count === 'number' ? { count } : null;
};

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('usePersistentState', () => {
  it('falls back when the key is missing', () => {
    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));
    expect(result.current[0]).toEqual(FALLBACK);
  });

  it('reads a stored value back', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ count: 7 }));
    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));
    expect(result.current[0]).toEqual({ count: 7 });
  });

  it('falls back on malformed JSON', () => {
    window.localStorage.setItem(KEY, '{not json');
    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));
    expect(result.current[0]).toEqual(FALLBACK);
  });

  it('falls back on a wrong shape', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ count: 'seven' }));
    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));
    expect(result.current[0]).toEqual(FALLBACK);
  });

  it('survives a throwing localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));
    expect(result.current[0]).toEqual(FALLBACK);

    act(() => result.current[1]({ count: 3 }));
    expect(result.current[0]).toEqual({ count: 3 });
  });

  it('persists updates, including functional ones', () => {
    const { result } = renderHook(() => usePersistentState(KEY, FALLBACK, normalise));

    act(() => result.current[1]({ count: 1 }));
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 1 }));

    act(() => result.current[1]((prev) => ({ count: prev.count + 4 })));
    expect(result.current[0]).toEqual({ count: 5 });
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 5 }));
  });
});
