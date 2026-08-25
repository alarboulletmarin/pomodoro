import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BACKGROUND = '#FBF6EE';
const DESCRIPTION =
  'Un minuteur de travail qui te laisse partir : une durée, une session, une pause. ' +
  'Pas de notification, pas de compte, pas de série à tenir.';

// Link previews want absolute URLs. Set SITE_URL at build time to get them; without it
// the tags stay relative, which most unfurlers still resolve.
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '');

/**
 * Une empreinte courte d'un fichier de `public/`, pour la coller en `?v=` derrière son
 * adresse. Une icône est redessinée sans que son chemin bouge, et ni Safari ni le
 * cache d'icônes d'iOS n'ont alors de raison de redemander le fichier : l'app posée
 * sur l'écran d'accueil garde le dessin d'avant. L'empreinte fait changer l'adresse
 * quand le dessin change, et jamais autrement — un numéro de version écrit à la main
 * s'oublie exactement le jour où il compte.
 */
const stamp = (file: string): string => {
  const path = new URL(`./public/${file}`, import.meta.url);
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);
  } catch {
    // Un jeton qui ne nomme aucun fichier est une faute de frappe dans index.html.
    // Le dire ici coûte moins qu'un ENOENT sans contexte au milieu d'un build.
    throw new Error(`asset-stamp : public/${file} est introuvable.`);
  }
};

// Read rather than imported so the manifest never lands in the client bundle.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    {
      name: 'site-url',
      // Without a site URL there is no canonical address to declare, so the tag goes
      // rather than pointing at "/"; the rest degrade to paths the scraper resolves.
      transformIndexHtml: (html: string) =>
        (SITE_URL ? html : html.replace(/\s*<meta property="og:url"[^>]*>/, '')).replaceAll(
          '%SITE_URL%',
          SITE_URL,
        ),
    },
    {
      name: 'asset-stamp',
      // `%V:chemin%` dans index.html devient l'empreinte de `public/chemin`.
      transformIndexHtml: (html: string) =>
        html.replace(/%V:([^%]+)%/g, (_match, file: string) => stamp(file)),
    },
    react(),
    VitePWA({
      // « prompt » plutôt qu'« autoUpdate » : une nouvelle version ne remplace
      // jamais l'app sous les doigts de quelqu'un. Une session armée à 45 min ou
      // en cours de réglage disparaîtrait sans un mot.
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        id: '/',
        name: 'Pomodoro',
        short_name: 'Pomodoro',
        description: DESCRIPTION,
        // The interface opens in the language the browser asks for, but the manifest
        // is read once, by the installer, before any of that: it declares the one the
        // app is written in.
        lang: 'fr',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        // Deux dessins — voir scripts/generate-icons.mjs. L'ordinaire est une tuile
        // arrondie sur fond papier, opaque jusqu'aux coins parce qu'un écran d'accueil
        // ne compose pas la transparence, il la remplit ; le `maskable` va à fond perdu
        // avec le cadran dans la zone sûre. `purpose` n'est écrit que sur le second :
        // omis, il vaut `any`, et un installateur n'a alors rien à interpréter.
        //
        // Pas d'icône `monochrome` : elle n'a que son alpha, un installateur qui la
        // retient sans la teinter pose un carré noir ou vide, et aucune des autres
        // applications de la maison n'en livre.
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // `txt` couvre licences-tierces.txt et les deux notices de fontes. Une
        // application qui marche hors ligne emporte les fontes dans son cache ;
        // laisser leur licence au réseau, c'est les distribuer sans elle dès la
        // première coupure, ce que ni l'OFL ni la FFL n'autorisent.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        navigateFallback: '/index.html',
        // Les `.txt` sont des documents, pas des routes : ouvrir
        // /licences-tierces.txt est une navigation, et le repli servirait l'app
        // à sa place. Le précache les sert déjà, mais il ne les sert que tant
        // que `txt` reste dans `globPatterns` au-dessus ; sans cette ligne,
        // retirer l'extension là-haut ferait répondre l'application à la place
        // des licences, sans qu'aucun test ne le dise.
        navigateFallbackDenylist: [/\.txt$/],
        // Les icônes sont demandées avec le `?v=` qu'index.html porte. Sans cette
        // ligne le paramètre ferait manquer l'entrée précachée, et une icône
        // demandée hors ligne partirait au réseau pour rien.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
        cleanupOutdatedCaches: true,
        // clientsClaim sans skipWaiting : le premier chargement prend la main
        // tout de suite (donc hors ligne dès la première visite), mais une
        // version suivante attend qu'on la demande.
        clientsClaim: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
