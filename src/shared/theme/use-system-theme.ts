import { useSyncExternalStore } from 'react';
import type { Theme } from '../../types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getSnapshot(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

function subscribe(onStoreChange: () => void): () => void {
  const list = window.matchMedia(DARK_QUERY);
  list.addEventListener('change', onStoreChange);
  return () => list.removeEventListener('change', onStoreChange);
}

/** What the device asks for, tracked live: switching at dusk needs no reload. */
export function useSystemTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
