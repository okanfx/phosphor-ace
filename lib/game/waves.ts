import type { EnemyKind } from "./types";

/**
 * Campaign data. Six hand-authored sectors, then endless.
 * Copy is written to be read on a 1.4-second banner, so it is short and loud.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export interface Squad {
  kind: EnemyKind;
  count: number;
  /** Formation archetype id (see spawn.ts F_*). */
  formation: number;
  at: number;
  /** 0..1 across the field. */
  cx: number;
  row: number;
  gap: number;
  speed: number;
  /** Attack personality: 0 straight, 1 aimed, 2 burst, 3 fan, 4 mines. */
  attack: number;
  elite: number;
}

export interface WaveDef {
  name: string;
  tag: string;
  /** 0 night ocean, 1 dawn, 2 storm. */
  palette: number;
  scroll: number;
  lead: number;
  squads: Squad[];
  boss: EnemyKind | null;
  /** Shore batteries to scatter on the islands. */
  turrets: number;
  firstDrop: number;
}

const F_VEE_L = 1;
const F_VEE_R = 2;
const F_COLUMN = 3;
const F_SINE = 4;
const F_PINCER = 5;
const F_RUN = 6;

const sq = (
  kind: EnemyKind,
  count: number,
  formation: number,
  at: number,
  cx: number,
  o: Partial<Squad> = {},
): Squad => ({
  kind, count, formation, at, cx, row: 0, gap: 1, speed: 1, attack: 1, elite: 0, ...o,
});

export const WAVES: readonly WaveDef[] = [
  {
    name: "FIRST LIGHT",
    tag: "SECTOR 01 — COASTAL PATROL",
    palette: 0,
    scroll: 1,
    lead: 0.5,
    turrets: 1,
    boss: null,
    firstDrop: 0,
    squads: [
      sq("grunt", 4, F_VEE_L, 0, 0.5),
      sq("grunt", 4, F_VEE_R, 3.4, 0.5),
      sq("grunt", 3, F_COLUMN, 8.5, 0.32),
      sq("grunt", 3, F_COLUMN, 9.8, 0.68),
      sq("weaver", 5, F_SINE, 14.0, 0.5),
      sq("kamikaze", 3, F_RUN, 19.5, 0.5, { gap: 2, speed: 1.1 }),
      sq("grunt", 5, F_VEE_L, 22.0, 0.42, { attack: 2 }),
      sq("grunt", 5, F_VEE_R, 23.2, 0.58, { attack: 2 }),
      sq("diver", 2, F_PINCER, 30.0, 0.3),
      sq("diver", 2, F_PINCER, 30.6, 0.7),
    ],
  },
  {
    name: "CROSSFIRE",
    tag: "SECTOR 02 — ENEMY INTERCEPT",
    palette: 1,
    scroll: 1.08,
    lead: 0.5,
    turrets: 2,
    boss: null,
    firstDrop: 0,
    squads: [
      sq("grunt", 5, F_COLUMN, 0, 0.5),
      sq("weaver", 4, F_SINE, 3.2, 0.28),
      sq("weaver", 4, F_SINE, 4.0, 0.72),
      sq("diver", 3, F_PINCER, 8.4, 0.5, { attack: 3 }),
      sq("grunt", 4, F_VEE_L, 12.4, 0.4, { attack: 2 }),
      sq("grunt", 4, F_VEE_R, 12.9, 0.6, { attack: 2 }),
      sq("mineLayer", 2, F_COLUMN, 17.6, 0.24, { attack: 4 }),
      sq("mineLayer", 2, F_COLUMN, 18.4, 0.76, { attack: 4 }),
      sq("kamikaze", 5, F_RUN, 23.0, 0.5, { speed: 1.15 }),
      sq("ace", 1, F_PINCER, 28.0, 0.5, { elite: 1 }),
      sq("weaver", 6, F_SINE, 32.0, 0.5),
      sq("diver", 4, F_VEE_L, 36.0, 0.5, { attack: 2 }),
    ],
  },
  {
    name: "STORM LINE",
    tag: "SECTOR 03 — SQUALL FRONT",
    palette: 2,
    scroll: 1.16,
    lead: 0.5,
    turrets: 2,
    boss: null,
    firstDrop: 1,
    squads: [
      sq("diver", 4, F_VEE_L, 0, 0.42, { attack: 3 }),
      sq("diver", 4, F_VEE_R, 0.7, 0.58, { attack: 3 }),
      sq("grunt", 5, F_COLUMN, 5.4, 0.5, { attack: 2 }),
      sq("weaver", 6, F_SINE, 9.0, 0.35),
      sq("weaver", 6, F_SINE, 9.6, 0.65),
      sq("ace", 2, F_PINCER, 14.6, 0.5, { elite: 1 }),
      sq("mineLayer", 3, F_COLUMN, 19.0, 0.5, { attack: 4 }),
      sq("kamikaze", 6, F_RUN, 23.4, 0.5, { speed: 1.2 }),
      sq("gunship", 1, F_COLUMN, 28.0, 0.5),
      sq("diver", 4, F_SINE, 33.0, 0.5, { attack: 2 }),
      sq("grunt", 6, F_VEE_L, 37.5, 0.5, { attack: 2 }),
    ],
  },
  {
    name: "HARD DECK",
    tag: "SECTOR 04 — CARRIER GROUP",
    palette: 0,
    scroll: 1.2,
    lead: 0.5,
    turrets: 3,
    boss: "bossA",
    firstDrop: 0,
    squads: [
      sq("ace", 2, F_PINCER, 0, 0.5, { elite: 1 }),
      sq("gunship", 1, F_COLUMN, 4.4, 0.36),
      sq("weaver", 6, F_SINE, 8.0, 0.5),
      sq("diver", 5, F_VEE_L, 12.4, 0.45, { attack: 3 }),
      sq("diver", 5, F_VEE_R, 13.0, 0.55, { attack: 3 }),
      sq("kamikaze", 6, F_RUN, 17.6, 0.5, { speed: 1.25 }),
      sq("ace", 3, F_COLUMN, 22.0, 0.5, { elite: 1 }),
      sq("mineLayer", 3, F_COLUMN, 26.4, 0.5, { attack: 4 }),
      sq("gunship", 1, F_COLUMN, 30.0, 0.64),
    ],
  },
  {
    name: "NIGHT CARRIER",
    tag: "SECTOR 05 — DEEP STRIKE",
    palette: 2,
    scroll: 1.3,
    lead: 0.5,
    turrets: 3,
    boss: "bossB",
    firstDrop: 1,
    squads: [
      sq("diver", 6, F_SINE, 0, 0.5, { attack: 2 }),
      sq("gunship", 1, F_COLUMN, 3.6, 0.4),
      sq("ace", 3, F_PINCER, 8.0, 0.5, { elite: 1 }),
      sq("grunt", 6, F_COLUMN, 12.0, 0.5, { attack: 2 }),
      sq("kamikaze", 8, F_RUN, 16.4, 0.5, { speed: 1.3 }),
      sq("gunship", 1, F_COLUMN, 21.0, 0.6),
      sq("ace", 4, F_SINE, 25.4, 0.5, { elite: 1 }),
      sq("mineLayer", 4, F_COLUMN, 30.0, 0.5, { attack: 4 }),
    ],
  },
];

