// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filme la fonctionnalité qu'aucune image fixe ne peut montrer : la durée se règle
 * en glissant sur les chiffres.
 *
 * Playwright pilote la vraie application — pas une reconstitution — avec un curseur
 * factice injecté dans la page, puisqu'une capture n'enregistre pas le pointeur du
 * système et qu'un nombre qui change tout seul ne se lit pas comme un geste.
 * `recordVideo` produit un .webm, ffmpeg en tire un GIF (palettegen/paletteuse en
 * deux passes) et un MP4 : le GIF pour un README ou une conversation, le MP4 pour
 * les réseaux, qui refusent presque tous le WebM.
 *
 * Deux plans, mêmes gestes :
 *   large   1280×720   → 16:9, et le GIF
 *   haut     540×960   → 9:16, la mise en page portrait de l'app
 *
 * Prérequis :
 *   - `npm run build` puis un serveur sur http://localhost:4173 (`npm run preview`),
 *     ou n'importe quelle adresse passée par POMODORO_BASE_URL
 *   - ffmpeg sur le PATH
 *
 * Déterministe par construction : la langue, le thème, l'accent et l'écran de
 * présentation sont fixés dans localStorage avant le moindre script de page, et
 * toute requête qui ne vise pas le serveur est refusée.
 *
 * Usage : npm run demo
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { argv, env, exit } from 'node:process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'design', 'social');
const BASE_URL = env.POMODORO_BASE_URL ?? 'http://localhost:4173';

/** Au-delà, un GIF ne s'affiche plus dans un README de GitHub sans être cliqué. */
const GIF_BUDGET_BYTES = 9 * 1024 * 1024;

/**
 * La fenêtre décide de deux choses à la fois, et elles tirent en sens contraire.
 *
 * D'abord la mise en page : au-delà de 768 px de large l'app passe en tablette, au-delà
 * de 1200 en bureau (LAYOUT_BREAKPOINTS). Une story doit montrer celle qu'on tient à la
 * main, donc une fenêtre de moins de 768.
 *
 * Ensuite la définition : Playwright compose la vidéo en pixels CSS et ne sait que la
 * *réduire* — demander 1080 à une fenêtre de 540 borde l'image de gris au lieu de
 * l'agrandir, et un `deviceScaleFactor` de 2 n'y change rien. Le 16:9 est donc filmé
 * à sa taille finale ; le 9:16 est filmé à 540 et agrandi par ffmpeg, ce qui reste
 * plus net que de laisser un réseau social le faire.
 */
const SCENES = [
  {
    key: 'wide',
    viewport: { width: 1920, height: 1080 },
    upscale: 1,
    mp4: 'pomodoro-demo-16x9.mp4',
    gif: { name: 'pomodoro-demo.gif', fps: 18, width: 900 },
    gifFallback: { fps: 12, width: 720 },
  },
  {
    key: 'tall',
    viewport: { width: 540, height: 960 },
    upscale: 2,
    mp4: 'pomodoro-demo-9x16.mp4',
    gif: null,
    gifFallback: null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Contrôles préalables — échouer tôt, et en disant quoi faire                */
/* -------------------------------------------------------------------------- */

async function assertServerUp() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error(`✗ Rien ne répond sur ${BASE_URL} (${error.message})`);
    console.error('  Lance-le d’abord : npm run build && npm run preview');
    exit(1);
  }
}

function assertFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('✗ ffmpeg introuvable sur le PATH — apt install ffmpeg, ou brew install ffmpeg.');
    exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/*  Le curseur factice                                                         */
/* -------------------------------------------------------------------------- */

