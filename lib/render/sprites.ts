import { BANK, SpriteBank, SPRITE_SCALE } from "./glyphmap";

/**
 * PHOSPHOR ACE sprite library — the entire art department.
 *
 * Every aircraft, weapon, pickup, cloud and explosion below is hand-authored
 * as a dot matrix. Nothing is a font glyph, nothing is a stock asset.
 *
 * Palette codes per dot:
 *   0-6  body ramp (dark rim -> hot)
 *   7-8  body near-white
 *   9    pure white (hottest core / canopy glass)
 *   a-e  secondary-colour ramp (wings, trim, glass, enemy markings)
 *   W/w  white flare (engine flame, muzzle flash, detonation)
 *   X/x  bloom-only halo — glows, never reads as a hard shape
 *   .    off
 *
 * 12x13 fighter grids. 26x28 capital-ship grids. F = 3 panel px per dot.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const pad = (rows: readonly string[]): readonly string[] => {
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  return rows.map((r) => r.padEnd(w, "."));
};

/* ══════════════════════════════════════════════════════ PLAYER AIRFRAME ══ */

/** AP-0 "WRAITH" — nose UP (the player flies at the bottom of the screen). */
const PLAYER = pad([
  ".....77.....",
  "....7887....",
  "....7997....",
  "...799997...",
  "..a7999997a.",
  ".aa7999997aa",
  "aaa7999997aaa",
  ".aa7888887aa.",
  "..aa788887aa.",
  "...77888877..",
  "....778877...",
  "....76..67...",
  "...WW..WW...",
]);

/** Focused silhouette: wings pulled in, engine bloom doubled. */
const PLAYER_FOCUS = pad([
  ".....77.....",
  "....7887....",
  "....7997....",
  "...799997...",
  "..a7999997a.",
  "..a7999997a.",
  "..a7888887a..",
  "..a7888887a..",
  "...7788877..",
  "....788887...",
  "....768867...",
  "....76..67...",
  "..WWX..XWW..",
]);

/* ═════════════════════════════════════════════════════════ ENEMY LINE ══ */

/** KESTREL FA-1 "HORNET" — the mass-market interceptor. Nose DOWN. */
const GRUNT = pad([
  "...99..99...",
  "...66..66...",
  "....6776....",
  "..aa7776aa..",
  ".aaaa776aaa.",
  "aaaa6777aaa.",
  ".aaa6776aa..",
  "..aa777776a.",
  "...7777776..",
  "....7887....",
  "....7887....",
  ".....77.....",
  "......6.....",
]);

/** KESTREL FV-2 "KITE" — forward-swept, dive fighter. */
const DIVER = pad([
  "....9..9....",
  "....6..6....",
  "...a77.77a..",
  "..a776.677a.",
  ".aa776.677aa",
  "aa7760.0677aa",
  ".aa760..06aa.",
  "..a76.677a..",
  "...a7777a...",
  "....7887....",
  "....7887....",
  ".....77.....",
  "......6.....",
]);

/** KESTREL FW-3 "VANDAL" — raked wings, twin tail, weaves like a snake. */
const WEAVER = pad([
  "..a....a....",
  "..a.77.77.a.",
  "..a7767677a.",
  ".a7766.6677a",
  "a7760...0677a",
  "a760.777.067a",
  ".a.777777.7a",
  "...67776776..",
  "..677667776..",
  "..677777776..",
  "....788787...",
  "....788787...",
  ".....77.77...",
  ".....6...6...",
]);

/** KESTREL XB-9 "MENDER" — minelayer. Fat, slow, armoured. */
const MINELAYER = pad([
  "..a......a..",
  ".aa..99..aa.",
  ".aa.66.66.aa",
  "aab.6776.baa",
  "aab6776676baa",
  "abb6776677bba",
  "abb7676677bba",
  "abb7766677bba",
  ".bb7766677bb.",
  ".b67777777b..",
  "..677777776..",
  "....7887.87..",
  "....78.7.78..",
  "...99...99...",
]);

