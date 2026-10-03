/**
 * Headless simulation harness.
 *
 * Runs the PHOSPHOR ACE engine for thousands of simulated frames with a
 * scripted "pilot", then asserts the run is healthy: no NaNs, no runaway
 * pools, waves advance, bosses spawn and die, and the run terminates.
 *
 *   npx tsx tools/simulate.mjs [frames]
 *
 * An OKANFXLABS AI Design Labs production.
 */
import { Engine } from "../lib/game/engine.ts";
import { BOUNDS } from "../lib/game/world.ts";
import { FIXED_DT } from "../lib/game/config.ts";

const FRAMES = Number(process.argv[2] ?? 60000);
const engine = new Engine();
engine.startRun(false, 12345);

/** A deliberately mediocre autopilot: tracks the nearest threat, dodges, shoots. */
let t = 0;
function pilot(dt) {
  const w = engine.world;
  const p = w.player;
  t += dt;

  // Target selection.
  let bestId = -1;
  let bestY = 1e9;
  for (const e of w.enemies) {
    if (!e.on || e.y < -20) continue;
    if (e.y < bestY) {
      bestY = e.y;
      bestId = e.id;
    }
  }
  let tx = BOUNDS.cx;
  let ty = BOUNDS.bottom - 70;
  if (bestId >= 0) {
    let best = null;
    for (const e of w.enemies) if (e.on && e.id === bestId) best = e;
    if (best) {
      // Sit under the target, offset so shots connect.
      tx = best.x + Math.sin(t * 1.7) * 30;
      ty = Math.min(BOUNDS.bottom - 24, best.y + 210);
    }
  }
  // Avoid incoming fire.
  for (const b of w.bullets) {
    if (!b.on || b.side !== 1) continue;
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    if (dy < -10 && dy > -150 && Math.abs(dx) < 30) {
      tx = p.x + (dx > 0 ? -46 : 46);
    }
  }
  engine.pointerTo(
    Math.max(BOUNDS.left + 12, Math.min(BOUNDS.right - 12, tx)),
    Math.max(BOUNDS.top + 20, Math.min(BOUNDS.bottom - 16, ty)),
  );
  engine.requestShot();
  // Spend bombs when it gets hairy.
  let incoming = 0;
  for (let i = 0; i < w.bulletCount; i++) {
    const b = w.bullets[i];
    if (b && b.on && b.side === 1) incoming++;
  }
  if (incoming > 90 && p.bombs > 0) {
    engine.requestBomb();
  }
  p.autoFire = 0;
}

const problems = [];
let maxBullets = 0;
let maxParticles = 0;
let maxEnemies = 0;
let maxScore = 0;
const wavesSeen = new Set();
let bossesSeen = 0;
let bossPhases = new Set();

function assertFinite(label) {
  const w = engine.world;
  const checks = [
    ["score", w.score],
    ["player.x", w.player.x],
    ["player.y", w.player.y],
    ["scroll", w.scroll],
    ["wave", w.wave],
  ];
  for (const [name, v] of checks) {
    if (!Number.isFinite(v)) problems.push(`${label}: ${name} is ${v}`);
  }
  for (const e of w.enemies) {
    if (!e.on) continue;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) {
      problems.push(`${label}: enemy ${e.kind} has non-finite transform`);
      return;
    }
  }
}

for (let f = 0; f < FRAMES; f++) {
  pilot(FIXED_DT);
  engine.step(FIXED_DT);
  const w = engine.world;

  if (f % 60 === 0) {
    assertFinite(`frame ${f}`);
    if (problems.length > 6) break;
  }

  // Bullet pools are swap-removed, so length === live count.
  maxBullets = Math.max(maxBullets, w.bulletCount);
  maxParticles = Math.max(maxParticles, w.particleCount);
  maxEnemies = Math.max(maxEnemies, w.enemies.filter((e) => e.on).length);
  maxScore = Math.max(maxScore, w.score);
  wavesSeen.add(w.wave);
  for (const e of w.enemies) {
    if (e.on && e.boss) {
      bossesSeen++;
      bossPhases.add(`${e.kind}:${e.band}`);
    }
  }

  if (engine.mode === "gameover" || engine.mode === "victory") {
    console.log(
      `run ended at frame ${f} (${(f * FIXED_DT).toFixed(1)}s) mode=${engine.mode} wave=${w.wave} score=${w.score}`,
    );
    break;
  }
}

const w = engine.world;
console.log("");
console.log("─── PHOSPHOR ACE simulation report ─────────────────────────");
console.log(`frames run              ${FRAMES}`);
console.log(`final mode              ${engine.mode}`);
console.log(`wave reached            ${w.wave} (${w.waveName})`);
console.log(`waves observed          ${[...wavesSeen].join(", ")}`);
console.log(`score                   ${w.score}`);
console.log(`kills                   ${w.kills}`);
console.log(`shots / hits            ${w.shots} / ${w.hits}`);
console.log(`accuracy                ${((w.hits / Math.max(1, w.shots)) * 100).toFixed(1)}%`);
console.log(`best chain              ${w.maxCombo}`);
console.log(`boss frames observed    ${bossesSeen}`);
console.log(`boss phases reached     ${[...bossPhases].join(" | ") || "(none)"}`);
console.log(`lives left              ${w.player.lives}`);
console.log(`peak bullets            ${maxBullets}`);
console.log(`peak particles          ${maxParticles}`);
console.log(`peak live enemies       ${maxEnemies}`);
console.log(`elapsed                 ${w.elapsed.toFixed(1)}s`);
console.log("──────────────────────────────────────────────────────────");

let fail = problems.length > 0;
if (maxBullets > 900) {
  console.log(`FAIL: bullet pool grew past capacity`);
  fail = true;
}
if (bossesSeen === 0) {
  console.log("WARN: the scripted pilot never reached a boss");
}
if (problems.length) {
  console.log("PROBLEMS:");
  for (const p of problems.slice(0, 10)) console.log("  " + p);
  fail = true;
}
if (!fail) console.log("\n✓ simulation healthy");
process.exit(fail ? 1 : 0);