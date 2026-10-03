/**
 * localStorage persistence. No server, no cookies, no network.
 * All reads are defensive: a corrupt or absent store falls back to defaults.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const NS = "phosphor-ace/v1";

export interface HighScore {
  callsign: string;
  score: number;
  wave: number;
  accuracy: number;
  kills: number;
  maxCombo: number;
  date: number;
  endless: boolean;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  quality: "low" | "medium" | "high";
  scanlines: boolean;
  curvature: boolean;
  bloom: boolean;
  crtCabinet: boolean;
  shake: number;
  flashMode: "full" | "reduced";
  showFps: boolean;
  gamepadAim: boolean;
  touchAutoFire: boolean;
  invertDrag: boolean;
}

export interface SaveData {
  version: 1;
  scores: HighScore[];
  settings: Settings;
  totals: {
    launches: number;
    kills: number;
    shots: number;
    hits: number;
    bombs: number;
    bosses: number;
    bestWave: number;
    bestScore: number;
    seconds: number;
    flawless: number;
  };
  seenIntro: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sfx: true,
  quality: "high",
  scanlines: true,
  curvature: false,
  bloom: true,
  crtCabinet: true,
  shake: 1,
  flashMode: "full",
  showFps: false,
  gamepadAim: true,
  touchAutoFire: true,
  invertDrag: false,
};

const DEFAULT_TOTALS: SaveData["totals"] = {
  launches: 0,
  kills: 0,
  shots: 0,
  hits: 0,
  bombs: 0,
  bosses: 0,
  bestWave: 0,
  bestScore: 0,
  seconds: 0,
  flawless: 0,
};

function defaults(): SaveData {
  return {
    version: 1,
    scores: [],
    settings: { ...DEFAULT_SETTINGS },
    totals: { ...DEFAULT_TOTALS },
    seenIntro: false,
  };
}

let cache: SaveData | null = null;
const listeners = new Set<() => void>();

function read(): SaveData {
  if (cache) return cache;
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(NS);
    if (!raw) {
      cache = defaults();
      return cache;
    }
    const parsed: unknown = JSON.parse(raw);
    cache = merge(parsed);
  } catch {
    cache = defaults();
  }
  return cache;
}

function merge(parsed: unknown): SaveData {
  const base = defaults();
  if (typeof parsed !== "object" || parsed === null) return base;
  const p = parsed as Partial<SaveData>;
  const scores = Array.isArray(p.scores)
    ? p.scores
        .filter((s): s is HighScore => typeof s === "object" && s !== null && typeof (s as HighScore).score === "number")
        .slice(0, 10)
        .map((s) => ({
          callsign: String(s.callsign ?? "ACE").slice(0, 8).toUpperCase(),
          score: Math.floor(s.score) || 0,
          wave: Math.floor(s.wave) || 1,
          accuracy: s.accuracy || 0,
          kills: Math.floor(s.kills) || 0,
          maxCombo: Math.floor(s.maxCombo) || 0,
          date: s.date || Date.now(),
          endless: Boolean(s.endless),
        }))
    : [];
  const settings: Settings = { ...base.settings, ...(p.settings ?? {}) };
  const totals: SaveData["totals"] = { ...base.totals, ...(p.totals ?? {}) };
  return {
    version: 1,
    scores,
    settings,
    totals,
    seenIntro: Boolean(p.seenIntro),
  };
}

function write(): void {
  if (!cache) return;
  try {
    window.localStorage.setItem(NS, JSON.stringify(cache));
  } catch {
    /* storage full or blocked — the game still plays, it just won't remember. */
  }
  for (const l of listeners) l();
}

export function getSave(): SaveData {
  return read();
}

export function getSettings(): Settings {
  return read().settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const s = read();
  s.settings = { ...s.settings, ...patch };
  write();
  return s.settings;
}

export function getScores(): HighScore[] {
  return read().scores;
}

export function getTotals(): SaveData["totals"] {
  return read().totals;
}

/** Insert a run. Returns the new 0-based rank, or -1 if it didn't place. */
export function submitScore(entry: HighScore): number {
  const s = read();
  const clean: HighScore = {
    ...entry,
    callsign: sanitizeCallsign(entry.callsign),
  };
  s.scores.push(clean);
  s.scores.sort((a, b) => b.score - a.score || b.wave - a.wave || a.date - b.date);
  s.scores = s.scores.slice(0, 10);
  const rank = s.scores.indexOf(clean);
  s.totals.bestScore = Math.max(s.totals.bestScore, clean.score);
  s.totals.bestWave = Math.max(s.totals.bestWave, clean.wave);
  s.totals.launches += 1;
  write();
  return rank;
}

export function mergeTotals(patch: Partial<SaveData["totals"]>): void {
  const s = read();
  s.totals = {
    launches: s.totals.launches + (patch.launches ?? 0),
    kills: s.totals.kills + (patch.kills ?? 0),
    shots: s.totals.shots + (patch.shots ?? 0),
    hits: s.totals.hits + (patch.hits ?? 0),
    bombs: s.totals.bombs + (patch.bombs ?? 0),
    bosses: s.totals.bosses + (patch.bosses ?? 0),
    bestWave: Math.max(s.totals.bestWave, patch.bestWave ?? 0),
    bestScore: Math.max(s.totals.bestScore, patch.bestScore ?? 0),
    seconds: s.totals.seconds + (patch.seconds ?? 0),
    flawless: s.totals.flawless + (patch.flawless ?? 0),
  };
  write();
}

export function markIntroSeen(): void {
  const s = read();
  s.seenIntro = true;
  write();
}

export function clearScores(): void {
  const s = read();
  s.scores = [];
  write();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function sanitizeCallsign(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-_]/g, "")
    .trim();
  if (cleaned.length === 0) return "ACE";
  return cleaned.slice(0, 8);
}
