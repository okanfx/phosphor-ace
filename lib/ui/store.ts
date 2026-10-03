"use client";


/**
 * A tiny external store so the canvas game loop never triggers a React render,
 * while the HUD still updates at a human pace.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export type Screen = "boot" | "attract" | "brief" | "hangar" | "scores" | "options" | "playing" | "pause" | "gameover" | "victory";

export interface HudState {
  score: number;
  wave: number;
  waveName: string;
  waveTag: string;
  combo: number;
  mult: number;
  lives: number;
  bombs: number;
  power: number;
  boss: boolean;
  bossName: string;
  bossFrac: number;
  bossLabel: string;
  announce: string;
  announceSub: string;
  announceOn: boolean;
  fps: number;
  muted: boolean;
  paused: boolean;
  endless: boolean;
  /** Attract-mode demo ticker. */
  demo: boolean;
  callsign: string;
  lowHealth: boolean;
}

interface Store {
  screen: Screen;
  hud: HudState;
  result: {
    score: number;
    wave: number;
    kills: number;
    accuracy: number;
    maxCombo: number;
    bosses: number;
    time: number;
    rank: number;
    medals: number;
    newRecord: boolean;
    endless: boolean;
  } | null;
  /** Smoothed numbers for the score roll-up. */
  displayScore: number;
}

let state: Store = {
  screen: "boot",
  hud: {
    score: 0, wave: 1, waveName: "", waveTag: "", combo: 0, mult: 1, lives: 3,
    bombs: 3, power: 0, boss: false, bossName: "", bossFrac: 1, bossLabel: "",
    announce: "", announceSub: "", announceOn: false, fps: 60, muted: false,
    paused: false, endless: false, demo: true, callsign: "ACE", lowHealth: false,
  },
  result: null,
  displayScore: 0,
};

const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState(): Store {
  return state;
}

function emit(): void {
  for (const l of listeners) l();
}

export function setScreen(screen: Screen): void {
  if (state.screen === screen) return;
  state = { ...state, screen };
  emit();
}

export function setHud(patch: Partial<HudState>): void {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof HudState)[]) {
    if (state.hud[k] !== patch[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, hud: { ...state.hud, ...patch } };
  emit();
}

export function setResult(result: Store["result"]): void {
  state = { ...state, result };
  emit();
}

export function setDisplayScore(v: number): void {
  if (Math.abs(state.displayScore - v) < 1) return;
  state = { ...state, displayScore: v };
  emit();
}

export const store = {
  subscribe,
  getState,
  setScreen,
  setHud,
  setResult,
  setDisplayScore,
};