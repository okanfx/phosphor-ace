import type { World } from "./world";
import { clamp, randRange } from "./math";

/**
 * Juice factory. Every function here writes into pre-allocated pools only.
 * This module is the game's feel department: hit-stop, shake, sparks, smoke,
 * shockwaves, score pops and screen flashes all live here.
 *
 * An OKANFXLABS AI Design Labs production.
 */

/* ───────────────────────────────────────────────────────────── particles ── */

export function spark(
  w: World,
  x: number,
  y: number,
  n: number,
  hue: number,
  speed: number,
  spread: number,
  dir: number,
  size = 3,
  life = 0.5,
): void {
  for (let i = 0; i < n; i++) {
    const p = alloc(w);
    if (!p) return;
    p.on = true;
    p.x = x + randRange(Math.random, -2, 2);
    p.y = y + randRange(Math.random, -2, 2);
    const a = dir + randRange(Math.random, -spread, spread);
    const s = speed * randRange(Math.random, 0.45, 1.3);
    p.vx = Math.sin(a) * s;
    p.vy = Math.cos(a) * s;
    p.maxLife = life * randRange(Math.random, 0.7, 1.35);
    p.life = p.maxLife;
    p.size = size * randRange(Math.random, 0.7, 1.4);
    p.kind = 1;
    p.hue = hue;
    p.drag = 0.9;
    p.add = 1;
    p.seed = Math.random() * 1000;
    p.rot = Math.random() * 6.28;
    p.spin = 0;
  }
}

export function smoke(
  w: World,
  x: number,
  y: number,
  n: number,
  size: number,
  rise: number,
  life = 1.1,
  hue = 6,
): void {
  for (let i = 0; i < n; i++) {
    const p = alloc(w);
    if (!p) return;
    p.on = true;
    p.x = x + randRange(Math.random, -6, 6);
    p.y = y + randRange(Math.random, -6, 6);
    p.vx = randRange(Math.random, -16, 16);
    p.vy = -rise * randRange(Math.random, 0.6, 1.3);
    p.maxLife = life * randRange(Math.random, 0.8, 1.4);
    p.life = p.maxLife;
    p.size = size * randRange(Math.random, 0.7, 1.4);
    p.kind = 2;
    p.hue = hue;
    p.drag = 0.94;
    p.add = 0;
    p.seed = Math.random() * 1000;
    p.rot = Math.random() * 6.28;
    p.spin = randRange(Math.random, -1.6, 1.6);
  }
}

export function dot(
  w: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  size: number,
  life: number,
  hue: number,
  drag = 0.94,
  kind: 0 | 1 | 2 | 3 | 4 = 0,
): void {
  const p = alloc(w);
  if (!p) return;
  p.on = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.maxLife = life;
  p.life = life;
  p.size = size;
  p.kind = kind;
  p.hue = hue;
  p.drag = drag;
  p.add = 1;
  p.seed = Math.random() * 1000;
  p.rot = 0;
  p.spin = 0;
}

export function ring(
  w: World,
  x: number,
  y: number,
  size: number,
  life: number,
  hue: number,
  speed = 1,
): void {
  const p = alloc(w);
  if (!p) return;
  p.on = true;
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.maxLife = life;
  p.life = life;
  p.size = size;
  p.kind = 3;
  p.hue = hue;
  p.drag = 1;
  p.add = 1;
  p.seed = speed;
  p.rot = 0;
  p.spin = 0;
}

export function shard(
  w: World,
  x: number,
  y: number,
  n: number,
  hue: number,
  speed: number,
  life = 0.8,
): void {
  for (let i = 0; i < n; i++) {
    const p = alloc(w);
    if (!p) return;
    p.on = true;
    p.x = x;
    p.y = y;
    const a = Math.random() * 6.28;
    const s = speed * randRange(Math.random, 0.3, 1.2);
    p.vx = Math.sin(a) * s;
    p.vy = Math.cos(a) * s - 40;
    p.maxLife = life * randRange(Math.random, 0.7, 1.3);
    p.life = p.maxLife;
    p.size = randRange(Math.random, 4, 9);
    p.kind = 4;
    p.hue = hue;
    p.drag = 0.97;
    p.add = 0.2;
    p.seed = Math.random() * 1000;
    p.rot = a;
    p.spin = randRange(Math.random, -9, 9);
  }
}

/** Claim the next particle slot. Particles are a dense prefix: if the pool is
 *  saturated we recycle the oldest slot rather than dropping the effect. */
function alloc(w: World): World["particles"][number] | null {
  const list = w.particles;
  if (w.particleCount < list.length) return list[w.particleCount++] ?? null;
  return list[0] ?? null;
}

/* ─────────────────────────────────────────────────────────── explosions ── */

