import type { Enemy } from "./enemy";
import {
  FIELD_H,
  FIELD_LEFT,
  FIELD_RIGHT,
  FIELD_TOP,
  FIELD_W,
  FIELD_X,
  FIELD_Y,
} from "./config";

/**
 * Fixed-capacity world. Every collection is allocated once at boot; the
 * simulation NEVER allocates and never triggers a GC pause during play.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export interface Bullet {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 = player ordnance, 1 = enemy. */
  side: 0 | 1;
  /** Sprite art id within the side's bank. */
  art: 0 | 1 | 2 | 3;
  dmg: number;
  r: number;
  life: number;
  maxLife: number;
  /** Sine wobble. */
  amp: number;
  freq: number;
  wob: number;
  originX: number;
  /** Homing. */
  turn: number;
  seek: number;
  target: number;
  /** Erases enemy bullets on contact. */
  eraser: boolean;
  /** Mines stick, then detonate. */
  sticky: boolean;
  age: number;
  seed: number;
  spin: number;
  /** Boss core-breaker: only hurts while the core is open. */
  breaker: boolean;
  sc: number;
  flash: number;
  /** Sticky parent id. */
  parent: number;
  /** Straight out of the muzzle this frame (muzzle flash anchor). */
  fresh: number;
}

export interface Particle {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  /** 0 dot, 1 streak, 2 smoke, 3 ring, 4 shard. */
  kind: 0 | 1 | 2 | 3 | 4;
  /** 0 white-hot, 1 gold, 2 orange, 3 red, 4 cyan, 5 green, 6 smoke. */
  hue: number;
  drag: number;
  add: number;
  seed: number;
  rot: number;
  spin: number;
}

export interface Pickup {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 spread, 1 shield, 2 bomb, 3 life, 4 core, 5 score. */
  kind: 0 | 1 | 2 | 3 | 4 | 5;
  life: number;
  t: number;
  pull: number;
  seed: number;
}

export interface FloatText {
  on: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  /** 0 green, 1 red, 2 gold, 3 cyan, 4 white. */
  hue: number;
  size: number;
}

export interface Scenery {
  on: boolean;
  x: number;
  y: number;
  bankId: number;
  frame: number;
  sc: number;
  /** Parallax multiplier. */
  depth: number;
  /** 0 cloud, 1 island, 2 wreck, 3 searchlight, 4 carrier. */
  type: number;
  alpha: number;
  flip: number;
  spin: number;
  t: number;
  /** Attached shore battery. */
  turret: number;
  turretX: number;
  turretY: number;
  turretId: number;
}

export interface Player {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  bank: number;
  lives: number;
  bombs: number;
  /** 0 single, 1 twin, 2 triple, 3 quad. */
  weapon: number;
  power: number;
  shield: number;
  invuln: number;
  cool: number;
  rate: number;
  /** Auto-fire (touch). */
  autoFire: number;
  alive: boolean;
  revive: number;
  hurt: number;
  dying: number;
  thrust: number;
  focus: number;
  focusOn: number;
  focusBox: number;
  /** 0 = keyboard, 1 = pointer/touch. */
  pointer: number;
  /** Input requests, consumed by the sim. */
  shotReq: number;
  bombReq: number;
  /** Meter charge. */
  charge: number;
  chargeMax: number;
  muzzle: number;
  lastHit: number;
  trail: number;
  shieldT: number;
  heat: number;
  /** Held-fire state (focus). */
  holding: number;
  /** Death spin-out. */
  spin: number;
  /** Countdown before the next airframe is spawned. */
  respawn: number;
  /** Ticks since respawn. */
  spawnT: number;
}

export interface World {
  bullets: Bullet[];
  particles: Particle[];
  pickups: Pickup[];
  enemies: Enemy[];
  texts: FloatText[];
  scenery: Scenery[];
  player: Player;

  nextId: number;
  /** Live-item counts. Bullets / particles / texts are dense prefixes of
   *  their arrays: live items occupy [0, count). Nothing is ever spliced out
   *  of a pool, so spawners always have a slot and the GC never runs. */
  bulletCount: number;
  particleCount: number;
  textCount: number;
  /** World scroll offset, px. */
  scroll: number;
  time: number;
  frame: number;

  /* feel */
  stop: number;
  shake: number;
  shakeT: number;
  flash: number;
  flashHue: number;
  vignette: number;
  zoom: number;

  /* scoring */
  score: number;
  kills: number;
  shots: number;
  hits: number;
  combo: number;
  comboT: number;
  mult: number;
  maxCombo: number;
  chain: number;

  /* run state */
  wave: number;
  waveT: number;
  waveName: string;
  waveTag: string;
  palette: number;
  scrollMul: number;
  intensity: number;
  endless: boolean;
  endlessIndex: number;
  elapsed: number;
  livesLost: number;
  noHit: boolean;
  medals: number;

  /* boss */
  bossOn: boolean;
  bossName: string;
  bossTitle: string;
  bossQuote: string;
  bossHp: number;
  bossHpMax: number;
  bossBar: number;
  bossLabel: string;
  bossKind: string;

  /* banners */
  announce: string;
  announceSub: string;
  announceT: number;
  announceHue: number;
  bossIntro: number;
  cleared: number;
  lowHealth: number;
  respawn: number;
  /** Attract-mode demo flag. */
  demo: boolean;
}

export function makeBullet(): Bullet {
  return {
    on: false, x: 0, y: 0, vx: 0, vy: 0, side: 0, art: 0, dmg: 1, r: 4,
    life: 0, maxLife: 4, amp: 0, freq: 0, wob: 0, originX: 0, turn: 0, seek: 0,
    target: -1, eraser: false, sticky: false, age: 0, seed: 0, spin: 0, breaker: false,
    sc: 1, flash: 0, parent: -1, fresh: 0,
  };
}

