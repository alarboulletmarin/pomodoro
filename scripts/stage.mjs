// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le plateau : ce dont les deux scripts de tournage ont besoin en commun — un
 * navigateur qui ouvre l'application dans un état connu, un curseur qu'on voit, des
 * gestes qui ressemblent à des gestes, et ffmpeg.
 *
 * `record-demo.mjs` s'en sert pour la démonstration brute, `make-film.mjs` pour les
 * plans du film. Deux copies de ce fichier finiraient par ne plus tourner la même app.
 */
import { execFileSync } from 'node:child_process';
import { env, exit } from 'node:process';

export const BASE_URL = env.POMODORO_BASE_URL ?? 'http://localhost:4173';

/* -------------------------------------------------------------------------- */
/*  Contrôles préalables — échouer tôt, et en disant quoi faire                */
/* -------------------------------------------------------------------------- */

export async function assertServerUp() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error(`✗ Rien ne répond sur ${BASE_URL} (${error.message})`);
    console.error('  Lance-le d’abord : npm run build && npm run preview');
    exit(1);
  }
}

export function assertFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('✗ ffmpeg introuvable sur le PATH — apt install ffmpeg, ou brew install ffmpeg.');
    exit(1);
  }
}

export const ffmpeg = (args, options = {}) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'ignore', 'inherit'],
    ...options,
  });

/* -------------------------------------------------------------------------- */
/*  Le curseur factice                                                         */
/* -------------------------------------------------------------------------- */

// Une capture n'enregistre pas le pointeur du système : sans ce disque, la
// démonstration montre des chiffres qui défilent sans raison visible. Il se resserre
// et prend l'accent à l'appui, comme un doigt qui se pose.
//
// Ses couleurs sont lues sur les jetons de l'application plutôt qu'écrites ici : en
// clair elles valent exactement ce qu'elles valaient — `--text` est `#221E1A` et
// `--accent` `#D63E45` —, et sur le thème sombre un disque d'encre foncée posé sur un
// fond foncé n'existait tout simplement pas.
export const CURSOR_SCRIPT = `
(() => {
  const channels = (name, fallback) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const hex = /^#([0-9a-fA-F]{6})$/.exec(raw);
    if (!hex) return fallback;
    const value = parseInt(hex[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255].join(',');
  };

  const install = () => {
    if (document.getElementById('__demo-cursor')) return;
    const dot = document.createElement('div');
    dot.id = '__demo-cursor';
    dot.style.cssText = [
      'position: fixed', 'top: 0', 'left: 0',
      'width: 30px', 'height: 30px', 'margin: -15px 0 0 -15px',
      'border-radius: 50%',
      'pointer-events: none', 'z-index: 2147483647',
      'transform: translate(-200px, -200px) scale(1)',
      'transition: transform 60ms linear, background-color 120ms linear',
    ].join(';');
    document.documentElement.appendChild(dot);

    let x = -200, y = -200, pressed = false;
    const render = () => {
      const ink = channels('--text', '34,30,26');
      const accent = channels('--accent', '214,62,69');
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (pressed ? 0.7 : 1) + ')';
      dot.style.border = '2.5px solid rgba(' + ink + ', 0.55)';
      dot.style.backgroundColor = pressed
        ? 'rgba(' + accent + ', 0.35)'
        : 'rgba(' + ink + ', 0.14)';
    };
    render();
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; render(); }, true);
    addEventListener('pointerdown', () => { pressed = true; render(); }, true);
    addEventListener('pointerup', () => { pressed = false; render(); }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
`;

/* -------------------------------------------------------------------------- */
/*  L'état de départ                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Présentation marquée vue, thème et accent fixés, et un mois de sessions semé.
 *
 * Un film qui dépend du thème de la machine n'est pas le même film deux fois, et un
 * relevé à zéro laisserait la moitié de l'écran vide alors que c'est justement ce que
 * l'application a à montrer. Le semis est calculé, pas tiré au sort : deux tournages
 * donnent la même semaine.
 *
 * `settings` écrase les réglages semés — les stories ont besoin des deux thèmes, le
 * film n'en veut qu'un. `timer` arme une session déjà en cours : l'application
 * restaure un `running` depuis son stockage, donc c'est un état qu'elle atteint
 * vraiment, et c'est le seul moyen de photographier un minuteur à mi-course sans
 * attendre dix minutes devant.
 *
 * Sérialisée par Playwright puis exécutée dans la page : elle ne peut fermer sur rien.
 */
