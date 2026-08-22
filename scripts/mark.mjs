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

/** La palette de la marque, reprise des jetons de l'interface. */
export const PALETTE = {
  accent: '#D63E45',
  paper: '#FBF6EE',
  ink: '#221E1A',
};

/**
 * Les deux courses sont de la même encre, à pleine opacité. Une pause en demi-teinte
 * a été essayée : elle vire au rose sur le rouge, et fait lire la marque comme un
 * tourniquet de chargement dont un bout traîne. Ce qui sépare le travail de la pause,
 * c'est leur longueur — 25 contre 5 —, et c'est assez.
 */
