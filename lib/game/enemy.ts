import { BANK } from "../render/glyphmap";
import type { EnemyKind } from "./types";

/**
 * Enemy tuning table — the difficulty dial, in one readable place.
 * The wave director composes these; the AI reads them.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export interface EnemyTemplate {
  kind: EnemyKind;
  /** Base hit points before the elite multiplier. */
  hp: number;
  /** Collision radius, panel px (used for player contact + AI spacing). */
  r: number;
  /** Hit box half-width / half-height, panel px. Derived from the art so a
   *  shot that visibly touches the hull always counts as a hit. */
  hw: number;
  hh: number;
  /** Score. */
  points: number;
  /** Cruising speed, px/s. */
  speed: number;
  /** Seconds between shots (0 = unarmed). */
  fire: number;
  /** Sprite bank. */
  bank: number;
  /** Leaves the bottom of the screen. */
  cull: boolean;
  /** Front hull soaks damage; only the open flank is vulnerable. */
  armored: boolean;
  /** Display name on the kill card. */
  name: string;
  /** One-line doctrine shown on the wave banner. */
  doctrine: string;
}

export const TEMPLATES: Record<EnemyKind, EnemyTemplate> = {
  grunt: { kind: "grunt", hp: 3, r: 11, hw: 16, hh: 18, points: 120, speed: 92, fire: 2.2, bank: BANK.grunt, cull: true, armored: false, name: "HORNET", doctrine: "LINE INTERCEPT" },
  weaver: { kind: "weaver", hp: 4, r: 11, hw: 16, hh: 18, points: 160, speed: 118, fire: 1.6, bank: BANK.weaver, cull: true, armored: false, name: "VANDAL", doctrine: "SINUOUS WEAVE" },
  diver: { kind: "diver", hp: 5, r: 12, hw: 16, hh: 20, points: 180, speed: 148, fire: 1.25, bank: BANK.diver, cull: true, armored: false, name: "KITE", doctrine: "DIVE STRIKE" },
  kamikaze: { kind: "kamikaze", hp: 2, r: 10, hw: 14, hh: 15, points: 90, speed: 200, fire: 0, bank: BANK.kamikaze, cull: false, armored: false, name: "SPARKPLUG", doctrine: "RAMMING DRONE" },
  gunship: { kind: "gunship", hp: 30, r: 23, hw: 27, hh: 32, points: 480, speed: 44, fire: 0.6, bank: BANK.gunship, cull: false, armored: true, name: "BASTION", doctrine: "ARMOURED GUNSHIP" },
  ace: { kind: "ace", hp: 10, r: 12, hw: 14, hh: 16, points: 320, speed: 180, fire: 0.95, bank: BANK.ace, cull: false, armored: false, name: "FALCON", doctrine: "ELITE ACE" },
  mineLayer: { kind: "mineLayer", hp: 7, r: 12, hw: 14, hh: 21, points: 140, speed: 80, fire: 2.9, bank: BANK.mineLayer, cull: true, armored: false, name: "MENDER", doctrine: "MINELAYER" },
  turret: { kind: "turret", hp: 16, r: 14, hw: 14, hh: 16, points: 220, speed: 0, fire: 1.0, bank: BANK.turret, cull: false, armored: false, name: "SHORE BATTERY", doctrine: "ANTI-AIR POSITION" },
  bossA: { kind: "bossA", hp: 4200, r: 40, hw: 78, hh: 84, points: 15000, speed: 62, fire: 0.5, bank: BANK.bossA, cull: false, armored: true, name: "STORMWELL", doctrine: "DREADNOUGHT CLASS" },
  bossB: { kind: "bossB", hp: 6800, r: 40, hw: 78, hh: 84, points: 30000, speed: 74, fire: 0.4, bank: BANK.bossB, cull: false, armored: true, name: "HELIOS PRIME", doctrine: "ORBITAL CITADEL" },
};

export const GROUND_KINDS: readonly EnemyKind[] = [
  "grunt",
  "weaver",
  "diver",
  "kamikaze",
  "ace",
  "mineLayer",
];

/* ────────────────────────────────────────────────── the fixed enemy record ── */

/**
 * One struct per enemy slot, allocated at boot and recycled forever.
 * Field names are terse because the AI touches most of them every frame —
 * the documentation lives in the comments.
 */
export interface Enemy {
  on: boolean;

  /* identity */
  id: number;
  kind: EnemyKind;
  boss: boolean;

  /* transform */
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  /** Facing: 0 = nose toward the bottom of the screen, +PI/2 = nose right. */
  a: number;
  bank: number;

  /* presentation */
  bankId: number;
  frame: number;
  r: number;
  hw: number;
  hh: number;
  sc: number;
  fade: number;
  flash: number;
  tint: number;
  glow: number;
  smoke: number;

  /* vitals */
  hp: number;
  hpMax: number;
  tough: number;
  invuln: number;
  dying: number;
  boom: number;

  /* movement */
  /** Per-enemy behaviour clock, seconds since spawn. */
  t: number;
  speed: number;
  amp: number;
  freq: number;
  sinPhase: number;
  dive: number;
  tell: number;
  strafe: number;
  lock: number;
  dash: number;
  dashCd: number;
  dir: number;
  spin: number;
  turn: number;
  travel: number;
  bob: number;
  minX: number;
  maxX: number;
  homeY: number;
  isStatic: number;
  entered: number;
  leaver: number;
  hostile: number;
  solid: number;

  /* formation */
  formation: number;
  pathT: number;
  formIdx: number;
  formN: number;
  formGap: number;
  formCell: number;
  formCx: number;
  formRow: number;

  /* weapons */
  cool: number;
  cool2: number;
  burst: number;
  burstGap: number;
  charge: number;
  chargeKind: number;
  fanCd: number;
  mineCd: number;
  ram: number;
  muzzle: number;
  /** GUNSHIP: flank vent cycle timer. */
  wing: number;
  energy: number;
  aim: number;
  aimX: number;
  aimY: number;
  fired: number;
  lastAngle: number;

  /* scoring + drops */
  points: number;
  mult: number;
  capsule: number;
  count: number;
  diff: number;
  elite: number;
  cull: number;
  armored: number;
  exposedSide: number;
  flank: number;
  minion: number;
  roll: number;

  /* boss only */
  phase: number;
  pt: number;
  pcd: number;
  pattern: number;
  pending: number;
  laser: number;
  laserA: number;
  ang: number;
  angv: number;
  wallT: number;
  gapSide: number;
  adds: number;
  coreOpen: number;
  g1: number;
  g2: number;
  g3: number;
  barSmooth: number;
  locked: number;
  enrage: number;
  spoke: number;
  stagger: number;
  band: number;
  bandDmg: number;
  label: string;
  beam: number;
  beamX: number;
  turretCd: number;
  death: number;
  intro: number;
  minionCap: number;
  parts: number;
  hover: number;

  r1: number;
  r2: number;
}

export function bankForKind(kind: EnemyKind): number {
  return TEMPLATES[kind].bank;
}
