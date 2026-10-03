/**
 * Glyph-map rasteriser — the visual identity of PHOSPHOR ACE.
 *
 * Every sprite is authored as a 16x16 map of characters where the CHARACTER CODE
 * encodes the dot's role:
 *
 *   '.'  empty            '0'..'9' body, brightness 9 (hottest) down to 0
 *   'a'..'f' accent (secondary colour), brightness 6 down to 0
 *   'W'/'w' hot white core (engine flame, muzzle flash, bomb blast)
 *   'X'/'x' bloom-only (dim halo — feeds the bloom pass, not the core)
 *   'v'/'V' ink (near-black; only reads against a bright field)
 *
 * The whole set is baked ONCE at boot into per-colour-bank offscreen sheets.
 * The renderer then only ever issues drawImage calls, so a thousand glowing
 * ships cost a thousand blits and nothing else.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export const MAX_GLYPH_COLS = 32;
export const MAX_GLYPH_H = 32;

/** Default panel pixels per dot cell. The whole look hinges on this number. */
export const SPRITE_SCALE = 3;

/** Sprite bank ids. */
export const BANK = {
  player: 0,
  grunt: 1,
  weaver: 2,
  diver: 3,
  kamikaze: 4,
  gunship: 5,
  ace: 6,
  mineLayer: 7,
  turret: 8,
  bossA: 9,
  bossB: 10,
  bulletP: 11,
  bulletE: 12,
  pickupSpread: 13,
  pickupShield: 14,
  pickupBomb: 15,
  pickupLife: 16,
  pickupCore: 17,
  pickupScore: 18,
  mine: 19,
  ring: 20,
  cloud0: 21,
  cloud1: 22,
  cloudFar: 23,
  explosion: 24,
  shield: 25,
  flame: 26,
  island: 27,
  islandLit: 28,
  searchlight: 29,
  carrier: 30,
  wreck: 31,
} as const;

type Palette = [body: string, accent: string, white: string, ink: string];

const PALETTES: Record<number, Palette> = {
  [BANK.player]: ["#3bffb0", "#2ea8ff", "#f2fff8", "#04180f"],
  [BANK.grunt]: ["#ff4d4d", "#ffb03a", "#fff0e0", "#2a0404"],
  [BANK.weaver]: ["#ff6bd6", "#ff9c3a", "#fff0f6", "#2a0420"],
  [BANK.diver]: ["#ffa03a", "#ff4d4d", "#fff6e6", "#2a1404"],
  [BANK.mineLayer]: ["#a07cff", "#ff4d4d", "#f6f0ff", "#140428"],
  [BANK.kamikaze]: ["#ff2f5e", "#ffd23a", "#fff0f4", "#28040f"],
  [BANK.gunship]: ["#ff8a3a", "#ffe14d", "#fff6e8", "#2a1204"],
  [BANK.ace]: ["#ff3a6a", "#ffffff", "#ffffff", "#280410"],
  [BANK.turret]: ["#9fb4c8", "#ff4d4d", "#e8f4ff", "#0c141c"],
  [BANK.bossA]: ["#8fa8c8", "#ff4d4d", "#e8f4ff", "#08101a"],
  [BANK.bossB]: ["#ffd24d", "#ff5a3a", "#fffce8", "#221603"],
  [BANK.bulletP]: ["#c8ffe8", "#3bffb0", "#ffffff", "#000000"],
  [BANK.bulletE]: ["#ffeeb0", "#ff5a3a", "#ffffff", "#000000"],
  [BANK.pickupSpread]: ["#3bffb0", "#ffffff", "#ffffff", "#04180f"],
  [BANK.pickupShield]: ["#2ea8ff", "#ffffff", "#ffffff", "#03101e"],
  [BANK.pickupBomb]: ["#ff9c3a", "#ffffff", "#ffffff", "#221403"],
  [BANK.pickupLife]: ["#ff4d8d", "#ffffff", "#ffffff", "#220412"],
  [BANK.pickupCore]: ["#7cff5a", "#ffffff", "#ffffff", "#041404"],
  [BANK.pickupScore]: ["#ffe14d", "#ffffff", "#ffffff", "#221a02"],
  [BANK.mine]: ["#ff4d4d", "#ffe14d", "#ffffff", "#220404"],
  [BANK.ring]: ["#ffb03a", "#ffffff", "#ffffff", "#000000"],
  [BANK.cloud0]: ["#4a6a8a", "#6a8aaa", "#c0d8f0", "#000000"],
  [BANK.cloud1]: ["#5a7a9a", "#7a9aba", "#c0d8f0", "#000000"],
  [BANK.cloudFar]: ["#2a4258", "#35506a", "#8098b0", "#000000"],
  [BANK.explosion]: ["#ffe14d", "#ff5a3a", "#ffffff", "#000000"],
  [BANK.shield]: ["#2ea8ff", "#a8e8ff", "#ffffff", "#000000"],
  [BANK.flame]: ["#3bffb0", "#ffe14d", "#ffffff", "#000000"],
  [BANK.island]: ["#2a3c4a", "#4a6a5a", "#7a9a8a", "#0a1014"],
  [BANK.islandLit]: ["#33475a", "#8a7a4a", "#c0b07a", "#0a1014"],
  [BANK.searchlight]: ["#c8e8ff", "#8a6a3a", "#ffffff", "#101418"],
  [BANK.carrier]: ["#3a4a5a", "#ff4d4d", "#c0d0e0", "#080e14"],
  [BANK.wreck]: ["#2a2a30", "#4a4a52", "#8a8a92", "#0a0a0c"],
};

