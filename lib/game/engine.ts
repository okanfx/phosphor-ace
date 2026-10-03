import {
  BOUNDS,
  makeWorld,
  type World,
  type Bullet,
  type Particle,
  type Pickup,
  type Scenery,
  type FloatText,
} from "./world";
import { FIELD_H, FIELD_W, FIELD_X, FIELD_Y, PANEL_W } from "./config";
import { clamp, lerp, mulberry32, TAU } from "./math";
import { spawnEnemy, spawnFormation, F_NONE } from "./spawn";
import { updateEnemyAi } from "./ai";
import { updateBoss, bossDeathSequence } from "./boss";
import { killBullet, playerShot } from "./weapons";
import {
  addShake,
  dot,
  explode,
  explodeBig,
  flashScreen,
  hitStop,
  impact,
  popText,
  ring,
  shard,
  smoke,
  spark,
  textColor,
  playerExplode,
} from "./fx";
import { WAVES, endlessWave, type WaveDef, type Squad } from "./waves";
import { BANK } from "../render/glyphmap";
import { BANK_OF } from "../render/sprites";
import { audio } from "../audio/engine";
import { MAX_INTENSITY } from "./config";

/**
 * PHOSPHOR ACE simulation.
 *
 * Deterministic fixed-timestep; no allocation after boot. The renderer reads
 * the world, the engine never touches the DOM.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export interface RunStats {
  score: number;
  wave: number;
  kills: number;
  shots: number;
  hits: number;
  maxCombo: number;
  bombs: number;
  time: number;
  bosses: number;
  flawless: boolean;
  noMiss: boolean;
  medals: number;
}

export interface EngineEvents {
  onWave?: (wave: number, def: WaveDef) => void;
  onBoss?: (name: string, title: string) => void;
  onDeath?: () => void;
  onGameOver?: (stats: RunStats) => void;
  onPickup?: (kind: number) => void;
  onMedals?: (medals: number) => void;
  onCombo?: (combo: number, mult: number) => void;
}

const SCROLL_BASE = 108;

export class Engine {
  readonly world: World = makeWorld();
  events: EngineEvents = {};

  /** Run lifecycle. */
  mode: "menu" | "briefing" | "playing" | "gameover" | "victory" = "menu";
  private rng = mulberry32(0x5eed);
  private waveDef: WaveDef = WAVES[0] as WaveDef;
  private squadCursor = 0;
  private waveClock = 0;
  private waveState: "intro" | "active" | "cleared" | "boss" = "intro";
  private runTime = 0;
  private seed = 1;
  private rngState = 0x5eed;
  /** Difficulty scalar applied to enemy fire rates. */
  private diff = 1;
  private dropDone: Record<number, boolean> = {};
  private firstDropDone = false;
  private stats: RunStats;
  /** Attract-mode autopilot. */
  demo = false;
  private demoT = 0;
  private demoTargetX = BOUNDS.cx;
  private demoTargetY = BOUNDS.bottom - 90;
  quality: "low" | "medium" | "high" = "high";
  /** Reduced flashing: suppress screen flashes and big particles. */
  calm = false;
  shakeScale = 1;

  constructor() {
    this.stats = this.blankStats();
    this.resetRun(1);
  }

  private blankStats(): RunStats {
    return {
      score: 0, wave: 1, kills: 0, shots: 0, hits: 0, maxCombo: 0, bombs: 0,
      time: 0, bosses: 0, flawless: true, noMiss: true, medals: 0,
    };
  }

  /* ────────────────────────────────────────────────────────── lifecycle ── */

  startRun(endless: boolean, seed?: number): void {
    this.rngState = seed ?? ((Date.now() ^ 0x9e3779b9) >>> 0);
    this.rng = mulberry32(this.rngState);
    this.seed = this.rngState;
    this.resetRun(1);
    this.world.endless = endless;
    this.mode = "playing";
    this.stats = this.blankStats();
    this.demo = false;
    audio.setIntensity(1);
  }

  private resetRun(wave: number): void {
    const w = this.world;
    w.bulletCount = 0;
    w.particleCount = 0;
    w.textCount = 0;
    for (const b of w.bullets) b.on = false;
    for (const p of w.particles) p.on = false;
    for (const p of w.pickups) p.on = false;
    for (const t of w.texts) t.on = false;
    for (const s of w.scenery) s.on = false;
    for (const e of w.enemies) e.on = false;
    w.score = 0;
    w.kills = 0;
    w.shots = 0;
    w.hits = 0;
    w.combo = 0;
    w.comboT = 0;
    w.mult = 1;
    w.maxCombo = 0;
    w.chain = 0;
    w.elapsed = 0;
    w.livesLost = 0;
    w.noHit = true;
    w.medals = 0;
    w.bossOn = false;
    w.bossBar = 0;
    w.bossName = "";
    w.announce = "";
    w.announceT = 0;
    w.lowHealth = 0;
    w.respawn = 0;
    w.cleared = 0;
    w.endlessIndex = 0;

    const p = w.player;
    p.x = BOUNDS.cx;
    p.y = BOUNDS.bottom - 62;
    p.tx = p.x;
    p.ty = p.y;
    p.vx = 0;
    p.vy = 0;
    p.bank = 0;
    p.lives = 3;
    p.bombs = 3;
    p.weapon = 1;
    p.power = 0;
    p.shield = 0;
    p.invuln = 2.2;
    p.cool = 0;
    p.alive = true;
    p.dying = 0;
    p.revive = 0;
    p.hurt = 0;
    p.spin = 0;
    p.thrust = 0;
    p.focus = 0;
    p.focusOn = 0;
    p.charge = 0;
    p.lastHit = -99;

    this.loadWave(wave);
  }

  private loadWave(n: number): void {
    const w = this.world;
    this.squadCursor = 0;
    this.waveClock = 0;
    this.waveState = "intro";
    this.diff = clamp(1 + (n - 1) * 0.13, 1, MAX_INTENSITY);
    this.dropDone = {};
    this.firstDropDone = false;

    if (w.endless) {
      this.waveDef = endlessWave(n - 1);
      w.endlessIndex = n - 1;
    } else {
      this.waveDef = WAVES[n - 1] ?? (WAVES[WAVES.length - 1] as WaveDef);
    }

    w.wave = n;
    w.waveName = this.waveDef.name;
    w.waveTag = this.waveDef.tag;
    w.palette = this.waveDef.palette;
    w.scrollMul = this.waveDef.scroll;
    w.intensity = this.diff;
    w.announce = this.waveDef.name;
    w.announceSub = this.waveDef.tag;
    w.announceT = 2.4;
    w.announceHue = 0;
    w.cleared = 0;
    w.noHit = true;

    // Scatter shore batteries on the islands below the play area.
    this.seedScenery(n);
    audio.play("wave");
    this.events.onWave?.(n, this.waveDef);
  }

  private seedScenery(n: number): void {
    const w = this.world;
    for (const s of w.scenery) s.on = false;
    // Far clouds.
    for (let i = 0; i < 7; i++) {
      this.pushScenery(
        this.rng() * PANEL_W,
        -200 + this.rng() * 2600,
        BANK.cloudFar,
        0.25,
        1,
        0.5,
      );
    }
    // Mid clouds.
    for (let i = 0; i < 6; i++) {
      this.pushScenery(
        this.rng() * PANEL_W,
        -200 + this.rng() * 2600,
        BANK.cloud1,
        0.55,
        2,
        0.7,
      );
    }
    // Near clouds.
    for (let i = 0; i < 4; i++) {
      this.pushScenery(this.rng() * PANEL_W, -200 + this.rng() * 2600, BANK.cloud0, 0.85, 2, 0.85);
    }
    // Islands (a few carry a shore battery).
    const turrets = this.waveDef.turrets;
    for (let i = 0; i < 5; i++) {
      // Keep islands within the visible field — they were spawning below FIELD_BOTTOM
      // and piling up in the HUD area.
      const y = -160 + i * 150 + this.rng() * 60;
      const x = 30 + this.rng() * (PANEL_W - 130);
      const bankId = this.rng() < 0.5 ? BANK.island : BANK.carrier;
      const isCarrier = bankId === BANK.carrier;
      // Islands are background — keep them subtle (0.45 alpha) so they don't
      // compete with enemies and the player for visual attention.
      const s = this.pushScenery(x, y, bankId, 1, 0.7, 0.45);
      if (s) {
        // Mark carriers via type directly — the old sc>=4 hack made them render 4x too big.
        s.type = isCarrier ? 4 : 1;
      }
      if (s && i < turrets + 1) {
        s.turret = 1;
        s.turretX = bankId === BANK.carrier ? 30 : 34;
        s.turretY = bankId === BANK.carrier ? 26 : 22;
        this.attachTurret(s);
      }
    }
    // Wreckage.
    for (let i = 0; i < 4; i++) {
      this.pushScenery(this.rng() * PANEL_W, -200 + this.rng() * 2600, BANK.wreck, 0.9, 2, 0.6);
    }
    void n;
  }

  private attachTurret(s: Scenery): void {
    const w = this.world;
    const e = spawnEnemy(w, {
      kind: "turret",
      x: s.x + s.turretX * s.sc,
      y: s.y + s.turretY * s.sc,
      homeY: s.y,
    });
    if (!e) return;
    e.entered = 0;
    e.invuln = 0.6;
    e.diff = this.diff;
    e.cool = 2.6 + this.rng() * 2.4;
    s.turretId = e.id;
  }

  private pushScenery(
    x: number, y: number, bankId: number, depth: number, sc: number, alpha: number,
  ): Scenery | null {
    const w = this.world;
    for (const s of w.scenery) {
      if (!s.on) {
        s.on = true;
        s.x = x;
        s.y = y;
        s.bankId = bankId;
        s.frame = 0;
        s.sc = sc;
        s.depth = depth;
        s.type = sc >= 4 ? 4 : bankId === BANK.wreck ? 2 : bankId === BANK.cloudFar ? 0 : sc === 1 ? 1 : 0;
        s.alpha = alpha;
        s.flip = this.rng() < 0.5 ? -1 : 1;
        s.spin = 0;
        s.t = this.rng() * 10;
        s.turret = 0;
        s.turretId = -1;
        return s;
      }
    }
    return null;
  }

  /* ───────────────────────────────────────────────────────────── input ─── */

  pointerTo(px: number, py: number): void {
    const p = this.world.player;
    p.pointer = 1;
    p.tx = clamp(px, BOUNDS.left + 10, BOUNDS.right - 10);
    p.ty = clamp(py, BOUNDS.top + 10, BOUNDS.bottom - 10);
  }

  setMove(vx: number, vy: number): void {
    const p = this.world.player;
    p.pointer = 0;
    p.tx = clamp(p.x + vx, BOUNDS.left + 10, BOUNDS.right - 10);
    p.ty = clamp(p.y + vy, BOUNDS.top + 10, BOUNDS.bottom - 10);
  }

  requestShot(): void {
    this.world.player.shotReq = 1;
  }

  requestBomb(): void {
    this.world.player.bombReq = 1;
  }

  /* ────────────────────────────────────────────────────────── main step ── */

  step(dt: number): void {
    const w = this.world;
    w.time += dt;
    w.frame++;

    if (this.mode !== "playing") {
      this.stepAttract(dt);
      return;
    }

    // Hit-stop: freeze the sim, keep the clock (and the CRT) alive.
    if (w.stop > 0) {
      w.stop -= dt;
      this.stepFeel(dt);
      return;
    }

    this.runTime += dt;
    w.elapsed += dt;

    this.stepScroll(dt);
    this.stepWaveDirector(dt);
    this.stepPlayer(dt);
    this.stepEnemies(dt);
    this.stepBullets(dt);
    this.stepPickups(dt);
    this.stepParticles(dt);
    this.stepScenery(dt);
    this.stepCombo(dt);
    this.stepFeel(dt);
    this.stepCamera(dt);

    if (this.demo) this.stepDemoAi(dt);

    this.stats.score = w.score;
    this.stats.wave = w.wave;
    this.stats.kills = w.kills;
    this.stats.shots = w.shots;
    this.stats.hits = Math.min(w.shots, w.hits);
    this.stats.maxCombo = w.maxCombo;
    this.stats.bombs = 3 - w.player.bombs;
    this.stats.time = this.runTime;
    this.stats.flawless = w.livesLost === 0;
    this.stats.noMiss = w.noHit;
    this.stats.medals = w.medals;
  }

  private stepScroll(dt: number): void {
    const w = this.world;
    const bossSlow = w.bossOn ? 0.55 : 1;
    w.scroll += SCROLL_BASE * w.scrollMul * bossSlow * dt;
  }

  /* ───────────────────────────────────────────────── wave director ───── */

  private stepWaveDirector(dt: number): void {
    const w = this.world;
    this.waveClock += dt;
    w.waveT = this.waveClock;

    switch (this.waveState) {
      case "intro":
        if (this.waveClock >= this.waveDef.lead) {
          this.waveState = "active";
          this.waveClock = 0;
          w.announceT = Math.min(w.announceT, 0.9);
        }
        break;

      case "active": {
        // Release squads whose time has come.
        const squads = this.waveDef.squads;
        while (this.squadCursor < squads.length) {
          const s = squads[this.squadCursor] as Squad;
          if (s.at > this.waveClock) break;
          this.releaseSquad(s);
          this.squadCursor++;
        }
        // Wave complete when the script is exhausted and the sky is clear.
        // "Clear" ignores kamikaze drones — a ram you cannot dodge is a
        // design bug, not a challenge.
        if (this.squadCursor >= squads.length && this.countLive() === 0) {
          if (this.waveDef.boss) {
            this.spawnBoss();
            this.waveState = "boss";
          } else {
            this.waveState = "cleared";
            w.cleared = 1;
            w.announce = "SECTOR CLEAR";
            w.announceSub = `${w.waveName} SECURED`;
            w.announceT = 2.2;
            w.announceHue = 0;
            const bonus = 400 * w.wave + (w.noHit ? 1200 : 0);
            this.addScore(bonus, BOUNDS.cx, BOUNDS.cy, 2, 9);
            audio.play("wave");
          }
        }
        break;
      }

      case "cleared":
        if (this.waveClock >= 2.4) {
          this.advanceWave();
        }
        break;

      case "boss": {
        if (!this.findBossRef()) {
          this.waveState = "cleared";
          w.cleared = 1;
          w.announce = w.endless ? "ASCENT CONTINUES" : "SECTOR SECURED";
          w.announceSub = w.endless ? `LIFT ${w.wave + 1} INBOUND` : "PROCEED TO NEXT SECTOR";
          w.announceT = 2.6;
          w.announceHue = 0;
          audio.play("wave");
        }
        break;
      }
    }
  }

  private advanceWave(): void {
    const w = this.world;
    w.cleared = 0;
    if (!w.endless && w.wave >= WAVES.length) {
      this.mode = "victory";
      audio.setIntensity(0);
      audio.play("record");
      this.events.onGameOver?.({ ...this.stats });
      return;
    }
    this.loadWave(w.wave + 1);
  }

  private releaseSquad(s: Squad): void {
    spawnFormation(this.world, {
      kind: s.kind,
      count: s.count,
      formation: s.formation,
      cx: s.cx,
      row: s.row,
      gap: s.gap,
      speed: s.speed,
      elite: s.elite,
      diff: this.diff,
      attack: s.attack,
      fire: 0,
    });
  }

  private spawnBoss(): void {
    const w = this.world;
    const kind = this.waveDef.boss;
    if (!kind) return;
    const e = spawnEnemy(w, {
      kind,
      x: BOUNDS.cx,
      y: -70,
      diff: this.diff,
      elite: w.wave - 1 >= 4 ? 1 : 0,
    });
    if (!e) return;
    e.boss = true;
    e.entered = 0;
    e.hpMax = e.hp;
    e.hp = e.hpMax;
    e.fade = 0;
    e.phase = 0;
    e.band = 0;
    e.intro = 0;
    e.pattern = 0;
    e.pt = 0;
    e.pcd = 0;
    e.locked = 0;
    e.coreOpen = 0;
    w.bossOn = true;
    w.bossName = e.kind === "bossA" ? "STORMWELL" : "HELIOS PRIME";
    w.bossTitle = e.kind === "bossA" ? "DREADNOUGHT CLASS" : "ORBITAL CITADEL";
    w.bossQuote = e.kind === "bossA" ? "SKIES CLAIMED." : "THE LAST LIGHT GOES OUT.";
    w.bossHp = e.hp;
    w.bossHpMax = e.hpMax;
    w.bossKind = e.kind;
    w.announce = "WARNING";
    w.announceSub = w.bossName;
    w.announceT = 3.0;
    w.announceHue = 1;
    audio.play("siren");
    audio.setIntensity(2);
    this.events.onBoss?.(w.bossName, w.bossTitle);
  }

  private findBossRef() {
    for (const e of this.world.enemies) if (e.on && e.boss) return e;
    return null;
  }

  /**
   * Ground units that must be destroyed for the wave to clear. Units that have
   * already left the panel are ignored: a ram you cannot dodge is a design bug,
   * not a challenge, and nothing may stall the campaign gate.
   */
  private countLive(): number {
    let n = 0;
    for (const e of this.world.enemies) {
      if (e.on && !e.boss && e.count > 0 && e.y < BOUNDS.bottom + 24) n++;
    }
    return n;
  }

  /* ──────────────────────────────────────────────────────────── player ── */

  private stepPlayer(dt: number): void {
    const w = this.world;
    const p = w.player;

    if (!p.alive) {
      p.dying += dt;
      if (p.dying > 1.1) {
        p.respawn -= dt;
        if (p.respawn <= 0) {
          if (p.lives > 0) {
            p.alive = true;
            p.invuln = 2.4;
            p.weapon = Math.max(0, p.weapon - 1);
            p.power = Math.max(0, p.power - 2);
            p.shield = 0;
            p.x = BOUNDS.cx;
            p.y = BOUNDS.bottom - 70;
            p.tx = p.x;
            p.ty = p.y;
            p.dying = 0;
            p.spin = 0;
          } else {
            this.gameOver();
          }
        }
      }
      return;
    }

    // Movement.
    const speed = p.focusOn > 0.5 ? 132 : 236;
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.6) {
      const k = Math.min(1, (speed / d) * 1.6);
      p.x += dx * k;
      p.y += dy * k;
    }
    p.x = clamp(p.x, BOUNDS.left + 9, BOUNDS.right - 9);
    p.y = clamp(p.y, BOUNDS.top + 12, BOUNDS.bottom - 12);
    p.vx = dx;
    p.vy = dy;
    p.bank = lerp(p.bank, clamp(dx * 0.02, -0.5, 0.5), 10 * dt);
    p.thrust = 0.6 + Math.min(1, Math.abs(dy) / 60) * 0.4 + Math.sin(w.time * 22) * 0.08;
    p.trail += dt;
    if (p.trail > 0.022) {
      p.trail = 0;
      dot(w, p.x + Math.sin(w.time * 30) * 3, p.y + 16, 0, 60, 3, 0.22, 5, 0.9);
    }
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.shieldT = p.shield > 0 ? Math.min(1, p.shieldT + dt * 4) : Math.max(0, p.shieldT - dt * 4);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt * 1.6);
    p.spin = Math.max(0, p.spin - dt * 2);
    p.focus = lerp(p.focus, p.holding, 12 * dt);
    p.focusBox = p.focus;
    if (p.shield > 0) p.shield -= dt;

    // Firing.
    p.cool -= dt;
    const wantShot = p.shotReq > 0 || p.autoFire > 0;
    p.shotReq = 0;
    if (wantShot && p.cool <= 0) {
      this.firePlayer();
      p.cool = p.rate * (p.focusOn > 0.5 ? 0.82 : 1);
    }
    p.heat = Math.min(1, p.heat + (wantShot ? 0.22 : -0.5 * dt * 6));

    // Bomb.
    if (p.bombReq > 0) {
      p.bombReq = 0;
      this.fireBomb();
    }
  }

  private firePlayer(): void {
    const w = this.world;
    const p = w.player;
    p.muzzle = 0.05;
    w.shots++;
    const power = p.power;
    const nose = p.y - 13;
    const wide = p.focusOn < 0.5;

    switch (p.weapon) {
      case 0:
        playerShot(w, p.x, nose, 0, power, 0);
        break;
      case 1: {
        playerShot(w, p.x - 8, nose + 2, -0.1, power, 0);
        playerShot(w, p.x + 8, nose + 2, 0.1, power, 0);
        break;
      }
      case 2: {
        const a = wide ? 0.26 : 0.12;
        playerShot(w, p.x, nose, 0, power, 1);
        playerShot(w, p.x - 12, nose + 3, -a, power, 0);
        playerShot(w, p.x + 12, nose + 3, a, power, 0);
        if (power >= 6) {
          playerShot(w, p.x - 20, nose + 6, -a * 1.7, power, 0);
          playerShot(w, p.x + 20, nose + 6, a * 1.7, power, 0);
        }
        break;
      }
      default: {
        const a = wide ? 0.3 : 0.14;
        playerShot(w, p.x - 5, nose, -a * 0.4, power, 1);
        playerShot(w, p.x + 5, nose, a * 0.4, power, 1);
        playerShot(w, p.x - 15, nose + 3, -a, power, 0);
        playerShot(w, p.x + 15, nose + 3, a, power, 0);
        if (power >= 4) {
          playerShot(w, p.x - 24, nose + 7, -a * 1.8, power, 0);
          playerShot(w, p.x + 24, nose + 7, a * 1.8, power, 0);
        }
        break;
      }
    }
    dot(w, p.x, nose - 2, 0, -30, 9, 0.07, 0);
    audio.play("shoot", (w.frame % 5) / 5);
  }

  private fireBomb(): void {
    const w = this.world;
    const p = w.player;
    if (p.bombs <= 0) {
      audio.play("deny");
      return;
    }
    p.bombs--;
    addShake(w, 9);
    hitStop(w, 0.06);
    flashScreen(w, 0.55, 1);
    ring(w, p.x, p.y, 70, 0.5, 4);
    ring(w, p.x, p.y, 40, 0.35, 0);
    audio.play("bomb");

    // A bomb is a shockwave, not a bullet: everything on screen feels it.
    for (let i = 0; i < w.bulletCount; i++) {
      const b = w.bullets[i];
      if (!b) continue;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 200 * 200) b.on = false;
    }
    for (const e of w.enemies) {
      if (!e.on) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 200) {
        this.damageEnemy(e, 26 * (1 - d / 400), p.x, p.y, 2);
      }
    }
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * TAU;
      spark(w, p.x, p.y, 2, 0, 420, 0.2, a, 5, 0.5);
      spark(w, p.x, p.y, 1, 2, 300, 0.2, a, 4, 0.8);
    }
    p.invuln = Math.max(p.invuln, 0.8);
    w.lowHealth = 0;
  }

  /* ─────────────────────────────────────────────────────────── enemies ── */

  private stepEnemies(dt: number): void {
    const w = this.world;
    for (const e of w.enemies) {
      if (!e.on) continue;
      e.t += dt;
      e.px = e.x;
      e.py = e.y;
      e.invuln = Math.max(0, e.invuln - dt);
      e.flash = Math.max(0, e.flash - dt * 6);
      e.muzzle = Math.max(0, e.muzzle - dt);
      e.aimX = lerp(e.aimX, w.player.x, 0.2);
      e.aimY = lerp(e.aimY, w.player.y, 0.2);

      if (e.boss) {
        if (e.death > 0) {
          bossDeathSequence(e, w, dt);
          if (!e.on) this.onBossDefeated();
          continue;
        }
        updateBoss(e, w, dt);
        w.bossHp = e.hp;
        w.bossHpMax = e.hpMax;
        w.bossBar = e.barSmooth;
        w.bossLabel = e.label;
        continue;
      }

      updateEnemyAi(e, w, dt);

      // Bounds + culling.
      if (e.y > BOUNDS.bottom + 26) {
        // Anything that gets this far has broken off or missed its run.
        if (e.leaver > 0 || e.count === 0) {
          e.on = false;
        } else {
          this.killEnemy(e, false);
        }
        continue;
      }
      if (e.x < BOUNDS.left - 60 || e.x > BOUNDS.right + 60) {
        e.x = clamp(e.x, BOUNDS.left - 60, BOUNDS.right + 60);
        if (e.kind === "kamikaze" || e.kind === "ace") e.on = false;
      }
      if (e.y < BOUNDS.top - 160 && e.entered === 0) {
        // Never let a spawn get permanently stuck off-screen.
        e.y = BOUNDS.top - 60;
      }
      // Engine smoke for damaged heavies.
      if ((e.armored > 0 || e.hp < e.hpMax * 0.4) && e.smoke <= 0) {
        e.smoke = 0.09;
        smoke(w, e.x + (Math.random() - 0.5) * 14, e.y - e.r * 0.6, 1, 7, 26, 0.9, 6);
      }
      e.smoke -= dt;
    }
  }

  /* ─────────────────────────────────────────────────────────── bullets ── */

  private stepBullets(dt: number): void {
    const w = this.world;
    const list = w.bullets;
    for (let i = w.bulletCount - 1; i >= 0; i--) {
      const b = list[i] as Bullet;
      b.age += dt;
      b.life -= dt;
      b.fresh = Math.max(0, b.fresh - dt);
      b.flash = Math.max(0, b.flash - dt * 6);

      if (b.amp > 0) {
        b.wob += b.freq * dt;
        b.vx = Math.cos(b.wob) * b.amp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Homing.
      if (b.seek > 0) {
        let target: Bullet["target"] = b.target;
        let best = 1e9;
        if (target < 0) {
          for (const e of w.enemies) {
            if (!e.on || e.boss) continue;
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < best && dy < 240) {
              best = d2;
              target = e.id;
            }
          }
          b.target = target;
        }
        if (target >= 0) {
          const e = this.findEnemyById(target);
          if (e) {
            const want = Math.atan2(e.x - b.x, e.y - b.y);
            const cur = Math.atan2(b.vx, b.vy);
            let d = want - cur;
            while (d > Math.PI) d -= TAU;
            while (d < -Math.PI) d += TAU;
            const step = clamp(d, -b.turn * dt, b.turn * dt);
            const sp = Math.hypot(b.vx, b.vy);
            const a = cur + step;
            b.vx = Math.sin(a) * sp;
            b.vy = Math.cos(a) * sp;
          }
        }
      }

      // Sticky mines: arm, then home slowly.
      if (b.sticky) {
        if (b.age > 0.35) {
          b.vy = lerp(b.vy, 16, 2 * dt);
          b.vx = lerp(b.vx, 0, 2 * dt);
        }
      }

      // Off-screen / expired.
      if (
        b.life <= 0 ||
        b.y < BOUNDS.top - 60 ||
        b.y > BOUNDS.bottom + 60 ||
        b.x < BOUNDS.left - 50 ||
        b.x > BOUNDS.right + 50
      ) {
        killBullet(w, i);
        continue;
      }

      if (b.side === 0) this.collidePlayerBullet(b);
      else this.collideEnemyBullet(b);
    }
  }

  private findEnemyById(id: number) {
    for (const e of this.world.enemies) if (e.on && e.id === id) return e;
    return null;
  }

  private collidePlayerBullet(b: Bullet): void {
    const w = this.world;
    // Erasers shred incoming fire.
    if (b.eraser) {
      for (let k = 0; k < w.bulletCount; k++) {
        const o = w.bullets[k];
        if (!o || o.side !== 1 || o === b) continue;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        if (dx * dx + dy * dy < (o.r + b.r) * (o.r + b.r)) {
          o.on = false;
          impact(w, o.x, o.y, 2, 0);
          dot(w, o.x, o.y, 0, 0, 7, 0.08, 4);
        }
      }
    }

    for (const e of w.enemies) {
      if (!e.on || e.dying) continue;
      if (e.entered === 0 && !e.boss) continue;
      // Elliptical hit box sized to the sprite, so the hull you can see is the
      // hull you can hit. The hull extends a bullet radius into the target.
      const nx = (e.x - b.x) / (e.hw + b.r);
      const ny = (e.y - b.y) / (e.hh + b.r);
      if (nx * nx + ny * ny > 1) continue;
      // Armoured hulls: only the vented flank takes damage.
      if (e.armored > 0 && !e.boss) {
        const side = Math.sign(b.x - e.x) || 1;
        if (side !== e.exposedSide && e.kind === "gunship") {
          b.on = false;
          impact(w, b.x, b.y, 3, 0);
          audio.play("hitArmor");
          this.bumpScore(0);
          return;
        }
      }
      b.on = false;
      this.damageEnemy(e, b.dmg, b.x, b.y, b.breaker ? 2 : 1);
      return;
    }
  }

  private collideEnemyBullet(b: Bullet): void {
    const w = this.world;
    const p = w.player;
    if (!p.alive || p.invuln > 0) return;
    const r = p.focusOn > 0.5 ? 3.2 : 5.6;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const rr = r + b.r;
    if (dx * dx + dy * dy > rr * rr) return;
    if (p.shield > 0) {
      b.on = false;
      dot(w, b.x, b.y, 0, 0, 14, 0.16, 4);
      ring(w, p.x, p.y, 26, 0.22, 3);
      audio.play("hitArmor");
      p.shield = Math.max(0, p.shield - 1.6);
      this.bumpCombo(0.5);
      return;
    }
    b.on = false;
    this.hitPlayer();
  }

  /* ──────────────────────────────────────────────────────────── damage ── */

  damageEnemy(
    e: ReturnType<Engine["findEnemyRef"]>,
    dmg: number,
    hx: number,
    hy: number,
    kind: number,
  ): void {
    if (!e.on || e.dying) return;
    const w = this.world;
    if (e.invuln > 0) return;
    if (e.locked > 0) return;

    // Armoured flank rule (gunship).
    if (e.armored > 0 && !e.boss && e.kind === "gunship") {
      const side = Math.sign(hx - e.x) || 1;
      if (side !== e.exposedSide) {
        impact(w, hx, hy, 3, 0);
        audio.play("hitArmor");
        return;
      }
    }
    // Boss weak point: shells only bite while the core is exposed.
    if (e.boss) {
      const shielded = e.coreOpen <= 0 && e.band < 2;
      if (shielded && kind === 2) {
        impact(w, hx, hy, 3, 0);
        audio.play("hitArmor");
        return;
      }
      if (e.locked > 0) {
        impact(w, hx, hy, 3, 0);
        return;
      }
    }

    e.hp -= dmg;
    e.flash = 1;
    e.bandDmg += dmg;
    const hue = e.armored > 0 ? 3 : 0;

    if (e.boss) {
      w.bossBar = e.barSmooth;
      hitStop(w, 0.014);
      addShake(w, 1.1);
      spark(w, hx, hy, 3, 0, 120, 1.2, Math.atan2(hy - e.y, hx - e.x), 3, 0.16);
      audio.play("bossHit");
      w.comboT = Math.max(w.comboT, 0.6);
      if (e.hp <= 0) {
        e.hp = 0;
        e.death = 0.0001;
        e.dying = 1;
        e.hostile = 0;
        e.solid = 0;
      }
      return;
    }

    spark(w, hx, hy, 4, hue, 150, 1.6, Math.atan2(hy - e.y, hx - e.x), 3, 0.2);
    dot(w, hx, hy, 0, 0, 8, 0.1, 0);
    addShake(w, 0.7);
    hitStop(w, 0.012);
    audio.play("hit");

    if (e.hp <= 0) this.killEnemy(e, true);
  }

  private findEnemyRef() {
    return this.world.enemies[0];
  }

  killEnemy(e: ReturnType<Engine["findEnemyRef"]>, scored: boolean): void {
    const w = this.world;
    if (!e.on || e.dying) return;
    e.dying = 1;
    e.solid = 0;
    e.hostile = 0;
    e.count = 0;
    w.kills++;
    this.bumpCombo(1);

    if (e.kind === "gunship") {
      explodeBig(w, e.x, e.y, 0.8);
      audio.play("explodeBig");
    } else {
      explode(w, e.x, e.y, 0.9 + (e.armored > 0 ? 0.5 : 0), 1);
      audio.play("explode");
    }

    if (scored) {
      const pts = Math.round(e.points * w.mult);
      this.addScore(pts, e.x, e.y - 8, 2, 8);
    }
    w.hits++;

    // Drops. Every wave opens with a guaranteed power capsule so a clean
    // pilot is never stuck on the starting gun, then it becomes a roll.
    if (!this.dropDone[e.id]) {
      this.dropDone[e.id] = true;
      if (!this.firstDropDone && this.waveDef.firstDrop >= 0) {
        this.firstDropDone = true;
        this.dropPickup(e.x, e.y, this.waveDef.firstDrop);
      } else {
        const roll = Math.random();
        if (e.kind === "gunship") this.dropPickup(e.x, e.y, roll < 0.5 ? 4 : 0);
        else if (e.kind === "ace") this.dropPickup(e.x, e.y, roll < 0.55 ? 0 : 5);
        else if (e.kind === "mineLayer") this.dropPickup(e.x, e.y, roll < 0.5 ? 1 : 2);
        else if (e.kind === "turret") this.dropPickup(e.x, e.y, roll < 0.35 ? 5 : 2);
        else if (roll < 0.1) this.dropPickup(e.x, e.y, this.rollPower(roll));
      }
    }

    e.on = false;
  }

  private onBossDefeated(): void {
    const w = this.world;
    w.bossOn = false;
    w.bossBar = 0;
    w.bossName = "";
    this.stats.bosses++;
    audio.setIntensity(1);
    this.addScore(20000 + w.wave * 5000, BOUNDS.cx, BOUNDS.cy, 2, 12);
    w.announce = "TARGET DESTROYED";
    w.announceSub = "SECTOR SECURED";
    w.announceT = 2.6;
    w.announceHue = 0;
  }

  hitPlayer(): void {
    const w = this.world;
    const p = w.player;
    if (!p.alive || p.invuln > 0) return;
    p.lives--;
    w.livesLost++;
    w.noHit = false;
    p.hurt = 1;
    w.vignette = 1;
    w.combo = 0;
    w.comboT = 0;
    w.mult = 1;
    playerExplode(w, p.x, p.y);
    audio.play("lifeLost");
    p.alive = false;
    p.dying = 0;
    p.respawn = 1.5;
    p.shield = 0;
    p.thrust = 0;
    this.events.onCombo?.(0, 1);

    // Kill streak: the sky does not get to keep its formation after you go
    // down. Ram drones are scrammed out of the sky; ground units lose their
    // nerve and break off. This keeps the wave gate honest and stops a single
    // death from stalling the campaign.
    for (const e of this.world.enemies) {
      if (!e.on || e.boss) continue;
      const above = e.y < p.y;
      if (e.kind === "kamikaze") {
        explode(w, e.x, e.y, 0.8, 0.6);
        e.on = false;
      } else if (above && e.entered === 1) {
        e.count = 0;
        e.leaver = 1;
        e.cull = 1;
        e.speed *= 3.4;
        e.turn = 1.2;
      }
    }
    audio.play("tick");
  }

  gameOver(): void {
    if (this.mode === "gameover") return;
    this.mode = "gameover";
    this.world.demo = true;
    audio.setIntensity(0);
    audio.play("gameOver");
    this.events.onGameOver?.({ ...this.stats });
  }

  /* ─────────────────────────────────────────────────────────── pickups ── */

  /** Weighted roll for light-unit drops: power first, then points. */
  private rollPower(r: number): number {
    if (r < 0.05) return 0; // spread
    if (r < 0.075) return 1; // shield
    if (r < 0.09) return 2; // bomb
    return 5; // score
  }

  private dropPickup(x: number, y: number, kind: number): void {
    const w = this.world;
    for (const p of w.pickups) {
      if (p.on) continue;
      p.on = true;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 40;
      p.vy = -40;
      p.kind = kind as Pickup["kind"];
      p.life = 13;
      p.t = 0;
      p.pull = 0;
      p.seed = Math.random() * 1000;
      ring(w, x, y, 20, 0.3, 3);
      return;
    }
  }

  private stepPickups(dt: number): void {
    const w = this.world;
    const p = w.player;
    for (const k of w.pickups) {
      if (!k.on) continue;
      k.t += dt;
      k.life -= dt;
      if (k.life <= 0) {
        k.on = false;
        continue;
      }
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      const d = Math.hypot(dx, dy);
      if (p.alive && d < 84) {
        k.pull = Math.min(1, k.pull + dt * 2.4);
        const s = 150 * k.pull;
        k.vx = lerp(k.vx, (dx / (d || 1)) * s, 6 * dt);
        k.vy = lerp(k.vy, (dy / (d || 1)) * s, 6 * dt);
      } else {
        k.pull = 0;
        k.vy = lerp(k.vy, 46, 2 * dt);
        k.vx = lerp(k.vx, 0, 2 * dt);
      }
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.x = clamp(k.x, BOUNDS.left + 8, BOUNDS.right - 8);
      if (k.y > BOUNDS.bottom + 20) {
        k.on = false;
        continue;
      }
      if (p.alive && d < 16) {
        this.collect(k.kind);
        k.on = false;
        ring(w, k.x, k.y, 22, 0.3, 0);
      }
    }
  }

  private collect(kind: number): void {
    const w = this.world;
    const p = w.player;
    const labels = ["SPREAD", "SHIELD", "BOMB", "AIRFRAME", "REACTOR", "SCORE"];
    switch (kind) {
      case 0:
        p.weapon = Math.min(3, p.weapon + (p.weapon < 3 ? 1 : 0));
        p.power = Math.min(8, p.power + 2);
        audio.play("powerUp");
        popText(w, p.x, p.y - 22, "SPREAD", 0, 8, 1.0);
        dot(w, p.x, p.y, 0, 0, 30, 0.24, 0);
        break;
      case 1:
        p.shield = 9;
        p.shieldT = 1;
        audio.play("powerUp");
        popText(w, p.x, p.y - 22, "SHIELD", 3, 8, 1.0);
        ring(w, p.x, p.y, 34, 0.4, 3);
        break;
      case 2:
        p.bombs = Math.min(5, p.bombs + 1);
        audio.play("powerUp");
        popText(w, p.x, p.y - 22, "BOMB +1", 2, 8, 1.0);
        break;
      case 3:
        p.lives++;
        audio.play("powerUp");
        popText(w, p.x, p.y - 22, "AIRFRAME +1", 1, 8, 1.2);
        break;
      case 4:
        w.score += 1500;
        p.power = Math.min(8, p.power + 1);
        audio.play("record");
        popText(w, p.x, p.y - 22, "REACTOR 1500", 2, 8, 1.2);
        break;
      default:
        w.score += 600;
        popText(w, p.x, p.y - 22, "600", 2, 7, 0.8);
        audio.play("pickup");
        break;
    }
    ring(w, p.x, p.y, 20, 0.3, 0);
    this.bumpCombo(0.4);
    this.events.onPickup?.(kind);
    void labels;
  }

  /* ───────────────────────────────────────────────────────── particles ── */

  private stepParticles(dt: number): void {
    const w = this.world;
    const list = w.particles;
    for (let i = w.particleCount - 1; i >= 0; i--) {
      const p = list[i] as Particle;
      p.life -= dt;
      if (p.life <= 0) {
        p.on = false;
        const last = w.particleCount - 1;
        if (i !== last) {
          const t = list[i] as Particle;
          list[i] = list[last] as Particle;
          list[last] = t;
        }
        w.particleCount = last;
        continue;
      }
      if (p.kind === 3) {
        p.seed += dt * 3.2;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.rot += p.spin * dt;
    }
  }

  private stepScenery(dt: number): void {
    const w = this.world;
    for (const s of w.scenery) {
      if (!s.on) continue;
      s.t += dt;
      s.y += SCROLL_BASE * w.scrollMul * s.depth * dt;
      s.x += Math.sin(s.t * 0.3) * 3 * dt;

      if (s.turret === 1 && s.turretId >= 0) {
        // Keep the shore battery glued to its island; it arms only once the
        // island is properly on screen, so it never opens fire off-frame.
        for (const e of w.enemies) {
          if (e.on && e.id === s.turretId) {
            e.x = s.x + s.turretX * s.sc;
            e.y = s.y + s.turretY * s.sc;
            e.entered = s.y > BOUNDS.top + 46 ? 1 : 0;
            break;
          }
        }
      }

      if (s.y > FIELD_Y + FIELD_H + 80) {
        s.on = false;
        // Recycle scenery so the sky never empties.
        if (s.bankId === BANK.cloudFar) this.pushScenery(Math.random() * PANEL_W, -260, BANK.cloudFar, 0.25, 1, 0.5);
        else if (s.bankId === BANK.cloud1) this.pushScenery(Math.random() * PANEL_W, -260, BANK.cloud1, 0.55, 2, 0.7);
        else if (s.bankId === BANK.cloud0) this.pushScenery(Math.random() * PANEL_W, -260, BANK.cloud0, 0.85, 2, 0.85);
        else if (s.bankId === BANK.wreck) this.pushScenery(Math.random() * PANEL_W, -260, BANK.wreck, 0.9, 2, 0.6);
        else if (s.bankId === BANK.island) this.pushScenery(30 + Math.random() * (PANEL_W - 130), -260, BANK.island, 1, 1, 1);
        else if (s.bankId === BANK.carrier) this.pushScenery(30 + Math.random() * (PANEL_W - 130), -260, BANK.carrier, 1, 1, 1);
      }
    }
  }

  /* ──────────────────────────────────────────────────────────── combo ─── */

  private stepCombo(dt: number): void {
    const w = this.world;
    if (w.combo > 0) {
      w.comboT -= dt;
      if (w.comboT <= 0) {
        w.combo = 0;
        w.mult = 1;
        this.events.onCombo?.(0, 1);
      } else {
        w.mult = Math.min(8, 1 + Math.floor(w.combo / 4));
      }
    }
  }

  private bumpCombo(amount: number): void {
    const w = this.world;
    if (this.demo) return;
    w.combo += amount;
    w.comboT = 1.7;
    if (w.combo > w.maxCombo) w.maxCombo = Math.floor(w.combo);
    w.mult = Math.min(8, 1 + Math.floor(w.combo / 4));
    this.events.onCombo?.(w.combo, w.mult);
  }

  bumpScore(points: number): void {
    this.addScore(points, 0, 0, -1, 0);
  }

  addScore(points: number, x: number, y: number, hue: number, size: number): void {
    const w = this.world;
    if (points === 0) return;
    w.score += points;
    if (hue >= 0) {
      popText(w, x, y, points > 0 ? `+${points}` : `${points}`, hue, size, 0.9);
    }
  }

  /* ───────────────────────────────────────────────────────── game feel ── */

  private stepFeel(dt: number): void {
    const w = this.world;
    w.shakeT = Math.max(0, w.shakeT - dt);
    if (w.shakeT <= 0) w.shake = Math.max(0, w.shake - dt * 42);
    w.shake *= 1 - Math.min(1, dt * 6);
    w.flash = Math.max(0, w.flash - dt * (this.calm ? 9 : 3.6));
    w.vignette = Math.max(0, w.vignette - dt * 1.2);
    w.zoom = Math.max(0, w.zoom - dt * 5);
    w.announceT = Math.max(0, w.announceT - dt);
    w.cleared = Math.max(0, w.cleared - dt * 0.6);
    w.lowHealth = w.player.lives <= 1 && w.player.alive ? 0.5 + Math.sin(w.time * 6) * 0.3 : 0;

    // Floating text.
    for (let i = w.textCount - 1; i >= 0; i--) {
      const t = w.texts[i] as FloatText;
      t.life -= dt;
      if (t.life <= 0) {
        t.on = false;
        const last = w.textCount - 1;
        if (i !== last) {
          const tmp = w.texts[i] as FloatText;
          w.texts[i] = w.texts[last] as FloatText;
          w.texts[last] = tmp;
        }
        w.textCount = last;
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 1 - Math.min(1, dt * 2.4);
    }
  }

  private stepCamera(dt: number): void {
    const w = this.world;
    w.zoom = lerp(w.zoom, 0, Math.min(1, dt * 6));
    // A slight drift toward the pointer adds weight without nausea.
    w.vignette = clamp(w.vignette, 0, 1);
  }

  /* ────────────────────────────────────────────────────── attract mode ── */

  private stepAttract(dt: number): void {
    const w = this.world;
    w.time += dt;
    w.frame++;
    this.stepScroll(dt);
    this.stepScenery(dt);
    this.stepParticles(dt);
    this.stepFeel(dt);
    w.vignette = lerp(w.vignette, 0.25, dt * 2);
    if (w.elapsed === 0 || w.time > 1000) this.startAttract();
  }

  /** Boot a live-looking backdrop for the attract screen. */
  startAttract(): void {
    const w = this.world;
    for (const s of w.scenery) s.on = false;
    for (let i = 0; i < 8; i++) {
      this.pushScenery(this.rng() * PANEL_W, -200 + this.rng() * 2600, BANK.cloudFar, 0.25, 1, 0.5);
    }
    for (let i = 0; i < 6; i++) {
      this.pushScenery(this.rng() * PANEL_W, -200 + this.rng() * 2600, BANK.cloud1, 0.55, 2, 0.7);
    }
    for (let i = 0; i < 4; i++) {
      this.pushScenery(this.rng() * PANEL_W, -200 + this.rng() * 2600, BANK.cloud0, 0.85, 2, 0.85);
    }
    for (let i = 0; i < 4; i++) {
      const s = this.pushScenery(30 + this.rng() * (PANEL_W - 130), -100 + i * 230, i % 2 ? BANK.carrier : BANK.island, 1, 1, 1);
      void s;
    }
    w.wave = 1;
    w.waveName = "PHOSPHOR ACE";
    w.waveTag = "";
    w.palette = 0;
    w.scrollMul = 1;
    w.score = 0;
  }

  /** Light autopilot so the attract screen shows the game actually playing. */
  private stepDemoAi(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.demoT += dt;
    if (this.demoT > 0.12) {
      this.demoT = 0;
      // Find the nearest threat and slide away from it.
      let best: number | null = null;
      let bestScore = 1e9;
      for (const b of w.bullets) {
        if (!b.on || b.side !== 1) continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dy < -20 || dy > 220) continue;
        const s = dx * dx * 1.4 + dy * dy;
        if (s < bestScore) {
          bestScore = s;
          best = b.x;
        }
      }
      let tx = p.tx;
      if (best !== null && bestScore < 9000) {
        tx = best > p.x ? p.x - 70 : p.x + 70;
      } else {
        tx = p.x + Math.sin(w.time * 0.7) * 40;
      }
      this.demoTargetX = clamp(tx, BOUNDS.left + 14, BOUNDS.right - 14);
      this.demoTargetY = BOUNDS.bottom - 90 + Math.sin(w.time * 0.9) * 30;
    }
    p.tx = this.demoTargetX;
    p.ty = this.demoTargetY;
    p.autoFire = 1;
  }

  /* ───────────────────────────────────────────────────────── accessors ── */

  get runStats(): RunStats {
    return this.stats;
  }
  get currentWave(): WaveDef {
    return this.waveDef;
  }
  get difficulty(): number {
    return this.diff;
  }
  get seedValue(): number {
    return this.seed;
  }
}

export { textColor, FIELD_W, FIELD_H, FIELD_X, FIELD_Y };
