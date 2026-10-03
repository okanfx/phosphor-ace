import { bankForKind, TEMPLATES, type Enemy } from "./enemy";
import type { EnemyKind } from "./types";
import type { World } from "./world";
import { BOUNDS } from "./world";
import { clamp, TAU } from "./math";

/**
 * Enemy allocator + formation layout.
 *
 * An OKANFXLABS AI Design Labs production.
 */

/** Formation archetypes. */
export const F_NONE = 0;
export const F_VEE_L = 1;
export const F_VEE_R = 2;
export const F_COLUMN = 3;
export const F_SINE = 4;
export const F_PINCER = 5;
export const F_RUN = 6;
export const F_STRAFE = 7;

export function formationFromString(s: string): number {
  switch (s) {
    case "veeLeft":
      return F_VEE_L;
    case "veeRight":
      return F_VEE_R;
    case "column":
      return F_COLUMN;
    case "sineColumn":
      return F_SINE;
    case "pincer":
      return F_PINCER;
    case "strafeRun":
      return F_RUN;
    case "strafeSweep":
      return F_STRAFE;
    default:
      return F_NONE;
  }
}

export interface SpawnOptions {
  kind: EnemyKind;
  x: number;
  y: number;
  elite?: number;
  minion?: number;
  diff?: number;
  homeY?: number;
}

/** Claim a free slot, or null if the world is saturated. */
export function allocEnemy(w: World): Enemy | null {
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    if (e && !e.on) {
      resetEnemy(e, w);
      return e;
    }
  }
  return null;
}

export function resetEnemy(e: Enemy, w: World): void {
  e.on = true;
  e.id = w.nextId++;
  e.boss = false;
  e.px = e.x;
  e.py = e.y;
  e.vx = 0;
  e.vy = 0;
  e.a = 0;
  e.bank = 0;
  e.sc = 1;
  e.fade = 1;
  e.flash = 0;
  e.tint = 0;
  e.glow = 0;
  e.smoke = 0;
  e.invuln = 0.3;
  e.dying = 0;
  e.boom = 1;
  e.t = 0;
  e.amp = 0;
  e.freq = 0;
  e.sinPhase = Math.random() * TAU;
  e.dive = 0;
  e.tell = 0;
  e.strafe = 0;
  e.lock = 0;
  e.dash = 0;
  e.dashCd = 0;
  e.dir = Math.random() < 0.5 ? -1 : 1;
  e.spin = 0;
  e.turn = 6;
  e.travel = 0;
  e.bob = 0;
  e.minX = BOUNDS.left + 8;
  e.maxX = BOUNDS.right - 8;
  e.homeY = 0;
  e.isStatic = 0;
  e.entered = 0;
  e.leaver = 1;
  e.hostile = 1;
  e.solid = 1;
  e.formation = F_NONE;
  e.pathT = 0;
  e.formIdx = 0;
  e.formN = 1;
  e.formGap = 1;
  e.formCell = 36;
  e.formCx = BOUNDS.cx;
  e.formRow = 0;
  e.cool = 0.5 + Math.random() * 1.6;
  e.cool2 = 0;
  e.burst = 0;
  e.burstGap = 0;
  e.charge = 0;
  e.chargeKind = 0;
  e.fanCd = 0;
  e.mineCd = 0;
  e.ram = 0;
  e.muzzle = 0;
  e.wing = 2.6;
  e.energy = 0;
  e.aim = 0;
  e.aimX = e.x;
  e.aimY = e.y;
  e.fired = 0;
  e.lastAngle = 0;
  e.points = 0;
  e.mult = 1;
  e.capsule = 0;
  e.count = 1;
  e.diff = 1;
  e.elite = 0;
  e.cull = 1;
  e.armored = 0;
  e.exposedSide = 1;
  e.flank = 1;
  e.minion = 0;
  e.roll = Math.random();
  e.phase = 0;
  e.pt = 0;
  e.pcd = 0;
  e.pattern = 0;
  e.pending = 0;
  e.laser = 0;
  e.laserA = 0;
  e.ang = Math.random() * TAU;
  e.angv = 0;
  e.wallT = 0;
  e.gapSide = 1;
  e.adds = 0;
  e.coreOpen = 0;
  e.g1 = 0;
  e.g2 = 0;
  e.g3 = 0;
  e.barSmooth = 1;
  e.locked = 0;
  e.enrage = 0;
  e.spoke = 0;
  e.stagger = 0;
  e.band = 0;
  e.bandDmg = 0;
  e.label = "";
  e.beam = 0;
  e.beamX = 0;
  e.turretCd = 0;
  e.death = 0;
  e.intro = 0;
  e.minionCap = 0;
  e.parts = 0;
  e.hover = Math.random() * TAU;
  e.r1 = Math.random();
  e.r2 = Math.random();
}

