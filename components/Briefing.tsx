"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PixelButton, DotRule, FadeIn, Label, Stat } from "./ui/Chrome";
import { audio } from "@/lib/audio/engine";

/**
 * Pre-flight briefing. Names the mission, the threat, and the loadout in
 * arcade language. Sets the tone before the first frame of gameplay.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const SECTORS = [
  {
    n: "01",
    name: "FIRST LIGHT",
    tag: "COASTAL PATROL",
    brief: "Kabal-Ascension fighters are running the shoreline at low altitude. Clear the lane.",
    threat: "HORNET LINE · SPARKPLUG DRONES",
  },
  {
    n: "02",
    name: "CROSSFIRE",
    tag: "ENEMY INTERCEPT",
    brief: "Their interceptors have learned to weave. Minefields seed the approach. Watch the flanks.",
    threat: "VANDAL WEAVE · MENDER MINES",
  },
  {
    n: "03",
    name: "STORM LINE",
    tag: "SQUALL FRONT",
    brief: "Weather gives cover to a heavy Bastion gunship. Armoured hull — hit the vented flank.",
    threat: "BASTION GUNSHIP · FALCON ACES",
  },
  {
    n: "04",
    name: "HARD DECK",
    tag: "CARRIER GROUP",
    brief: "The dreadnought STORMWELL is on deck. Its glacis plate will eat everything. Break the vents.",
    threat: "STORMWELL · DREADNOUGHT CLASS",
  },
  {
    n: "05",
    name: "NIGHT CARRIER",
    tag: "DEEP STRIKE",
    brief: "Above the cloud deck sits HELIOS PRIME. Solar sails open. Reactor eye open. Go.",
    threat: "HELIOS PRIME · ORBITAL CITADEL",
  },
];

const CONTROLS = [
  { k: "MOVE", v: "ARROWS / WASD / DRAG" },
  { k: "FIRE", v: "J / SPACE / HOLD" },
  { k: "FOCUS", v: "SHIFT / K" },
  { k: "BOMB", v: "L" },
  { k: "PAUSE", v: "P / ESC" },
];

interface Props {
  endless: boolean;
  callsign: string;
  onStart: () => void;
  onBack: () => void;
}

export default function Briefing({ endless, callsign, onStart, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const total = endless ? SECTORS.length + 1 : SECTORS.length;
  const advance = () => {
    audio.play("confirm");
    if (step < total - 1) setStep(step + 1);
    else onStart();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        audio.play("back");
        setStep(Math.max(0, step - 1));
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setShowControls(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (showControls) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
        <FadeIn className="w-full max-w-sm">
          <Label>FLIGHT CONTROLS</Label>
          <DotRule className="my-3" />
          <div className="flex flex-col gap-1.5">
            {CONTROLS.map((c) => (
              <div key={c.k} className="flex items-center justify-between text-[10px]">
                <span className="w-16 font-bold text-cyan glow-c">{c.k}</span>
                <span className="text-dim">{c.v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <PixelButton onClick={() => setShowControls(false)}>Back</PixelButton>
          </div>
        </FadeIn>
      </div>
    );
  }

  const isEndless = endless && step === total - 1;
  const s = SECTORS[Math.min(step, SECTORS.length - 1)];

  return (
    <div className="absolute inset-0 z-30 flex flex-col px-5 py-[6%] sm:px-8">
      <div className="flex items-start justify-between">
        <div>
          <Label>FLIGHT BRIEF</Label>
          <div className="glow-c mt-1 text-[10px] tracking-[0.3em] text-cyan">
            PILOT: {callsign}
          </div>
        </div>
        <div className="text-right">
          <Label>FRAME</Label>
          <div className="glow-a text-sm font-bold text-amber">
            {String(step + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </div>
        </div>
      </div>

      <DotRule className="mt-3" />

      <div className="flex flex-1 flex-col justify-center">
        <FadeIn key={step}>
          {isEndless ? (
            <>
              <div className="glow-d text-5xl font-black text-danger sm:text-6xl">∞</div>
              <h2 className="glow-d mt-2 text-xl font-black tracking-[0.2em] text-danger sm:text-2xl">
                ENDLESS ASCENT
              </h2>
              <p className="mt-2 max-w-md text-[10px] leading-relaxed text-dim">
                No sector seven. No extraction. The sky keeps sending until you
                stop it. Every third lift brings a capital ship.
              </p>
            </>
          ) : (
            s ? (
              <>
                <div className="glow-c text-5xl font-black text-cyan/70 sm:text-6xl">{s.n}</div>
                <h2 className="glow-p mt-2 text-xl font-black tracking-[0.2em] text-phosphor sm:text-2xl">
                  {s.name}
                </h2>
                <div className="mt-0.5 text-[8px] tracking-[0.3em] text-dim">{s.tag}</div>
                <p className="mt-3 max-w-md text-[10px] leading-relaxed text-dim">{s.brief}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[8px] tracking-[0.2em] text-danger/80">THREAT:</span>
                  <span className="glow-d text-[9px] font-bold text-danger">{s.threat}</span>
                </div>
              </>
            ) : null
          )}
        </FadeIn>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat label="LOADOUT" value="AP-0" tone="phos" />
          <Stat label="AIRFRAMES" value="3" tone="cyan" />
          <Stat label="BOMBS" value="3" tone="amber" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <PixelButton onClick={onBack} variant="danger">
          ← Back
        </PixelButton>
        <div className="flex gap-2">
          <PixelButton onClick={() => setShowControls(true)}>Controls</PixelButton>
          <PixelButton onClick={advance} variant="primary" autoFocus>
            {step === total - 1 ? "Launch ▶" : "Next →"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}