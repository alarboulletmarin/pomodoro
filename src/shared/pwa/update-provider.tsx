import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { hardReload } from './hard-reload';

/** Une heure entre deux vérifications de fond, et un quart d'heure au retour. */
const PERIODIC_MS = 60 * 60 * 1000;
const ON_RETURN_MS = 15 * 60 * 1000;
/** Le temps qu'une version trouvée s'installe avant de conclure « à jour ». */
const SETTLE_MS = 900;
/** Si la relève ne s'annonce pas, on recharge quand même : le worker a déjà cédé. */
const RELOAD_FALLBACK_MS = 1500;

export interface AppUpdate {
  /** Une nouvelle version est installée et attend qu'on la prenne. */
  ready: boolean;
  /** Si le bandeau doit être visible : fermé, il ne revient pas de lui-même. */
  notice: boolean;
  checking: boolean;
  /** Quand la dernière vérification n'a rien trouvé — pour le dire, puis l'oublier. */
  checkedAt: number | null;
  check(): void;
  reload(): void;
  dismiss(): void;
}

const INERT: AppUpdate = {
  ready: false,
  notice: false,
  checking: false,
  checkedAt: null,
  check: () => undefined,
  reload: () => undefined,
  dismiss: () => undefined,
};

const UpdateContext = createContext<AppUpdate>(INERT);

export function UpdateProvider({ children }: { children: ReactNode }): JSX.Element {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const lastCheck = useRef(0);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, current) => {
      registration.current = current ?? null;
    },
  });

  // An installed app can stay open for days: without asking, it would never
  // learn that anything shipped. Hourly, and whenever it comes back on screen.
  useEffect(() => {
    const ask = (): void => {
      const current = registration.current;
      if (!current) return;
      lastCheck.current = Date.now();
      void current.update().catch(() => undefined);
    };

    const onVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck.current < ON_RETURN_MS) return;
      ask();
    };

    const timer = window.setInterval(ask, PERIODIC_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // `updateServiceWorker(true)` promet de recharger la page et ne le fait pas
  // quand celle-ci était déjà pilotée par un worker : le nouveau prend la main,
  // l'écran garde l'ancien bundle. Vérifié à deux versions successives. On
  // demande donc la relève seule, et on recharge sur la relève.
  const reload = useCallback(() => {
    const container = navigator.serviceWorker as ServiceWorkerContainer | undefined;
    let reloaded = false;
    const comeBack = (): void => {
      if (reloaded) return;
      reloaded = true;
      hardReload();
    };

    container?.addEventListener('controllerchange', comeBack, { once: true });
    void updateServiceWorker(false).then(() => {
      window.setTimeout(comeBack, RELOAD_FALLBACK_MS);
    });
  }, [updateServiceWorker]);

  const check = useCallback(() => {
    const current = registration.current;
    setCheckedAt(null);
    if (!current) {
      setCheckedAt(Date.now());
      return;
    }
    setChecking(true);
    lastCheck.current = Date.now();
    void current
      .update()
      .catch(() => undefined)
      // The promise settles when the check is done, not when the new worker has
      // finished installing; concluding "up to date" any sooner would lie.
      .then(() => new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS)))
      .then(() => {
        setChecking(false);
        setCheckedAt(Date.now());
      });
  }, []);

  // Fermer le bandeau n'est pas refuser la version : `needRefresh` reste vrai,
  // et les réglages continuent de porter le bouton.
  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  const value = useMemo<AppUpdate>(
    () => ({
      ready: needRefresh,
      notice: needRefresh && !dismissed,
      checking,
      checkedAt: needRefresh ? null : checkedAt,
      check,
      reload,
      dismiss: () => setDismissed(true),
    }),
    [needRefresh, dismissed, checking, checkedAt, check, reload],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

/** Inerte hors de son provider : un écran testé seul n'a pas de service worker. */
export function useAppUpdate(): AppUpdate {
  return useContext(UpdateContext);
}