/** Kestrel "SPARKPLUG" — expendable ramming drone. All speed, no guns. */
const KAMIKAZE = pad([
  "......aa.....",
  ".....a77a....",
  "....a7767a...",
  "...a776677a..",
  "..a7766677a..",
  "..a7660667a..",
  ".a76.0990.7a.",
  ".a7.099990.7a",
  "..a.099990.a.",
  "...a07667a...",
  "....a767a....",
  ".....a7a.....",
  "......aa.....",
  ".............",
]);

/** Elite ace "FALCON" — swept wings, twin tails, alternate engine flare. */
const ACE_A = pad([
  "a.........a..",
  "aa.7....7.aa.",
  "a776.77.677a.",
  "a7667766677a.",
  ".7667766776..",
  ".7667.7766...",
  "..677.7776...",
  "..67..7777...",
  "...6.77777...",
  "....788878...",
  "....788878...",
  ".....77.77...",
  ".....6...6...",
  "...99...99...",
]);

const ACE_B = pad([
  "a.........a..",
  "aa.7....7.aa.",
  "a776.77.677a.",
  "a7667766677a.",
  ".7667766776..",
  ".7667.7766...",
  "..677.7776...",
  "..67..7777...",
  "...6.77777...",
  "....788878...",
  "....788878...",
  ".....77.77...",
  ".....6...6...",
  "..99X...X99..",
]);

/* ═══════════════════════════════════════════════════════ HEAVY ENEMIES ══ */

/** KESTREL TB-4 "BASTION" — armoured gunship. 20x18. One flank vents at a
 *  time; you can only hurt it through the open side. */
const GUNSHIP = pad([
  "....a..........a....",
  "....aa.7....7.aa....",
  "...aab776.677baa...",
  "..aabb7766777bbaa..",
  ".aabbb76667767bbbaa.",
  "aabbbb.766667.bbbbaa",
  "aabbb..7777777..bbbaa",
  ".aab.77766766777.bba.",
  "..a.77666.66.66777a..",
  "..a.77660.06.66777a..",
  "..a.77666.66.66777a..",
  "...b.77660.06.677b...",
  "...bb.77666.66.77bb..",
  "....bb.0909090.bbb...",
  "....bbb.09090.bbbb..",
  ".....bbb09090bbbb...",
  "......bbb.09.bbbb....",
  ".......bb...bbbb.....",
]);

/** Shore battery — a dot-matrix emplacement welded to a sand spit. */
const TURRET = pad([
  "......aaaa......",
  ".....abbbba.....",
  "....abb.0bba....",
  "...abbba0abbba..",
  "..abbba000abbba.",
  ".abbba.aaa.abbba",
  ".abbb.0aaa0.bbba",
  ".abb.0aaaaa0.bba",
  ".ab.0aabbaaa0.ba",
  ".0b.0aabbbbaa0.b0",
  "..b.0aabbbbaa0.b.",
  "..0.0aabbbbaa0.0.",
  "..00.0aabbaa0.00",
  "..00.0aaaaa0.00.",
  "...00.00000.00..",
  "....000000000...",
]);

/* ══════════════════════════════════════════════════════════ CAPITAL SHIP ══ */

/** BOSS 1 — STORMWELL. Dreadnought class. 26x24. Nose DOWN (facing the player).
 *  Armour: front glacis plate. Weak point: the four condenser vents that cycle
 *  open across the hull. Core opens only during phase 3. */
const BOSS_A = pad([
  "00000000000000000000000000",
  "07777777777777777777777770",
  "07666666666666666666666660",
  "07600000000000000000000060",
  "0760aa000bb000cc0000aa0060",
  "0760aa000bb000cc0000aa0060",
  "07660000000000000000000060",
  "0a666666666666666666666660",
  "0aa666666666666666666666aa0",
  "0a7666666666666666666666a0".slice(0, 26),
  "07666666666666666666666660",
  "07600000000000000000000060",
  "07600aa0000bb00cc000aa0060".slice(0, 26),
  "07600aa0000bb00cc000aa0060".slice(0, 26),
  "07660000000000000000000060",
  "07666666666666666666666660",
  "07777777777777777777777770",
  "0007777777777777777777700",
  "0aa.7bbbbbbbbbbbbbbb7.aa00",
  "0aa.7bbbb.0909090.bbbb.aa0".slice(0, 26),
  "0.7.7bb..09090909090..bb.70".slice(0, 26),
  ".7..7b.090909090909090.b.7.".slice(0, 26),
  "09..7b.090909090909090.b.90",
  "..7..b.0909090909090.b...7..",
  "....0.0909090909090.0......",
  "......090909090909090.......",
]);

