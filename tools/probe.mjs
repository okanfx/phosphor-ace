/**
 * Gameplay probe: runs a competent scripted pilot through the campaign and
 * reports how far it gets, which bosses it meets, and how long each phase lasts.
 *
 *   npx tsx tools/probe.mjs [frames] [seed] [endless]
 *
 * An OKANFXLABS AI Design Labs production.
 */
import { Engine } from "../lib/game/engine.ts";
import { BOUNDS } from "../lib/game/world.ts";
import { FIXED_DT } from "../lib/game/config.ts";

const FRAMES = Number(process.argv[2] ?? 60 * 60 * 12);
const SEED = Number(process.argv[3] ?? 4242);
const ENDLESS = process.argv[4] === "endless";
const GOD = process.argv[5] === "god";

const engine = new Engine();
engine.startRun(ENDLESS, SEED);
const w = engine.world;

/** Threat field: where will each enemy round be in `horizon` seconds? */
function danger(horizon) {
  const field = new Float64Array(24);
  for (let i = 0; i < w.bulletCount; i++) {
    const b = w.bullets[i];
    if (!b || b.side !== 1) continue;
    const px = b.x + b.vx * horizon;
    const py = b.y + b.vy * horizon;
    const slot = Math.floor(((px - BOUNDS.left) / BOUNDS.width) * 24);
    if (slot < 0 || slot >= 24) continue;
    // Only count rounds that will actually reach the player's band.
    if (py < BOUNDS.top + 30 || py > BOUNDS.bottom) continue;
    const prox = Math.max(0, 1 - Math.abs(py - w.player.y) / 260);
    field[slot] += 1 + prox * 3;
  }
  return field;
}

let t = 0;
let deaths = 0;
const log = [];
const bossLog = new Map();

function pilot(dt) {
  const p = w.player;
  t += dt;

  // 1. Where do I want to be? Chase the highest-value target, else sit low.
  let target = null;
  let bestScore = -1e9;
  for (const e of w.enemies) {
    if (!e.on) continue;
    const dy = w.player.y - e.y;
    if (dy < 40 || dy > 330) continue;
    let s = 300 - dy;
    if (e.boss) s += 400;
    if (e.armored > 0) s += 120;
    if (e.kind === "turret") s += 90;
    if (e.kind === "gunship" || e.kind === "ace") s += 60;
    s -= Math.abs(e.x - BOUNDS.cx) * 0.25;
    if (s > bestScore) {
      bestScore = s;
      target = e;
    }
  }
  let tx = target ? target.x : BOUNDS.cx + Math.sin(t * 0.6) * 60;
  let ty = target
    ? Math.min(BOUNDS.bottom - 22, Math.max(BOUNDS.bottom - 150, target.y + 230))
    : BOUNDS.bottom - 80;

  // 2. Grab anything worth grabbing.
  for (const k of w.pickups) {
    if (!k.on) continue;
    if (k.y > w.player.y - 60) continue;
    if (Math.hypot(k.x - p.x, k.y - p.y) < 120) {
      tx = k.x;
      ty = Math.min(BOUNDS.bottom - 20, k.y + 70);
    }
  }

  // 3. Dodge: sample the threat field and walk toward the calmest column.
  const field = danger(0.22);
  const slot = Math.max(0, Math.min(23, Math.floor(((p.x - BOUNDS.left) / BOUNDS.width) * 24)));
  let bestSlot = slot;
  let bestCost = Infinity;
  for (let d = -5; d <= 5; d++) {
    const s = slot + d;
    if (s < 1 || s > 22) continue;
    const cost = field[s] + Math.abs(d) * 0.6;
    if (cost < bestCost) {
      bestCost = cost;
      bestSlot = s;
    }
  }
  const laneX = BOUNDS.left + ((bestSlot + 0.5) / 24) * BOUNDS.width;
  if (field[slot] > 0.4) tx = tx * 0.35 + laneX * 0.65;

  // 4. Stay off the top of the screen.
  ty = Math.max(ty, BOUNDS.top + 90);

  if (GOD) {
    // Invulnerable pilot: only used to verify the campaign's progression gate
    // and the boss encounters end-to-end.
    p.invuln = 5;
    p.lives = 99;
  }
  engine.pointerTo(
    Math.max(BOUNDS.left + 11, Math.min(BOUNDS.right - 11, tx)),
    Math.max(BOUNDS.top + 30, Math.min(BOUNDS.bottom - 14, ty)),
  );
  engine.requestShot();
  p.autoFire = 0;

  // 5. Bombs when swamped or when a capital ship is up.
  let inc = 0;
  for (let i = 0; i < w.bulletCount; i++) {
    const b = w.bullets[i];
    if (b && b.side === 1) inc++;
  }
  if (p.bombs > 0 && (inc > 80 || (target && target.boss && inc > 40))) engine.requestBomb();
}

