import type { Enemy } from "./enemy";
import type { World } from "./world";
import { BOUNDS } from "./world";
import { F_COLUMN, F_PINCER, F_RUN, F_SINE, F_STRAFE, F_VEE_L, F_VEE_R } from "./spawn";
import { aimedShot, enemyShot, fanShot, mineDrop } from "./weapons";
import { clamp, lerp, TAU } from "./math";

/**
 * Enemy behaviour library. Each function steers one aircraft and pulls its
 * trigger; bosses have their own file. The design rule: every attack must be
 * readable — a telegraph, then the shot — so a death is always the pilot's read.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const TAU_ = TAU;

/** Rotate `cur` toward `target` by at most `maxStep`. */
function face(cur: number, target: number, maxStep: number): number {
  let d = (target - cur) % TAU_;
  if (d > Math.PI) d -= TAU_;
  if (d < -Math.PI) d += TAU_;
  if (d > maxStep) d = maxStep;
  if (d < -maxStep) d = -maxStep;
  return cur + d;
}

/** Standard formation flight: descend, hold a slot, weave if asked. */
function formationFlight(e: Enemy, w: World, dt: number): void {
  e.pathT += dt;
  const half = (e.formN - 1) / 2;
  const slot = e.formIdx - half;
  let gx = slot;
  let gy = 0;
  switch (e.formation) {
    case F_VEE_L:
      gx = slot;
      gy = -Math.abs(slot) * 0.85;
      break;
    case F_VEE_R:
      gx = -slot;
      gy = -Math.abs(slot) * 0.85;
      break;
    case F_SINE:
      gx = slot;
      gy = -Math.abs(slot) * 0.2;
      break;
    case F_PINCER:
      gx = (e.formIdx % 2 === 0 ? -1 : 1) * (Math.floor(e.formIdx / 2) + 0.5);
      gy = -Math.floor(e.formIdx / 4);
      break;
    default:
      gx = slot;
      gy = 0;
      break;
  }
  const sway = e.formation === F_SINE ? Math.sin(e.pathT * 2.4 + e.formIdx * 0.8) * 34 : 0;
  const targetX = clamp(
    e.formCx + gx * e.formCell * e.formGap + sway,
    BOUNDS.left + 14,
    BOUNDS.right - 14,
  );
  const targetY = e.formRow > 0 ? 120 + gy * 26 + e.formRow * 24 : -1;

  if (e.y < BOUNDS.top + 70) {
    // Entry: glide in toward the slot.
    const k = Math.min(1, 3.4 * dt);
    e.x += (targetX - e.x) * k;
    e.y += (e.speed - e.y * 0 - (e.speed - 0)) * 0 + e.speed * dt;
  } else if (targetY > 0) {
    // Hold station at a set altitude, oscillating gently.
    const k = Math.min(1, 2.6 * dt);
    e.x += (targetX - e.x) * k;
    e.y += (targetY + Math.sin(e.pathT * 1.1 + e.formIdx) * 14 - e.y) * k;
  } else {
    // Free descent once the flight has crossed in.
    const k = Math.min(1, 2.2 * dt);
    e.x += (targetX - e.x) * k;
    e.y += e.speed * dt;
  }
  e.entered = e.y > BOUNDS.top + 10 ? 1 : 0;
  e.a = face(e.a, clamp((targetX - e.x) * 0.02, -0.7, 0.7) + e.vx * 0.001, 4 * dt);
}

/* ────────────────────────────────────────────────────────── behaviours ── */