/** BOSS 2 — HELIOS PRIME. Orbital Citadel. 26x24. Solar-sail prongs.
 *  Armour: the sail itself. Weak point: the exposed reactor eye, which tracks
 *  the player. Phase 3 cracks the sail open. */
const BOSS_B = pad([
  "aaaa0aaaaaaaaaaaaaa0aaaaaaaa0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a00000a999999999990a999999a0".slice(0, 26),
  "aaaa0aa999999999990a999999a0".slice(0, 26),
  ".a.0aaa00000000000a000000a0.".slice(0, 26),
  ".a.0.aa9999999999aa99999aa0.".slice(0, 26),
  ".a.0.aa999999999999aa9999a0.".slice(0, 26),
  ".a.0.aa999999999999aa9999a0.".slice(0, 26),
  ".a.0.aa999999999999aa9999a0.".slice(0, 26),
  ".a.0.aa999999999999aa9999a0.".slice(0, 26),
  ".a.0.aa99999999999aa99999aa0.".slice(0, 26),
  ".a.0aaa00000000000a000000a0.".slice(0, 26),
  "aaaa0aa999999999990a999999a0".slice(0, 26),
  "a00000a999999999990a999999a0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a99990a999999999990a999999a0".slice(0, 26),
  "a9999.0999999999990.9999999a0".slice(0, 26),
  "a999.0.0aaaaaaaaa0.0.9999999a".slice(0, 26),
  "a99..0...0a.0.a.0...0..99999a".slice(0, 26),
  "a9..0.....0.0.0.....0..99999a".slice(0, 26),
  "0a..0......0.0.0......0..999a0".slice(0, 26),
  "..0..0...9..0.0..9...0..0..a0".slice(0, 26),
  "......0..99..0.0..99..0......",
]);

/* ═══════════════════════════════════════════════════════════ ORDNANCE ══ */

const BULLET_P = pad([
  "....0....",
  "....0....",
  "...0W0...",
  "...080...",
  "..07790..",
  "..07790..",
  "..07790..",
  "..07790..",
  "..07790..",
  "..07790..",
  "...080...",
  "...0W0...",
  "....0....",
]);

const BULLET_P_BIG = pad([
  ".....00.....",
  ".....00.....",
  "....0WW0....",
  "....0990....",
  "...099990...",
  "...099990...",
  "...099990...",
  "...099990...",
  "...099990...",
  "...099990...",
  "....0990....",
  "....0WW0....",
  ".....00.....",
]);

const BULLET_E = pad([
  "....0....",
  "...000...",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "..0a8a0..",
  "...000...",
]);

const BULLET_BIG = pad([
  "...00000...",
  "..0aaaaa0..",
  ".0a99999a0.",
  "0a9988889a0",
  "099888888890",
  "099888888890",
  "099888888890",
  "099888888890",
  "099888888890",
  "0a9988889a0",
  ".0a99999a0.",
  "..0aaaaa0..",
  "...00000...",
]);

/** Eraser round — the player's counter-fire. Destroys enemy bullets. */
const BULLET_ERASER = pad([
  "........",
  "..0..0..",
  ".0aa0aa0",
  "0a99999a0".slice(0, 8),
  "0a99999a0".slice(0, 8),
  "0a99999a0".slice(0, 8),
  ".0aa0aa0",
  "..0..0..",
]);

/* ═════════════════════════════════════════════════════════════ PICKUPS ══ */

