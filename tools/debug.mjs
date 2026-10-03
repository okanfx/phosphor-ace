import { Engine } from "../lib/game/engine.ts";
import { BOUNDS } from "../lib/game/world.ts";
import { FIXED_DT } from "../lib/game/config.ts";

const engine = new Engine();
engine.startRun(false, 999);
const w = engine.world;
let t = 0;
for (let f = 0; f < 60 * 400; f++) {
  const p = w.player;
  t += FIXED_DT;
  let bestId = -1, bestY = 1e9;
  for (const e of w.enemies) {
    if (!e.on || e.y < -20) continue;
    if (e.y < bestY) { bestY = e.y; bestId = e.id; }
  }
  let tx = BOUNDS.cx, ty = BOUNDS.bottom - 70;
  if (bestId >= 0) {
    for (const e of w.enemies) if (e.on && e.id === bestId) { tx = e.x; ty = Math.min(BOUNDS.bottom - 24, e.y + 210); }
  }
  // Threat avoidance: sidestep anything incoming.
  for (let i = 0; i < w.bulletCount; i++) {
    const b = w.bullets[i];
    if (!b || b.side !== 1) continue;
    const dx = b.x - p.x, dy = b.y - p.y;
    if (dy < -5 && dy > -170 && Math.abs(dx) < 26) tx = p.x + (dx > 0 ? -60 : 60);
  }
  engine.pointerTo(Math.max(BOUNDS.left+12, Math.min(BOUNDS.right-12, tx)), Math.max(BOUNDS.top+20, Math.min(BOUNDS.bottom-16, ty)));
  engine.requestShot();
  // Pop the bombs when swamped.
  let inc = 0;
  for (let i = 0; i < w.bulletCount; i++) { const b = w.bullets[i]; if (b && b.side === 1) inc++; }
  if (inc > 70 && p.bombs > 0) engine.requestBomb();
  engine.step(FIXED_DT);
  if (f % 600 === 0) {
    const live = w.enemies.filter(e => e.on && !e.boss && e.count > 0);
    const byKind = {};
    for (const e of live) byKind[e.kind] = (byKind[e.kind]||0)+1;
    console.log(`t=${(f/60).toFixed(0)}s wave=${w.wave} lives=${p.lives} bullets=${w.bulletCount} live=${live.length}`, JSON.stringify(byKind),
      live.slice(0,4).map(e=>`${e.kind}@${e.x|0},${e.y|0}(y>bot:${e.y>BOUNDS.bottom})`).join(" "));
  }
  if (engine.mode !== "playing") { console.log("END", engine.mode, f); break; }
}
