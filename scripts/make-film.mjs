// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Monte le film de promotion.
 *
 * Ce n'est pas la démonstration de `record-demo.mjs`, qui filme un geste et s'arrête
 * là. C'est un film : il ouvre sur le geste déjà commencé, pose la promesse, montre la
 * session démarrer et l'écran se vider, dit ce qui ne sort pas de l'appareil, laisse
 * changer les couleurs, énumère ce que l'app refuse de faire, et signe.
 *
 * Trois étapes :
 *
 *  1. **Tournage.** Playwright joue chaque plan dans la vraie application — un contexte
 *     par plan, pour que chaque vidéo commence et finisse là où le montage l'attend.
 *  2. **Montage.** `design/film/film.html` porte le découpage. Les images du tournage y
 *     sont servies une par une, et `render(t)` échantillonne les animations à la
 *     seconde voulue au lieu de les laisser jouer : le film est reproductible à
 *     l'image près, ce qu'un enregistrement en temps réel ne serait jamais.
 *  3. **Encodage.** Les images partent dans ffmpeg par un tuyau, sans toucher le disque.
 *
 * Prérequis : un serveur sur http://localhost:4173 (`npm run build && npm run preview`)
 * et ffmpeg sur le PATH.
 *
 * Usage :
 *   npm run film              les deux formats
 *   npm run film -- wide      un seul
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { argv, env } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

import { BASE_URL, assertFfmpeg, assertServerUp, centre, ffmpeg, openStage } from './stage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMELINE = join(ROOT, 'design', 'film', 'film.html');
const OUT_DIR = join(ROOT, 'design', 'film');

const FPS = 30;

/**
 * Le tournage s'ouvre sur une application immobile, le temps d'absorber le décalage
 * entre le début de l'enregistrement et l'horloge de Node, qui ne sont jamais tout à
 * fait le même instant. Le montage, lui, n'en montre rien : chaque plan dit par son
 * `data-head` à quelle seconde de la prise il commence.
 */
const HOLD_SEC = 0.35;

