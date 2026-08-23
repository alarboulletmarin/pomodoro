// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tire les stories 9:16 de `design/social/stories.html`, en clair et en sombre.
 *
 * `generate-social.mjs` produit les visuels que l'application distribue d'elle-même :
 * une carte de lien, un post, une story, tous porteurs de la même phrase. C'est ce
 * qu'un lien collé demande, et ça s'arrête là.
 *
 * Une story se fait défiler. Elle a deux secondes pour dire ce que l'app fait, à quoi
 * elle ressemble et quoi faire ensuite — ce qu'une phrase seule sur du papier ne fait
 * pas. Ces huit planches-là racontent, dans l'ordre : la promesse, le geste, la
 * session, ce que l'app refuse de faire, où restent les données, le relevé,
 * l'apparence, l'installation.
 *
 * Deux passes :
 *
 *  1. **Prise.** Playwright ouvre la vraie application, une fois par thème, dans une
 *     fenêtre de téléphone au double de la définition. Les captures ne sont pas des
 *     maquettes : ce sont les écrans que quelqu'un a sous les yeux. La session en
 *     cours est semée dans le stockage — l'app en restaure une au démarrage, donc
 *     c'est un état qu'elle atteint vraiment, et c'est le seul moyen de photographier
 *     un minuteur à mi-course sans attendre dix minutes devant.
 *  2. **Tirage.** Les captures sont injectées dans la planche en data URI, le thème et
 *     l'accent posés par les mêmes propriétés que l'app, et chaque planche capturée.
 *
 * Prérequis : un serveur sur http://localhost:4173 (`npm run build && npm run preview`).
 *
 * Usage :
 *   npm run stories                             les huit, en clair et en sombre
 *   npm run stories -- --accent '#7A5AF8'       avec une couleur à soi
 *   npm run stories -- --url pomodoro.exemple   l'adresse au lieu de « lien en bio »
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { argv, env, exit } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

import { ACCENTS } from './mark.mjs';
import { BASE_URL, assertServerUp, openStage } from './stage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design', 'social', 'stories.html');
const OUT_DIR = join(ROOT, 'design', 'social', 'stories');

const THEMES = ['light', 'dark'];

/** Le téléphone qu'on photographie, au double de la définition. */
const PHONE = { width: 430, height: 932 };

/**
 * Les huit planches, dans l'ordre de publication. Le nom du fichier porte le rang :
 * un dossier trié par nom est la série dans le bon ordre, et personne n'a à se
 * rappeler laquelle vient après laquelle au moment de les poster.
 */
const BOARDS = [
  { id: 's1', slug: '1-promesse' },
  { id: 's2', slug: '2-geste' },
  { id: 's3', slug: '3-session' },
  { id: 's4', slug: '4-refus' },
  { id: 's5', slug: '5-donnees' },
  { id: 's6', slug: '6-releve' },
  { id: 's7', slug: '7-apparence' },
  { id: 's8', slug: '8-installation' },
];

/** Un drapeau `--nom valeur`, validé, ou `null`. */
function flag(name, pattern) {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return null;

  const value = argv[at + 1];
  if (!pattern.test(value ?? '')) {
    console.error(`--${name} : valeur invalide (${value ?? 'rien'})`);
    exit(1);
  }
  return value;
}

const custom = flag('accent', /^#[0-9a-fA-F]{6}$/);
const accent = custom ? { light: custom.toUpperCase(), dark: custom.toUpperCase() } : ACCENTS.red;

// « lien en bio » est la convention d'Instagram, où une story ne porte pas de lien
// cliquable ; ailleurs c'est une adresse qu'on lit et qu'on retape. Le projet n'en a
// pas encore, donc elle se passe en argument plutôt que de s'inventer ici.
const url = flag('url', /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i);

/* -------------------------------------------------------------------------- */
/*  1. La prise                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Les deux écrans dont les planches ont besoin, dans un thème : l'app armée — en-tête,
 * préréglages, cadran, relevé — et une session à mi-course.
 *
 * Un seul contexte ne suffit pas : la session en cours est semée avant le chargement,
 * et l'app ne revient pas à `idle` sans qu'on appuie sur un bouton, ce qui remplirait
 * le relevé d'une session de plus.
 */
async function shoot(browser, theme) {
  const shots = {};

  for (const [name, timer] of [
    ['idle', null],
    ['running', { minutes: 25, remainingMinutes: 15 }],
  ]) {
    const { context, page } = await openStage(browser, {
      viewport: PHONE,
      deviceScaleFactor: 2,
      colorScheme: theme,
      // Le curseur factice sert à filmer un geste ; une photo n'en montre aucun, et un
      // disque posé au milieu des chiffres se lit comme une salissure.
      cursor: false,
      seed: { settings: { theme, accentKey: 'red' }, timer },
    });

    // Les cartes arrivent avec une transition ; une capture prise trop tôt les attrape
    // à mi-course, plus pâles qu'elles ne sont.
    await page.waitForTimeout(400);
    shots[name] = `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
    await context.close();
  }

  return shots;
}

/* -------------------------------------------------------------------------- */
/*  2. Le tirage                                                              */
/* -------------------------------------------------------------------------- */

await assertServerUp();

const browser = await chromium.launch({ executablePath: env.CHROMIUM_PATH || undefined });

console.log(`prise de vue sur ${BASE_URL}`);
const takes = {};
for (const theme of THEMES) takes[theme] = await shoot(browser, theme);

const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((value) => globalThis.paintCall(value), url);

// Un dossier reconstruit plutôt que recouvert : une planche retirée de la série
// laisserait sinon son fichier derrière elle, et on la posterait.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const theme of THEMES) {
  await page.evaluate(
    ([mode, colour, shots]) => {
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.setProperty('--accent', colour);
      // La planche des thèmes montre les deux appareils : elle a besoin des deux
      // prises, quel que soit le thème de la planche elle-même.
      globalThis.paintShots({ ...shots.own, 'idle-light': shots.light, 'idle-dark': shots.dark });
    },
    [theme, accent[theme], { own: takes[theme], light: takes.light.idle, dark: takes.dark.idle }],
  );

  for (const board of BOARDS) {
    const file = `pomodoro-story-${board.slug}-${theme}.png`;
    const bytes = await page.locator(`#${board.id}`).screenshot({ type: 'png' });
    writeFileSync(join(OUT_DIR, file), bytes);
    console.log(`${file} · 1080×1920 (${(bytes.length / 1024).toFixed(1)} Ko)`);
  }
}

await browser.close();
