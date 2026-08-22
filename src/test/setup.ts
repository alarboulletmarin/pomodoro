import '@testing-library/jest-dom/vitest';

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