const FORMATS = [
  {
    key: 'wide',
    stage: { width: 1920, height: 1080 },
    take: { width: 1920, height: 1080 },
    out: 'pomodoro-film-16x9.mp4',
    poster: 'pomodoro-film-poster.png',
  },
  {
    key: 'tall',
    stage: { width: 1080, height: 1920 },
    // Sous 768 px l'app garde la mise en page qu'on tient à la main ; l'image est
    // ensuite agrandie par la scène, qui fait deux fois cette largeur.
    take: { width: 540, height: 960 },
    out: 'pomodoro-film-9x16.mp4',
    poster: null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Les plans                                                                  */
/* -------------------------------------------------------------------------- */

const digitsOf = (page) => page.getByRole('spinbutton', { name: 'durée de la session en minutes' });

/**
 * Chaque prise commence sur une application immobile, joue son geste, puis tient une
 * seconde de plus qu'il n'en faut : le montage entre en cours de geste et sort après,
 * et une prise trop courte se figerait sur sa dernière image. Le film n'accélère ni ne
 * ralentit ce qu'il montre.
 */
const TAKES = {
  /** On saisit les chiffres et on cherche sa durée. 25 → 45 → 15. */
  async scrub(page, pointer) {
    const digits = digitsOf(page);
    await digits.waitFor({ state: 'visible' });
    const grip = await centre(digits);

    await pointer.jumpTo(grip.x + 300, grip.y + 210);
    await page.waitForTimeout(500);
    await pointer.moveTo(grip.x, grip.y, 650);
    await page.waitForTimeout(250);

    await pointer.down();
    await page.waitForTimeout(280);

    // 9 px par minute, et l'app tronque plutôt qu'elle n'arrondit : 180 px font
    // exactement vingt minutes, 270 en font trente.
    await pointer.moveTo(grip.x, grip.y - 180, 1350);
    await page.waitForTimeout(620);
    await pointer.moveTo(grip.x, grip.y + 90, 1250);
    await page.waitForTimeout(700);

    await pointer.up();
    await page.waitForTimeout(900);
  },

  /** On démarre, et l'écran se tait. */
  async run(page, pointer) {
    const digits = digitsOf(page);
    await digits.waitFor({ state: 'visible' });

    // La durée est posée au clavier : ce plan-là parle du démarrage, pas du réglage,
    // et un second glissement raconterait deux fois la même chose.
    await digits.focus();
    for (let step = 0; step < 10; step += 1) await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);

    const start = page.getByRole('button', { name: 'démarrer', exact: true });
    await pointer.moveToElement(start, 700);
    await page.waitForTimeout(220);
    await pointer.press();

    await page.waitForTimeout(700);

    // Le curseur sort du cadre : l'app n'attend plus rien de personne, et un pointeur
    // posé au milieu de l'écran dirait le contraire.
    const { height } = page.viewportSize();
    await pointer.moveTo(pointer.at.x, height + 60, 550);
    await page.waitForTimeout(2200);
  },

  /** Les réglages : la couleur, puis le thème. */
  async accent(page, pointer) {
    await pointer.moveToElement(page.getByRole('button', { name: 'réglages' }).first(), 550);
    await page.waitForTimeout(120);
    await pointer.press();
    await page.waitForTimeout(560);

    // Le thème d'abord, les accents ensuite : les couleurs se voient mieux posées sur
    // le fond sombre, et la légende les annonce dans cet ordre. L'inverse laissait le
    // basculement du thème pour la dernière demi-seconde du plan, où personne ne l'a vu.
    await pointer.moveToElement(page.getByRole('button', { name: 'sombre', exact: true }), 450);
    await page.waitForTimeout(110);
    await pointer.press();
    await page.waitForTimeout(620);

    for (const name of ['vert', 'bleu']) {
      await pointer.moveToElement(page.getByRole('button', { name, exact: true }), 420);
      await page.waitForTimeout(110);
      await pointer.press();
      await page.waitForTimeout(620);
    }

    await page.waitForTimeout(900);
  },
};

/* -------------------------------------------------------------------------- */
/*  Tournage                                                                   */
/* -------------------------------------------------------------------------- */

/** Joue un plan, en sort les images, et rend le dossier qui les contient. */
async function shoot(browser, name, viewport) {
  const videoDir = mkdtempSync(join(tmpdir(), `pomodoro-take-${name}-`));
  const framesDir = mkdtempSync(join(tmpdir(), `pomodoro-frames-${name}-`));

  const { context, page, pointer, openedAt, readyAt } = await openStage(browser, {
    viewport,
    recordVideo: { dir: videoDir, size: viewport },
  });

  await page.waitForTimeout(HOLD_SEC * 1000);
  await TAKES[name](page, pointer);
  await page.waitForTimeout(250);
  await context.close();

  // Le chargement et la mise en place ne sont pas le plan : on coupe ce qui les
  // couvre, mesuré plutôt que deviné. Ce qui reste commence sur l'immobilité de
  // `HOLD_SEC`, qui laisse sa marge à l'imprécision de l'enregistreur.
  const lead = (readyAt - openedAt) / 1000;
  const webm = join(
    videoDir,
    readdirSync(videoDir).find((file) => file.endsWith('.webm')),
  );
  ffmpeg([
    '-ss',
    lead.toFixed(3),
    '-i',
    webm,
    '-vf',
    `fps=${FPS}`,
    '-q:v',
    '3',
    join(framesDir, '%04d.jpg'),
  ]);
  rmSync(videoDir, { recursive: true, force: true });

  const count = readdirSync(framesDir).length;
  if (count === 0) throw new Error(`le plan « ${name} » n'a produit aucune image`);
  return { dir: framesDir, count };
}

/* -------------------------------------------------------------------------- */
/*  Montage et encodage                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Ouvre ffmpeg sur un tuyau : les images du montage y sont écrites une par une et ne
 * touchent jamais le disque. Un film de trente secondes en 1920×1080, c'est neuf cents
 * fichiers dont personne n'a besoin.
 */
function openEncoder(out) {
  const encoder = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
      '-i',
      '-',
      // yuv420p et des côtés pairs : hors de ces deux contraintes, la moitié des
      // lecteurs des réseaux sociaux refuse le fichier sans rien dire.
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-crf',
      '18',
      '-preset',
      'slow',
      '-movflags',
      '+faststart',
      '-an',
      out,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );

  const done = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg s'est arrêté avec le code ${code}`)),
    );
  });

  return {
    async write(buffer) {
      if (encoder.stdin.write(buffer)) return;
      await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    },
    async close() {
      encoder.stdin.end();
      await done;
    },
  };
}

