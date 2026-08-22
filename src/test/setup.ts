import '@testing-library/jest-dom/vitest';

// jsdom ships no matchMedia; components read it for layout and colour scheme.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      matches: false,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

interface JsdomHandle {
  window: { localStorage: Storage; sessionStorage: Storage };
}

// Node 22+ declares its own inert `localStorage` global, which makes Vitest's jsdom
// environment skip the key and leave web storage undefined. Wire jsdom's back in.
const dom = (globalThis as { jsdom?: JsdomHandle }).jsdom;
if (dom) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    if (globalThis[key]) continue;
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
  }
}
