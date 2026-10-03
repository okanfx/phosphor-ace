import { BANK, type BakedSprite } from "./glyphmap";
import { BANK_OF } from "./sprites";

/**
 * The dot-matrix panel renderer.
 *
 * Three passes:
 *   1. SEA   — the ocean field, drawn as a grid of dots whose brightness is a
 *              function of a scrolling wave field. This is the only thing that
 *              fills the background, so the "matrix" is literally geometry.
 *   2. SCENE — every sprite, bullet, particle and readout, as baked dot blits.
 *   3. POST  — bloom, scanlines, vignette, chromatic edge, curvature.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export const PALETTES = [
  {
    // 0 — NIGHT OCEAN
    name: "NIGHT OCEAN",
    seaA: "#05121f",
    seaB: "#0a2740",
    seaC: "#12486b",
    crest: "#8fd8ff",
    skyTop: "#03080f",
    skyBot: "#071a2a",
    glow: "#2ea8ff",
    ink: "#02121d",
  },
  {
    // 1 — DAWN STRAFE
    name: "DAWN STRAFE",
    seaA: "#1a0a18",
    seaB: "#3d1330",
    seaC: "#7a2440",
    crest: "#ffd0a8",
    skyTop: "#100516",
    skyBot: "#3a0f2a",
    glow: "#ff5a6a",
    ink: "#1a0810",
  },
  {
    // 2 — STORM
    name: "STORM FRONT",
    seaA: "#0a0f14",
    seaB: "#16222e",
    seaC: "#27404f",
    crest: "#c8d8e0",
    skyTop: "#05080b",
    skyBot: "#0d1822",
    glow: "#9fb4c8",
    ink: "#060a0e",
  },
] as const;

export type PaletteId = 0 | 1 | 2;

const C_BULLET_P = BANK_OF.bulletP;
const C_BULLET_E = BANK_OF.bulletE;

export interface RenderStats {
  particles: number;
  bullets: number;
  enemies: number;
}

export class PanelRenderer {
  readonly ctx: CanvasRenderingContext2D;
  private bank: (b: number, i?: number) => BakedSprite | null;
  private width: number;
  private height: number;
  private time = 0;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bank: (b: number, i?: number) => BakedSprite | null,
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.bank = bank;
    this.ctx.imageSmoothingEnabled = false;
  }

  frame(bankId: number, index = 0): BakedSprite | null {
    return this.bank(bankId, index);
  }

  /* ──────────────────────────────────────────────────────────── primitives */

  /** Blit a baked dot sprite centred on (x, y), rotated by `rot` radians. */
  sprite(
    bankId: number,
    x: number,
    y: number,
    rot = 0,
    scale = 1,
    alpha = 1,
    frame = 0,
    flash = 0,
  ): void {
    const s = this.bank(bankId, frame);
    if (!s) return;
    const ctx = this.ctx;
    const w = s.w * scale;
    const h = s.h * scale;
    ctx.save();
    ctx.translate(x, y);
    if (rot !== 0) ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    if (flash > 0) {
      // Hit flash: draw the silhouette in white, then the normal art on top.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(1, alpha + flash);
      ctx.drawImage(s.canvas, s.sx, s.sy, s.sw, s.sh, -w / 2, -h / 2, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = alpha;
    }
    ctx.drawImage(s.canvas, s.sx, s.sy, s.sw, s.sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** Blit without centring — used for HUD strips that read as a matrix. */
  blit(bankId: number, x: number, y: number, alpha = 1, frame = 0, scale = 1): void {
    const s = this.bank(bankId, frame);
    if (!s) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      s.canvas, s.sx, s.sy, s.sw, s.sh,
      x, y, s.w * scale, s.h * scale,
    );
    ctx.globalAlpha = 1;
  }

  /** Draw a sprite stretched between two points (engine trails, beams). */
  stretch(bankId: number, x0: number, y0: number, x1: number, y1: number, alpha = 1, scale = 1): void {
    const s = this.bank(bankId);
    if (!s) return;
    const ctx = this.ctx;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x0, y0);
    ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    ctx.drawImage(s.canvas, s.sx, s.sy, s.sw, s.sh, -s.w * scale / 2, 0, s.w * scale, len);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  dot(x: number, y: number, size: number, color: string, alpha = 1): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    ctx.globalAlpha = 1;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.globalAlpha = 1;
  }

  /** A run of matrix dots forming a bar — the HUD's structural motif. */
  dotBar(x: number, y: number, cells: number, cell: number, color: string, alpha = 1, gap = 3): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < cells; i++) {
      ctx.fillRect(Math.round(x + i * (cell + gap)), Math.round(y), cell, cell);
    }
    ctx.globalAlpha = 1;
  }

  get w(): number {
    return this.width;
  }

  get h(): number {
    return this.height;
  }

  advance(dt: number): void {
    this.time += dt;
  }

  now(): number {
    return this.time;
  }

  bulletBank(side: 0 | 1): number {
    return side === 0 ? C_BULLET_P : C_BULLET_E;
  }
}