/** SPREAD pod — a 3-way barrel cluster. */
const PK_SPREAD = pad([
  "..0..0..0..",
  ".0.0.0.0.0.",
  "0aa0.0.0aa0",
  "077.099.770",
  "077.099.770",
  "077.099.770",
  "07.0999 90.7".replace(" ", "9"),
  "07.0aaa0.70",
  "077.0.0.770",
  "077.0.0.770",
  ".0aa0.0aa0.",
  "..0..0..0..",
]);

/** SHIELD cell — a ring generator. */
const PK_SHIELD = pad([
  "...0000...",
  "..077770..",
  ".07777770.",
  "077.0.0770",
  "07..0.0..70",
  "07..0.0..70",
  "077.0.0770",
  ".07777770.",
  "..077770..",
  "...0000...",
]);

/** BOMB — a finned canister. */
const PK_BOMB = pad([
  "....00....",
  "...0W0....",
  "..0aaa0...",
  "..0a0a0...",
  ".0aaaaa0..",
  "0a00000a0.",
  "0a0aaa0a0.",
  "0a0aaa0a0.",
  "0a0aaa0a0.",
  ".0a00000a0",
  "..0aaaaa..",
  "...0aaa0..",
]);

/** SPARE AIRFRAME. */
const PK_LIFE = pad([
  "..000000..",
  ".07777770.",
  "077.0.0770",
  "07..7.7..70",
  "07.77777.70",
  "0777777770",
  "077.7.7.770",
  "07..777..70",
  "07.77777.70",
  "077.0.0.770",
  ".07777770.",
  "..000000..",
]);

/** REACTOR CELL — a spinning green core that feeds the super meter. */
const PK_CORE = pad([
  "....00....",
  "...0aa0...",
  "..0a00a0..",
  ".0a0..0a0.",
  "0a0.00.0a0",
  "0a.0999.a0",
  "0a.0999.a0",
  "0a.0999.a0",
  "0a0.00.0a0",
  ".0a0..0a0.",
  "..0a00a0..",
  "...0aa0...",
]);

/** SCORE token. */
const PK_SCORE = pad([
  "....00....",
  "...0aa0...",
  "..0aaaa0..",
  "..0a00a0..",
  "..0a00a0..",
  "..0a00a0..",
  "..0a00a0..",
  "..0a00a0..",
  "...0aa0...",
  "....00....",
]);

const MINE = pad([
  "...0.0.0...",
  "0..0.0.0..0",
  "..0.a.a.0..",
  ".0.a000a0..",
  "0a0.0.0.0a0",
  "0a0.a0a.0a0",
  "0a0.a0a.0a0",
  "0a0.a0a.0a0",
  "0a0.0.0.0a0",
  ".0.a000a0..",
  "..0.a.a.0..",
  "0..0.0.0..0",
  "...0.0.0...",
]);

/* ══════════════════════════════════════════════════════════════ SCENERY ══ */

const CLOUD_NEAR = pad([
  "....00000000...............",
  "...0888888880..............",
  "..0888aaaaaa880............",
  ".0888aaaaaaaaaa880..........",
  "0888aaaaabbaaaaaa880.......",
  "0888aaabbbbbbbbaaaa880.....",
  "0888aaabbbbbbbbbbaaaa88....",
  "0888aabbbbbbbbbbbbbbaa8....",
  "0.8aabbbbbbbbbbbbbbbbb8a...",
  "0.8aabbbbbbbbbbbbbbbbbaa...",
  ".0aabbbbbbbbbbbbbbbbbbaa..",
  "..0aabbbbbbbbbbbbbbbbaa...",
  "..00aabbbbbbbbbbbbbbaa0...",
  "...00aabbbbbbbbbbbbaa00...",
  "....00aaaaaaaaaaaaaa00....",
  "......0000000000000.......",
]);

