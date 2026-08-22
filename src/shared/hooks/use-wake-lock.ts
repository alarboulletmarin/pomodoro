import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let cancelled = false;

    const acquire = async (): Promise<void> => {
      if (sentinel.current !== null) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await lock.release();
          return;
        }
        lock.addEventListener('release', () => {
          sentinel.current = null;
        });
        sentinel.current = lock;
      } catch {
        // Unsupported, denied, or the document is hidden: the timer does not depend on it.
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel.current?.release().catch(() => undefined);
      sentinel.current = null;
    };
  }, [active]);
}
