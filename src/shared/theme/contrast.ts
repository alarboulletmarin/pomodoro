import { ON_ACCENT } from '../../types';

const HEX_PATTERN = /^#?(?:([0-9a-f]{3})|([0-9a-f]{6}))$/i;

export function normaliseHex(value: string): string | null {
  const match = HEX_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, short, long] = match;
  const digits = long ?? (short as string).replace(/./g, (c) => c + c);
  return `#${digits.toUpperCase()}`;
}

function channels(hex: string): [number, number, number] {
  const normalised = normaliseHex(hex);
  if (!normalised) throw new TypeError(`Not a hex colour: ${hex}`);
  return [
    Number.parseInt(normalised.slice(1, 3), 16),
    Number.parseInt(normalised.slice(3, 5), 16),
    Number.parseInt(normalised.slice(5, 7), 16),
  ];
}

function linearise(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linearise) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function bestOnColor(hex: string): string {
  const light = ON_ACCENT.light;
  const dark = ON_ACCENT.dark;
  return contrastRatio(hex, light) >= contrastRatio(hex, dark) ? light : dark;
}
