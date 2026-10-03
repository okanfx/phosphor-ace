import type { Enemy } from "./enemy";
import type { World } from "./world";
import { BOUNDS } from "./world";
import { aimedShot, bossShell, enemyShot, fanShot, ringShot } from "./weapons";
import { clamp, lerp, TAU } from "./math";
import { spawnEnemy } from "./spawn";
import { updateEnemyAi } from "./ai";
import { dot, ring as fxRing, shake } from "./bossfx";

/**
 * Boss director.
 *
 * STORMWELL  — Dreadnought. Trades in readable geometry: telegraphed volleys,
 *              sweeping beams, a rotating wall of fire with one gap, and a
 *              spiral finale. Armour plates cycle open as weak points.
 * HELIOS PRIME — Orbital Citadel. Fast, evasive, punishes greed: homing mines,
 *              aimed sniper shots, a dual-counter-rotating spiral, and an
 *              enrage that halves every cooldown.
 *
 * Both use the same contract: `band` is the HP gate, `pt` is the timer inside
 * the current pattern, `pcd` the pause between patterns.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const PAT = {
  VOLLEY: 0,
  BEAM: 1,
  WALL: 2,
  SPIRAL: 3,
  SUMMON: 4,
  HOMING: 5,
  SNIPE: 6,
  DUAL: 7,
  RAGE: 8,
} as const;

function patternName(kind: string, p: number): string {
  if (kind === "bossA") {
    return (
      ["VOLLEY", "BEAM SWEEP", "FIRE WALL", "SPIRAL", "ESCORT SORTIE"][p] ?? "PATTERN"
    );
  }
  return (
    ["HOMING SWARM", "SNIPER", "DUAL SPIRAL", "VOLLEY", "RAGE"][p] ?? "PATTERN"
  );
}

export function updateBoss(e: Enemy, w: World, dt: number): void {
  e.t += dt;
  e.pt += dt;
  e.hover += dt;

  // ── entrance ───────────────────────────────────────────────────────────
  if (e.entered === 0) {
    e.intro += dt;
    e.y += e.speed * 1.15 * dt;
    e.x = lerp(e.x, BOUNDS.cx, 1.4 * dt);
    e.sc = lerp(e.sc, 1, 3 * dt);
    e.fade = Math.min(1, e.fade + dt * 2);
    e.label = "INBOUND";
    w.bossBar = 1;
    if (e.y >= BOUNDS.top + 96) {
      e.entered = 1;
      e.pt = 0;
      e.pcd = 0.6;
      w.bossIntro = 0;
    }
    return;
  }

  // ── hover motion ────────────────────────────────────────────────────────
  const drift = e.kind === "bossA" ? 42 : 62;
  e.x = clamp(e.x + Math.sin(e.hover * 0.62) * drift * dt, BOUNDS.left + 62, BOUNDS.right - 62);
  const baseY = BOUNDS.top + 96;
  e.y = lerp(e.y, baseY + Math.sin(e.hover * 0.9) * 10, 2.2 * dt);
  e.sc = 1;
  e.fade = 1;

  // ── band (phase) progression ────────────────────────────────────────────
  const frac = e.hp / e.hpMax;
  const band = frac < 0.32 ? 2 : frac < 0.66 ? 1 : 0;
  if (band !== e.band) {
    e.band = band;
    e.enrage = band;
    e.locked = 1.1;
    e.pcd = 1.4;
    e.coreOpen = e.kind === "bossA" && band >= 1 ? 4.2 : 0;
    shake(w, 12);
    e.fade = 1;
    // Announce the escalation.
    w.announce = band === 2 ? "CORE EXPOSED" : "ARMOUR BREACH";
    w.announceSub = band === 2 ? "ALL SYSTEMS FAILING" : "TARGET ENRAGING";
    w.announceT = 1.5;
    w.announceHue = band === 2 ? 1 : 2;
    e.spoke = 1;
  }
  if (e.locked > 0) {
    e.locked -= dt;
    e.barSmooth = lerp(e.barSmooth, e.hp / e.hpMax, 6 * dt);
    return;
  }

  e.barSmooth = lerp(e.barSmooth, e.hp / e.hpMax, 7 * dt);
  e.enrage = Math.max(0, e.enrage - dt);
  const rage = e.enrage > 0 ? 1.7 : 1;
  w.bossBar = e.barSmooth;

  // Weak core window.
  if (e.coreOpen > 0) e.coreOpen -= dt;

  // ── pattern sequencing ──────────────────────────────────────────────────
  if (e.pcd > 0) {
    e.pcd -= dt;
    e.label = "REPOSITIONING";
    return;
  }

  if (e.kind === "bossA") updateStormwell(e, w, dt, rage);
  else updateHelios(e, w, dt, rage);
}

/* ═══════════════════════════════════════════════ BOSS 1 — STORMWELL ══ */