export function spawnEnemy(w: World, o: SpawnOptions): Enemy | null {
  const e = allocEnemy(w);
  if (!e) return null;
  const t = TEMPLATES[o.kind];
  e.kind = o.kind;
  e.x = o.x;
  e.y = o.y;
  e.px = o.x;
  e.py = o.y;
  e.bank = bankForKind(o.kind);
  const tough = 1 + (o.elite ?? 0) * 0.7;
  e.hp = t.hp * tough;
  e.hpMax = e.hp;
  e.tough = tough;
  e.r = t.r;
  e.hw = t.hw;
  e.hh = t.hh;
  e.speed = t.speed;
  e.points = t.points;
  e.cull = t.cull ? 1 : 0;
  e.leaver = t.cull ? 1 : 0;
  e.armored = t.armored ? 1 : 0;
  e.elite = o.elite ?? 0;
  e.diff = o.diff ?? 1;
  e.minion = o.minion ?? 0;
  e.homeY = o.homeY ?? 0;
  e.cool = 0.6 + Math.random() * 1.8;
  e.isStatic = o.kind === "turret" ? 1 : 0;
  if (o.kind === "turret") {
    e.hostile = 1;
    e.solid = 1;
  }
  return e;
}

export interface FormationRequest {
  kind: EnemyKind;
  count: number;
  formation: number;
  /** 0..1 across the field width. */
  cx: number;
  row: number;
  gap: number;
  speed: number;
  elite: number;
  diff: number;
  attack: number;
  fire: number;
}

/** Slot position inside a formation, in grid units. */
export function gridPos(i: number, formation: number, n: number): { x: number; y: number } {
  const half = (n - 1) / 2;
  switch (formation) {
    case F_VEE_L:
      return { x: i - half, y: -Math.abs(i - half) * 0.85 };
    case F_VEE_R:
      return { x: half - i, y: -Math.abs(i - half) * 0.85 };
    case F_SINE:
      return { x: i - half, y: -Math.abs(i - half) * 0.2 };
    case F_PINCER:
      return { x: (i % 2 === 0 ? -1 : 1) * (Math.floor(i / 2) + 0.5), y: -Math.floor(i / 4) };
    case F_RUN:
    case F_STRAFE:
      return { x: i - half, y: 0 };
    case F_COLUMN:
    default:
      return { x: i - half, y: 0 };
  }
}

/** Launch a whole flight as one readable shape. */
export function spawnFormation(w: World, req: FormationRequest): void {
  const cell = 36;
  const n = Math.max(1, req.count);
  const originX = req.cx * BOUNDS.width;
  for (let i = 0; i < n; i++) {
    const g = gridPos(i, req.formation, n);
    const x = clamp(originX + g.x * cell * req.gap, BOUNDS.left + 24, BOUNDS.right - 24);
    const y = -40 - g.y * 24 - req.row * 24;
    const e = spawnEnemy(w, {
      kind: req.kind,
      x,
      y,
      elite: req.elite,
      diff: req.diff,
    });
    if (!e) return;
    e.formation = req.formation;
    e.formIdx = i;
    e.formN = n;
    e.formGap = req.gap;
    e.formCell = cell;
    e.formCx = originX;
    e.formRow = req.row;
    e.speed *= req.speed;
    e.cool = 0.9 + Math.random() * 1.6;
    // Per-slot shot cadence jitter so a flight does not fire in lockstep.
    e.cool += i * 0.13;
    if (req.attack === 4) e.fanCd = 0.4 + i * 0.12;
    if (req.fire > 0) e.cool2 = req.fire;
  }
}
