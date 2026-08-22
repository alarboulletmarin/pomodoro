// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Capture les planches de `design/social/cards.html`.
 *
 * Chromium plutôt qu'un rasteriseur maison : ces images portent du texte, et le texte
 * est en Clash Display et en Inter. Les icônes se dessinent à la main parce qu'elles
 * n'ont que des arcs ; une police se rend par un moteur de rendu ou pas du tout.
 *
 * `og.png` va dans `public/` — c'est l'application qui la sert. Les deux autres
 * restent dans `design/social/` : ce sont des images qu'on poste, pas des fichiers
 * que l'app doit embarquer, et 700 Ko de plus dans le cache hors ligne se paieraient
 * à chaque installation.
 *
 * Usage : npm run social
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design', 'social', 'cards.html');

const BOARDS = [
  { id: 'og', out: join(ROOT, 'public', 'og.png'), label: 'og.png · 1200×630' },
  {
    id: 'wide',
    out: join(ROOT, 'design', 'social', 'pomodoro-16x9.png'),
    label: 'pomodoro-16x9.png · 1920×1080',
  },
  {
    id: 'tall',
    out: join(ROOT, 'design', 'social', 'pomodoro-9x16.png'),
    label: 'pomodoro-9x16.png · 1080×1920',
  },
];

// Les images conteneurisées n'ont pas toujours le Chromium que Playwright attend là
// où il l'attend. Rien d'autre dans le projet n'en a besoin, d'où la variable plutôt
// qu'un réglage.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

for (const board of BOARDS) {
  mkdirSync(dirname(board.out), { recursive: true });
  const shot = await page.locator(`#${board.id}`).screenshot({ type: 'png' });
  writeFileSync(board.out, shot);
  console.log(`${board.label} (${(shot.length / 1024).toFixed(1)} Ko)`);
}

await browser.close();
