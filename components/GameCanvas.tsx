"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Engine, type RunStats } from "@/lib/game/engine";
import { Renderer } from "@/lib/render/renderer";
import { SPRITES, BANK_OF } from "@/lib/render/sprites";
import { BANK } from "@/lib/render/glyphmap";
import { FIXED_DT, PANEL_W, PANEL_H, MAX_STEPS_PER_FRAME } from "@/lib/game/config";
import { InputManager } from "@/lib/game/input";
import { audio } from "@/lib/audio/engine";
import { getSettings, submitScore, mergeTotals, sanitizeCallsign } from "@/lib/data/save";
import { setScreen, setHud, setResult, getState } from "@/lib/ui/store";
import { clamp } from "@/lib/game/math";

/**
 * The canvas host. Owns the fixed-timestep loop, feeds the renderer, and
 * mirrors a throttled snapshot into the React store for the HUD overlay.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const BULLET_P_BANK = BANK_OF.bulletP as number;
const BULLET_E_BANK = BANK_OF.bulletE as number;

interface Props {
  /** Bumped by the parent to request a run. */
  runToken: number;
  endless: boolean;
  paused: boolean;
  onRunEnd: (stats: RunStats) => void;
  onFirstGesture: () => void;
}

export default function GameCanvas({ runToken, endless, paused, onRunEnd, onFirstGesture }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const [, forceTick] = useState(0);
  const gestureDone = useRef(false);
  const endSent = useRef(false);
  const [ready, setReady] = useState(false);

  /* ── boot ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Bake the sprite bank once the DOM exists.
    SPRITES.bake();

    const engine = new Engine();
    const renderer = new Renderer(ctx, PANEL_W, PANEL_H, (bankId: number, index = 0) =>
      SPRITES.frame(bankId, index),
    );
    const settings = getSettings();
    renderer.scanlines = settings.scanlines;
    renderer.curvature = settings.curvature;
    renderer.bloom = settings.bloom;
    renderer.quality = settings.quality;
    renderer.showFps = settings.showFps;
    engine.quality = settings.quality;
    engine.calm = settings.flashMode === "reduced";
    engine.shakeScale = settings.shake;
    engine.startAttract();
    engine.demo = true;

    const input = new InputManager(engine);
    input.setTouchAutoFire(settings.touchAutoFire);
    input.attach(canvas);
    input.onPause = () => {
      if (getState().screen === "playing") {
        setScreen("pause");
      } else if (getState().screen === "pause") {
        setScreen("playing");
      }
    };
    input.onBombKey = () => {
      audio.setSfxEnabled(!audio.sfxEnabled);
    };

    audio.setSfxEnabled(settings.sfx);
    audio.setMusicEnabled(settings.music);

    engineRef.current = engine;
    rendererRef.current = renderer;
    inputRef.current = input;
    setReady(true);

    return () => {
      input.detach();
      engineRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  /* ── run start / end hooks ────────────────────────────────────────────── */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || runToken === 0 || !ready) return;
    endSent.current = false;
    void audio.init().then(() => {
      audio.setIntensity(1);
    });
    engine.startRun(endless);
    setScreen("playing");
    // Reset the player's auto-fire based on input mode.
    const p = engine.world.player;
    p.autoFire = 0;
  }, [runToken, endless, ready]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !ready) return;
    engine.events = {
      onGameOver: (stats) => {
        if (endSent.current) return;
        endSent.current = true;
        const accuracy = stats.shots > 0 ? (stats.hits / stats.shots) * 100 : 0;
        const callsign = getState().hud.callsign || "ACE";
        const entry = {
          callsign: sanitizeCallsign(callsign),
          score: stats.score,
          wave: stats.wave,
          accuracy,
          kills: stats.kills,
          maxCombo: stats.maxCombo,
          date: Date.now(),
          endless,
        };
        const prevBest = getState().result?.score ?? -1;
        const rank = submitScore(entry);
        mergeTotals({
          launches: 1, kills: stats.kills, shots: stats.shots, hits: stats.hits,
          bombs: stats.bombs, bosses: stats.bosses, bestWave: stats.wave,
          bestScore: stats.score, seconds: stats.time,
          flawless: stats.flawless ? 1 : 0,
        });
        setResult({
          score: stats.score,
          wave: stats.wave,
          kills: stats.kills,
          accuracy,
          maxCombo: stats.maxCombo,
          bosses: stats.bosses,
          time: stats.time,
          rank,
          medals: stats.medals,
          newRecord: rank === 0 && stats.score > 0,
          endless,
        });
        void prevBest;
        onRunEnd(stats);
        window.setTimeout(
          () => setScreen(engine.mode === "victory" ? "victory" : "gameover"),
          1400,
        );
      },
    };
  }, [ready, endless, onRunEnd]);

  /* ── the loop ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const renderer = rendererRef.current;
    const input = inputRef.current;
    if (!canvas || !engine || !renderer || !input) return;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let fpsAcc = 0;
    let fpsFrames = 0;
    let hudClock = 0;
    let pausedRef = paused;
    pausedRef = paused;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const rawDt = (now - last) / 1000;
      last = now;
      const dt = Math.min(0.05, rawDt);

      // FPS meter.
      fpsAcc += rawDt;
      fpsFrames++;
      if (fpsAcc >= 0.5) {
        renderer.fps = fpsFrames / fpsAcc;
        fpsAcc = 0;
        fpsFrames = 0;
      }

      input.pollGamepad(true);
      if (!gestureDone.current && (input.state.fire || input.state.pointerActive)) {
        gestureDone.current = true;
        onFirstGesture();
      }

      const screen = getState().screen;
      const active = screen === "playing" && !pausedRef;
      if (active) {
        acc += dt;
        let steps = 0;
        while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
          input.apply(FIXED_DT);
          engine.step(FIXED_DT);
          acc -= FIXED_DT;
          steps++;
        }
        if (acc > FIXED_DT * MAX_STEPS_PER_FRAME) acc = 0;
      } else if (getState().screen === "attract" || engine.mode !== "playing") {
        engine.step(Math.min(dt, FIXED_DT));
      }

      const backdropOnly = screen === "boot" || screen === "attract" || screen === "brief" ||
        screen === "hangar" || screen === "scores" || screen === "options";
      renderer.draw(engine.world, dt, backdropOnly);

      // Mirror to the store at ~20Hz for the HUD.
      hudClock += dt;
      if (hudClock >= 0.05) {
        hudClock = 0;
        const w = engine.world;
        setHud({
          score: w.score,
          wave: w.wave,
          waveName: w.waveName,
          waveTag: w.waveTag,
          combo: w.combo,
          mult: w.mult,
          lives: w.player.lives,
          bombs: w.player.bombs,
          power: w.player.power,
          boss: w.bossOn,
          bossName: w.bossName,
          bossFrac: w.bossHpMax > 0 ? clamp(w.bossHp / w.bossHpMax, 0, 1) : 0,
          bossLabel: w.bossLabel,
          announce: w.announce,
          announceSub: w.announceSub,
          announceOn: w.announceT > 0,
          fps: renderer.fps,
          paused: pausedRef,
          endless: w.endless,
          demo: engine.demo,
          lowHealth: w.player.lives <= 1,
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [ready, paused, onFirstGesture]);

  /* ── touch bomb button: Hud dispatches "phosphor-bomb", we fire it ── */
  useEffect(() => {
    if (!ready) return;
    const h = () => {
      const engine = engineRef.current;
      if (engine && getState().screen === "playing") {
        engine.requestBomb();
      }
    };
    window.addEventListener("phosphor-bomb", h);
    return () => window.removeEventListener("phosphor-bomb", h);
  }, [ready]);

  /* ── pause state mirror ───────────────────────────────────────────────── */
  const handlePause = useCallback((v: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.mode = v ? "menu" : "playing";
  }, []);

  useEffect(() => {
    handlePause(paused);
  }, [paused, handlePause]);

  useEffect(() => {
    const s = getSettings();
    const r = rendererRef.current;
    const e = engineRef.current;
    if (!r || !e) return;
    r.scanlines = s.scanlines;
    r.curvature = s.curvature;
    r.bloom = s.bloom;
    r.quality = s.quality;
    r.showFps = s.showFps;
    e.calm = s.flashMode === "reduced";
    e.shakeScale = s.shake;
    inputRef.current?.setTouchAutoFire(s.touchAutoFire);
  }, [ready]);

  return (
    <canvas
      ref={canvasRef}
      // Keep drawing and input in panel coordinates; CSS handles display sizing.
      width={PANEL_W}
      height={PANEL_H}
      className="absolute inset-0 h-full w-full touch-none select-none"
      style={{ imageRendering: "auto" }}
      aria-label="Phosphor Ace game screen"
      onPointerDown={() => {
        if (!gestureDone.current) {
          gestureDone.current = true;
          onFirstGesture();
        }
      }}
      data-engine={engineRef.current ? "live" : "boot"}
    />
  );
}