const CLOUD_MID = pad([
  "..............00000000....",
  "............00888888880...",
  "..........0088aaaaaaaaa80..",
  "........0088aaaaaaaaaaa80..",
  "......0088aaaabbbbaaaaa0...",
  "....0088aaabbbbbbbbbaa0...",
  "..0088aaabbbbbbbbbbbbaa0..",
  ".088aaabbbbbbbbbbbbbbaa0..",
  "088aabbbbbbbbbbbbbbbbbba0.",
  "08aabbbbbbbbbbbbbbbbbbaa0.",
  "0aabbbbbbbbbbbbbbbbbbbba0.",
  "0aabbbbbbbbbbbbbbbbbbbaa0.",
  ".0aabbbbbbbbbbbbbbbbaaa0..",
  "..00aabbbbbbbbbbbbbaaa0...",
  "...00aaaaaaaaaaaaaaa00....",
  ".....000000000000000.....",
]);

const CLOUD_FAR = pad([
  "................................",
  "..........00000000..............",
  ".......008888888880.............",
  ".....0088aaaaaaaaaa880..........",
  "...0088aaaabbbbbaaaaaa80........",
  "..088aaabbbbbbbbbaaaaaaa80......",
  ".088aabbbbbbbbbbbbbbbbbbaa80....",
  "088aabbbbbbbbbbbbbbbbbbbbbaa0...",
  "08aabbbbbbbbbbbbbbbbbbbbbbaa0..",
  "0aabbbbbbbbbbbbbbbbbbbbbbbba0..",
  "0aabbbbbbbbbbbbbbbbbbbbbbbaa0..",
  ".0aabbbbbbbbbbbbbbbbbbbbaaa0...",
  "..00aabbbbbbbbbbbbbbbbbbaaa0....",
  "...00aabbbbbbbbbbbbbbbbaaa0....",
  ".....00aaaaaaaaaaaaaaa00.......",
  ".......00000000000000..........",
]);

/** Island, lit side. 22x18. */
const ISLAND = pad([
  "..........000000..........",
  "........00aaaaaa00........",
  ".......0aabbbbbbaa0.......",
  "...00..0abbbbbbbbbaa0..00.",
  "..0aa0.0abbbccbbbbbaa0ab0.",
  ".0abba00abbbccddddbbbaabb0",
  ".abbba.0abbbccdddccbbbaab0",
  ".0abba0aabbbccddddccbbbaa0",
  "..0aabbaaabbccddddccbbaa00",
  "...0aabbbaaabccddccbaa00..",
  "....0aabbbbbaabccbaa00...",
  ".....0aaaabbbbaabbaa00....",
  "......000aabbbbaaab000...",
  "........0aaabbbbaaba0....",
  ".........00aabbbbaa00....",
  "...........00000000.......",
]);

/** Island, shadowed. */
const ISLAND_DARK = pad([
  "..........000000..........",
  "........00aaaaaa00........",
  ".......0aabbbbbbaa0.......",
  "...00..0abbbbbbbbbaa0..00.",
  "..0aa0.0abbbccbbbbbaa0ab0.",
  ".0abba00abbbccddddbbbaabb0",
  ".abbba.0abbbccdddccbbbaab0",
  ".0abba0aabbbccddddccbbbaa0",
  "..0aabbaaabbccddddccbbaa00",
  "...0aabbbaaabccddccbaa00..",
  "....0aabbbbbaabccbaa00...",
  ".....0aaaabbbbaabbaa00....",
  "......000aabbbbaaab000...",
  "........0aaabbbbaaba0....",
  ".........00aabbbbaa00....",
  "...........00000000.......",
]);

/** A burning carrier hull, seen from above, 20x22. */
const CARRIER = pad([
  "........00000000........",
  ".......0777777770.......",
  "......076666666670......",
  ".....0766666666670.....",
  "....076666000006670....",
  "...076660aabbcc06670...",
  "...07660aabbcccc06670..",
  "...07660abcccccc06670..",
  "...076660aabbcc066670...",
  "...0766660000066670....",
  "....076666666666670.....",
  ".....0766666666670......",
  "......07777777770.......",
  ".......00077777000......",
  "....000..0W0W0W0..000...",
  "...0W0W0.0W0W0W0.0W0W0..",
  "..0W0W0W0W0W0W0W0W0W0W0.",
  "..0W0W0W0W0W0W0W0W0W0W0.",
  "..0W0W0W0W0W0W0W0W0W0W0.",
  "...0W0W0W0W0W0W0W0W0W0..",
  "....0W0W0.0W0W0W0.0W0W0.",
  "..........0W0.0W0........",
]);

