/** Validate that every glyph map in the sprite library is rectangular + legal. */
import { SPRITES } from "../lib/render/sprites.ts";

let bad = 0;
for (const d of SPRITES.allDefs()) {
  const lens = d.rows.map((r) => r.length);
  const min = Math.min(...lens);
  const max = Math.max(...lens);
  const badChars = d.rows
    .flatMap((r, i) => [...r].map((c, j) => ({ c, i, j })))
    .filter((p) => p.c !== "." && !/[0-9a-fWwXxVv]/.test(p.c));
  const ok = min === max && badChars.length === 0;
  if (!ok) bad++;
  console.log(
    `${ok ? "ok " : "BAD"} ${d.name.padEnd(16)} ${String(d.rows.length).padStart(2)}x${String(min).padStart(2)}-${String(max).padStart(2)}` +
      (badChars.length ? `  illegal: ${JSON.stringify(badChars.slice(0, 4))}` : ""),
  );
}
console.log(bad === 0 ? "\nAll glyph maps rectangular." : `\n${bad} BAD`);