function updateStormwell(e: Enemy, w: World, dt: number, rage: number): void {
  e.label = patternName("bossA", e.pattern);
  switch (e.pattern) {
    case PAT.VOLLEY: {
      // Five hardpoints walk their guns across the field in sequence.
      const n = 5;
      const guns = 5;
      const perGun = 0.2;
      const slot = Math.floor(e.pt / perGun);
      for (let i = 0; i < guns; i++) {
        const idx = slot - i;
        if (idx < 0) continue;
        if (idx >= 6) {
          e.pattern = PAT.BEAM;
          e.pt = 0;
          e.pcd = 0.8;
          return;
        }
        const gx = -1 + (i / (guns - 1)) * 2;
        const x = e.x + gx * 52;
        const y = e.y + 34;
        if (idx % 2 === 0) {
          bossShell(w, x, y, 0, 210, false);
        } else {
          const ang = Math.atan2(w.player.x - x, w.player.y - y);
          bossShell(w, x, y, ang, 240, false);
        }
        fxRing(w, x, y, 12, 0.2, 1);
        shake(w, 1.6);
      }
      e.fired++;
      break;
    }
    case PAT.BEAM: {
      // Charge, then rake a continuous beam across the field.
      if (e.laser === 0) {
        e.laser = 1;
        e.pt = 0;
        e.laserA = Math.atan2(w.player.x - e.x, w.player.y - e.y);
      }
      if (e.laser === 1) {
        e.laserA = lerp(e.laserA, Math.atan2(w.player.x - e.x, w.player.y - e.y), 2.2 * dt);
        if (e.pt > 0.95) {
          e.laser = 2;
          e.pt = 0;
          shake(w, 8);
        }
      } else if (e.laser === 2) {
        const sweep = Math.sin(e.pt * 1.35) * 1.15;
        e.laserA = 0.55 + sweep;
        const muzzleX = e.x;
        const muzzleY = e.y + 40;
        for (let i = 1; i <= 16; i++) {
          const d = i * 26;
          const x = muzzleX + Math.sin(e.laserA) * d;
          const y = muzzleY + Math.cos(e.laserA) * d;
          dot(w, x, y, 0, 0, 9, 0.1, 0, 1);
        }
        if (e.pt % 0.05 < dt) {
          bossShell(w, muzzleX, muzzleY, e.laserA, 300, true);
          shake(w, 2.2);
        }
        if (e.pt > 2.6) {
          e.laser = 0;
          e.pattern = PAT.WALL;
          e.pt = 0;
          e.pcd = 0.6;
        }
      }
      break;
    }
    case PAT.WALL: {
      // A wall of ordnance rolls down with a single gap; shoot the gap.
      if (e.pt < dt * 2) {
        e.gapSide = Math.random() < 0.5 ? -1 : 1;
        e.wallT = 0;
        e.pattern = e.pattern;
      }
      e.wallT -= dt;
      if (e.wallT <= 0) {
        e.wallT = 0.2 / rage;
        const cols = 11;
        const gapCol = 2 + Math.floor(Math.random() * (cols - 4));
        for (let i = 0; i < cols; i++) {
          const x = BOUNDS.left + 14 + (i / (cols - 1)) * (BOUNDS.width - 28);
          if (Math.abs(i - gapCol) < 1) continue;
          bossShell(w, x, e.y + 30, 0, 150, false);
        }
        e.gapSide = gapCol;
      }
      if (e.pt > 5.0) {
        e.pattern = PAT.SPIRAL;
        e.pt = 0;
        e.pcd = 0.7;
      }
      break;
    }
    case PAT.SPIRAL: {
      e.ang += 3.1 * dt * rage;
      if (e.pt % 0.075 < dt) {
        const arms = e.band >= 1 ? 4 : 3;
        for (let i = 0; i < arms; i++) {
          const a = e.ang + (i / arms) * TAU;
          enemyShot(w, e.x + Math.sin(a) * 40, e.y + 30 + Math.cos(a) * 18, a, 190, { art: 0, dmg: 1, r: 5 });
        }
        e.fired++;
      }
      if (e.pt > 4.6) {
        e.pattern = e.band >= 1 ? PAT.SUMMON : PAT.VOLLEY;
        e.pt = 0;
        e.pcd = 0.8;
      }
      break;
    }
    case PAT.SUMMON: {
      e.adds -= dt;
      if (e.adds <= 0) {
        e.adds = 2.4 / rage;
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = e.x + side * 70;
        const kind = Math.random() < 0.35 ? "kamikaze" : "grunt";
        spawnEnemy(w, { kind, x, y: e.y + 20, minion: 1, diff: e.diff });
        shake(w, 2);
      }
      if (e.pt > 5.0) {
        e.pattern = PAT.VOLLEY;
        e.pt = 0;
        e.pcd = 0.7;
      }
      break;
    }
    default:
      e.pattern = PAT.VOLLEY;
      e.pt = 0;
      e.pcd = 0.8;
      break;
  }
}

/* ═══════════════════════════════════════ BOSS 2 — HELIOS PRIME ══ */

