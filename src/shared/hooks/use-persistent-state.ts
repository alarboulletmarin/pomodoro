import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

export type Normalise<T> = (raw: unknown) => T | null;

function read<T>(key: string, fallback: T, normalise: Normalise<T>): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return normalise(JSON.parse(raw) as unknown) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the app stays usable without persistence.
  }
}

export function usePersistentState<T>(
  key: string,
  fallback: T,
  normalise: Normalise<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, fallback, normalise));

  const setPersisted = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, setPersisted];
}