/** HORNET: textbook straight-down interceptor with a 3-round burst. */
function aiGrunt(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    formationFlight(e, w, dt);
    return;
  }
  e.y += e.speed * dt;
  e.x += Math.sin(w.time * 1.4 + e.sinPhase) * 14 * dt;
  e.a = face(e.a, Math.sin(w.time * 1.4 + e.sinPhase) * 0.2, 3 * dt);

  e.cool -= dt;
  if (e.cool <= 0 && e.entered === 1) {
    if (e.chargeKind === 2) {
      e.burst = 3;
      e.burstGap = 0.11;
    } else if (e.chargeKind === 3) {
      fanShot(w, e.x, e.y + e.r, 0.1, 3, 0.5, 250, { dmg: 1 });
      e.muzzle = 0.07;
    } else if (e.chargeKind === 1) {
      aimedShot(w, e.x, e.y + e.r * 0.7, w.player.x, w.player.y, 260, { lead: 0.16 });
      e.muzzle = 0.07;
    } else {
      enemyShot(w, e.x, e.y + e.r, 0, 250, { dmg: 1, r: 5 });
      e.muzzle = 0.07;
    }
    e.cool = 2.1 * e.diff + Math.random() * 0.9;
  }
  if (e.burst > 0) {
    e.burstGap -= dt;
    if (e.burstGap <= 0) {
      e.burstGap = 0.11;
      e.burst--;
      enemyShot(w, e.x, e.y + e.r, 0, 250, { dmg: 1, r: 5 });
      e.muzzle = 0.07;
      e.fired++;
    }
  }
}

/** VANDAL: sine-weaving, fires aimed shots at the lead position. */
function aiWeaver(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    formationFlight(e, w, dt);
    return;
  }
  e.freq = 2.3;
  e.x += Math.cos(w.time * e.freq + e.sinPhase) * 78 * dt * e.dir;
  e.y += e.speed * dt;
  e.a = face(e.a, Math.cos(w.time * e.freq + e.sinPhase) * 0.75 * e.dir, 5 * dt);
  e.x = clamp(e.x, BOUNDS.left + 10, BOUNDS.right - 10);

  e.cool -= dt;
  if (e.cool <= 0 && e.entered === 1) {
    aimedShot(w, e.x, e.y + e.r * 0.7, w.player.x, w.player.y, 268, { lead: 0.18 });
    e.cool = 1.5 * e.diff + Math.random() * 0.6;
    e.muzzle = 0.07;
    e.fired++;
  }
}

/** KITE: telegraphs a dive, then accelerates straight at the player. */
function aiDiver(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    formationFlight(e, w, dt);
    return;
  }
  e.x += Math.sin(w.time * 1.1 + e.sinPhase) * 20 * dt;
  e.y += e.speed * dt;

  if (e.dive > 0) {
    // Committed dive: home hard on the player.
    e.dive -= dt;
    const ang = Math.atan2(w.player.x - e.x, Math.max(12, w.player.y - e.y));
    e.a = face(e.a, ang, 5.2 * dt);
    e.vx = lerp(e.vx, Math.sin(ang) * 300, 4 * dt);
    e.vy = lerp(e.vy, Math.cos(ang) * 300, 4 * dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.tell = 0;
    if (e.dive <= 0) {
      e.x = clamp(e.x, BOUNDS.left + 10, BOUNDS.right - 10);
      e.vx = 0;
      e.vy = 0;
    }
  } else {
    e.tell = Math.max(0, e.tell - dt * 1.6);
    e.a = face(e.a, Math.sin(w.time * 1.1 + e.sinPhase) * 0.3, 3 * dt);
    e.cool -= dt;
    if (e.cool <= 0) {
      e.cool = 2.0 * e.diff + Math.random() * 0.8;
      e.dive = 1.5;
      e.tell = 1;
    }
  }
  if (e.tell > 0.05) {
    // Telegraph: one warning round straight down.
    e.fanCd -= dt;
    if (e.fanCd <= 0) {
      e.fanCd = 0.25;
      enemyShot(w, e.x, e.y + e.r, 0, 200, { dmg: 1 });
      e.muzzle = 0.07;
    }
  }
}

