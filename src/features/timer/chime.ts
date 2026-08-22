const FREQUENCY_HZ = 880;
const PEAK_GAIN = 0.12;
const ATTACK_S = 0.012;
const DURATION_S = 0.18;

let shared: AudioContext | null = null;

export function playChime(): void {
  if (typeof AudioContext === 'undefined') return;

  try {
    shared ??= new AudioContext();
    // Autoplay policy may have suspended it between two sessions.
    void shared.resume().catch(() => undefined);

    const context = shared;
    const startedAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(FREQUENCY_HZ, startedAt);
    gain.gain.setValueAtTime(0, startedAt);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, startedAt + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + DURATION_S);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startedAt);
    oscillator.stop(startedAt + DURATION_S);
  } catch {
    // No audio device, no permission, or a blocked context: the timer stays silent.
  }
}
