export interface GearIconProps {
  size?: number;
}

// Eight teeth on a 24-unit grid: root radius 7.55, tip 10.35, each tooth 26° wide
// at the tip and 40° at its root. Stroked, like every other glyph in the app.
const TEETH =
  'M9.42 4.91 L9.67 1.92 L14.33 1.92 L14.58 4.91 L15.19 5.16 L17.48 3.22 L20.78 6.52 ' +
  'L18.84 8.81 L19.09 9.42 L22.08 9.67 L22.08 14.33 L19.09 14.58 L18.84 15.19 L20.78 17.48 ' +
  'L17.48 20.78 L15.19 18.84 L14.58 19.09 L14.33 22.08 L9.67 22.08 L9.42 19.09 L8.81 18.84 ' +
  'L6.52 20.78 L3.22 17.48 L5.16 15.19 L4.91 14.58 L1.92 14.33 L1.92 9.67 L4.91 9.42 ' +
  'L5.16 8.81 L3.22 6.52 L6.52 3.22 L8.81 5.16 Z';

export function GearIcon({ size = 17 }: GearIconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={TEETH} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
