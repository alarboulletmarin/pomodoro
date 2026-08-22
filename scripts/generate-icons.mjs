// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dessine le jeu d'icônes de la PWA, et le favicon SVG, depuis `mark.mjs`.
 *
 * Sans dépendance : un canevas RGBA rasterisé à la main, suréchantillonné 4×4 pour
 * les bords, puis encodé en PNG via zlib. Une bibliothèque d'images pour cinq
 * disques et deux arcs coûterait plus à auditer qu'à écrire.
 *
 * Ce que le jeu doit tenir, et que le précédent ne tenait pas :
 *
 * - Une tuile **opaque et colorée**. Une icône crème sur un fond crème n'est pas une
 *   icône, c'est un carré vide — et c'est ce qu'on voyait après installation.
 * - Un `maskable` qui **soit** maskable : fond à fond perdu, motif dans la zone sûre.
 *   L'ancien était l'octet pour octet copie du `any`, donc rogné par le masque rond
 *   des lanceurs Android.
 * - Un `apple-touch-icon` **carré et sans transparence** : iOS ne compose pas, il
 *   pose l'image telle quelle et arrondit lui-même. Un coin transparent y devient noir.
 *
 * Usage : npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTER, PALETTE, RADIUS, RUNS, STROKE, TILE_RADIUS, arcPath } from './mark.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');

const ACCENT = hex(PALETTE.accent);
const PAPER = hex(PALETTE.paper);
const INK = [0, 0, 0];

function hex(value) {
  return [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16));
}

/* -------------------------------------------------------------------------- */
/*  Canevas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Un canevas RGBA en flottants : les couleurs restent en 0–255 et l'alpha en 0–1
 * jusqu'à l'encodage. Composer en entiers sur cinq passes ferait dériver les bords.
 */
function createCanvas(size) {
  const rgb = new Float64Array(size * size * 3);
  const alpha = new Float64Array(size * size);

  return {
    size,
    rgb,
    alpha,

    /** Remplit tout, opaque : le fond des tuiles à fond perdu. */
    fill(color) {
      for (let index = 0; index < size * size; index += 1) {
        rgb[index * 3] = color[0];
        rgb[index * 3 + 1] = color[1];
        rgb[index * 3 + 2] = color[2];
        alpha[index] = 1;
      }
    },

    /**
     * Peint `color` là où `inside(x, y)` est vrai, en source-over, bords lissés
     * par 16 échantillons. `opacity` est l'opacité de la source, pas du résultat.
     */
    paint(color, opacity, inside) {
      const SAMPLES = 4;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          let hits = 0;
          for (let sy = 0; sy < SAMPLES; sy += 1) {
            for (let sx = 0; sx < SAMPLES; sx += 1) {
              if (inside(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)) hits += 1;
            }
          }
          if (hits === 0) continue;

          const source = opacity * (hits / (SAMPLES * SAMPLES));
          const index = y * size + x;
          const behind = alpha[index] * (1 - source);
          const total = source + behind;

          for (let channel = 0; channel < 3; channel += 1) {
            const offset = index * 3 + channel;
            rgb[offset] = (color[channel] * source + rgb[offset] * behind) / total;
          }
          alpha[index] = total;
        }
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Formes                                                                     */
/* -------------------------------------------------------------------------- */

/** Rectangle à coins arrondis. */
const roundedRect = (left, top, width, height, radius) => (x, y) => {
  if (x < left || x > left + width || y < top || y > top + height) return false;
  const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
  const dy = Math.max(top + radius - y, 0, y - (top + height - radius));
  return dx * dx + dy * dy <= radius * radius;
};

/**
 * Arc à bouts ronds : l'ensemble des points à moins d'un demi-trait de la ligne
 * médiane. Dans le secteur, c'est l'écart au rayon ; en dehors, la distance au bout
 * le plus proche — ce qui donne les bouts ronds sans les dessiner.
 */
const roundArc = (cx, cy, radius, from, to, stroke) => {
  const half = stroke / 2;
  const span = to - from;
  const ends = [from, to].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
  });

  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.hypot(dx, dy);

    // Trop loin du cercle dans les deux sens : aucun bout ne peut rattraper.
    if (distance > radius + half + stroke || distance < radius - half - stroke) {
      // Les bouts ronds ne dépassent jamais de plus d'un demi-trait du cercle.
      if (distance > radius + half || distance < radius - half) return false;
    }

    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const offset = (degrees - from + 720) % 360;
    if (offset <= span) return Math.abs(distance - radius) <= half;

    return ends.some(([ex, ey]) => Math.hypot(x - ex, y - ey) <= half);
  };
};

