import { PanelRenderer, PALETTES } from "./panel";
import { BANK, type BakedSprite } from "./glyphmap";
import { BANK_OF } from "./sprites";
import type { World } from "../game/world";
import { PANEL_W, PANEL_H, FIELD_X, FIELD_Y, FIELD_W, FIELD_H } from "../game/config";
import { formatScore, clamp, TAU } from "../game/math";
import { TEMPLATES } from "../game/enemy";

/**
 * Compositor: ocean field + scene + HUD, then bloom/CRT post.
 * Called once per rendered frame with the current world snapshot.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const HUD_FONT = '"Lucida Console", "DejaVu Sans Mono", Menlo, Consolas, monospace';
const PICKUP_BANK = [
  BANK.pickupSpread,
  BANK.pickupShield,
  BANK.pickupBomb,
  BANK.pickupLife,
  BANK.pickupCore,
  BANK.pickupScore,
] as const;

const PARTICLE_HUE: readonly string[] = [
  "#ffffff", // 0 white-hot
  "#ffe14d", // 1 gold
  "#ff9c3a", // 2 orange
  "#ff4d4d", // 3 red
  "#6fd8ff", // 4 cyan
  "#3bffb0", // 5 green
  "#3a4a55", // 6 smoke
];

const PARTICLE_HUE_DIM: readonly string[] = [
  "#b8c4cc", "#c8b458", "#c8793a", "#c04a4a", "#5a9ab8", "#3aa88a", "#2a343c",
];

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private panel: PanelRenderer;
  private width: number;
  private height: number;

  // Offscreen targets for post-processing.
  private scene: HTMLCanvasElement;
  private sceneCtx: CanvasRenderingContext2D;
  private bloomA: HTMLCanvasElement;
  private bloomACtx: CanvasRenderingContext2D;
  private bloomB: HTMLCanvasElement;
  private bloomBCtx: CanvasRenderingContext2D;

  // Precomputed scanline + mask patterns.
  private scanPattern: CanvasPattern | null = null;
  private maskPattern: CanvasPattern | null = null;

  shakeX = 0;
  shakeY = 0;
  zoom = 1;
  private time = 0;

  quality: "low" | "medium" | "high" = "high";
  scanlines = true;
  curvature = false;
  bloom = true;
  calm = false;
  showFps = false;
  fps = 0;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bank: (b: number, i?: number) => BakedSprite | null,
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.panel = new PanelRenderer(ctx, width, height, bank);

    this.scene = document.createElement("canvas");
    this.scene.width = width;
    this.scene.height = height;
    this.sceneCtx = this.scene.getContext("2d")!;

    this.bloomA = document.createElement("canvas");
    this.bloomA.width = Math.max(1, Math.floor(width / 4));
    this.bloomA.height = Math.max(1, Math.floor(height / 4));
    this.bloomACtx = this.bloomA.getContext("2d")!;

    this.bloomB = document.createElement("canvas");
    this.bloomB.width = this.bloomA.width;
    this.bloomB.height = this.bloomA.height;
    this.bloomBCtx = this.bloomB.getContext("2d")!;

    this.buildPatterns();
  }

  private buildPatterns(): void {
    // Scanlines: a 1px dark row every 3px, matching the dot pitch.
    const sl = document.createElement("canvas");
    sl.width = 1;
    sl.height = 6;
    const sctx = sl.getContext("2d")!;
    sctx.fillStyle = "rgba(0,0,0,0.30)";
    sctx.fillRect(0, 0, 1, 2);
    sctx.fillStyle = "rgba(0,0,0,0.10)";
    sctx.fillRect(0, 2, 1, 1);
    this.scanPattern = this.ctx.createPattern(sl, "repeat");

    // Phosphor mask: RGB triads over a 3px cell.
    const mk = document.createElement("canvas");
    mk.width = 3;
    mk.height = 1;
    const mctx = mk.getContext("2d")!;
    mctx.fillStyle = "rgba(255,60,60,0.05)";
    mctx.fillRect(0, 0, 1, 1);
    mctx.fillStyle = "rgba(60,255,90,0.05)";
    mctx.fillRect(1, 0, 1, 1);
    mctx.fillStyle = "rgba(90,90,255,0.05)";
    mctx.fillRect(2, 0, 1, 1);
    this.maskPattern = this.ctx.createPattern(mk, "repeat");
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.scene.width = width;
    this.scene.height = height;
    const bw = Math.max(1, Math.floor(width / 4));
    const bh = Math.max(1, Math.floor(height / 4));
    this.bloomA.width = bw;
    this.bloomA.height = bh;
    this.bloomB.width = bw;
    this.bloomB.height = bh;
  }

  /* ───────────────────────────────────────────────────────────── draw ──── */

  draw(w: World, dt: number): void {
    this.time += dt;
    const ctx = this.sceneCtx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Screen shake + zoom.
    const sh = w.shake * (this.calm ? 0.35 : 1);
    this.shakeX = (Math.random() - 0.5) * sh * 2;
    this.shakeY = (Math.random() - 0.5) * sh * 2;
    this.zoom = 1 + w.zoom * 0.012;

    const pal = PALETTES[clamp(w.palette, 0, PALETTES.length - 1)];

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.width / 2 + this.shakeX, -this.height / 2 + this.shakeY);

    this.drawSea(ctx, w, pal);
    this.drawScenery(ctx, w);
    this.drawPickups(ctx, w);
    this.drawEnemies(ctx, w);
    this.drawBullets(ctx, w);
    this.drawParticles(ctx, w);
    this.drawPlayer(ctx, w);
    this.drawBossBeam(ctx, w);
    this.drawFieldFrame(ctx, w, pal);
    this.drawTexts(ctx, w);
    ctx.restore();

    this.drawHud(ctx, w, pal);
    ctx.restore();

    this.postProcess(w);
  }

  /* ────────────────────────────────────────────────────────────── sea ──── */

  private drawSea(
    ctx: CanvasRenderingContext2D,
    w: World,
    pal: (typeof PALETTES)[number],
  ): void {
    // Sky above the field: a vertical gradient of the palette.
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_Y + 60);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(1, pal.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, FIELD_Y + 60);

    // Sea body.
    const grad2 = ctx.createLinearGradient(0, FIELD_Y, 0, FIELD_Y + FIELD_H);
    grad2.addColorStop(0, pal.seaB);
    grad2.addColorStop(0.5, pal.seaA);
    grad2.addColorStop(1, pal.seaA);
    ctx.fillStyle = grad2;
    ctx.fillRect(0, FIELD_Y, this.width, FIELD_H + 20);

    // Matrix wave field. Every crest is a lit dot; everything else is a dim dot.
    // This is the single most expensive pass on screen, so it is quality-gated
    // and allocation-free: brightness is classified inline and drawn at once.
    const cell = this.quality === "low" ? 6 : 3;
    const cols = Math.ceil(this.width / cell);
    const rows = Math.ceil((FIELD_H + 40) / cell);
    const step = this.quality === "high" ? 1 : 2;
    const dot = cell - 1;
    const scroll = w.scroll;

    ctx.fillStyle = pal.seaC;
    ctx.globalAlpha = 0.5;
    for (let r = 0; r < rows; r += step) {
      const y = FIELD_Y + r * cell;
      const rowPhase = y * 0.06;
      const rowPhase2 = y * 0.05;
      for (let c = 0; c < cols; c += step) {
        const x = c * cell;
        const wave =
          Math.sin(x * 0.035 + scroll * 0.02 + Math.sin(rowPhase + scroll * 0.014) * 1.4) * 0.5 +
          Math.sin(x * 0.09 - scroll * 0.04 + (r / rows) * 6) * 0.28 +
          Math.sin(rowPhase2 + scroll * 0.03) * 0.3;
        const crest = wave - 0.62;
        if (crest < -0.06) continue;
        ctx.fillStyle = crest > 0.14 ? pal.crest : pal.seaC;
        ctx.globalAlpha = crest > 0.14 ? 0.32 : 0.28;
        ctx.fillRect(x, y, dot, dot);
      }
    }
    ctx.globalAlpha = 1;

    // Sun / moon glint on the water, driven by the palette glow.
    const gx = this.width * 0.5 + Math.sin(this.time * 0.1) * 40;
    const gy = FIELD_Y + FIELD_H * 0.32;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 140);
    g.addColorStop(0, pal.crest);
    g.addColorStop(0.2, `${pal.glow}44`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(gx - 140, gy - 140, 280, 280);

    // Horizontal "searchlight" banding, a subtle CRT-era touch.
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = pal.crest;
    for (let y = FIELD_Y; y < FIELD_Y + FIELD_H; y += 24) {
      const off = Math.sin(this.time * 0.4 + y * 0.05) * 4;
      ctx.fillRect(0, y + off, this.width, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ───────────────────────────────────────────────────────── scenery ───── */

  private drawScenery(ctx: CanvasRenderingContext2D, s: World): void {
    for (const it of s.scenery) {
      if (!it.on) continue;
      if (it.alpha <= 0.02) continue;

      const bankId = it.bankId;
      const a = it.alpha * (it.depth >= 1 ? 1 : 0.9);
      if (bankId === BANK.cloudFar || bankId === BANK.cloud1 || bankId === BANK.cloud0) {
        this.panel.sprite(bankId, it.x, it.y, 0, it.sc, a * (0.35 + Math.sin(it.t * 0.4) * 0.05), 0);
      } else if (bankId === BANK.searchlight) {
        // A sweeping cone of light across the water.
        ctx.save();
        ctx.globalAlpha = 0.2 * it.alpha;
        ctx.globalCompositeOperation = "lighter";
        this.panel.sprite(bankId, it.x, it.y, Math.sin(it.t * 0.5) * 0.5, it.sc, 1);
        ctx.restore();
      } else {
        this.panel.sprite(bankId, it.x, it.y, 0, it.sc, a, 0);
      }
    }
  }

  /* ────────────────────────────────────────────────────────── enemies ──── */

  private drawEnemies(ctx: CanvasRenderingContext2D, w: World): void {
    for (const e of w.enemies) {
      if (!e.on) continue;
      if (e.y < -70 || e.y > this.height + 70) continue;
      const alpha = e.fade;
      const scale = e.sc;
      const flash = e.flash;

      // Telegraph: a danger ring before a committed dive.
      if (e.tell > 0.2 && !e.boss) {
        ctx.save();
        ctx.globalAlpha = e.tell * 0.5;
        ctx.globalCompositeOperation = "lighter";
        this.panel.sprite(BANK.ring, e.x, e.y, this.time * 3, 0.4 + (1 - e.tell) * 0.6, 1);
        ctx.restore();
      }

      // Boss weak-point glow.
      if (e.boss && e.coreOpen > 0) {
        const pulse = 0.5 + Math.sin(this.time * 12) * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        this.panel.sprite(BANK.ring, e.x, e.y + 6, this.time * 2, (e.sc * 1.2) * (0.8 + pulse * 0.2), pulse * 0.7);
        ctx.restore();
      }

      // Gunship vent glow.
      if (e.kind === "gunship" && e.armored > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const gx = e.x + e.exposedSide * 16;
        this.panel.sprite(BANK.flame, gx, e.y, 0, 0.5, 0.4 + Math.sin(this.time * 8) * 0.2);
        ctx.restore();
      }

      // Boss charging telegraph.
      if (e.boss && e.laser === 1) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.35 + Math.sin(this.time * 30) * 0.2;
        this.panel.sprite(BANK.ring, e.x, e.y + 34, this.time, 0.6, 1);
        ctx.restore();
      }

      this.panel.sprite(e.bankId, e.x, e.y, e.a, scale, alpha, e.frame, flash);

      // Muzzle flash.
      if (e.muzzle > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        this.panel.sprite(BANK.flame, e.x, e.y + e.r * 0.8, 0, 0.6, e.muzzle * 8);
        ctx.restore();
      }

      // Elite marker: a small chevron.
      if (e.elite > 0 && !e.boss) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#ffe14d";
        const sy = e.y - e.r - 8;
        for (let i = 0; i < 3; i++) ctx.fillRect(e.x - 4 + i * 3, sy + i, 2, 2);
        ctx.restore();
      }
      void ctx;
    }
  }

  /* ────────────────────────────────────────────────────────── bullets ──── */

  private drawBullets(ctx: CanvasRenderingContext2D, w: World): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < w.bulletCount; i++) {
      const b = w.bullets[i];
      if (!b) continue;
      if (b.art === 3) {
        this.panel.sprite(BULLET_ERASER_BANK, b.x, b.y, this.time * 5, b.sc, 0.7, 0);
        continue;
      }
      const bank = b.side === 0 ? C_BULLET_P : C_BULLET_E;
      const frame = b.art === 1 ? 1 : 0;
      this.panel.sprite(bank, b.x, b.y, 0, b.sc, 0.95, frame, b.flash);
    }
    ctx.restore();
  }

  /* ───────────────────────────────────────────────────────── particles ─── */

  private drawParticles(ctx: CanvasRenderingContext2D, w: World): void {
    // Pass 1: additive (sparks, rings, dots).
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < w.particleCount; i++) {
      const p = w.particles[i];
      if (!p || p.add < 0.5) continue;
      const life = p.life / p.maxLife;
      const fade = life > 0.75 ? (1 - life) / 0.25 : life / 0.75;
      const color = PARTICLE_HUE[p.hue] ?? "#ffffff";
      if (p.kind === 3) {
        // Expanding shockwave ring drawn as a dot-matrix circle.
        const r = p.size * (1.6 - life * 0.6);
        this.dotRing(p.x, p.y, r, color, fade * 0.7);
      } else if (p.kind === 1) {
        // Streak: a short line along the velocity.
        const len = Math.min(18, Math.hypot(p.vx, p.vy) * 0.03);
        this.streak(p.x, p.y, p.vx, p.vy, len, p.size, color, fade);
      } else {
        this.panel.dot(p.x, p.y, p.size * fade, color, fade);
      }
    }
    ctx.restore();

    // Pass 2: normal (smoke, debris).
    ctx.save();
    for (let i = 0; i < w.particleCount; i++) {
      const p = w.particles[i];
      if (!p || p.add >= 0.5) continue;
      const life = p.life / p.maxLife;
      const fade = life;
      if (p.kind === 2) {
        this.panel.dot(p.x, p.y, p.size * (1.4 - life * 0.4), PARTICLE_HUE_DIM[6] ?? "#2a343c", fade * 0.4);
      } else if (p.kind === 4) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = PARTICLE_HUE_DIM[p.hue] ?? "#8a8a92";
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private dotRing(x: number, y: number, r: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const steps = Math.max(10, Math.min(44, Math.round(r * 1.5)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU + this.time * 0.4;
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 3, 3);
    }
  }

  private streak(
    x: number, y: number, vx: number, vy: number, len: number, size: number, color: string, alpha: number,
  ): void {
    const ctx = this.ctx;
    const d = Math.hypot(vx, vy) || 1;
    const nx = vx / d;
    const ny = vy / d;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const steps = Math.max(2, Math.round(len / 3));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      ctx.fillRect(Math.round(x - nx * len * t), Math.round(y - ny * len * t), size, size);
    }
  }

  /* ─────────────────────────────────────────────────────────── player ──── */

  private drawPlayer(ctx: CanvasRenderingContext2D, w: World): void {
    const p = w.player;
    if (!p.alive) {
      if (p.dying > 0.05 && p.dying < 0.4) {
        // Flicker the wreck as it comes apart.
        const a = 1 - p.dying / 0.4;
        ctx.save();
        ctx.globalAlpha = a;
        this.panel.sprite(BANK.player, p.x, p.y, p.spin * 6, 1 + (1 - a) * 0.6, a, 0, 1);
        ctx.restore();
      }
      return;
    }
    const blink = p.invuln > 0 ? (Math.sin(this.time * 26) > -0.2 ? 1 : 0.28) : 1;
    const focused = p.focusOn > 0.5;
    const frame = focused ? 1 : 0;

    // Engine flame.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flameLen = 0.7 + p.thrust * 0.6;
    this.panel.sprite(BANK.flame, p.x - 4, p.y + 12, 0, 0.5 * flameLen, 0.8, 0);
    this.panel.sprite(BANK.flame, p.x + 4, p.y + 12, 0, 0.5 * flameLen, 0.8, 0);
    if (p.muzzle > 0) {
      this.panel.sprite(BANK.flame, p.x, p.y - 18, 0, 0.8, 1);
    }
    ctx.restore();

    this.panel.sprite(BANK.player, p.x, p.y, p.bank * 0.6, 1.25, blink, frame);

    // Player glow halo — makes the ship trackable in busy scenes.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.25 * blink;
    this.panel.sprite(BANK.ring, p.x, p.y, 0, 0.5, 1);
    ctx.restore();

    // Shield bubble.
    if (p.shieldT > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      this.panel.sprite(BANK.shield, p.x, p.y, 0, p.shieldT * (0.9 + Math.sin(this.time * 10) * 0.06), p.shieldT * 0.5);
      ctx.restore();
    }

    // Focus hitbox.
    if (focused) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const k = 0.6 + Math.sin(this.time * 18) * 0.25;
      this.panel.dot(p.x, p.y, 6, "#ffffff", k);
      this.panel.dot(p.x, p.y, 3, "#6fd8ff", k);
      ctx.restore();
    }
  }

  /* ──────────────────────────────────────────────────────── boss beam ─── */

  private drawBossBeam(ctx: CanvasRenderingContext2D, w: World): void {
    for (const e of w.enemies) {
      if (!e.on || !e.boss) continue;
      if (e.laser !== 2) continue;
      // Rake a wide beam from the boss down-field.
      const x0 = e.x;
      const y0 = e.y + 40;
      const a = e.laserA;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#ff5a6a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.sin(a) * 800, y0 + Math.cos(a) * 800);
      ctx.stroke();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#ffe1e1";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ───────────────────────────────────────────────────────── pickups ──── */

  private drawPickups(ctx: CanvasRenderingContext2D, w: World): void {
    for (const k of w.pickups) {
      if (!k.on) continue;
      const bankId = PICKUP_BANK[k.kind] ?? BANK.pickupScore;
      // Blink out as the timer runs down.
      const blink = k.life < 3 ? (Math.sin(k.life * 14) > 0 ? 1 : 0.25) : 1;
      const bob = Math.sin(k.t * 4) * 2;
      // Halo.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      this.panel.sprite(BANK.ring, k.x, k.y + bob, this.time * 2, 0.32, 0.35 * blink);
      ctx.restore();
      this.panel.sprite(bankId, k.x, k.y + bob, 0, 1, blink, 0);
    }
  }

  /* ──────────────────────────────────────────────────────────── text ───── */

  private drawTexts(ctx: CanvasRenderingContext2D, w: World): void {
    ctx.save();
    ctx.font = `bold 8px ${HUD_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < w.textCount; i++) {
      const t = w.texts[i];
      if (!t) continue;
      const life = t.life / t.maxLife;
      const alpha = life > 0.7 ? (1 - life) / 0.3 : life / 0.7;
      const color = TEXT_HUE[t.hue] ?? "#fff";
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  /* ────────────────────────────────────────────────────── field frame ──── */

  private drawFieldFrame(ctx: CanvasRenderingContext2D, w: World, pal: (typeof PALETTES)[number]): void {
    // A subtle inner bezel made of lit dots — frames the play area.
    const x0 = FIELD_X - 6;
    const y0 = FIELD_Y - 6;
    const x1 = FIELD_X + FIELD_W + 6;
    const y1 = FIELD_Y + FIELD_H + 6;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pal.glow;
    for (let x = x0; x <= x1; x += 6) {
      ctx.globalAlpha = 0.22 + Math.sin(x * 0.1 + this.time) * 0.08;
      ctx.fillRect(x, y0, 2, 2);
      ctx.fillRect(x, y1, 2, 2);
    }
    for (let y = y0; y <= y1; y += 6) {
      ctx.globalAlpha = 0.22 + Math.sin(y * 0.1 - this.time) * 0.08;
      ctx.fillRect(x0, y, 2, 2);
      ctx.fillRect(x1, y, 2, 2);
    }
    ctx.restore();
  }

  /* ────────────────────────────────────────────────────────────── HUD ──── */

  private drawHud(ctx: CanvasRenderingContext2D, w: World, pal: (typeof PALETTES)[number]): void {
    const cx = this.width / 2;
    ctx.save();
    ctx.textBaseline = "top";

    // Top bar.
    ctx.font = `bold 9px ${HUD_FONT}`;
    ctx.fillStyle = "#6fd8ff";
    ctx.textAlign = "left";
    ctx.fillText("SCORE", FIELD_X - 4, 3);
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillStyle = "#3bffb0";
    ctx.fillText(formatScore(w.score), FIELD_X - 4, FIELD_Y - 18);

    ctx.textAlign = "center";
    ctx.font = `bold 9px ${HUD_FONT}`;
    ctx.fillStyle = "#6fd8ff";
    ctx.fillText(w.waveTag, cx, 3);
    ctx.font = `bold 11px ${HUD_FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(w.endless ? `WAVE ${w.wave}` : `${w.waveName}`, cx, 14);

    ctx.textAlign = "right";
    ctx.font = `bold 9px ${HUD_FONT}`;
    ctx.fillStyle = "#6fd8ff";
    ctx.fillText("MULT", FIELD_X + FIELD_W + 4, 3);
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillStyle = w.mult > 1 ? "#ffe14d" : "#3bffb0";
    ctx.fillText(`${w.mult}x`, FIELD_X + FIELD_W + 4, FIELD_Y - 18);

    // Combo meter under the mult.
    if (w.combo > 1) {
      const frac = clamp(w.comboT / 1.7, 0, 1);
      const barW = 34;
      this.panel.rect(FIELD_X + FIELD_W + 4 - barW, FIELD_Y - 2, barW, 3, "#1b2a33", 0.8);
      this.panel.rect(FIELD_X + FIELD_W + 4 - barW, FIELD_Y - 2, barW * frac, 3, "#ffe14d", 1);
      ctx.font = `bold 8px ${HUD_FONT}`;
      ctx.fillStyle = "#ffe14d";
      ctx.fillText(`${Math.floor(w.combo)} CHAIN`, FIELD_X + FIELD_W + 4, FIELD_Y + 4);
    }

    // Bottom bar: lives + bombs as icons.
    const by = FIELD_Y + FIELD_H + 4;
    const bx = FIELD_X - 2;
    ctx.textAlign = "left";
    ctx.font = `bold 8px ${HUD_FONT}`;
    ctx.fillStyle = "#6fd8ff";
    ctx.fillText("AIRFRAMES", bx, by);
    for (let i = 0; i < Math.min(6, w.player.lives); i++) {
      this.panel.sprite(BANK.player, bx + 8 + i * 11, by + 12, 0, 0.42, 0.9, 0);
    }
    ctx.fillText("BOMBS", bx + 92, by);
    for (let i = 0; i < Math.min(5, w.player.bombs); i++) {
      this.panel.sprite(BANK.pickupBomb, bx + 100 + i * 10, by + 12, 0, 0.42, 0.9, 0);
    }

    // Boss bar.
    if (w.bossOn && w.bossHpMax > 0) {
      const barW = FIELD_W - 40;
      const barX = (this.width - barW) / 2;
      const barY = FIELD_Y + FIELD_H - 16;
      ctx.textAlign = "center";
      ctx.font = `bold 9px ${HUD_FONT}`;
      ctx.fillStyle = "#ff5a6a";
      ctx.fillText(w.bossName, cx, barY - 12);
      // Bar body.
      this.panel.rect(barX, barY, barW, 6, "#2a0a0e", 0.9);
      // Lag bar (damage taken).
      this.panel.rect(barX, barY, barW * clamp(w.bossBar, 0, 1), 6, "#ffd0a0", 0.5);
      // Live bar.
      const frac = clamp(w.bossHp / w.bossHpMax, 0, 1);
      const hpColor = frac < 0.33 ? "#ff2f5e" : frac < 0.66 ? "#ff9c3a" : "#ff4d4d";
      this.panel.rect(barX, barY, barW * frac, 6, hpColor, 1);
      // Segment ticks.
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#000";
      for (let i = 1; i < 12; i++) ctx.fillRect(barX + (barW / 12) * i, barY, 1, 6);
      ctx.globalAlpha = 1;
      ctx.font = `bold 8px ${HUD_FONT}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(w.bossLabel, cx, barY + 8);
    }

    // Wave banner / announcements.
    if (w.announceT > 0) {
      const a = clamp(w.announceT / 0.6, 0, 1) * clamp((2.6 - w.announceT) / 0.3, 0, 1);
      const y = this.height * 0.38;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.textAlign = "center";
      ctx.font = `bold 22px ${HUD_FONT}`;
      ctx.fillStyle = w.announceHue === 1 ? "#ff5a6a" : w.announceHue === 2 ? "#ffe14d" : "#3bffb0";
      ctx.fillText(w.announce, cx, y);
      ctx.font = `bold 10px ${HUD_FONT}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(w.announceSub, cx, y + 28);
      // Underline rule.
      ctx.globalAlpha = clamp(a, 0, 1) * 0.5;
      ctx.fillStyle = pal.glow;
      ctx.fillRect(cx - 90, y + 44, 180, 1);
      ctx.globalAlpha = 1;
    }

    // Boss intro klaxon text.
    if (w.bossOn && w.bossIntro < 1) {
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 8) * 0.3;
    }

    ctx.restore();
  }

  /* ─────────────────────────────────────────────────────── post-process ── */

  private postProcess(w: World): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (this.curvature) {
      this.blitCurved(this.scene, 1);
    } else {
      ctx.drawImage(this.scene, 0, 0);
    }

    // Bloom.
    if (this.bloom && this.quality !== "low") {
      const a = this.bloomACtx;
      const b = this.bloomBCtx;
      a.clearRect(0, 0, this.bloomA.width, this.bloomA.height);
      a.drawImage(this.scene, 0, 0, this.bloomA.width, this.bloomA.height);
      // Threshold by drawing the scene over itself with 'multiply'-ish isolation:
      // easiest robust approach = draw twice with a soft composite.
      a.globalCompositeOperation = "multiply";
      a.drawImage(this.scene, 0, 0, this.bloomA.width, this.bloomA.height);
      a.globalCompositeOperation = "source-over";
      // Blur.
      b.clearRect(0, 0, this.bloomB.width, this.bloomB.height);
      b.filter = `blur(${this.quality === "high" ? 2.2 : 1.2}px)`;
      b.drawImage(this.bloomA, 0, 0);
      b.filter = "none";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.bloomB, 0, 0, W, H);
      ctx.restore();
    }

    // Scanlines.
    if (this.scanlines && this.scanPattern) {
      ctx.save();
      ctx.fillStyle = this.scanPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Phosphor triad mask.
    if (this.maskPattern && this.quality === "high") {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = this.maskPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Full-screen flash.
    if (w.flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(w.flash, 0, 1) * 0.6;
      ctx.fillStyle = w.flashHue === 1 ? "#ff3040" : w.flashHue === 2 ? "#ffd24d" : "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Damage vignette + low-life pulse.
    const vig = Math.max(w.vignette, w.lowHealth * 0.5);
    if (vig > 0.01) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(${w.lowHealth > 0 ? "255,40,60" : "255,60,60"},${clamp(vig, 0, 0.8)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // Permanent CRT edge vignette.
    const g2 = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.85);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Rolling refresh bar.
    const roll = ((this.time * 42) % (H + 120)) - 60;
    const rg = ctx.createLinearGradient(0, roll - 30, 0, roll + 30);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(0.5, "rgba(255,255,255,0.025)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, roll - 30, W, 60);

    // FPS readout.
    if (this.showFps) {
      ctx.save();
      ctx.font = `bold 10px ${HUD_FONT}`;
      ctx.textAlign = "left";
      ctx.fillStyle = this.fps > 50 ? "#3bffb0" : "#ff5a6a";
      ctx.fillText(`${this.fps | 0} FPS`, 6, this.height - 14);
      ctx.restore();
    }
  }

  /** Barrel-distort the scene into the output. */
  private blitCurved(src: HTMLCanvasElement, amount: number): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const cx = W / 2;
    const cy = H / 2;
    const k = amount * 0.08;
    // Draw as a grid of destination strips, sampling a curved source position.
    const slices = 60;
    const sh = H / slices;
    for (let i = 0; i < slices; i++) {
      const v = (i / slices) * 2 - 1;
      const bow = 1 + k * v * v;
      const destW = W * bow;
      const destX = cx - destW / 2;
      const sy = i * sh;
      // Corresponding source row also bows.
      const srcY = cy + (sy + sh / 2 - cy) / bow - sh / 2;
      ctx.drawImage(
        src, 0, srcY, W, sh,
        destX, sy, destW, sh + 1,
      );
    }
    // Fill the corners that the curve exposes.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillRect(0, H - 4, W, 4);
  }

  get sceneCanvas(): HTMLCanvasElement {
    return this.scene;
  }
}

const C_BULLET_P = BANK_OF.bulletP;
const C_BULLET_E = BANK_OF.bulletE;
const BULLET_ERASER_BANK = BANK_OF.bulletEraser;
const TEXT_HUE = ["#3bffb0", "#ff5a6a", "#ffe14d", "#6fd8ff", "#ffffff"] as const;

export { PANEL_W, PANEL_H };