/** SPARKPLUG: pure ramming run, flashing as it closes. */
function aiKamikaze(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    e.y += e.speed * 0.5 * dt;
    e.x = lerp(e.x, e.formCx + (e.formIdx - (e.formN - 1) / 2) * e.formCell * e.formGap, 3 * dt);
    return;
  }
  e.ram = Math.min(1, e.ram + dt * 1.6);
  const ang = Math.atan2(w.player.x - e.x, Math.max(10, w.player.y - e.y));
  e.a = face(e.a, ang, 6 * dt);
  const boost = 1 + e.ram * 0.45;
  e.vx = lerp(e.vx, Math.sin(ang) * e.speed * boost, 5 * dt);
  e.vy = lerp(e.vy, Math.cos(ang) * e.speed * boost, 5 * dt);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.frame = Math.floor(w.time * 12) % 2;
}

/** MENDER: slow, drops magnetic mines, strafes to stay above the player. */
function aiMineLayer(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    formationFlight(e, w, dt);
    return;
  }
  e.y += e.speed * dt;
  e.x += Math.sin(w.time * 0.7 + e.sinPhase) * 26 * dt;
  e.a = face(e.a, Math.sin(w.time * 0.7 + e.sinPhase) * 0.28, 2.4 * dt);
  e.x = clamp(e.x, BOUNDS.left + 12, BOUNDS.right - 12);

  e.mineCd -= dt;
  if (e.mineCd <= 0) {
    e.mineCd = 2.1 * e.diff;
    mineDrop(w, e.x, e.y, 0, 26);
    mineDrop(w, e.x - 14, e.y, -18, 22);
    mineDrop(w, e.x + 14, e.y, 18, 22);
    e.muzzle = 0.1;
  }
  e.cool -= dt;
  if (e.cool <= 0) {
    e.cool = 2.6 * e.diff;
    fanShot(w, e.x, e.y + e.r, 0, 3, 0.5, 200, { dmg: 1 });
    e.muzzle = 0.09;
  }
}

/** FALCON (ace): strafes across, reverses, fires a tight aimed fan. */
function aiAce(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    e.y += e.speed * 0.45 * dt;
    e.x = lerp(e.x, e.formCx, 3 * dt);
    return;
  }
  // Strafe: sweep left/right at altitude, then a committed pass at the player.
  e.strafe += dt;
  if (e.lock <= 0) {
    e.lock = 2.2 + Math.random() * 1.4;
    e.dir = w.player.x < e.x ? 1 : -1;
  }
  e.lock -= dt;
  e.x += e.dir * 108 * dt;
  e.y += e.speed * 0.42 * dt;
  if (e.x < BOUNDS.left + 16) {
    e.x = BOUNDS.left + 16;
    e.dir = 1;
  }
  if (e.x > BOUNDS.right - 16) {
    e.x = BOUNDS.right - 16;
    e.dir = -1;
  }
  e.a = face(e.a, e.dir * 0.62, 4 * dt);
  e.frame = Math.floor(w.time * 14) % 2;

  e.cool -= dt;
  if (e.cool <= 0) {
    e.cool = 1.0 * e.diff;
    const ang = Math.atan2(w.player.x - e.x, Math.max(14, w.player.y - e.y));
    fanShot(w, e.x, e.y, ang, e.elite > 0 ? 3 : 2, 0.34, 330, { dmg: 1 });
    e.muzzle = 0.08;
    e.fired++;
  }
}

/**
 * BASTION (gunship): armoured mini-boss. Holds a slow patrol, opens one flank
 * at a time (only the open side takes damage), and walks a 5-round burst.
 */
