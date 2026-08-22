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
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeManifestIcons: false,
      manifest: {
        name: 'Pomodoro',
        short_name: 'Pomodoro',
        description: DESCRIPTION,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
