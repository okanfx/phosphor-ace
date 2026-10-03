/**
 * Entity payload types + tunables. Every value is a primitive so the whole
 * simulation state stays structurally clonable (used for the in-game
 * debug/telemetry snapshot and for deterministic replay tests).
 */

export type EnemyKind =
  | "grunt"
  | "weaver"
  | "diver"
  | "kamikaze"
  | "gunship"
  | "ace"
  | "mineLayer"
  | "turret"
  | "bossA"
  | "bossB";

export type Formation =
  | "none"
  | "veeLeft"
  | "veeRight"
  | "column"
  | "sineColumn"
  | "pincer"
  | "strafeRun";

export type Attack =
  | "none"
  | "downSpread"
  | "downAimed"
  | "downBurst"
  | "sinFan"
  | "lob"
  | "mines"
  | "strafeStrafe"
  | "strafeDive"
  | "ram"
  | "radial"
  | "spiral"
  | "laserSweep"
  | "wall"
  | "homingSwarm";

export type PickupKind =
  | "spread"
  | "shield"
  | "bomb"
  | "life"
  | "core"
  | "score";

/** Shared per-frame message bus so the sim never touches the DOM. */
export interface GameEvent {
  type: "shot" | "hit" | "explode" | "pickup" | "playerHit" | "bomb";
  x: number;
  y: number;
  power: number;
}