export function seedStorage({ settings = {}, timer = null } = {}) {
  localStorage.setItem('pomodoro.intro.v1', '1');
  localStorage.setItem(
    'pomodoro.settings.v1',
    JSON.stringify({
      version: 1,
      theme: 'light',
      accentKey: 'red',
      locale: 'fr',
      focusMinutes: 25,
      breakMinutes: 5,
      dailyGoal: 4,
      ...settings,
    }),
  );

  if (timer) {
    const totalMs = timer.minutes * 60 * 1000;
    const remainingMs = timer.remainingMinutes * 60 * 1000;
    localStorage.setItem(
      'pomodoro.timer.v1',
      JSON.stringify({
        phase: 'running',
        mode: timer.mode ?? 'focus',
        minutes: timer.minutes,
        // Une marge de trois secondes absorbe le chargement : sans elle, la prise
        // arrive une seconde après l'instant visé et l'horloge a déjà tourné.
        endsAt: Date.now() + remainingMs + 3000,
        remainingMs: Math.min(totalMs, remainingMs),
      }),
    );
  }

  const DAY = 24 * 60 * 60 * 1000;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const entries = [];
  for (let back = 29; back >= 0; back -= 1) {
    // Une suite qui ne bouge pas d'un tournage à l'autre, avec des trous : un relevé
    // plein tous les jours ne ressemble à la semaine de personne.
    const count = [2, 3, 0, 4, 2, 1, 3, 0][back % 8];
    for (let index = 0; index < count; index += 1) {
      entries.push({
        startedAt: midnight.getTime() - back * DAY + (9 + index * 2) * 60 * 60 * 1000,
        minutes: [25, 45, 15, 25][index] ?? 25,
        mode: 'focus',
      });
    }
  }

  localStorage.setItem('pomodoro.sessions.v1', JSON.stringify({ version: 1, entries }));
}

/**
 * Un contexte prêt à tourner : fenêtre fixée, français, thème clair, aucun réseau
 * sortant, curseur installé, stockage semé.
 *
 * Les valeurs par défaut sont celles du tournage — un film se tourne en clair, à
 * l'échelle 1, sans session en cours. Les stories, elles, photographient : elles
 * demandent le double de pixels, les deux thèmes, et parfois un minuteur déjà parti.
 */
export async function openStage(
  browser,
  { viewport, recordVideo, deviceScaleFactor = 1, colorScheme = 'light', seed = {}, cursor = true },
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    locale: 'fr-FR',
    colorScheme,
    reducedMotion: 'no-preference',
    ...(recordVideo ? { recordVideo } : {}),
  });

  // Aucun réseau : l'app n'en demande pas, et une requête qui sortirait serait un
  // bogue à voir plutôt qu'une image à filmer.
  const origin = new URL(BASE_URL).origin;
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );

  await context.addInitScript(seedStorage, seed);
  if (cursor) await context.addInitScript(CURSOR_SCRIPT);

  // L'enregistreur démarre avec la page, donc avant le chargement et la mise en
  // place. Cet horodatage est ce qui permettra de couper exactement ce qui les
  // précède : sans lui, chaque plan commencerait avec une seconde de retard variable.
  const openedAt = Date.now();
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  return { context, page, openedAt, readyAt: Date.now(), pointer: createPointer(page) };
}

/* -------------------------------------------------------------------------- */
/*  Gestes                                                                     */
/* -------------------------------------------------------------------------- */

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const centre = async (locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('élément sans boîte englobante');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/**
 * Le pointeur, avec sa position. Le déplacement est adouci et piloté depuis Node pour
 * que de vrais `pointermove` partent le long du chemin ; le temps est lu à l'horloge
 * et non compté en images, parce que chaque aller-retour coûte 20 à 30 ms et qu'une
 * boucle à pas fixe durerait le double du demandé.
 */
export function createPointer(page) {
  let at = { x: 0, y: 0 };

  const moveTo = async (x, y, durationMs = 600) => {
    const from = { ...at };
    const start = Date.now();

    for (let elapsed = 0; elapsed < durationMs; elapsed = Date.now() - start) {
      const t = easeInOutCubic(elapsed / durationMs);
      await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
      await page.waitForTimeout(8);
    }

    await page.mouse.move(x, y);
    at = { x, y };
  };

  return {
    get at() {
      return { ...at };
    },
    moveTo,
    jumpTo: async (x, y) => {
      await page.mouse.move(x, y);
      at = { x, y };
    },
    moveToElement: async (locator, durationMs = 600) => {
      const target = await centre(locator);
      await moveTo(target.x, target.y, durationMs);
    },
    press: async (holdMs = 110) => {
      await page.mouse.down();
      await page.waitForTimeout(holdMs);
      await page.mouse.up();
    },
    down: () => page.mouse.down(),
    up: () => page.mouse.up(),
  };
}
