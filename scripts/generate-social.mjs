// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Capture les planches de `design/social/cards.html`, une fois par thème et par
 * accent.
 *
 * Chromium plutôt qu'un rasteriseur maison : ces images portent du texte, et le texte
 * est en Clash Display et en Inter. Les icônes se dessinent à la main parce qu'elles
 * n'ont que des arcs ; une police se rend par un moteur de rendu ou pas du tout.
 *
 * `og.png` va dans `public/` — c'est l'application qui la sert, et `index.html` la
 * désigne par ce nom, donc il n'y en a qu'une : le thème clair, l'accent rouge, les
 * réglages de quelqu'un qui n'a rien réglé. Les formats à poster restent dans
 * `design/social/`, en autant de variantes qu'il y a de combinaisons : ce sont des
 * images qu'on publie, pas des fichiers que l'app doit embarquer, et un jeu complet
 * dans le cache hors ligne se paierait à chaque installation.
 *
 * Usage :
 *   npm run social                     tous les thèmes, les trois accents livrés
 *   npm run social -- --accent '#7A5AF8'   la même chose avec une couleur à soi
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { argv, env, exit } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

import { ACCENTS } from './mark.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design', 'social', 'cards.html');
const OUT_DIR = join(ROOT, 'design', 'social');

const FORMATS = [
  { id: 'wide', name: '16x9', size: '1920×1080' },
  { id: 'tall', name: '9x16', size: '1080×1920' },
];

const THEMES = ['light', 'dark'];

/**
 * Une couleur donnée à la main remplace les trois accents livrés plutôt que de s'y
 * ajouter : on la passe pour voir *celle-là*, pas pour produire huit fichiers de plus.
 * Elle sert dans les deux thèmes — l'app, elle, tient une valeur par thème, mais
 * personne n'en saisit deux dans le sélecteur de couleur.
 */
function palette() {
  const flag = argv.indexOf('--accent');
  if (flag === -1) return ACCENTS;

  const value = argv[flag + 1];
  if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
    console.error(`--accent attend une couleur en #RRGGBB, reçu : ${value ?? '(rien)'}`);
    exit(1);
  }

  const hex = value.toUpperCase();
  return { custom: { light: hex, dark: hex } };
}

const accents = palette();

// Les images conteneurisées n'ont pas toujours le Chromium que Playwright attend là
// où il l'attend. Rien d'autre dans le projet n'en a besoin, d'où la variable plutôt
// qu'un réglage.
const browser = await chromium.launch({ executablePath: env.CHROMIUM_PATH || undefined });

const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

mkdirSync(OUT_DIR, { recursive: true });

async function paint(theme, accent) {
  await page.evaluate(
    ([mode, colour]) => {
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.setProperty('--accent', colour);
    },
    [theme, accent],
  );
}

async function capture(id, out) {
  const shot = await page.locator(`#${id}`).screenshot({ type: 'png' });
  writeFileSync(out, shot);
  return shot.length;
}

for (const [key, pair] of Object.entries(accents)) {
  for (const theme of THEMES) {
    await paint(theme, pair[theme]);

    for (const format of FORMATS) {
      const file = `pomodoro-${format.name}-${theme}-${key}.png`;
      const bytes = await capture(format.id, join(OUT_DIR, file));
      console.log(`${file} · ${format.size} (${(bytes / 1024).toFixed(1)} Ko)`);
    }
  }
}

// La carte de lien en dernier, pour que la page finisse sur les réglages par défaut
// si quelqu'un la garde ouverte.
await paint('light', ACCENTS.red.light);
const bytes = await capture('og', join(ROOT, 'public', 'og.png'));
console.log(`og.png · 1200×630 (${(bytes / 1024).toFixed(1)} Ko)`);

await browser.close();