/** Searchlight sweep, 16x20. A fan of light raking the water. */
const SEARCHLIGHT = pad([
  "......0..0..0..0..",
  ".....0..0..0..0...",
  "....0..0..0..0....",
  "...0..0..0..0.....",
  "..0..0..0..0......",
  ".0..0..0..0.......",
  "0..0..0..0.........",
  "0..0..0............",
  "0..0..0............",
  "0..0..0............",
  ".0..0..0...........",
  ".0..0..0...........",
  "..0..0..0..........",
  "..0..0..0..........",
  "...0..0..0.........",
  "...0..0..0.........",
  "....0..0..0........",
  "....0..0..0........",
  ".....00000.........",
  "......000..........",
]);

/** Wreck — a sinking hulk trailing smoke. 14x12. */
const WRECK = pad([
  "..0000000000..",
  ".07777777770.",
  "0766666666670",
  "077a0000a0770",
  "077.0aaa0.770",
  ".77.0a0a0.77.",
  "..00.000.00..",
  "...0777770...",
  "....0aa0a0...",
  "....0.0.0....",
  "..............",
  "..............",
]);

/* ═════════════════════════════════════════════════════════════ EFFECTS ══ */

const RING = pad([
  "........00000000........",
  "......00aaaaaaaa00......",
  "....00aa000000aa00......".slice(0, 24),
  "...0aa0..0000..0aa0.....".slice(0, 24),
  "..0aa0....00....0aa0....".slice(0, 24),
  "..0a0....0a0a0....0a0...",
  ".0a0....0aaaaa0....0a0..",
  ".0a0...0a99999a0...0a0..",
  "0aa0..0a9999999a0..0aa0.",
  "0aa0.0a99999999a0.0aa0.",
  "0a00.0a99a000a99a0.00a0",
  "0a0..0a9a0..0a90a..0a0.",
  "0a0...09a0..0a90...0a0.",
  ".0a0..0a9a000a90a..0a0.",
  ".0a0...0a999999a0...0a0.",
  "0aa0...0a99999a0...0aa0.",
  "0aa0....0aaaaa0....0aa0.",
  ".0a0....0a0a0....0a0..",
  ".0a0....0...0....0a0..",
  "..0a0....0a0a0....0a0..",
  "..0aa0..0a0a0a0..0aa0..",
  "...0aa0.0a0..0a0.0aa0...",
  "....0aa00a0....a00aa0..",
  "......00aaaaaaaaaa00....",
  "........00000000........",
  "........................",
]);

const SHIELD_BUBBLE = pad([
  "......000000000000......",
  "....00aaaaaaaaaaaa00....",
  "...0aaa00000000aaa0....",
  "..0aa0..0aaaa0..0aa0...",
  ".0aa0...0a0a0a0...0aa0..",
  "0aa0..0a0000000a0..0aa0.",
  "0aa0.0a0a0aaa0a0a0.0aa0.",
  "0aa0.0a0a0aaa0a0a0.0aa0.",
  "0aa0.0a0aaa00aaa0a0.0aa0",
  ".0aa0.0a0a0a0a0a0.0aa0..",
  ".0aa0..0a0a0a0a0..0aa0..",
  "..0aa0..0a0a0a0..0aa0...",
  "..0aa0..0a0a0a0..0aa0...",
  "...0aa0..0a0a0..0aa0....",
  "...0aa0.0a0a0a0.0aa0....",
  "....0aa0.0a0a0.0aa0.....",
  "....0aa0.0a0a0.0aa0.....",
  ".....0aa0.0a0.0aa0......",
  "......0aa0.0.0aa0.......",
  "......0aa0...0aa0.......",
  ".......0aa0.0aa0........",
  "........0aa0aa0.........",
  ".........0aa0..........",
  "..........00...........",
  ".......................",
  ".......................",
]);

