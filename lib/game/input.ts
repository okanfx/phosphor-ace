"use client";

import type { Engine } from "./engine";
import { PANEL_H, PANEL_W } from "./config";

/**
 * Unified input: keyboard, pointer, touch-drag, and gamepad all write into the
 * same intent struct, so the simulation never knows where input came from.
 *
 * An OKANFXLABS AI Design Labs production.
 */

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  bomb: boolean;
  focus: boolean;
  /** Pointer position in panel coords, or null when unused this frame. */
  pointerX: number | null;
  pointerY: number | null;
  pointerActive: boolean;
}

export class InputManager {
  readonly keys = new Set<string>();
  state: InputState = {
    up: false, down: false, left: false, right: false, fire: false,
    bomb: false, focus: false, pointerX: null, pointerY: null, pointerActive: false,
  };
  private engine: Engine;
  private target: HTMLElement | null = null;
  private pressed = new Set<string>();
  /** Cooldown so a keypress triggers exactly one bomb. */
  private bombLatch = false;
  private fireLatch = false;
  private listeners: (() => void)[] = [];
  private disposers: (() => void)[] = [];
  /** True when the last interaction was touch (drives the auto-fire hint). */
  touchMode = false;
  onPause: (() => void) | null = null;
  onBombKey: (() => void) | null = null;
  touchAutoFire = true;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  attach(el: HTMLElement): void {
    this.detach();
    this.target = el;
    const on = <K extends keyof WindowEventMap>(
      target: Window | HTMLElement | Document,
      type: K | string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };

    on(window, "keydown", ((e: KeyboardEvent) => this.onKey(e, true)) as never);
    on(window, "keyup", ((e: KeyboardEvent) => this.onKey(e, false)) as never);
    on(window, "blur", (() => this.releaseAll()) as never);
    on(el, "pointerdown", ((e: PointerEvent) => this.onPointerDown(e)) as never, { passive: false });
    on(window, "pointermove", ((e: PointerEvent) => this.onPointerMove(e)) as never, { passive: true });
    on(window, "pointerup", ((e: PointerEvent) => this.onPointerUp(e)) as never);
    on(el, "contextmenu", ((e: Event) => e.preventDefault()) as never);
    el.style.touchAction = "none";
  }

  detach(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.target = null;
    this.releaseAll();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const code = e.code;
    if (down) {
      if (this.pressed.has(code)) return;
      this.pressed.add(code);
    } else {
      this.pressed.delete(code);
    }
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        this.state.up = down;
        break;
      case "ArrowDown":
      case "KeyS":
        this.state.down = down;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.state.left = down;
        break;
      case "ArrowRight":
      case "KeyD":
        this.state.right = down;
        break;
      case "KeyJ":
      case "Space":
        this.state.fire = down;
        if (down) this.fireLatch = true;
        break;
      case "KeyK":
      case "ShiftLeft":
      case "ShiftRight":
        this.state.focus = down;
        break;
      case "KeyL":
        this.state.bomb = down;
        if (down) this.bombLatch = true;
        break;
      case "Escape":
      case "KeyP":
        if (down) this.onPause?.();
        break;
      case "KeyM":
        if (down) this.onBombKey?.();
        break;
      default:
        break;
    }
    if (
      code.startsWith("Arrow") ||
      code === "Space" ||
      code === "KeyJ" ||
      code === "KeyK" ||
      code === "KeyL" ||
      code === "Tab"
    ) {
      e.preventDefault();
    }
    if (down) this.touchMode = false;
  }

  private toPanel(e: PointerEvent): { x: number; y: number } | null {
    const el = this.target;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return {
      x: ((e.clientX - r.left) / r.width) * PANEL_W,
      y: ((e.clientY - r.top) / r.height) * PANEL_H,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    const p = this.toPanel(e);
    if (!p) return;
    this.touchMode = e.pointerType === "touch";
    this.state.pointerX = p.x;
    this.state.pointerY = p.y;
    this.state.pointerActive = true;
    this.state.fire = true;
    this.fireLatch = true;
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "touch" && !this.state.pointerActive) return;
    const p = this.toPanel(e);
    if (!p) return;
    this.state.pointerX = p.x;
    this.state.pointerY = p.y;
  }

  private onPointerUp(e: PointerEvent): void {
    void e;
    this.state.pointerActive = false;
    this.state.pointerX = null;
    this.state.pointerY = null;
    if (this.touchMode && this.touchAutoFire) {
      this.state.fire = true; // keep autofiring
    } else {
      this.state.fire = false;
    }
  }

  releaseAll(): void {
    this.pressed.clear();
    const s = this.state;
    s.up = s.down = s.left = s.right = s.fire = s.focus = false;
    s.bomb = false;
    s.pointerActive = false;
    s.pointerX = s.pointerY = null;
  }

  /** Poll gamepads and merge into the intent struct. Called once per frame. */
  pollGamepad(enabled: boolean): void {
    if (!enabled || typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const dpadL = pad.buttons[14]?.pressed ?? false;
      const dpadR = pad.buttons[15]?.pressed ?? false;
      const dpadU = pad.buttons[12]?.pressed ?? false;
      const dpadD = pad.buttons[13]?.pressed ?? false;
      if (ax < -0.35 || dpadL) this.state.left = true;
      if (ax > 0.35 || dpadR) this.state.right = true;
      if (ay < -0.45 || dpadU) this.state.up = true;
      if (ay > 0.45 || dpadD) this.state.down = true;
      const fire = pad.buttons[0]?.pressed || pad.buttons[7]?.pressed;
      if (fire) {
        this.state.fire = true;
        this.fireLatch = true;
      }
      const bomb = pad.buttons[1]?.pressed || pad.buttons[2]?.pressed;
      if (bomb) {
        this.bombLatch = true;
      }
      if (pad.buttons[9]?.pressed) {
        this.onPause?.();
      }
      break;
    }
  }

  /** Apply the current intent to the engine. Call once per simulation step. */
  apply(dt: number): void {
    const s = this.state;
    const p = this.engine.world.player;

    // Keyboard movement — integrate into a target position.
    const sp = p.focusOn > 0.5 ? 132 : 236;
    let kx = 0;
    let ky = 0;
    if (s.left) kx -= 1;
    if (s.right) kx += 1;
    if (s.up) ky -= 1;
    if (s.down) ky += 1;
    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky) || 1;
      this.engine.setMove((kx / len) * sp * dt, (ky / len) * sp * dt);
    } else if (s.pointerX !== null && s.pointerY !== null && s.pointerActive) {
      this.engine.pointerTo(s.pointerX, s.pointerY);
    }

    p.focusOn = s.focus ? 1 : 0;
    p.holding = s.focus ? 1 : 0;

    if (s.fire || this.fireLatch) {
      this.engine.requestShot();
      this.fireLatch = false;
    }
    if (this.bombLatch) {
      this.engine.requestBomb();
      this.bombLatch = false;
    }
  }

  /** Touch auto-fire: hold to keep shooting after the finger lifts. */
  setTouchAutoFire(on: boolean): void {
    this.touchAutoFire = on;
  }
}