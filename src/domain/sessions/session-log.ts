import { SESSIONS_STORAGE_KEY, type SessionEntry, type SessionStore } from '../../types';

export const SESSION_RETENTION_DAYS = 400;

const RETENTION_MS = SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toEntry(value: unknown): SessionEntry | null {
  if (!isRecord(value)) return null;
  const { startedAt, minutes, mode } = value;
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (mode !== 'focus' && mode !== 'break') return null;
  return { startedAt, minutes, mode };
}

function normalise(values: readonly unknown[], now: number): SessionEntry[] {
  const cutoff = now - RETENTION_MS;
  const entries: SessionEntry[] = [];
  for (const value of values) {
    const entry = toEntry(value);
    if (entry && entry.startedAt >= cutoff) entries.push(entry);
  }
  return entries.sort((a, b) => a.startedAt - b.startedAt);
}

export function parseSessionStore(raw: unknown, now: number): SessionEntry[] {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.entries)) return [];
  return normalise(raw.entries, now);
}

export function appendSession(
  entries: readonly SessionEntry[],
  entry: SessionEntry,
  now: number,
): SessionEntry[] {
  return normalise([...entries, entry], now);
}

export function loadSessions(now: number): SessionEntry[] {
  try {
    const raw = globalThis.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw === null) return [];
    return parseSessionStore(JSON.parse(raw), now);
  } catch {
    return [];
  }
}

export function saveSessions(entries: readonly SessionEntry[]): void {
  const store: SessionStore = { version: 1, entries: [...entries] };
  try {
    globalThis.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota: the history is simply not kept.
  }
}