/** Detonation, core frame. 18x18. */
const BOOM_0 = pad([
  "..................",
  ".......0000.......",
  ".....00aaaa00.....",
  "...00aaaaaa9900...",
  "..0aa99999999900..",
  ".0a99999999999a0..",
  "0a99999999999W9a0.",
  "0a99999999999W9a0.",
  "0a9999999999WW99a0".slice(0, 18),
  "0a9999999999WW99a0".slice(0, 18),
  "0a99999999999W9a0.",
  "0a99999999999W9a0.",
  "0a99999999999W9a0",
  ".0a99999999999a0.",
  ".0a99999999999a0.",
  "..0aa99999999900.",
  "...00aaaaaaaa00...",
  ".....0000000.....",
]);

/** Detonation, shockwave frame. 18x18. */
const BOOM_1 = pad([
  "..................",
  "...0.........0...",
  "..0a0.......0a0..",
  "..0a00.....00a0..",
  "..0aa0.....0aa0..",
  "..0aa0.....0aa0..",
  "...0aa0...0aa0...",
  "....0aa0.0aa0....",
  ".....0aa0aa0.....",
  "......0aaa0......",
  ".......0a0.......",
  "......0aaa0......",
  ".....0aa0aa0.....",
  "....0aa0.0aa0....",
  "...0aa0...0aa0...",
  "..0aa0.....0aa0..",
  "..0a00.....00a0..",
  "...0.........0...",
]);

const FLAME = pad([
  "....00....",
  "...0aa0...",
  "...0aa0...",
  "..0a990a..",
  "..0a990a..",
  "..0a990a..",
  ".0a99990a.",
  ".0a99990a.",
  ".0a99W90a.",
  "0a99WW90a0",
  "0a9WWW90a0",
  "0a9WW090a0".slice(0, 10),
  "0a99900a0".slice(0, 10),
  ".0aa00a0.",
  ".0aa0a0.",
  "..0000..",
]);

/* ══════════════════════════════════════════════════════════════ EXPORTS ══ */

const F = SPRITE_SCALE;