let prevLives = w.player.lives;
let maxBullet = 0;
let maxParticle = 0;
let maxEnemies = 0;
let nan = 0;
const detail = [];

for (let f = 0; f < FRAMES; f++) {
  pilot(FIXED_DT);
  engine.step(FIXED_DT);

  if (f % 120 === 0) {
    if (!Number.isFinite(w.score) || !Number.isFinite(w.player.x) || !Number.isFinite(w.player.y)) nan++;
    for (const e of w.enemies) {
      if (e.on && (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp))) {
        nan++;
        break;
      }
    }
  }

  if (w.player.lives < prevLives) {
    deaths++;
    const near = w.enemies
      .filter((e) => e.on && Math.hypot(e.x - w.player.x, e.y - w.player.y) < 260)
      .map((e) => `${e.kind}@${e.x | 0},${e.y | 0}`)
      .join(" ");
    log.push(
      `  ✖ death ${deaths} t=${t.toFixed(1)}s wave ${w.wave} lives ${w.player.lives} ` +
        `w${w.player.weapon} pwr ${w.player.power} invuln ${w.player.invuln.toFixed(1)} | ${near}`,
    );
    prevLives = w.player.lives;
  }

  for (const e of w.enemies) {
    if (e.on && e.boss) {
      const key = `${e.kind}`;
      const cur = bossLog.get(key) ?? { frames: 0, phases: new Set(), bands: new Set(), byPattern: {}, byBand: {} };
      cur.byPattern[e.pattern] = (cur.byPattern[e.pattern] ?? 0) + 1;
      const bk = `${e.kind}:${e.band}`;
      cur.byBand[bk] = (cur.byBand[bk] ?? 0) + 1;
      cur.frames++;
      cur.phases.add(e.pattern);
      cur.bands.add(e.band);
      bossLog.set(key, cur);
    }
  }

  maxBullet = Math.max(maxBullet, w.bulletCount);
  maxParticle = Math.max(maxParticle, w.particleCount);
  maxEnemies = Math.max(maxEnemies, w.enemies.filter((e) => e.on).length);

  if (f % (60 * 30) === 0 && f > 0) {
    const bossNow = w.enemies.find((e) => e.on && e.boss);
    log.push(
      `  · t=${t.toFixed(0)}s wave ${w.wave} "${w.waveName}" lives ${w.player.lives} ` +
        `w${w.player.weapon} pwr ${w.player.power} score ${w.score} bullets ${w.bulletCount}` +
        (bossNow
          ? ` | BOSS ${bossNow.kind} hp ${bossNow.hp.toFixed(0)}/${bossNow.hpMax} band ${bossNow.band} pat ${bossNow.pattern} "${bossNow.label}"`
          : ""),
    );
  }

  if (engine.mode === "gameover" || engine.mode === "victory") {
    log.push(`  ■ run ended t=${t.toFixed(1)}s mode=${engine.mode} wave ${w.wave} score ${w.score}`);
    break;
  }
}

console.log("");
console.log("═══ PHOSPHOR ACE gameplay probe ════════════════════════════");
for (const l of log) console.log(l);
console.log("────────────────────────────────────────────────────────────");
console.log(`seed                ${SEED} ${ENDLESS ? "(endless)" : "(campaign)"}`);
console.log(`outcome            ${engine.mode}`);
console.log(`time               ${t.toFixed(1)}s`);
console.log(`wave reached       ${w.wave} — ${w.waveName}`);
console.log(`deaths             ${deaths}`);
console.log(`lives left         ${w.player.lives}`);
console.log(`weapon tier        ${w.player.weapon}  power ${w.player.power}`);
console.log(`score              ${w.score}`);
console.log(`kills / shots      ${w.kills} / ${w.shots}`);
console.log(`accuracy           ${((w.hits / Math.max(1, w.shots)) * 100).toFixed(1)}%`);
console.log(`best chain         ${w.maxCombo}`);
console.log(`capital ships sunk ${engine.runStats.bosses}`);
console.log(`peak bullets       ${maxBullet}`);
console.log(`peak particles     ${maxParticle}`);
console.log(`peak enemies       ${maxEnemies}`);
console.log(`non-finite frames  ${nan}`);
for (const l of detail) console.log(l);
for (const [k, v] of bossLog) {
  console.log(
    `boss ${k.padEnd(8)}   ${(v.frames / 60).toFixed(1)}s engaged · patterns {${[...v.phases].sort().join(",")}} · bands {${[...v.bands].sort().join(",")}}`,
  );
}
console.log("════════════════════════════════════════════════════════════");
process.exit(nan > 0 ? 1 : 0);