/** One baked sprite = one glyph frame inside a bank sheet. */
export interface BakedSprite {
  canvas: HTMLCanvasElement;
  /** Source rect (always the whole canvas, kept for API symmetry). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Baked logical size, panel px. */
  w: number;
  h: number;
  /** Hitbox radius, panel px. */
  r: number;
}

const PAD = 2;

export interface GlyphDef {
  name: string;
  bank: number;
  rows: readonly string[];
  /** Panel px per dot. Default SPRITE_SCALE. */
  scale?: number;
  /** Optional explicit hitbox radius; defaults to auto. */
  r?: number;
}

export class SpriteBank {
  /** bank id -> baked frames */
  private readonly banks = new Map<number, BakedSprite[]>();
  private readonly definitions: GlyphDef[] = [];
  private baked = false;

  add(def: GlyphDef): void {
    this.definitions.push(def);
  }

  bake(): void {
    if (this.baked) return;
    for (const def of this.definitions) {
      const pal = PALETTES[def.bank] ?? (["#ffffff", "#cccccc", "#ffffff", "#000000"] as Palette);
      const scale = def.scale ?? SPRITE_SCALE;
      const h = def.rows.length;
      let w = 0;
      for (const row of def.rows) w = Math.max(w, row.length);
      const cv = document.createElement("canvas");
      cv.width = w * scale + PAD * 2;
      cv.height = h * scale + PAD * 2;
      const ctx = cv.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      drawGlyph(ctx, def.rows, PAD, PAD, pal, scale);
      const frame: BakedSprite = {
        canvas: cv,
        sx: 0,
        sy: 0,
        sw: cv.width,
        sh: cv.height,
        w: w * scale,
        h: h * scale,
        r: def.r ?? autoRadius(def.rows, scale),
      };
      const list = this.banks.get(def.bank) ?? [];
      list.push(frame);
      this.banks.set(def.bank, list);
    }
    this.baked = true;
  }

  /** Every registered glyph definition (used by the offline tools). */
  allDefs(): readonly GlyphDef[] {
    return this.definitions;
  }

  /** Raw glyph definitions for a bank (used by the offline proof-sheet tool). */
  defs(bank: number): readonly GlyphDef[] {
    return this.definitions.filter((d) => d.bank === bank);
  }

  frames(bank: number): readonly BakedSprite[] {
    return this.banks.get(bank) ?? [];
  }

  frame(bank: number, index = 0): BakedSprite | null {
    const list = this.banks.get(bank);
    if (!list || list.length === 0) return null;
    return list[index % list.length] as BakedSprite;
  }

  radius(bank: number, index = 0): number {
    const f = this.frame(bank, index);
    return f ? f.r : 10;
  }
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  ox: number,
  oy: number,
  pal: Palette,
  scale: number,
): void {
  for (let r = 0; r < rows.length; r++) {
    const rowStr = rows[r];
    if (!rowStr) continue;
    for (let c = 0; c < rowStr.length; c++) {
      const ch = rowStr[c];
      if (!ch || ch === " " || ch === ".") continue;
      const info = DOT[ch];
      if (!info) continue;
      const x = ox + c * scale;
      const y = oy + r * scale;
      ctx.globalAlpha = info.a;
      ctx.fillStyle = info.pal(pal);
      ctx.fillRect(x, y, scale, scale);
    }
  }
  ctx.globalAlpha = 1;
}

interface DotInfo {
  a: number;
  pal: (p: Palette) => string;
}

const DOT: Record<string, DotInfo> = {
  "0": { a: 0.16, pal: (p) => p[0] },
  "1": { a: 0.3, pal: (p) => p[0] },
  "2": { a: 0.45, pal: (p) => p[0] },
  "3": { a: 0.6, pal: (p) => p[0] },
  "4": { a: 0.74, pal: (p) => p[0] },
  "5": { a: 0.86, pal: (p) => p[0] },
  "6": { a: 0.96, pal: (p) => p[0] },
  "7": { a: 1, pal: (p) => p[0] },
  "8": { a: 0.72, pal: (p) => p[2] },
  "9": { a: 0.55, pal: (p) => p[2] },
  a: { a: 0.78, pal: (p) => p[1] },
  b: { a: 0.62, pal: (p) => p[1] },
  c: { a: 0.48, pal: (p) => p[1] },
  d: { a: 0.34, pal: (p) => p[1] },
  e: { a: 0.22, pal: (p) => p[1] },
  f: { a: 0.12, pal: (p) => p[1] },
  W: { a: 1, pal: (p) => p[2] },
  w: { a: 0.8, pal: (p) => p[2] },
  X: { a: 0.5, pal: (p) => p[1] },
  x: { a: 0.3, pal: (p) => p[1] },
  v: { a: 0.5, pal: (p) => p[3] },
  V: { a: 0.75, pal: (p) => p[3] },
};

function autoRadius(rows: readonly string[], scale: number): number {
  let minC = MAX_GLYPH_COLS;
  let maxC = -1;
  let minR = MAX_GLYPH_H;
  let maxR = -1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch && ch !== "." && ch !== " " && DOT[ch]) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }
  if (maxC < 0) return 8;
  const w = (maxC - minC + 1) * scale;
  const h = (maxR - minR + 1) * scale;
  return Math.max(5, Math.round(Math.min(w, h) * 0.42));
}