function updateHelios(e: Enemy, w: World, dt: number, rage: number): void {
  e.label = patternName("bossB", e.pattern);
  switch (e.pattern) {
    case PAT.HOMING: {
      // Mines peel off the hull, arc out, then hunt.
      e.fanCd -= dt;
      if (e.fanCd <= 0) {
        e.fanCd = 0.42 / rage;
        for (let i = 0; i < 2; i++) {
          const a = 0.5 + Math.random() * 2.1;
          enemyShot(w, e.x + (i ? 22 : -22), e.y + 26, a, 150, {
            art: 0, dmg: 1, r: 7, life: 8,
          });
        }
        e.fired++;
      }
      if (e.pt > 4.2) {
        e.pattern = PAT.SNIPE;
        e.pt = 0;
        e.pcd = 0.6;
      }
      break;
    }
    case PAT.SNIPE: {
      // Charge, then a single devastating aimed shell with a tracer.
      if (e.charge === 0) {
        e.charge = 1;
        e.aim = 0;
      }
      e.charge += dt * 1.6;
      e.aim = lerp(e.aim, Math.atan2(w.player.x - e.x, w.player.y - e.y), 3.4 * dt);
      if (e.charge > 1) {
        bossShell(w, e.x, e.y + 34, e.aim, 460, true);
        fxRing(w, e.x, e.y + 34, 22, 0.25, 2);
        shake(w, 4);
        e.charge = 0;
        e.pattern = PAT.DUAL;
        e.pt = 0;
        e.pcd = 0.35;
      }
      break;
    }
    case PAT.DUAL: {
      e.angv = e.band >= 1 ? 2.7 : 2.0;
      e.ang += e.angv * dt * rage;
      if (e.pt % 0.06 < dt) {
        const dir = e.band >= 1 ? -1 : 1;
        enemyShot(w, e.x, e.y + 28, e.ang, 210, { art: 0, dmg: 1, r: 5 });
        enemyShot(w, e.x, e.y + 28, e.ang * dir + Math.PI, 210, { art: 0, dmg: 1, r: 5 });
        e.fired++;
      }
      if (e.pt > 5.4) {
        e.pattern = PAT.VOLLEY;
        e.pt = 0;
        e.pcd = 0.6;
      }
      break;
    }
    case PAT.VOLLEY: {
      if (e.pt % 0.11 < dt) {
        const ang = Math.atan2(w.player.x - e.x, w.player.y - e.y);
        fanShot(w, e.x, e.y + 32, ang, e.band >= 1 ? 5 : 3, 0.7, 260, { art: 0, dmg: 1 });
        e.fired++;
        shake(w, 1.4);
      }
      if (e.pt > 3.4) {
        e.pattern = e.band === 2 ? PAT.RAGE : PAT.HOMING;
        e.pt = 0;
        e.pcd = 0.7;
      }
      break;
    }
    case PAT.RAGE: {
      // Everything at once.
      e.ang += 4.4 * dt;
      if (e.pt % 0.05 < dt) {
        for (let i = 0; i < 5; i++) {
          const a = e.ang + (i / 5) * TAU;
          enemyShot(w, e.x, e.y + 26, a, 230, { art: 0, dmg: 1, r: 5 });
        }
      }
      if (e.pt % 0.22 < dt) {
        aimedShot(w, e.x, e.y + 32, w.player.x, w.player.y, 330, { dmg: 1, r: 7 });
      }
      if (e.pt > 6.0) {
        e.pattern = PAT.DUAL;
        e.pt = 0;
        e.pcd = 0.8;
      }
      break;
    }
    default:
      e.pattern = PAT.HOMING;
      e.pt = 0;
      e.pcd = 0.8;
      break;
  }
}

/* ─────────────────────────────────────────────────────── boss death ───── */

export function bossDeathSequence(e: Enemy, w: World, dt: number): void {
  e.death += dt;
  const t = e.death;
  if (t < 1.4) {
    if (Math.random() < dt * 26) {
      const a = Math.random() * TAU;
      const d = Math.random() * e.r * 1.4;
      const x = e.x + Math.sin(a) * d;
      const y = e.y + Math.cos(a) * d;
      dot(w, x, y, rand3(-40, 40), rand3(-40, 40), 20, 0.3, 1);
      fxRing(w, x, y, 26, 0.3, 1);
      shake(w, 3);
    }
    e.fade = 1 - t * 0.4;
  } else if (e.death < 3.0) {
    if (Math.random() < dt * 34) {
      const a = Math.random() * TAU;
      const d = Math.random() * e.r * 1.6;
      explodeLocal(w, e.x + Math.sin(a) * d, e.y + Math.cos(a) * d);
    }
    e.fade = Math.max(0.2, 1 - (t - 1.4) * 0.6);
    shake(w, 4);
  } else {
    // Final bloom.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const d = e.r * 0.9;
      explodeLocal(w, e.x + Math.sin(a) * d, e.y + Math.cos(a) * d);
    }
    fxRing(w, e.x, e.y, 200, 0.9, 0);
    dot(w, e.x, e.y, 0, 0, 220, 0.4, 0);
    shake(w, 26);
    e.on = false;
  }
}

function explodeLocal(w: World, x: number, y: number): void {
  fxRing(w, x, y, 40, 0.4, 1);
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * TAU;
    dot(w, x, y, Math.sin(a) * 150, Math.cos(a) * 150, 4, 0.4, 0);
  }
}

function rand3(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

export { PAT };
