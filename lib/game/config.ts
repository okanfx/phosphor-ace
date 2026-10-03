/**
 * Global tuning constants for the PHOSPHOR ACE simulation.
 * Everything the designer might want to twist lives here.
 *
 * An OKANFXLABS AI Design Labs production.
 */

/** Internal simulation / render resolution of the "dot-matrix panel". */
export const PANEL_W = 480;
export const PANEL_H = 640;

/** Fixed simulation step (seconds). The renderer interpolates nothing — 60Hz is honest. */
export const FIXED_DT = 1 / 60;

/** Never simulate more than this many steps in one frame (tab-switch safety). */
export const MAX_STEPS_PER_FRAME = 5;

/** The matrix cell pitch, in panel pixels. 3px cells over a 480px panel = 160 columns. */
export const CELL = 3;

/** Playfield is inset from the panel so the side rails can hold the dot-matrix readouts. */
export const FIELD_X = 18;
export const FIELD_Y = 22;
export const FIELD_W = PANEL_W - FIELD_X * 2;
export const FIELD_H = PANEL_H - FIELD_Y - 26;

export const MAX_BOMBS = 3;
export const START_LIVES = 3;
export const INVULN_AFTER_LIFE = 2.0;

/** Playfield bounds helper values (absolute panel space). */
export const FIELD_LEFT = FIELD_X;
export const FIELD_RIGHT = FIELD_X + FIELD_W;
export const FIELD_TOP = FIELD_Y;
export const FIELD_BOTTOM = FIELD_Y + FIELD_H;

/** Scenery layers scroll at these multiples of the world scroll speed. */
export const PARALLAX = {
  sky: 0.15,
  islands: 0.42,
  cloud: 0.75,
  spray: 1.0,
  flash: 1.0,
} as const;

/** Difficulty ramping: enemy fire-rate and density scale with this. */
export const INTENSITY_PER_WAVE = 0.12;
export const MAX_INTENSITY = 2.35;

/** Scoring. */
export const SCORE = {
  grunt: 120,
  weaver: 160,
  diver: 180,
  turretShip: 220,
  mineLayer: 140,
  kamikaze: 90,
  gunship: 480,
  ace: 320,
  pickup: 60,
  core: 900,
  noMiss: 2500,
  noHit: 5000,
  waveClear: 400,
} as const;

/** Combo decay window (seconds). */
export const COMBO_WINDOW = 1.7;

/** How long the wave banner holds before the wave starts pouring in. */
export const WAVE_INTRO_TIME = 2.1;
export const WAVE_CLEAR_TIME = 2.0;
