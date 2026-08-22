import { useSyncExternalStore } from 'react';
import { LAYOUT_BREAKPOINTS, type Layout } from '../../types';

const QUERIES = [
  `(orientation: landscape) and (max-height: ${LAYOUT_BREAKPOINTS.landscapeMaxHeight}px)`,
  `(min-width: ${LAYOUT_BREAKPOINTS.desktopMinWidth}px)`,
  `(min-width: ${LAYOUT_BREAKPOINTS.tabletMinWidth}px)`,
] as const;

const MATCHES: readonly Layout[] = ['landscape', 'desktop', 'tablet'];

function getSnapshot(): Layout {
  for (let i = 0; i < QUERIES.length; i += 1) {
    const query = QUERIES[i];
    const layout = MATCHES[i];
    if (query && layout && window.matchMedia(query).matches) return layout;
  }
  return 'portrait';
}

function getServerSnapshot(): Layout {
  return 'portrait';
}

function subscribe(onStoreChange: () => void): () => void {
  const lists = QUERIES.map((query) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onStoreChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onStoreChange));
}

export function useMediaLayout(): Layout {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