/* -------------------------------------------------------------------------- */
/*  PNG                                                                        */
/* -------------------------------------------------------------------------- */

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePNG(canvas) {
  const { size, rgb, alpha } = canvas;
  const stride = size * 4;
  // Chaque ligne est préfixée par son octet de filtre (0 = aucun).
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const line = y * (stride + 1);
    raw[line] = 0;
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const offset = line + 1 + x * 4;
      raw[offset] = Math.round(rgb[index * 3]);
      raw[offset + 1] = Math.round(rgb[index * 3 + 1]);
      raw[offset + 2] = Math.round(rgb[index * 3 + 2]);
      raw[offset + 3] = Math.round(alpha[index] * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/*  Les icônes                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @param size    côté en pixels
 * @param options.tile     'rounded' (coins transparents), 'square' (à fond perdu),
 *                         ou 'none' (fond transparent, pour le monochrome)
 * @param options.scale    taille de la marque, 1 = la géométrie nominale
 * @param options.ink      couleur des deux courses
 */
function drawIcon(size, { tile = 'rounded', scale = 1, ink = PAPER } = {}) {
  const canvas = createCanvas(size);

  if (tile === 'square') canvas.fill(ACCENT);
  else if (tile === 'rounded') {
    canvas.paint(ACCENT, 1, roundedRect(0, 0, size, size, size * TILE_RADIUS));
  }

  const centre = size / 2;
  const radius = RADIUS * size * scale;
  const stroke = STROKE * size * scale;

  for (const run of RUNS) {
    canvas.paint(ink, 1, roundArc(centre, centre, radius, run.from, run.to, stroke));
  }

  return encodePNG(canvas);
}

/** Le favicon : la même tuile, en vectoriel, pour l'onglet et la barre d'adresse. */
function drawFavicon() {
  const runs = RUNS.map(
    (run) =>
      `  <path d="${arcPath(256, 256, RADIUS * 512, run.from, run.to)}" stroke="${PALETTE.paper}" stroke-width="${STROKE * 512}" stroke-linecap="round" fill="none" />`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Pomodoro">
  <rect width="512" height="512" rx="${TILE_RADIUS * 512}" fill="${PALETTE.accent}" />
${runs.join('\n')}
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  // `any` : coins transparents, la plateforme pose la tuile telle quelle.
  ['icon-32.png', drawIcon(32)],
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],

  // `maskable` : fond perdu, marque rentrée sous les 80 % de la zone sûre.
  ['icon-512-maskable.png', drawIcon(512, { tile: 'square', scale: 0.86 })],

  // `monochrome` : Android n'en garde que l'alpha, et le teinte lui-même.
  ['icon-512-monochrome.png', drawIcon(512, { tile: 'none', scale: 0.86, ink: INK })],

  // iOS : carré, opaque, il arrondit lui-même.
  ['apple-touch-icon.png', drawIcon(180, { tile: 'square' })],

  ['icon.svg', Buffer.from(drawFavicon(), 'utf8')],
];

for (const [name, data] of outputs) {
  writeFileSync(join(OUT_DIR, name), data);
  console.log(`${name} (${(data.length / 1024).toFixed(1)} Ko)`);
}

console.log(`\nMarque : ${(OUTER * 200).toFixed(1)} % du côté, écart ${RUNS[0].visual[0] * 2}°.`);
