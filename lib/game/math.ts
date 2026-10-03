/** Small, allocation-free math helpers. No `any` ever touches this file. */

export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : clamp((v - a) / (b - a), 0, 1);
}

export function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

export function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  const u = 1 - c;
  return 1 - u * u * u;
}

export function easeInCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * c;
}

export function easeOutBack(t: number): number {
  const c = clamp(t, 0, 1);
  const s = 1.70158;
  const u = c - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.atan2(by - ay, bx - ax);
}

/** Shortest signed angular difference from `a` to `b`, in (-PI, PI]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Deterministic PRNG so every run has a reproducible seed (and testable bunks). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

export function pick<T>(rng: () => number, list: readonly T[]): T {
  if (list.length === 0) throw new Error("pick() from empty list");
  const i = Math.floor(rng() * list.length) % list.length;
  return list[i] as T;
}

export function formatScore(n: number): string {
  return Math.max(0, Math.floor(n))
    .toString()
    .padStart(8, "0");
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}
