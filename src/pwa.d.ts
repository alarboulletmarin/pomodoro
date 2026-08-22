/**
 * Le module virtuel de vite-plugin-pwa, déclaré à la main.
 *
 * `vite-plugin-pwa/react` n'est pas ajouté aux `types` du tsconfig : cette
 * chaîne tire les types de workbox, écrits pour un service worker, et le
 * compilateur réclamerait alors la lib `WebWorker` — donc `self`,
 * `ExtendableEvent` et le reste des globales d'un worker dans du code de
 * navigateur. La surface réellement utilisée tient en un hook.
 */
declare module 'virtual:pwa-register/react' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onRegisteredSW?(swScriptUrl: string, registration: ServiceWorkerRegistration | undefined): void;
    onRegisterError?(error: unknown): void;
    onNeedRefresh?(): void;
    onOfflineReady?(): void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker(reloadPage?: boolean): Promise<void>;
  };
}
