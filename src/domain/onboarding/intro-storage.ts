import { INTRO_STORAGE_KEY, SESSIONS_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '../../types';
import { loadTimerState } from '../timer/timer-storage';

// Anyone carrying one of these has used the app before, whatever the intro flag says:
// the flag was added after the app shipped, and a returning visitor is not a first one.
// Both are only ever written by an act — a setting changed, a session logged.
const PRIOR_USE = [SETTINGS_STORAGE_KEY, SESSIONS_STORAGE_KEY];

export function markIntroSeen(): void {
  try {
    globalThis.localStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    // Private mode or a full quota: the intro simply does not persist.
  }
}

/**
 * Whether to open on the intro rather than the timer. Storage that throws answers no:
 * a first screen that cannot remember being dismissed would return on every visit.
 */
export function shouldShowIntro(forced: boolean, now: number): boolean {
  if (forced) return true;
  try {
    const storage = globalThis.localStorage;
    if (storage.getItem(INTRO_STORAGE_KEY) !== null) return false;
    // The timer state is rewritten on every mount, so its presence proves nothing —
    // a session under way, paused or over does.
    const used =
      PRIOR_USE.some((key) => storage.getItem(key) !== null) ||
      loadTimerState(now).phase !== 'idle';
    if (!used) return true;
    markIntroSeen();
    return false;
  } catch {
    return false;
  }
}
