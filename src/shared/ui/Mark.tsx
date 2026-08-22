export interface MarkProps {
  size?: number;
}

// The mark: one dial, two runs — the long one is the focus session, the short one the
// break, in the 25:5 ratio the app arms by default. The two paths are the ones
// `scripts/generate-icons.mjs` writes into `public/icons/icon.svg`; the geometry lives
// in `scripts/mark.mjs` and `npm run icons` reprints both. Nothing here is decorative:
// change the ratio there and every surface follows.
const WORK = 'M 296.923 121.278 A 140.8 140.8 0 1 1 118.866 224.079';
const BREAK = 'M 159.789 153.199 A 140.8 140.8 0 0 1 215.077 121.278';

/**
 * Drawn in `currentColor` and hidden from screen readers: it stands next to the name
 * everywhere it appears, and a logo that repeats the word beside it is noise. Colour
 * and spacing belong to whoever places it, like every other glyph here.
 */
export function Mark({ size = 20 }: MarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth={48.64}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={WORK} />
      <path d={BREAK} />
    </svg>
  );
}
