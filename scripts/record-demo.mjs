// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filme la fonctionnalité qu'aucune image fixe ne peut montrer : la durée se règle
 * en glissant sur les chiffres.
 *
 * C'est la démonstration nue — un geste, en entier, sans montage. Le film de
 * promotion, avec ses cartons et son rythme, est dans `make-film.mjs`.
 *
 * Playwright pilote la vraie application, pas une reconstitution. `recordVideo`
 * produit un .webm, ffmpeg en tire un GIF (palettegen/paletteuse en deux passes) et
 * un MP4 : le GIF pour un README ou une conversation, le MP4 pour les réseaux, qui
 * refusent presque tous le WebM.
 *
 * Prérequis :
 *   - `npm run build` puis un serveur sur http://localhost:4173 (`npm run preview`),
 *     ou n'importe quelle adresse passée par POMODORO_BASE_URL
 *   - ffmpeg sur le PATH
 *
 * Usage : npm run demo
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { argv, env } from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { assertFfmpeg, assertServerUp, centre, ffmpeg, openStage } from './stage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'design', 'social');

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
async function play(page, pointer) {
  const digits = page.getByRole('spinbutton', { name: 'durée de la session en minutes' });
  await digits.waitFor({ state: 'visible' });

  const grip = await centre(digits);
  await pointer.jumpTo(grip.x + 260, grip.y + 170);
  await page.waitForTimeout(700);

  await pointer.moveTo(grip.x, grip.y, 700);
  await page.waitForTimeout(350);

  await pointer.down();
  await page.waitForTimeout(300);

  // 25 → 45 : vingt minutes de plus, donc 180 px vers le haut.
  await pointer.moveTo(grip.x, grip.y - 180, 1500);
  await page.waitForTimeout(700);

  // 45 → 15 : trente minutes de moins, 270 px vers le bas depuis le même départ.
  await pointer.moveTo(grip.x, grip.y + 90, 1400);
  await page.waitForTimeout(800);

  await pointer.up();
  await page.waitForTimeout(600);

  await pointer.moveToElement(page.getByRole('button', { name: 'démarrer', exact: true }), 650);
  await page.waitForTimeout(200);
  await pointer.press();

  // La session tourne : l'écran se réduit à ses chiffres et à deux boutons. C'est la
  // promesse du produit, et elle ne se voit qu'en le laissant tourner. Le curseur
  // sort du cadre — l'app n'attend plus rien de personne, et un pointeur posé au
  // milieu de l'écran dirait le contraire.
  await page.waitForTimeout(900);

  const { height } = page.viewportSize();
  await pointer.moveTo(pointer.at.x, height + 60, 600);
  await page.waitForTimeout(1400);
}

/* -------------------------------------------------------------------------- */
/*  Encodage                                                                   */
/* -------------------------------------------------------------------------- */

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
    const { context, page, pointer } = await openStage(browser, {
      viewport: scene.viewport,
      recordVideo: { dir: videoDir, size: scene.viewport },
    });

    await play(page, pointer);
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