export function makeParticle(): Particle {
  return {
    on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, kind: 0,
    hue: 0, drag: 0.9, add: 1, seed: 0, rot: 0, spin: 0,
  };
}

export function makePickup(): Pickup {
  return { on: false, x: 0, y: 0, vx: 0, vy: 0, kind: 0, life: 0, t: 0, pull: 0, seed: 0 };
}

export function makeText(): FloatText {
  return { on: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: "", hue: 0, size: 8 };
}

export function makeScenery(): Scenery {
  return {
    on: false, x: 0, y: 0, bankId: 0, frame: 0, sc: 1, depth: 0.5, type: 0,
    alpha: 1, flip: 0, spin: 0, t: 0, turret: 0, turretX: 0, turretY: 0, turretId: -1,
  };
}

export function makePlayer(): Player {
  return {
    x: BOUNDS.cx, y: BOUNDS.bottom - 62, tx: BOUNDS.cx, ty: BOUNDS.bottom - 62,
    vx: 0, vy: 0, bank: 0, lives: 3, bombs: 3, weapon: 1, power: 0, shield: 0,
    invuln: 2.4, cool: 0, rate: 0.108, autoFire: 0, alive: true, revive: 0, hurt: 0,
    dying: 0, thrust: 0, focus: 0, focusOn: 0, focusBox: 0, pointer: 0, shotReq: 0,
    bombReq: 0, charge: 0, chargeMax: 0, muzzle: 0, lastHit: -99, trail: 0, shieldT: 0,
    heat: 0, holding: 0, spin: 0, respawn: 0, spawnT: 0,
  };
}

export function makeEnemy(): Enemy {
  return {
    on: false, id: 0, kind: "grunt", boss: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
    a: 0, bank: 0, bankId: 0, frame: 0, r: 11, hw: 16, hh: 18, sc: 1, fade: 1, flash: 0, tint: 0, glow: 0, smoke: 0,
    hp: 1, hpMax: 1, tough: 1, invuln: 0, dying: 0, boom: 1, t: 0, speed: 90, amp: 0, freq: 0,
    sinPhase: 0, dive: 0, tell: 0, strafe: 0, lock: 0, dash: 0, dashCd: 0, dir: 1,
    spin: 0, turn: 0, travel: 0, bob: 0, minX: 0, maxX: 0, homeY: 0, isStatic: 0,
    entered: 0, leaver: 1, hostile: 1, solid: 1, formation: 0, pathT: 0, formIdx: 0,
    formN: 1, formGap: 1, formCell: 34, formCx: 0, formRow: 0, cool: 0, cool2: 0,
    burst: 0, burstGap: 0, charge: 0, chargeKind: 0, fanCd: 0, mineCd: 0, ram: 0,
    muzzle: 0, wing: 0, energy: 0, aim: 0, aimX: 0, aimY: 0, fired: 0, lastAngle: 0, points: 0,
    mult: 1, capsule: 0, count: 1, diff: 1, elite: 0, cull: 1, armored: 0, exposedSide: 1,
    flank: 1, minion: 0, roll: 0, phase: 0, pt: 0, pcd: 0, pattern: 0, pending: 0,
    laser: 0, laserA: 0, ang: 0, angv: 0, wallT: 0, gapSide: 1, adds: 0, coreOpen: 0,
    g1: 0, g2: 0, g3: 0, barSmooth: 1, locked: 0, enrage: 0, spoke: 0, stagger: 0,
    band: 0, bandDmg: 0, label: "", beam: 0, beamX: 0, turretCd: 0, death: 0, intro: 0,
    minionCap: 0, parts: 0, hover: 0, r1: 0, r2: 0,
  };
}

export function makeWorld(): World {
  return {
    bullets: Array.from({ length: 900 }, makeBullet),
    particles: Array.from({ length: 1500 }, makeParticle),
    pickups: Array.from({ length: 28 }, makePickup),
    enemies: Array.from({ length: 64 }, makeEnemy),
    texts: Array.from({ length: 48 }, makeText),
    scenery: Array.from({ length: 110 }, makeScenery),
    player: makePlayer(),
    nextId: 1, bulletCount: 0, particleCount: 0, textCount: 0,
    scroll: 0, time: 0, frame: 0, stop: 0, shake: 0, shakeT: 0,
    flash: 0, flashHue: 0, vignette: 0, zoom: 0, score: 0, kills: 0, shots: 0, hits: 0,
    combo: 0, comboT: 0, mult: 1, maxCombo: 0, chain: 0, wave: 1, waveT: 0, waveName: "",
    waveTag: "", palette: 0, scrollMul: 1, intensity: 1, endless: false, endlessIndex: 0,
    elapsed: 0, livesLost: 0, noHit: true, medals: 0, bossOn: false, bossName: "",
    bossTitle: "", bossQuote: "", bossHp: 0, bossHpMax: 1, bossBar: 0, bossLabel: "",
    bossKind: "", announce: "", announceSub: "", announceT: 0, announceHue: 0,
    bossIntro: 0, cleared: 0, lowHealth: 0, respawn: 0, demo: false,
  };
}

export const BOUNDS = {
  left: FIELD_LEFT,
  right: FIELD_RIGHT,
  top: FIELD_TOP,
  bottom: FIELD_TOP + FIELD_H,
  width: FIELD_W,
  height: FIELD_H,
  cx: FIELD_X + FIELD_W / 2,
  cy: FIELD_Y + FIELD_H / 2,
} as const;