/** Standard aircraft kill: flash core, ember burst, smoke plume, shockwave. */
export function explode(
  w: World,
  x: number,
  y: number,
  scale: number,
  intensity = 1,
): void {
  ring(w, x, y, 26 * scale, 0.34, 1, 1);
  spark(w, x, y, Math.round(16 * intensity * scale), 0, 190 * scale, 3.2, Math.random() * 6.28, 4, 0.44);
  spark(w, x, y, Math.round(10 * intensity * scale), 1, 130 * scale, 3.2, Math.random() * 6.28, 3, 0.6);
  shard(w, x, y, Math.round(5 * intensity), 3, 120 * scale, 0.8);
  smoke(w, x, y, Math.round(5 * intensity * scale), 12 * scale, 34 * scale, 1.0, 6);
  dot(w, x, y, 0, 0, 34 * scale, 0.12, 0);
  addShake(w, 2.6 * scale * intensity);
}

/** Heavy capital-ship kill: long, loud, screen-eating. */
export function explodeBig(w: World, x: number, y: number, scale: number): void {
  for (let i = 0; i < 7; i++) {
    const d = i * 0.11;
    const ox = randRange(Math.random, -26, 26) * scale;
    const oy = randRange(Math.random, -26, 26) * scale;
    ring(w, x + ox, y + oy, 34 * scale, 0.5, 1, 1);
    spark(w, x + ox, y + oy, 22, 0, 240 * scale, 3.2, Math.random() * 6.28, 5, 0.6);
    spark(w, x + ox, y + oy, 14, 2, 170 * scale, 3.2, Math.random() * 6.28, 4, 0.9);
    smoke(w, x + ox, y + oy, 8, 20 * scale, 50 * scale, 1.5, 6);
    dot(w, x + ox, y + oy, 0, 0, 44 * scale, 0.16, 0);
    addShake(w, 5.5 * scale);
  }
  shard(w, x, y, 14, 2, 210 * scale, 1.2);
  flashScreen(w, 0.5, 0);
  hitStop(w, 0.09);
}

/** Bullet impact: a tiny white pop. */
export function impact(w: World, x: number, y: number, hue: number, dir: number): void {
  spark(w, x, y, 4, hue, 110, 1.4, dir, 2, 0.16);
  dot(w, x, y, 0, 0, 8, 0.08, 0);
}

/** Player death: airframe comes apart, then a white bloom. */
export function playerExplode(w: World, x: number, y: number): void {
  ring(w, x, y, 46, 0.5, 1, 1);
  ring(w, x, y, 26, 0.32, 4, 1);
  spark(w, x, y, 40, 0, 250, 3.2, Math.random() * 6.28, 5, 0.7);
  spark(w, x, y, 22, 3, 170, 3.2, Math.random() * 6.28, 4, 1.0);
  shard(w, x, y, 12, 5, 200, 1.1);
  smoke(w, x, y, 14, 22, 60, 1.6, 6);
  dot(w, x, y, 0, 0, 60, 0.14, 0);
  addShake(w, 11);
  flashScreen(w, 0.65, 1);
  hitStop(w, 0.14);
}

/* ────────────────────────────────────────────────────────── game feel ── */

export function addShake(w: World, amount: number): void {
  w.shake = Math.min(22, w.shake + amount);
  w.shakeT = Math.max(w.shakeT, 0.16);
}

export function hitStop(w: World, seconds: number): void {
  w.stop = Math.max(w.stop, seconds);
}

export function flashScreen(w: World, amount: number, hue: number): void {
  w.flash = Math.max(w.flash, amount);
  w.flashHue = hue;
}

export function zoomPunch(w: World, amount: number): void {
  w.zoom = Math.max(w.zoom, amount);
}

/* ──────────────────────────────────────────────────────────── popups ─── */

const HUE_COLOR: readonly string[] = [
  "#3bffb0", // green
  "#ff5a6a", // red
  "#ffe14d", // gold
  "#6fd8ff", // cyan
  "#ffffff", // white
];

export function popText(
  w: World,
  x: number,
  y: number,
  text: string,
  hue: number,
  size = 8,
  life = 0.85,
): void {
  for (let i = 0; i < w.texts.length; i++) {
    const t = w.texts[i];
    if (t && !t.on) {
      t.on = true;
      if (i >= w.textCount) w.textCount = i + 1;
      t.x = x;
      t.y = y;
      t.vy = -46;
      t.maxLife = life;
      t.life = life;
      t.text = text;
      t.hue = hue;
      t.size = size;
      return;
    }
  }
}

export function textColor(hue: number): string {
  return HUE_COLOR[clamp(hue | 0, 0, HUE_COLOR.length - 1)] as string;
}
