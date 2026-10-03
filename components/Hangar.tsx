"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PixelButton, DotRule, FadeIn, Label, Marquee } from "./ui/Chrome";
import { BANK } from "@/lib/render/glyphmap";
import { SPRITES } from "@/lib/render/sprites";
import { audio } from "@/lib/audio/engine";

/**
 * The Hangar. Renders the actual baked sprites as an interactive manifest, so
 * the art you see is the art that flies. Unlocks are driven by career stats.
 *
 * An OKANFXLABS AI Design Labs production.
 */

interface Props {
  onBack: () => void;
  bestWave: number;
  bosses: number;
}

interface Entry {
  id: string;
  name: string;
  bank: number;
  spec: string;
  role: string;
  unlock: (w: number, b: number) => boolean;
  req: string;
}

const FLEET: Entry[] = [
  {
    id: "player",
    name: "AP-0 WRAITH",
    bank: BANK.player,
    spec: "1× VULCAN · 2.4 S ARMOUR · 3 S BOMBS",
    role: "YOUR AIRFRAME",
    unlock: () => true,
    req: "ALWAYS FITTED",
  },
  {
    id: "grunt",
    name: "FA-1 HORNET",
    bank: BANK.grunt,
    spec: "3 HP · 3-ROUND BURST · 92 PX/S",
    role: "MASS INTERCEPTOR",
    unlock: () => true,
    req: "ALWAYS FITTED",
  },
  {
    id: "weaver",
    name: "FW-3 VANDAL",
    bank: BANK.weaver,
    spec: "4 HP · LEADING SHOT · 118 PX/S",
    role: "SINUOUS WEAVE",
    unlock: (w) => w >= 2,
    req: "REACH WAVE 02",
  },
  {
    id: "diver",
    name: "FV-2 KITE",
    bank: BANK.diver,
    spec: "5 HP · COMMITTED DIVE · 148 PX/S",
    role: "DIVE STRIKE",
    unlock: (w) => w >= 2,
    req: "REACH WAVE 02",
  },
  {
    id: "kamikaze",
    name: "SPARKPLUG",
    bank: BANK.kamikaze,
    spec: "2 HP · RAMS ON SIGHT · 200 PX/S",
    role: "EXPENDABLE",
    unlock: (w) => w >= 2,
    req: "REACH WAVE 02",
  },
  {
    id: "mineLayer",
    name: "XB-9 MENDER",
    bank: BANK.mineLayer,
    spec: "7 HP · SEEDS 3 MAGNETIC MINES",
    role: "AREA DENIAL",
    unlock: (w) => w >= 3,
    req: "REACH WAVE 03",
  },
  {
    id: "ace",
    name: "FALCON",
    bank: BANK.ace,
    spec: "10 HP · 3-SPREAD · 180 PX/S",
    role: "ELITE ACE",
    unlock: (w) => w >= 4,
    req: "REACH WAVE 04",
  },
  {
    id: "gunship",
    name: "TB-4 BASTION",
    bank: BANK.gunship,
    spec: "30 HP · ARMOURED · VENTED FLANK ONLY",
    role: "MINI-BOSS",
    unlock: (w) => w >= 4,
    req: "REACH WAVE 04",
  },
  {
    id: "bossA",
    name: "STORMWELL",
    bank: BANK.bossA,
    spec: "1150 HP · 3 PHASES · VENT CYCLE WEAK POINT",
    role: "DREADNOUGHT",
    unlock: (b) => b >= 1,
    req: "SINK 1 CAPITAL SHIP",
  },
  {
    id: "bossB",
    name: "HELIOS PRIME",
    bank: BANK.bossB,
    spec: "1900 HP · 3 PHASES · HOMING SWARM",
    role: "ORBITAL CITADEL",
    unlock: (b) => b >= 1,
    req: "SINK 1 CAPITAL SHIP",
  },
];

const ORDNANCE = [
  { name: "SPREAD POD", desc: "Escalates your cannon to twin / triple / quad. Permanent for the run.", bank: BANK.pickupSpread },
  { name: "SHIELD CELL", desc: "Nine seconds of bubble. Blocks one hit and erases the round.", bank: BANK.pickupShield },
  { name: "BOMB", desc: "Shockwave: clears every round on screen, damages everything within 200px.", bank: BANK.pickupBomb },
  { name: "REACTOR CORE", desc: "1500 bonus points and a power step. Pure greed.", bank: BANK.pickupCore },
  { name: "SPARE AIRFRAME", desc: "One more life. The only pickup that matters when you are on your last.", bank: BANK.pickupLife },
  { name: "SCORE TOKEN", desc: "600 points. The sky is full of them if you are brave enough.", bank: BANK.pickupScore },
];

