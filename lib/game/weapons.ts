import type { World, Bullet } from "./world";
import { BANK } from "../render/glyphmap";
import { BANK_OF } from "../render/sprites";
import { TAU } from "./math";


/**
 * Bullet pool management + every shot the game can fire.
 * Pool order is back-to-front: a fresh shot lands at the head so its
 * additive glow composites over the older ones.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const BULLET_P = BANK_OF.bulletP as number;
const BULLET_P_BIG = BULLET_P;
const BULLET_ERASER = BULLET_P;
const BULLET_E = BANK_OF.bulletE as number;
const BULLET_BIG = BULLET_E;

export interface ShotOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  side: 0 | 1;
  art?: 0 | 1 | 2 | 3;
  dmg?: number;
  r?: number;
  life?: number;
  amp?: number;
  freq?: number;
  eraser?: boolean;
  sticky?: boolean;
  seek?: number;
  turn?: number;
  breaker?: boolean;
  sc?: number;
  target?: number;
}

/** Bullets are a dense prefix of `w.bullets`; live count lives in
 *  `w.bulletCount`. When the pool saturates the oldest round is recycled, which
 *  is invisible in play and keeps the sim allocation-free. */
export function fireBullet(w: World, o: ShotOptions): Bullet | null {
  const list = w.bullets;
  const idx = w.bulletCount < list.length ? w.bulletCount++ : 0;
  {
    const b = list[idx];
    if (b) {
      b.on = true;
      b.x = o.x;
      b.y = o.y;
      b.vx = o.vx;
      b.vy = o.vy;
      b.side = o.side;
      b.art = o.art ?? 0;
      b.dmg = o.dmg ?? 1;
      b.r = o.r ?? 4;
      b.life = o.life ?? 4;
      b.maxLife = b.life;
      b.amp = o.amp ?? 0;
      b.freq = o.freq ?? 0;
      b.wob = Math.random() * TAU;
      b.originX = o.x;
      b.turn = o.turn ?? 0;
      b.seek = o.seek ?? 0;
      b.target = o.target ?? -1;
      b.eraser = o.eraser ?? false;
      b.sticky = o.sticky ?? false;
      b.age = 0;
      b.seed = Math.random() * 1000;
      b.spin = 0;
      b.breaker = o.breaker ?? false;
      b.sc = o.sc ?? 1;
      b.flash = 0;
      b.parent = -1;
      b.fresh = 1;
      return b;
    }
  }
  return null;
}

/** Retire a bullet by swapping it with the last live round. */
export function killBullet(w: World, index: number): void {
  const list = w.bullets;
  const last = w.bulletCount - 1;
  if (index !== last) {
    const t = list[index] as Bullet;
    list[index] = list[last] as Bullet;
    list[last] = t;
  }
  w.bulletCount = last;
}

/* ───────────────────────────────────────────────── player ordnance ────── */

export function playerShot(w: World, x: number, y: number, angle: number, power: number, art: 0 | 1): void {
  const speed = art === 1 ? 720 : 860;
  fireBullet(w, {
    x, y,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    side: 0,
    art,
    dmg: art === 1 ? 2 : 1,
    r: art === 1 ? 6 : 4,
    life: 2.2,
  });
  void power;
}

export function eraserShot(w: World, x: number, y: number): void {
  fireBullet(w, {
    x, y, vx: 0, vy: -760, side: 0, art: 3, dmg: 1, r: 9, life: 2.4, eraser: true,
  });
}

export function homingShot(w: World, x: number, y: number, targetId: number): void {
  fireBullet(w, {
    x, y, vx: 0, vy: -420, side: 0, art: 2, dmg: 3, r: 6, life: 3.2,
    turn: 4.4, seek: 1, target: targetId,
  });
}

export function bigShot(w: World, x: number, y: number, angle: number): void {
  const speed = 560;
  fireBullet(w, {
    x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed,
    side: 0, art: 1, dmg: 6, r: 10, life: 2.4,
  });
}

/* ────────────────────────────────────────────────── enemy ordnance ────── */

export function enemyShot(
  w: World,
  x: number,
  y: number,
  angle: number,
  speed: number,
  opts: { art?: 0 | 1; dmg?: number; r?: number; life?: number; amp?: number; freq?: number; sc?: number } = {},
): void {
  const art = opts.art ?? 0;
  fireBullet(w, {
    x, y,
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * speed,
    side: 1,
    art,
    dmg: opts.dmg ?? 1,
    r: opts.r ?? (art === 1 ? 9 : 5),
    life: opts.life ?? 6,
    amp: opts.amp ?? 0,
    freq: opts.freq ?? 0,
    sc: opts.sc ?? 1,
  });
}

/** Straight down. angle 0. */
/**
 * Fire at a point, optionally leading the target by `lead` seconds of travel.
 * This is the whole reason enemy fire feels "aimed at you" rather than
 * "sprayed in your direction".
 */
export function aimedShot(
  w: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
  opts?: { art?: 0 | 1; dmg?: number; r?: number; lead?: number; life?: number; amp?: number; freq?: number; sc?: number },
): void {
  const art = opts?.art ?? 0;
  const lead = opts?.lead ?? 0;
  const px = tx + w.player.vx * lead;
  const py = ty + w.player.vy * lead;
  const angle = Math.atan2(px - x, Math.max(1, py - y));
  enemyShot(w, x, y, angle, speed, {
    art,
    dmg: opts?.dmg ?? 1,
    r: opts?.r,
    life: opts?.life,
    amp: opts?.amp,
    freq: opts?.freq,
    sc: opts?.sc,
  });
}

export function fanShot(
  w: World,
  x: number,
  y: number,
  baseAngle: number,
  count: number,
  spread: number,
  speed: number,
  opts?: { art?: 0 | 1; dmg?: number },
): void {
  if (count <= 1) {
    enemyShot(w, x, y, baseAngle, speed, { art: opts?.art, dmg: opts?.dmg });
    return;
  }
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = baseAngle + (t - 0.5) * spread;
    enemyShot(w, x, y, a, speed, { art: opts?.art, dmg: opts?.dmg });
  }
}

export function ringShot(
  w: World,
  x: number,
  y: number,
  count: number,
  speed: number,
  phase: number,
  opts?: { art?: 0 | 1; dmg?: number },
): void {
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * TAU;
    enemyShot(w, x, y, a, speed, { art: opts?.art, dmg: opts?.dmg });
  }
}

export function mineDrop(w: World, x: number, y: number, vx: number, vy: number): void {
  fireBullet(w, {
    x, y, vx, vy, side: 1, art: 0, dmg: 2, r: 10, life: 14, sticky: true,
  });
}

export function bossShell(w: World, x: number, y: number, angle: number, speed: number, breaker: boolean): void {
  fireBullet(w, {
    x, y, vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed,
    side: 1, art: 1, dmg: breaker ? 2 : 1, r: breaker ? 11 : 9, life: 8, breaker,
  });
}

export const BULLET_BANKS = {
  player: [BULLET_P, BULLET_P_BIG, BULLET_P, BULLET_ERASER],
  enemy: [BULLET_E, BULLET_BIG, BULLET_E, BULLET_E],
} as const;

export { BANK };