function aiGunship(e: Enemy, w: World, dt: number): void {
  if (e.entered === 0) {
    e.y += e.speed * dt;
    e.x = lerp(e.x, e.formCx, 2.2 * dt);
    if (e.y > BOUNDS.top + 90) e.entered = 1;
    return;
  }
  // Slow horizontal patrol.
  e.x += e.dir * 26 * dt;
  if (e.x < BOUNDS.left + 34) {
    e.x = BOUNDS.left + 34;
    e.dir = 1;
  }
  if (e.x > BOUNDS.right - 34) {
    e.x = BOUNDS.right - 34;
    e.dir = -1;
  }
  e.y = lerp(e.y, BOUNDS.top + 118 + Math.sin(w.time * 0.8) * 12, 1.6 * dt);
  e.a = Math.sin(w.time * 0.5) * 0.08;

  // Telegraph the vent opening so the flank hit is always earned.
  e.tell = Math.max(0, e.tell - dt * 1.6);
  if (e.wing <= 0.45 && e.tell <= 0) {
    e.tell = 0.55;
    e.lastAngle = 1; // marker: arm the vent
  }

  // Flank cycle: vent the port wing, then the starboard wing.
  e.wing -= dt;
  if (e.wing <= 0) {
    e.wing = 2.6;
    e.exposedSide = e.exposedSide === 1 ? -1 : 1;
  }
  // The port/starboard vents must be within the flank the pilot is on.
  if (e.tell > 0) {
    e.exposedSide = e.exposedSide === 1 ? -1 : 1;
    e.wing = 2.6;
    e.tell = 0;
  }
  e.flank = e.exposedSide;

  e.cool -= dt;
  if (e.cool <= 0) {
    e.burst = 5;
    e.burstGap = 0;
    e.cool = 1.5 * e.diff;
  }
  if (e.burst > 0) {
    e.burstGap -= dt;
    if (e.burstGap <= 0) {
      e.burstGap = 0.13;
      e.burst--;
      const nose = e.y + e.r * 0.8;
      enemyShot(w, e.x, nose, 0, 250, { art: 0, dmg: 1, r: 6 });
      if (e.burst % 2 === 0) {
        aimedShot(w, e.x, nose, w.player.x, w.player.y, 230, { dmg: 1, r: 6, lead: 0.12 });
      }
      e.muzzle = 0.08;
      e.fired++;
    }
  }
}

/**
 * Shore battery: bolted to an island, tracks and leads the player. Deliberately
 * a pressure source rather than a wall — slow cadence, single shot, and it has
 * to survive the opening invulnerability window before it opens fire.
 */
function aiTurret(e: Enemy, w: World, dt: number): void {
  e.aim = Math.atan2(w.player.x - e.x, w.player.y - e.y);
  e.a = face(e.a, e.aim, 1.4 * dt);
  e.cool -= dt;
  if (e.cool <= 0 && e.entered === 1 && w.player.invuln <= 0) {
    e.cool = 1.9 * e.diff;
    aimedShot(w, e.x, e.y + e.r * 0.6, w.player.x, w.player.y, 250, { lead: 0.1 });
    e.muzzle = 0.1;
    e.fired++;
  }
}

/** Straight-line runner: crosses the field at speed without shooting. */
function aiRunner(e: Enemy, w: World, dt: number): void {
  if (e.formation === F_RUN || e.formation === F_STRAFE) {
    formationFlight(e, w, dt);
    return;
  }
  formationFlight(e, w, dt);
}

export function updateEnemyAi(e: Enemy, w: World, dt: number): void {
  switch (e.kind) {
    case "grunt":
      aiGrunt(e, w, dt);
      break;
    case "weaver":
      aiWeaver(e, w, dt);
      break;
    case "diver":
      aiDiver(e, w, dt);
      break;
    case "kamikaze":
      aiKamikaze(e, w, dt);
      break;
    case "mineLayer":
      aiMineLayer(e, w, dt);
      break;
    case "ace":
      aiAce(e, w, dt);
      break;
    case "gunship":
      aiGunship(e, w, dt);
      break;
    case "turret":
      aiTurret(e, w, dt);
      break;
    case "bossA":
    case "bossB":
      // Bosses run their own update in boss.ts.
      break;
    default:
      aiRunner(e, w, dt);
      break;
  }
}

export { face, formationFlight };
