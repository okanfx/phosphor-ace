/**
 * Sprite proof-sheet. Renders every glyph map to a PPM using a pure-JS
 * rasteriser (no canvas needed), so silhouettes can be checked headlessly.
 *   npx tsx tools/preview.mjs   ->  tools/proof.ppm
 */
import { writeFileSync } from "node:fs";
import { SPRITES, BANK_OF } from "../lib/render/sprites.ts";

const PAL = {
  player: ["#3bffb0", "#2ea8ff", "#f2fff8", "#04180f"],
  grunt: ["#ff4d4d", "#ffb03a", "#fff0e0", "#2a0404"],
  weaver: ["#ff6bd6", "#ff9c3a", "#fff0f6", "#2a0420"],
  diver: ["#ffa03a", "#ff4d4d", "#fff6e6", "#2a1404"],
  mineLayer: ["#a07cff", "#ff4d4d", "#f6f0ff", "#140428"],
  kamikaze: ["#ff2f5e", "#ffd23a", "#fff0f4", "#28040f"],
  gunship: ["#ff8a3a", "#ffe14d", "#fff6e8", "#2a1204"],
  ace: ["#ff3a6a", "#ffffff", "#ffffff", "#280410"],
  turret: ["#9fb4c8", "#ff4d4d", "#e8f4ff", "#0c141c"],
  bossA: ["#8fa8c8", "#ff4d4d", "#e8f4ff", "#08101a"],
  bossB: ["#ffd24d", "#ff5a3a", "#fffce8", "#221603"],
  bulletP: ["#c8ffe8", "#3bffb0", "#ffffff", "#000000"],
  bulletE: ["#ffeeb0", "#ff5a3a", "#ffffff", "#000000"],
  pickupSpread: ["#3bffb0", "#ffffff", "#ffffff", "#04180f"],
  pickupShield: ["#2ea8ff", "#ffffff", "#ffffff", "#03101e"],
  pickupBomb: ["#ff9c3a", "#ffffff", "#ffffff", "#221403"],
  pickupLife: ["#ff4d8d", "#ffffff", "#ffffff", "#220412"],
  pickupCore: ["#7cff5a", "#ffffff", "#ffffff", "#041404"],
  pickupScore: ["#ffe14d", "#ffffff", "#ffffff", "#221a02"],
  mine: ["#ff4d4d", "#ffe14d", "#ffffff", "#220404"],
  ring: ["#ffb03a", "#ffffff", "#ffffff", "#000000"],
  cloud0: ["#4a6a8a", "#6a8aaa", "#c0d8f0", "#000000"],
  cloud1: ["#5a7a9a", "#7a9aba", "#c0d8f0", "#000000"],
  cloudFar: ["#2a4258", "#35506a", "#8098b0", "#000000"],
  explosion: ["#ffe14d", "#ff5a3a", "#ffffff", "#000000"],
  shield: ["#2ea8ff", "#a8e8ff", "#ffffff", "#000000"],
  flame: ["#3bffb0", "#ffe14d", "#ffffff", "#000000"],
  island: ["#2a3c4a", "#4a6a5a", "#7a9a8a", "#0a1014"],
  carrier: ["#3a4a5a", "#ff4d4d", "#c0d0e0", "#080e14"],
  wreck: ["#2a2a30", "#4a4a52", "#8a8a92", "#0a0a0c"],
  searchlight: ["#c8e8ff", "#8a6a3a", "#ffffff", "#101418"],
};
const BANK_PAL = {};
for (const [k, v] of Object.entries(BANK_OF)) BANK_PAL[v] = PAL[k] ?? ["#ffffff", "#ccc", "#fff", "#000"];

const DOT = {
  0: [0.16, 0], 1: [0.3, 0], 2: [0.45, 0], 3: [0.6, 0], 4: [0.74, 0],
  5: [0.86, 0], 6: [0.96, 0], 7: [1, 0], 8: [0.72, 2], 9: [0.55, 2],
  a: [0.78, 1], b: [0.62, 1], c: [0.48, 1], d: [0.34, 1], e: [0.22, 1], f: [0.12, 1],
  W: [1, 2], w: [0.8, 2], X: [0.5, 1], x: [0.3, 1], v: [0.5, 3], V: [0.75, 3],
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const items = [];
for (const [name, bank] of Object.entries(BANK_OF)) {
  for (const d of SPRITES.defs(bank)) {
    if (d.name !== name && !d.name.startsWith(name)) continue;
    if (!items.some((x) => x.name === d.name)) items.push(d);
  }
}

const PAD = 10, LABEL = 10, COLS = 6;
let cw = 0, ch = 0;
for (const d of items) {
  cw = Math.max(cw, Math.max(...d.rows.map((r) => r.length)) * (d.scale ?? 3));
  ch = Math.max(ch, d.rows.length * (d.scale ?? 3));
}
const rowsN = Math.ceil(items.length / COLS);
const W = COLS * (cw + PAD) + PAD;
const H = rowsN * (ch + PAD + LABEL) + PAD;
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) { px[i*3] = 8; px[i*3+1] = 10; px[i*3+2] = 14; }

items.forEach((d, idx) => {
  const sc = d.scale ?? 3;
  const cx = PAD + (idx % COLS) * (cw + PAD) + Math.floor((cw - Math.max(...d.rows.map(r=>r.length))*sc) / 2);
  const cy = PAD + Math.floor(idx / COLS) * (ch + PAD + LABEL);
  const pal = BANK_PAL[d.bank] ?? ["#fff", "#ccc", "#fff", "#000"];
  const rgb = pal.map(hex);
  d.rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const info = DOT[line[c]];
      if (!info) continue;
      const [a, pi] = info;
      const col = rgb[pi];
      for (let y = 0; y < sc; y++) for (let x = 0; x < sc; x++) {
        const tx = cx + c * sc + x, ty = cy + r * sc + y;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const o = (ty * W + tx) * 3;
        px[o] = Math.max(px[o], Math.round(col[0] * a));
        px[o+1] = Math.max(px[o+1], Math.round(col[1] * a));
        px[o+2] = Math.max(px[o+2], Math.round(col[2] * a));
      }
    }
  });
  console.log(`${String(idx).padStart(2)} ${d.name.padEnd(16)} ${d.rows.length}x${Math.max(...d.rows.map(r=>r.length))} @${cx},${cy}`);
});

writeFileSync("tools/proof.ppm", Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(px)]));
console.log(`\ntools/proof.ppm ${W}x${H}`);
