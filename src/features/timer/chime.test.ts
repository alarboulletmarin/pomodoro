import { describe, expect, it } from 'vitest';
import type { ChimeVolume } from '../../types';
import { renderChimeWav } from './chime';

function decode(volume: ChimeVolume): DataView {
  const uri = renderChimeWav(volume);
  const [head, body] = uri.split(',');
  expect(head).toBe('data:audio/wav;base64');
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new DataView(bytes.buffer);
}

function ascii(view: DataView, offset: number, length: number): string {
  let text = '';
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

function peak(view: DataView): number {
  let max = 0;
  for (let offset = 44; offset < view.byteLength; offset += 2) {
    max = Math.max(max, Math.abs(view.getInt16(offset, true)));
  }
  return max;
}

describe('the rendered chime', () => {
  it('is a playable mono 16-bit WAV', () => {
    const view = decode('normal');

    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint16(34, true)).toBe(16);
    // The declared sizes agree with the bytes actually present.
    expect(view.getUint32(40, true)).toBe(view.byteLength - 44);
    expect(view.getUint32(4, true)).toBe(view.byteLength - 8);
  });

  it('rings louder at each step, and never clips', () => {
    const soft = peak(decode('soft'));
    const normal = peak(decode('normal'));
    const loud = peak(decode('loud'));

    expect(soft).toBeGreaterThan(0);
    expect(normal).toBeGreaterThan(soft);
    expect(loud).toBeGreaterThan(normal);
    expect(loud).toBeLessThanOrEqual(0x7fff);
  });
});