async function cut(browser, format, takes) {
  const context = await browser.newContext({
    viewport: format.stage,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(TIMELINE).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((value) => window.film.format(value), format.key);

  const { duration, shots } = await page.evaluate(() => ({
    duration: window.film.duration,
    shots: window.film.shots,
  }));

  const stage = page.locator('#stage');
  const encoder = openEncoder(join(OUT_DIR, format.out));
  const total = Math.round(duration * FPS);
  let poster = null;

  for (let index = 0; index < total; index += 1) {
    const seconds = index / FPS;

    // Pour chaque plan filmé encore à l'écran, l'image du tournage qui lui correspond.
    // `head` est la seconde du tournage sur laquelle le plan ouvre : chaque prise
    // commence par une application immobile et un curseur qui arrive, et rien de tout
    // cela n'est du film. Un plan plus court que sa place au montage tient sur sa
    // dernière image plutôt que de disparaître.
    const frames = {};
    for (const shot of shots) {
      if (seconds < shot.in || seconds >= shot.out) continue;
      const take = takes[shot.take];
      const wanted = Math.min(Math.round((seconds - shot.in + shot.head) * FPS), take.count - 1);
      frames[shot.id] = pathToFileURL(
        join(take.dir, String(wanted + 1).padStart(4, '0') + '.jpg'),
      ).href;
    }

    await page.evaluate(([time, sources]) => window.film.render(time, sources), [seconds, frames]);

    const shot = await stage.screenshot({ type: 'jpeg', quality: 95 });
    await encoder.write(shot);

    // L'affiche : le cadran une fois la durée posée, légendé. C'est l'image qu'un
    // lecteur vidéo montre avant qu'on appuie sur lecture — elle doit montrer le
    // produit et dire ce qu'il fait, ce qu'une phrase seule sur du papier ne fait qu'à
    // moitié. Prise à l'arrêt du geste : en plein glissement, l'encodeur laisse une
    // traînée sur les chiffres, qui se lit dans un film et pas dans une image fixe.
    if (format.poster && Math.abs(seconds - 3.6) < 0.5 / FPS) {
      poster = await stage.screenshot({ type: 'png' });
    }
  }

  await encoder.close();
  await context.close();

  if (poster) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(OUT_DIR, format.poster), poster);
  }

  return { duration, total };
}

/* -------------------------------------------------------------------------- */

await assertServerUp();
assertFfmpeg();
mkdirSync(OUT_DIR, { recursive: true });

const wanted = argv.slice(2).filter((argument) => !argument.startsWith('-'));
const formats = wanted.length ? FORMATS.filter((format) => wanted.includes(format.key)) : FORMATS;

const browser = await chromium.launch({ executablePath: env.CHROMIUM_PATH || undefined });
console.log(`Tournage sur ${BASE_URL}`);

for (const format of formats) {
  const takes = {};

  try {
    for (const name of Object.keys(TAKES)) {
      takes[name] = await shoot(browser, name, format.take);
      console.log(`  plan ${name} · ${takes[name].count} images`);
    }

    const { duration } = await cut(browser, format, takes);
    const size = statSync(join(OUT_DIR, format.out)).size;
    console.log(`${format.out} · ${duration.toFixed(1)} s (${(size / 1024).toFixed(0)} Ko)`);
    if (format.poster) console.log(`${format.poster}`);
  } finally {
    for (const take of Object.values(takes)) rmSync(take.dir, { recursive: true, force: true });
  }
}

await browser.close();