// Une capture d'écran n'enregistre pas le pointeur du système : sans ce disque, la
// démonstration montre des chiffres qui défilent sans raison visible. Il se resserre
// à l'appui, comme un doigt qui se pose.
const CURSOR_SCRIPT = `
(() => {
  const install = () => {
    if (document.getElementById('__demo-cursor')) return;
    const dot = document.createElement('div');
    dot.id = '__demo-cursor';
    dot.style.cssText = [
      'position: fixed', 'top: 0', 'left: 0',
      'width: 30px', 'height: 30px', 'margin: -15px 0 0 -15px',
      'border-radius: 50%',
      'background: rgba(34, 30, 26, 0.14)',
      'border: 2.5px solid rgba(34, 30, 26, 0.55)',
      'pointer-events: none', 'z-index: 2147483647',
      'transform: translate(-200px, -200px) scale(1)',
      'transition: transform 60ms linear, background-color 120ms linear',
    ].join(';');
    document.documentElement.appendChild(dot);

    let x = -200, y = -200, pressed = false;
    const render = () => {
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (pressed ? 0.7 : 1) + ')';
      dot.style.backgroundColor = pressed ? 'rgba(214, 62, 69, 0.35)' : 'rgba(34, 30, 26, 0.14)';
    };
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; render(); }, true);
    addEventListener('pointerdown', () => { pressed = true; render(); }, true);
    addEventListener('pointerup', () => { pressed = false; render(); }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
`;

/* -------------------------------------------------------------------------- */
/*  Gestes                                                                     */
/* -------------------------------------------------------------------------- */

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

let pointer = { x: 0, y: 0 };

/**
 * Déplacement adouci, piloté depuis Node pour que de vrais `pointermove` partent le
 * long du chemin. Le temps est lu à l'horloge et non compté en images : chaque
 * aller-retour coûte 20 à 30 ms, une boucle à pas fixe durerait le double du demandé.
 */
async function moveTo(page, x, y, durationMs = 600) {
  const from = { ...pointer };
  const start = Date.now();

  for (let elapsed = 0; elapsed < durationMs; elapsed = Date.now() - start) {
    const t = easeInOutCubic(elapsed / durationMs);
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
    await page.waitForTimeout(8);
  }

  await page.mouse.move(x, y);
  pointer = { x, y };
}

