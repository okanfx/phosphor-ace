/** The player's airframe. All values are plain numbers; no allocation. */
export interface PlayerState {
  x: number;
  y: number;
  /** Target position the airframe eases toward (keyboard or touch). */
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  /** Bank angle in radians, for the sprite tilt + engine trail. */
  bank: number;

  lives: number;
  bombs: number;

  /** Weapon tiers. */
  weapon: number; // 0 = single, 1 = twin, 2 = triple, 3 = quad
  weaponLevel: number; // 0..8
  power: number; // 0..8, drives spread density
  shield: number; // seconds of shield remaining
  /** Invulnerability after a respawn / hit. */
  invuln: number;
  /** 0..1 muzzle heat, purely cosmetic. */
  heat: number;

  cool: number;
  /** 0..1, drives the airframe's dot shimmer. */
  flicker: number;
  /** Engine trail length. */
  thrust: number;
  alive: boolean;
  /** Respawn animation timer. */
  revive: number;
  /** Last damage time, for the vignette. */
  hurtT: number;
  /** Spin-out animation after a hit. */
  spin: number;
  /** Screen position of the airframe shadow for parallax. */
  depth: number;
  /** Whether the airframe is currently clamping (holding Shift). */
  focus: number;
  /** Focus mode reveals hitbox + tightens shots. */
  focusOn: number;
}

export function makePlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    tx: x,
    ty: y,
    vx: 0,
    vy: 0,
    bank: 0,
    lives: 3,
    bombs: 3,
    weapon: 1,
    weaponLevel: 0,
    power: 0,
    shield: 0,
    invuln: 2.5,
    heat: 0,
    cool: 0,
    flicker: 0,
    thrust: 0,
    alive: true,
    revive: 0,
    hurtT: 0,
    spin: 0,
    depth: 1,
    focus: 0,
    focusOn: 0,
  };
}
