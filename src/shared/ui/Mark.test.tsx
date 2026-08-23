import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACCENT_PALETTE } from '../../types';
import { THEME_BG, THEME_INK, THEME_SURFACE } from '../../features/settings/theme-colors';
import { BREAK, WORK } from './Mark';

// The mark exists in four places and must be one shape: this component, the favicon
// and the icon PNGs that `scripts/generate-icons.mjs` prints, and the share boards.
// The generator is a plain .mjs the app cannot import, so the agreement is checked
// here — by reading the files, which needs no build step and no type declaration.
const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const paths = (svg: string): string[] =>
  [...svg.matchAll(/\sd="([^"]+)"/g)].flatMap((match) => (match[1] ? [match[1]] : []));

describe('the mark', () => {
  it('draws the same two runs as the favicon', () => {
    expect(paths(read('public/icons/icon.svg'))).toEqual([WORK, BREAK]);
  });

  it('draws the same two runs as the share boards', () => {
    expect(paths(read('design/social/cards.html'))).toEqual([WORK, BREAK]);
  });

  it('carries the ratio the app arms by default', () => {
    // 25 of 30 minutes is 300°, so the long run has to cross the half turn and the
    // short one must not. Those are the two large-arc flags, and swapping either
    // turns the dial inside out without any other test noticing.
    expect(WORK).toContain('0 1 1');
    expect(BREAK).toContain('0 0 1');
  });
});

describe('the generator palette', () => {
  // `scripts/mark.mjs` restates these values because a script cannot import
  // TypeScript. Restating them is only safe while something forbids them drifting.
  const script = read('scripts/mark.mjs').toLowerCase();

  it.each(Object.entries(ACCENT_PALETTE))('carries both %s accents', (_key, pair) => {
    expect(script).toContain(pair.light.toLowerCase());
    expect(script).toContain(pair.dark.toLowerCase());
  });

  it.each(['light', 'dark'] as const)('carries the %s surfaces', (theme) => {
    for (const value of [THEME_BG[theme], THEME_SURFACE[theme], THEME_INK[theme]]) {
      expect(script).toContain(value.toLowerCase());
    }
  });

  it('agrees with the muted ink of both themes', () => {
    // Not exposed to the app in TypeScript — it is only ever read from CSS — so the
    // token file is the reference here.
    const tokens = read('src/styles/tokens.css');
    const muted = [...tokens.matchAll(/--muted:\s*(#[0-9a-fA-F]{6})/g)].flatMap((match) =>
      match[1] ? [match[1]] : [],
    );

    expect(muted).toHaveLength(2);
    for (const value of muted) expect(script).toContain(value.toLowerCase());
  });
});

describe('the icon links', () => {
  const html = read('index.html');

  const stamped = [...html.matchAll(/<link[^>]*?href="\/([^"?]+)\?v=%V:([^%]+)%"/gs)].map(
    ([, href, token]) => ({ href, token }),
  );

  // Un onglet garderait le dessin d'avant jusqu'à expiration de son cache. Le `?v=`
  // que le plugin `asset-stamp` remplit au build est ce qui fait redemander le
  // fichier ; enlever le jeton ne casse rien de visible, et ne se verrait qu'au
  // redessin suivant.
  it('stamps both favicons, and only them', () => {
    expect(stamped.map(({ href }) => href)).toEqual(['icons/icon.svg', 'icons/icon-32.png']);
  });

  it.each(['icons/icon.svg', 'icons/icon-32.png'])(
    'stamps %s from the file it actually serves',
    (href) => {
      // Le jeton nomme le fichier dont l'empreinte est prise : s'il désigne autre
      // chose que l'icône servie, l'adresse ne bouge pas quand le dessin change.
      expect(stamped.find((candidate) => candidate.href === href)?.token).toBe(href);
      expect(existsSync(resolve(process.cwd(), 'public', href))).toBe(true);
    },
  );

  // Les trois règles qu'iOS impose et qui ne se voient sur aucun écran de
  // développement : l'icône est à la racine, parce que c'est le chemin qu'il demande
  // de lui-même quand il ne lit pas la balise ; elle est nue, parce qu'on ne donne
  // pas de paramètre à un fetch système ; et le fichier est bien là. Les quatre
  // autres applications de la maison livrent exactement cette forme.
  it('points the apple-touch-icon at the site root, bare', () => {
    const link = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*>/s)?.[0];
    expect(link).toBeDefined();
    expect(link).toContain('href="/apple-touch-icon.png"');
    expect(existsSync(resolve(process.cwd(), 'public/apple-touch-icon.png'))).toBe(true);
  });
});
