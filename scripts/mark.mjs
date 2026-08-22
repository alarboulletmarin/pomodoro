// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La marque : un cadran, deux courses — travail, pause.
 *
 * L'anneau n'est pas décoratif, il porte le rythme par défaut de l'application :
 * la course longue vaut 25 minutes, la courte 5, sur un tour de 30. C'est la seule
 * idée que le logo ait à transporter, et elle se lit sans légende.
 *
 * Les angles partent de midi et tournent dans le sens des aiguilles. Ce fichier est
 * la source unique : le générateur d'icônes, le favicon SVG, le composant React du
 * logotype et les visuels sociaux lisent tous ces mêmes nombres. Deux géométries qui
 * se ressemblent finissent par diverger d'un demi-degré, et une identité ne survit
 * pas à ça.
 */

/** Le cycle par défaut de l'app, en minutes. */
export const CYCLE = { work: 25, break: 5 };

const TOUR = CYCLE.work + CYCLE.break;

/** Part du tour occupée par le travail, en degrés. */
export const WORK_DEG = (360 * CYCLE.work) / TOUR;

/** L'écart visible entre les deux courses, aux deux jonctions. */
export const GAP_DEG = 14;

/** Rayon de la ligne médiane de l'anneau, en fraction du côté de la boîte. */
export const RADIUS = 0.275;

/** Épaisseur de l'anneau, même unité. */
export const STROKE = 0.095;

/** Rayon extérieur de la marque, ce qui décide de la place qu'elle prend. */
export const OUTER = RADIUS + STROKE / 2;

/**
 * Les bouts ronds débordent de la ligne médiane d'un demi-trait. Sans les rentrer,
 * l'écart dessiné serait plus étroit que l'écart voulu — et à la jonction courte,
 * négatif. Voici de combien, en degrés.
 */
const CAP_DEG = ((STROKE / 2 / RADIUS) * 180) / Math.PI;

/**
 * Les deux courses, en degrés de ligne médiane depuis midi.
 *
 * `from`/`to` décrivent le trait à peindre ; `visual` dit où l'œil voit ses bords,
 * bouts ronds compris. C'est `visual` qui respecte l'écart et le rapport 25:5.
 */
export const RUNS = [
  {
    name: 'work',
    from: GAP_DEG / 2 + CAP_DEG,
    to: WORK_DEG - GAP_DEG / 2 - CAP_DEG,
    visual: [GAP_DEG / 2, WORK_DEG - GAP_DEG / 2],
  },
  {
    name: 'break',
    from: WORK_DEG + GAP_DEG / 2 + CAP_DEG,
    to: 360 - GAP_DEG / 2 - CAP_DEG,
    visual: [WORK_DEG + GAP_DEG / 2, 360 - GAP_DEG / 2],
  },
];

/** Le rayon des coins, en fraction du côté — la tuile des icônes et du favicon. */
export const TILE_RADIUS = 0.225;

/** Un point de la ligne médiane, pour un centre et un rayon donnés. */
export function pointAt(cx, cy, radius, degrees) {
  const angle = (degrees * Math.PI) / 180;
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
}

/**
 * Le `d` d'un arc SVG. Les deux courses font moins de 180°… sauf celle du travail,
 * qui en fait 286 : le drapeau `large-arc` se déduit de l'angle, il ne se devine pas.
 */
export function arcPath(cx, cy, radius, from, to) {
  const [x1, y1] = pointAt(cx, cy, radius, from);
  const [x2, y2] = pointAt(cx, cy, radius, to);
  const large = to - from > 180 ? 1 : 0;
  const round = (value) => Number(value.toFixed(3));
  return `M ${round(x1)} ${round(y1)} A ${round(radius)} ${round(radius)} 0 ${large} 1 ${round(x2)} ${round(y2)}`;
}

/**
 * Les trois accents de l'application, dans leurs deux thèmes.
 *
 * Ces valeurs existent déjà dans `ACCENT_PALETTE` (src/types/index.ts) : les scripts
 * ne peuvent pas lire du TypeScript, alors elles sont recopiées ici — et un test
 * (src/shared/ui/Mark.test.tsx) relit ce fichier pour interdire qu'elles divergent.
 */
export const ACCENTS = {
  red: { light: '#D63E45', dark: '#FF6F6F' },
  green: { light: '#2C855E', dark: '#5FCB92' },
  blue: { light: '#2F6FE0', dark: '#7FA9FF' },
};

/** Les surfaces des deux thèmes, mêmes valeurs que src/styles/tokens.css. */
export const THEMES = {
  light: {
    paper: '#FBF6EE',
    surface: '#FFFFFF',
    ink: '#221E1A',
    muted: '#6B625A',
    track: 'rgba(34, 30, 26, 0.09)',
    dot: 'rgba(34, 30, 26, 0.3)',
    shadow: '0 1px 0 rgba(34, 30, 26, 0.06), 0 2.5em 5em -3.4em rgba(34, 30, 26, 0.8)',
  },
  dark: {
    paper: '#151311',
    surface: '#201D1A',
    ink: '#F5F0E8',
    muted: '#A79C90',
    track: 'rgba(245, 240, 232, 0.1)',
    dot: 'rgba(245, 240, 232, 0.3)',
    // Le thème sombre de l'app ne porte pas d'ombre portée : sur un fond sombre elle
    // ne se voit pas, et une carte s'y détache par sa clarté. Juste le filet du haut.
    shadow: '0 1px 0 rgba(245, 240, 232, 0.05)',
  },
};

/**
 * La palette de la tuile d'icône : toujours le rouge clair sur le papier clair.
 * Une icône d'écran d'accueil ne suit pas le thème du système, et elle est posée
 * une fois pour toutes à l'installation.
 */
export const PALETTE = {
  accent: ACCENTS.red.light,
  paper: THEMES.light.paper,
  ink: THEMES.light.ink,
};

/**
 * Les deux courses sont de la même encre, à pleine opacité. Une pause en demi-teinte
 * a été essayée : elle vire au rose sur le rouge, et fait lire la marque comme un
 * tourniquet de chargement dont un bout traîne. Ce qui sépare le travail de la pause,
 * c'est leur longueur — 25 contre 5 —, et c'est assez.
 */