export const SPRITES: SpriteBank = (() => {
  const b = new SpriteBank();
  b.add({ name: "player", bank: BANK.player, rows: PLAYER, scale: F, r: 7 });
  b.add({ name: "playerFocus", bank: BANK.player, rows: PLAYER_FOCUS, scale: F, r: 6 });
  b.add({ name: "grunt", bank: BANK.grunt, rows: GRUNT, scale: F, r: 10 });
  b.add({ name: "diver", bank: BANK.diver, rows: DIVER, scale: F, r: 10 });
  b.add({ name: "weaver", bank: BANK.weaver, rows: WEAVER, scale: F, r: 10 });
  b.add({ name: "mineLayer", bank: BANK.mineLayer, rows: MINELAYER, scale: F, r: 11 });
  b.add({ name: "kamikaze", bank: BANK.kamikaze, rows: KAMIKAZE, scale: F, r: 9 });
  b.add({ name: "ace0", bank: BANK.ace, rows: ACE_A, scale: F, r: 10 });
  b.add({ name: "ace1", bank: BANK.ace, rows: ACE_B, scale: F, r: 10 });
  b.add({ name: "gunship", bank: BANK.gunship, rows: GUNSHIP, scale: F, r: 22 });
  b.add({ name: "turret", bank: BANK.turret, rows: TURRET, scale: F, r: 14 });
  b.add({ name: "bossA", bank: BANK.bossA, rows: BOSS_A, scale: F * 2, r: 38 });
  b.add({ name: "bossB", bank: BANK.bossB, rows: BOSS_B, scale: F * 2, r: 38 });
  b.add({ name: "bulletP", bank: BANK.bulletP, rows: BULLET_P, scale: F, r: 5 });
  b.add({ name: "bulletPBig", bank: BANK.bulletP, rows: BULLET_P_BIG, scale: F, r: 6 });
  b.add({ name: "bulletE", bank: BANK.bulletE, rows: BULLET_E, scale: F, r: 5 });
  b.add({ name: "bulletBig", bank: BANK.bulletE, rows: BULLET_BIG, scale: F, r: 9 });
  b.add({ name: "bulletEraser", bank: BANK.bulletP, rows: BULLET_ERASER, scale: F, r: 6 });
  b.add({ name: "pkSpread", bank: BANK.pickupSpread, rows: PK_SPREAD, scale: F, r: 11 });
  b.add({ name: "pkShield", bank: BANK.pickupShield, rows: PK_SHIELD, scale: F, r: 11 });
  b.add({ name: "pkBomb", bank: BANK.pickupBomb, rows: PK_BOMB, scale: F, r: 11 });
  b.add({ name: "pkLife", bank: BANK.pickupLife, rows: PK_LIFE, scale: F, r: 11 });
  b.add({ name: "pkCore", bank: BANK.pickupCore, rows: PK_CORE, scale: F, r: 11 });
  b.add({ name: "pkScore", bank: BANK.pickupScore, rows: PK_SCORE, scale: F, r: 11 });
  b.add({ name: "mine", bank: BANK.mine, rows: MINE, scale: F, r: 9 });
  b.add({ name: "cloudNear", bank: BANK.cloud0, rows: CLOUD_NEAR, scale: F * 2, r: 0 });
  b.add({ name: "cloudMid", bank: BANK.cloud1, rows: CLOUD_MID, scale: F * 2, r: 0 });
  b.add({ name: "cloudFar", bank: BANK.cloudFar, rows: CLOUD_FAR, scale: F * 2, r: 0 });
  b.add({ name: "island", bank: BANK.island, rows: ISLAND, scale: F * 2, r: 0 });
  b.add({ name: "islandDark", bank: BANK.island, rows: ISLAND_DARK, scale: F * 2, r: 0 });
  b.add({ name: "carrier", bank: BANK.carrier, rows: CARRIER, scale: F * 2, r: 0 });
  b.add({ name: "wreck", bank: BANK.wreck, rows: WRECK, scale: F * 2, r: 0 });
  b.add({ name: "searchlight", bank: BANK.searchlight, rows: SEARCHLIGHT, scale: F * 2, r: 0 });
  b.add({ name: "ring", bank: BANK.ring, rows: RING, scale: F * 2, r: 0 });
  b.add({ name: "shield", bank: BANK.shield, rows: SHIELD_BUBBLE, scale: F * 2, r: 26 });
  b.add({ name: "boom0", bank: BANK.explosion, rows: BOOM_0, scale: F * 2, r: 0 });
  b.add({ name: "boom1", bank: BANK.explosion, rows: BOOM_1, scale: F * 2, r: 0 });
  b.add({ name: "flame", bank: BANK.flame, rows: FLAME, scale: F, r: 7 });
  return b;
})();

/** Convenience: name -> bank id, so the renderer can look up baked frames. */
export const BANK_OF: Record<string, number> = {
  player: BANK.player,
  grunt: BANK.grunt,
  diver: BANK.diver,
  weaver: BANK.weaver,
  kamikaze: BANK.kamikaze,
  gunship: BANK.gunship,
  ace: BANK.ace,
  mineLayer: BANK.mineLayer,
  turret: BANK.turret,
  bossA: BANK.bossA,
  bossB: BANK.bossB,
  bulletP: BANK.bulletP,
  bulletE: BANK.bulletE,
  bulletEraser: BANK.bulletP,
  pickupSpread: BANK.pickupSpread,
  pickupShield: BANK.pickupShield,
  pickupBomb: BANK.pickupBomb,
  pickupLife: BANK.pickupLife,
  pickupCore: BANK.pickupCore,
  pickupScore: BANK.pickupScore,
  mine: BANK.mine,
  cloudNear: BANK.cloud0,
  cloudMid: BANK.cloud1,
  cloudFar: BANK.cloudFar,
  island: BANK.island,
  carrier: BANK.carrier,
  wreck: BANK.wreck,
  searchlight: BANK.searchlight,
  ring: BANK.ring,
  shield: BANK.shield,
  explosion: BANK.explosion,
  flame: BANK.flame,
};
