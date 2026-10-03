"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PixelButton, DotRule, Label, Marquee } from "./ui/Chrome";
import { getSettings, updateSettings, type Settings } from "@/lib/data/save";
import { audio } from "@/lib/audio/engine";

/**
 * Options. Every control is live — toggles take effect on the live renderer
 * the next frame. Nothing here is decorative.
 *
 * An OKANFXLABS AI Design Labs production.
 */

interface Props {
  onBack: () => void;
}

export default function Options({ onBack }: Props) {
  const [s, setS] = useState<Settings>(() => getSettings());
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    const next = updateSettings({ [k]: v } as Partial<Settings>);
    setS(next);
    if (k === "sfx") audio.setSfxEnabled(v as boolean);
    if (k === "music") audio.setMusicEnabled(v as boolean);
    audio.play("tick");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        audio.play("back");
        onBack();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onBack]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col px-4 py-[5%] sm:px-7">
      <Marquee small />
      <div className="mt-6 flex items-end justify-between sm:mt-8">
        <div>
          <Label>CABINET CONFIG</Label>
          <h2 className="glow-c text-lg font-black tracking-[0.24em] text-cyan sm:text-2xl">
            OPTIONS
          </h2>
        </div>
        <PixelButton onClick={onBack}>← Back</PixelButton>
      </div>
      <DotRule className="mt-3" />

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="AUDIO">
            <Toggle
              k="SFX"
              desc="Chiptune zaps, explosions, klaxons"
              v={s.sfx}
              on={(v) => set("sfx", v)}
            />
            <Toggle
              k="MUSIC"
              desc="Adaptive arcade loop — gets angrier with the wave"
              v={s.music}
              on={(v) => set("music", v)}
            />
          </Panel>

          <Panel title="DISPLAY">
            <Choice
              k="QUALITY"
              desc="Resolution of the dot-matrix pass"
              v={s.quality}
              opts={["low", "medium", "high"]}
              on={(v) => set("quality", v as Settings["quality"])}
            />
            <Toggle
              k="SCANLINES"
              desc="CRT phosphor striping"
              v={s.scanlines}
              on={(v) => set("scanlines", v)}
            />
            <Toggle
              k="BLOOM"
              desc="Phosphor bleed around bright dots"
              v={s.bloom}
              on={(v) => set("bloom", v)}
            />
            <Toggle
              k="CURVATURE"
              desc="Barrel-warp the panel like a real tube"
              v={s.curvature}
              on={(v) => set("curvature", v)}
            />
            <Toggle
              k="SHOW FPS"
              desc="Frame counter, top-left of the panel"
              v={s.showFps}
              on={(v) => set("showFps", v)}
            />
          </Panel>

          <Panel title="COMFORT">
            <Toggle
              k="REDUCED FLASH"
              desc="Damper for photosensitive players — kills screen flashes and softens shake"
              v={s.flashMode === "reduced"}
              on={(v) => set("flashMode", v ? "reduced" : "full")}
            />
            <Slider
              k="SCREEN SHAKE"
              desc="How hard the cabinet kicks when things explode"
              v={s.shake}
              min={0}
              max={2}
              step={0.25}
              on={(v) => set("shake", v)}
            />
          </Panel>

          <Panel title="CONTROLS">
            <Toggle
              k="GAMEPAD"
              desc="Left stick, triggers, start = pause"
              v={s.gamepadAim}
              on={(v) => set("gamepadAim", v)}
            />
            <Toggle
              k="TOUCH AUTO-FIRE"
              desc="Keep firing after the finger lifts (recommended on phones)"
              v={s.touchAutoFire}
              on={(v) => set("touchAutoFire", v)}
            />
            <div className="mt-3 space-y-1 text-[9px] text-dim">
              <div className="flex justify-between">
                <span>MOVE</span>
                <span className="text-cyan">ARROWS / WASD / DRAG</span>
              </div>
              <div className="flex justify-between">
                <span>FIRE</span>
                <span className="text-cyan">J / SPACE / HOLD</span>
              </div>
              <div className="flex justify-between">
                <span>FOCUS</span>
                <span className="text-cyan">SHIFT / K</span>
              </div>
              <div className="flex justify-between">
                <span>BOMB</span>
                <span className="text-cyan">L</span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-4 flex items-center justify-between border border-white/10 bg-black/25 p-3">
          <div>
            <Label>RESET</Label>
            <div className="mt-1 text-[9px] text-dim">
              Wipe scores, career stats and all options back to factory.
            </div>
          </div>
          <PixelButton variant="danger" onClick={() => setConfirmReset(true)}>
            Factory Reset
          </PixelButton>
        </div>

        <p className="mt-4 text-center text-[8px] leading-relaxed text-dim/60">
          PHOSPHOR ACE is an original production by OKANFXLABS AI Design Labs.
          Every dot, sound and shockwave is generated in code — no image or audio
          assets ship with this cabinet.
        </p>
      </div>

      {confirmReset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <div className="cabinet grain w-[19rem] p-5">
            <Label>FACTORY RESET</Label>
            <p className="mt-2 text-[10px] text-danger glow-d">
              Wipe scores, career stats and options? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <PixelButton
                variant="danger"
                onClick={() => {
                  try {
                    window.localStorage.removeItem("phosphor-ace/v1");
                  } catch {
                    /* storage may be blocked; the reset still applies in memory */
                  }
                  location.reload();
                }}
              >
                Wipe
              </PixelButton>
              <PixelButton onClick={() => setConfirmReset(false)}>Cancel</PixelButton>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <Label>{title}</Label>
      <DotRule className="my-2.5" />
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Toggle({
  k,
  desc,
  v,
  on,
}: {
  k: string;
  desc: string;
  v: boolean;
  on: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={v}
      onClick={() => on(!v)}
      className="flex items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-[10px] font-bold text-cyan">{k}</span>
        <span className="block text-[8px] leading-snug text-dim">{desc}</span>
      </span>
      <span
        className={`relative h-4 w-9 shrink-0 border transition-colors ${
          v ? "border-phosphor/70 bg-phosphor/20" : "border-white/15 bg-white/5"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[12px] w-[12px] transition-all ${
            v ? "left-[22px] bg-phosphor shadow-[0_0_8px_#3bffb0]" : "left-[2px] bg-dim"
          }`}
        />
      </span>
    </button>
  );
}

function Choice<T extends string>({
  k,
  desc,
  v,
  opts,
  on,
}: {
  k: string;
  desc: string;
  v: T;
  opts: readonly T[];
  on: (v: T) => void;
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold text-cyan">{k}</span>
      <span className="block text-[8px] leading-snug text-dim">{desc}</span>
      <div className="mt-1.5 flex gap-1.5">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => on(o)}
            className={`btn px-2.5 py-1 text-[9px] uppercase ${v === o ? "btn-primary" : ""}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  k,
  desc,
  v,
  min,
  max,
  step,
  on,
}: {
  k: string;
  desc: string;
  v: number;
  min: number;
  max: number;
  step: number;
  on: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-cyan">{k}</span>
        <span className="glow-p text-[10px] font-bold text-phosphor">{v.toFixed(2)}</span>
      </div>
      <span className="block text-[8px] leading-snug text-dim">{desc}</span>
      <input
        type="range"
        className="mt-1.5 w-full"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => on(Number(e.target.value))}
        aria-label={k}
      />
    </div>
  );
}