const centre = async (locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('élément sans boîte englobante');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/* -------------------------------------------------------------------------- */
/*  La scène                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Le geste, en entier : on saisit les chiffres, on monte jusqu'à 45 minutes, on
 * redescend à 15, on lâche, on démarre. Les valeurs fantômes au-dessus et en dessous
 * suivent tout du long — c'est ce qui dit que les chiffres défilent.
 *
 * 9 pixels par minute (SCRUB_PIXELS_PER_MINUTE), et l'app tronque plutôt qu'elle
 * n'arrondit : les distances ci-dessous sont donc exactes, pas approchées.
 */
async function play(page) {
  const digits = page.getByRole('spinbutton', { name: 'durée de la session en minutes' });
  await digits.waitFor({ state: 'visible' });

  const grip = await centre(digits);
  await page.mouse.move(grip.x + 260, grip.y + 170);
  pointer = { x: grip.x + 260, y: grip.y + 170 };
  await page.waitForTimeout(700);

  await moveTo(page, grip.x, grip.y, 700);
  await page.waitForTimeout(350);

  await page.mouse.down();
  await page.waitForTimeout(300);

  // 25 → 45 : vingt minutes de plus, donc 180 px vers le haut.
  await moveTo(page, grip.x, grip.y - 180, 1500);
  await page.waitForTimeout(700);

  // 45 → 15 : trente minutes de moins, 270 px vers le bas depuis le même départ.
  await moveTo(page, grip.x, grip.y + 90, 1400);
  await page.waitForTimeout(800);

  await page.mouse.up();
  await page.waitForTimeout(600);

  const start = page.getByRole('button', { name: 'démarrer', exact: true });
  await moveTo(page, ...Object.values(await centre(start)), 650);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(110);
  await page.mouse.up();

  // La session tourne : l'écran se réduit à ses chiffres et à deux boutons. C'est la
  // promesse du produit, et elle ne se voit qu'en le laissant tourner. Le curseur
  // sort du cadre — l'app n'attend plus rien de personne, et un pointeur posé au
  // milieu de l'écran dirait le contraire.
  await page.waitForTimeout(900);

  const { height } = page.viewportSize();
  await moveTo(page, pointer.x, height + 60, 600);
  await page.waitForTimeout(1400);
}

/* -------------------------------------------------------------------------- */
/*  Encodage                                                                   */
/* -------------------------------------------------------------------------- */

const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

function toMp4(webm, out, upscale) {
  // yuv420p et des côtés pairs : hors de ces deux contraintes, la moitié des lecteurs
  // des réseaux sociaux refuse le fichier sans rien dire.
  const size =
    upscale > 1
      ? `scale=iw*${upscale}:ih*${upscale}:flags=lanczos`
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

  ffmpeg([
    '-i',
    webm,
    '-vf',
    `${size},format=yuv420p`,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-crf',
    '20',
    '-preset',
    'slow',
    '-movflags',
    '+faststart',
    '-an',
    out,
  ]);
}

function toGif(webm, out, { fps, width }) {
  const filters = `fps=${fps},scale=${width}:-1:flags=lanczos`;
  const palette = join(mkdtempSync(join(tmpdir(), 'pomodoro-gif-')), 'palette.png');

  ffmpeg([
    '-i',
    webm,
    '-vf',
    `${filters},palettegen=stats_mode=diff`,
    '-update',
    '1',
    '-frames:v',
    '1',
    palette,
  ]);
  ffmpeg([
    '-i',
    webm,
    '-i',
    palette,
    '-lavfi',
    `${filters} [v]; [v][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    '-loop',
    '0',
    out,
  ]);

  rmSync(dirname(palette), { recursive: true, force: true });
}

/* -------------------------------------------------------------------------- */

await assertServerUp();
assertFfmpeg();
mkdirSync(OUT_DIR, { recursive: true });

const wanted = argv.slice(2).filter((argument) => !argument.startsWith('-'));
const scenes = wanted.length ? SCENES.filter((scene) => wanted.includes(scene.key)) : SCENES;

const browser = await chromium.launch({ executablePath: env.CHROMIUM_PATH || undefined });

for (const scene of scenes) {
  const videoDir = mkdtempSync(join(tmpdir(), 'pomodoro-demo-'));

  try {
    const context = await browser.newContext({
      viewport: scene.viewport,
      deviceScaleFactor: 1,
      locale: 'fr-FR',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      recordVideo: { dir: videoDir, size: scene.viewport },
    });

    // Aucun réseau : l'app n'en demande pas, et une requête qui sortirait serait
    // un bogue à voir plutôt qu'une image à filmer.
    const origin = new URL(BASE_URL).origin;
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );

    // La présentation du premier lancement est marquée vue, le thème est fixé, et un
    // mois de sessions est semé : un film qui dépend du thème de la machine n'est pas
    // le même film deux fois, et un relevé à zéro montrerait la moitié de l'écran
    // vide alors que c'est justement ce que l'app a à raconter. Le semis est calculé,
    // pas tiré au sort — deux tournages donnent la même semaine.
    await context.addInitScript(() => {
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
        }),
      );

      const DAY = 24 * 60 * 60 * 1000;
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const entries = [];
      for (let back = 29; back >= 0; back -= 1) {
        // Une suite qui ne bouge pas d'un tournage à l'autre, avec des trous : un
        // relevé plein tous les jours ne ressemble à la semaine de personne.
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
    });
    await context.addInitScript(CURSOR_SCRIPT);

    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await play(page);

    await page.waitForTimeout(400);
    await context.close();

    const webm = join(
      videoDir,
      readdirSync(videoDir).find((file) => file.endsWith('.webm')),
    );

    toMp4(webm, join(OUT_DIR, scene.mp4), scene.upscale);
    console.log(`${scene.mp4} (${(statSync(join(OUT_DIR, scene.mp4)).size / 1024).toFixed(0)} Ko)`);

    if (scene.gif) {
      const out = join(OUT_DIR, scene.gif.name);
      toGif(webm, out, scene.gif);

      if (statSync(out).size > GIF_BUDGET_BYTES) {
        console.log(`  ${scene.gif.name} dépasse le budget — nouvelle passe plus légère`);
        toGif(webm, out, scene.gifFallback);
      }

      console.log(`${scene.gif.name} (${(statSync(out).size / 1024 / 1024).toFixed(1)} Mo)`);
    }
  } finally {
    rmSync(videoDir, { recursive: true, force: true });
  }
}

await browser.close();
