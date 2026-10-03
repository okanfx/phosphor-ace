/** Tiny PPM inspector: prints a region of tools/proof.ppm as ASCII. */
import { readFileSync } from "node:fs";

const [x0, y0, cw, chh, stepArg] = process.argv.slice(2);
const step = Number(stepArg ?? 1);
const d = readFileSync("tools/proof.ppm");
const marker = Buffer.from("255\n");
const i = d.indexOf(marker) + marker.length;
const hdr = d.subarray(0, i).toString().split(/\s+/).filter(Boolean);
const w = Number(hdr[1]);
const px = d.subarray(i);

const X = Number(x0 ?? 0);
const Y = Number(y0 ?? 0);
const CW = Number(cw ?? w);
const CH = Number(chh ?? 40);

for (let y = Y; y < Math.min(Y + CH, h_of(px)); y += step) {
  let line = "";
  for (let x = X; x < Math.min(X + CW, w); x += step) {
    const o = (y * w + x) * 3;
    const s = px[o] + px[o + 1] + px[o + 2];
    line += s < 25 ? " " : s > 560 ? "#" : s > 280 ? "+" : ":";
  }
  process.stdout.write(line + "\n");
}
function h_of() {
  return Number(hdr[2]);
}