export const CAMPAIGN_LENGTH = WAVES.length;

/** Endless mode: recycled pressure with an escalating tempo. */
export function endlessWave(n: number): WaveDef {
  const t = n * 2.4;
  const hard = Math.min(2.4, 1 + n * 0.18);
  return {
    name: "ENDLESS ASCENT",
    tag: `SECTOR ∞ — LIFT ${String(n + 1).padStart(2, "0")}`,
    palette: n % 2 === 0 ? 1 : 2,
    scroll: 1.2 + Math.min(0.7, n * 0.06),
    lead: 0.4,
    turrets: 2,
    boss: n > 0 && n % 3 === 0 ? (n % 2 === 0 ? "bossA" : "bossB") : null,
    firstDrop: n % 2 === 0 ? 0 : 1,
    squads: [
      sq("diver", 5, F_SINE, 0, 0.5, { attack: 2, speed: hard }),
      sq("gunship", 1, F_COLUMN, t, 0.4, { speed: hard }),
      sq("ace", 3, F_PINCER, t + 3.6, 0.5, { elite: 1, speed: hard }),
      sq("grunt", 6, F_COLUMN, t + 7.2, 0.5, { attack: 2, speed: hard }),
      sq("kamikaze", 8, F_RUN, t + 11.0, 0.5, { speed: hard }),
      sq("diver", 6, F_VEE_L, t + 15.4, 0.5, { attack: 3, speed: hard }),
      sq("diver", 6, F_VEE_R, t + 16.2, 0.5, { attack: 3, speed: hard }),
      sq("mineLayer", 3, F_COLUMN, t + 20.0, 0.5, { attack: 4, speed: hard }),
      sq("weaver", 6, F_SINE, t + 23.4, 0.5, { speed: hard }),
    ],
  };
}