function SpriteCard({
  entry,
  unlocked,
  onSelect,
  selected,
}: {
  entry: Entry;
  unlocked: boolean;
  onSelect: () => void;
  selected: boolean;
}) {
  const frame = SPRITES.frame(entry.bank, 0);
  const scale = entry.bank === BANK.bossA || entry.bank === BANK.bossB ? 1.1 : entry.bank === BANK.gunship ? 1.3 : 2.2;
  return (
    <button
      type="button"
      onClick={() => {
        if (!unlocked) {
          audio.play("deny");
          return;
        }
        audio.play("select");
        onSelect();
      }}
      className={`group relative flex flex-col items-center gap-1 border p-2 transition-colors ${
        selected
          ? "border-phosphor/70 bg-phosphor/10"
          : unlocked
            ? "border-white/10 bg-white/[0.02] hover:border-cyan/40 hover:bg-cyan/5"
            : "border-white/5 bg-black/30"
      }`}
      aria-label={`${entry.name}${unlocked ? "" : ` (locked — ${entry.req})`}`}
    >
      <div className="flex h-14 w-full items-center justify-center">
        {frame && unlocked ? (
          <canvas
            ref={(el) => {
              if (!el || !frame) return;
              el.width = frame.w;
              el.height = frame.h;
              const c = el.getContext("2d");
              if (!c) return;
              c.clearRect(0, 0, el.width, el.height);
              c.imageSmoothingEnabled = false;
              c.drawImage(frame.canvas, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.w, frame.h);
            }}
            style={{
              width: Math.min(96, frame.w * scale * 0.42),
              height: Math.min(56, frame.h * scale * 0.42),
              imageRendering: "pixelated",
              filter: selected ? "drop-shadow(0 0 6px rgba(59,255,176,0.8))" : "drop-shadow(0 0 4px rgba(59,255,176,0.35))",
            }}
            aria-hidden
          />
        ) : (
          <span className="text-2xl text-dim/40" aria-hidden>
            ▓
          </span>
        )}
      </div>
      <div className={`text-center text-[8px] leading-tight font-bold ${unlocked ? "text-cyan" : "text-dim/40"}`}>
        {entry.name}
      </div>
      {!unlocked && (
        <div className="text-center text-[6px] tracking-[0.1em] text-dim/50">{entry.req}</div>
      )}
    </button>
  );
}

export default function Hangar({ onBack, bestWave, bosses }: Props) {
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<"fleet" | "ordnance">("fleet");
  const [inspect, setInspect] = useState<Entry | null>(FLEET[0] ?? null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        audio.play("back");
        onBack();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setTab(tab === "fleet" ? "ordnance" : "fleet");
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSel((s) => (s + 1) % FLEET.length);
        audio.play("tick");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tab, onBack]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col px-4 py-[5%] sm:px-7">
      <Marquee small />
      <div className="mt-6 flex items-end justify-between sm:mt-8">
        <div>
          <Label>HANGAR</Label>
          <h2 className="glow-p text-lg font-black tracking-[0.24em] text-phosphor sm:text-2xl">
            AIRFRAME MANIFEST
          </h2>
        </div>
        <PixelButton onClick={onBack}>← Back</PixelButton>
      </div>

      <div className="mt-3 flex gap-2">
        {(["fleet", "ordnance"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              audio.play("select");
            }}
            className={`btn px-3 py-1 text-[9px] uppercase ${tab === t ? "btn-primary" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <DotRule className="mt-3" />

      {tab === "fleet" ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
            {FLEET.map((f, i) => (
              <SpriteCard
                key={f.id}
                entry={f}
                unlocked={f.unlock(bestWave, bosses)}
                selected={sel === i}
                onSelect={() => {
                  setSel(i);
                  setInspect(f);
                }}
              />
            ))}
          </div>
          <motion.div
            key={inspect?.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="shrink-0 border border-white/10 bg-black/30 p-3 lg:w-56"
          >
            <Label>INTEL</Label>
            <div className="glow-c mt-1 text-xs font-bold text-cyan">{inspect?.name}</div>
            <div className="mt-0.5 text-[8px] tracking-[0.2em] text-danger/80">
              {inspect?.role}
            </div>
            <DotRule className="my-2" />
            <p className="text-[9px] leading-relaxed text-dim">{inspect?.spec}</p>
            {inspect && !inspect.unlock(bestWave, bosses) && (
              <div className="mt-2 text-[8px] text-amber glow-a">LOCKED · {inspect.req}</div>
            )}
            <div className="mt-3 space-y-1 text-[8px] text-dim/70">
              <div>CAREER BEST: WAVE {bestWave || "—"}</div>
              <div>CAPITAL SHIPS SUNK: {bosses}</div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {ORDNANCE.map((o) => (
            <div key={o.name} className="flex items-start gap-2 border border-white/10 bg-white/[0.02] p-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/5 bg-black/40">
                <canvas
                  ref={(el) => {
                    const f = SPRITES.frame(o.bank, 0);
                    if (!el || !f) return;
                    el.width = f.w;
                    el.height = f.h;
                    const c = el.getContext("2d");
                    if (!c) return;
                    c.clearRect(0, 0, el.width, el.height);
                    c.drawImage(f.canvas, f.sx, f.sy, f.sw, f.sh, 0, 0, f.w, f.h);
                  }}
                  style={{ width: 30, height: 30, imageRendering: "pixelated" }}
                  aria-hidden
                />
              </div>
              <div>
                <div className="text-[9px] font-bold text-phosphor glow-p">{o.name}</div>
                <p className="mt-0.5 text-[8px] leading-snug text-dim">{o.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-center text-[7px] tracking-[0.24em] text-dim/50">
        TAB SWITCH · ESC BACK
      </div>
    </div>
  );
}

export { FadeIn };