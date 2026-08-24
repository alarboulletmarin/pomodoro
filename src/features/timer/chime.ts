import type { ChimeVolume } from '../../types';

// The chime used to be an oscillator on a Web Audio context created at the moment the
// session ends. On an iPhone that moment is the worst one possible: a context born
// outside a user gesture stays suspended in an installed app, and even an unlocked one
// is muted by the ring/silent switch. So the sound is now an ordinary <audio> element —
// media playback, which iOS lets through the silent switch — fed a WAV rendered here,
// and blessed by the gesture that starts the session (see primeChime).

const SAMPLE_RATE = 22050;
const DURATION_S = 1.0;
const ATTACK_S = 0.008;

// One strike of a small bell: a fundamental that rings, brighter partials that die
// first. Each amplitude is relative to the fundamental, each decay a time constant.
const PARTIALS = [
  { frequency: 880, amplitude: 1, decay: 0.28 },
  { frequency: 1760, amplitude: 0.55, decay: 0.11 },
  { frequency: 2640, amplitude: 0.22, decay: 0.06 },
] as const;

// Baked into the samples rather than set on the element: iOS ignores `audio.volume`.
const PEAK: Record<ChimeVolume, number> = { soft: 0.25, normal: 0.55, loud: 1 };

function renderSamples(peak: number): Float32Array {
  const length = Math.round(SAMPLE_RATE * DURATION_S);
  const samples = new Float32Array(length);
  let max = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    for (const partial of PARTIALS) {
      value +=
        partial.amplitude *
        Math.sin(2 * Math.PI * partial.frequency * t) *
        Math.exp(-t / partial.decay);
    }
    value *= Math.min(1, t / ATTACK_S);
    samples[i] = value;
    max = Math.max(max, Math.abs(value));
  }
  const scale = max === 0 ? 0 : peak / max;
  for (let i = 0; i < length; i += 1) samples[i] = (samples[i] ?? 0) * scale;
  return samples;
}

/** The chime at one volume, as a self-contained 16-bit mono WAV data URI. */
export function renderChimeWav(volume: ChimeVolume): string {
  const samples = renderSamples(PEAK[volume]);
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);

  const ascii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, Math.round(clamped * 0x7fff), true);
  }

  let binary = '';
  // Chunked: String.fromCharCode over the whole buffer would blow the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const sources = new Map<ChimeVolume, string>();

function sourceFor(volume: ChimeVolume): string {
  let source = sources.get(volume);
  if (!source) {
    source = renderChimeWav(volume);
    sources.set(volume, source);
  }
  return source;
}

let element: HTMLAudioElement | null = null;
let loaded: ChimeVolume | null = null;
let primed = false;

function elementFor(volume: ChimeVolume): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  element ??= new Audio();
  if (loaded !== volume) {
    element.src = sourceFor(volume);
    loaded = volume;
  }
  return element;
}

/**
 * Call from a user gesture — starting or resuming a session, switching the chime on.
 * iOS only lets a page make sound through an element a gesture has already played, so
 * this plays the chime once, muted, and rewinds it; the real ring minutes later is then
 * just a replay, which needs no gesture.
 */
export function primeChime(volume: ChimeVolume): void {
  if (primed) return;
  try {
    const el = elementFor(volume);
    if (!el) return;
    primed = true;
    el.muted = true;
    const playing: Promise<void> | undefined = el.play();
    playing
      ?.then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
        primed = false;
      });
  } catch {
    primed = false;
  }
}

export function playChime(volume: ChimeVolume): void {
  try {
    const el = elementFor(volume);
    if (!el) return;
    el.muted = false;
    if (el.currentTime > 0) el.currentTime = 0;
    const playing: Promise<void> | undefined = el.play();
    void playing?.catch(() => undefined);
  } catch {
    // No audio output or a blocked element: the timer stays silent.
  }
}
