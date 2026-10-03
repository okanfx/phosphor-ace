"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PixelButton, DotRule, FadeIn, Label, Marquee } from "./ui/Chrome";
import { audio } from "@/lib/audio/engine";
import { getScores, getTotals, type HighScore } from "@/lib/data/save";
import { formatScore, formatTime } from "@/lib/game/math";

/**
 * The attract screen — the thing that draws a crowd at a convention.
 * Real copy, real keyboard nav, real high scores.
 *
 * An OKANFXLABS AI Design Labs production.
 */

type Action = "launch" | "hangar" | "scores" | "options" | "endless";

interface Props {
  callsign: string;
  onLaunch: (endless: boolean) => void;
  onHangar: () => void;
  onScores: () => void;
  onOptions: () => void;
  onCallsign: (v: string) => void;
}

export default function Attract({
  callsign,
  onLaunch,
  onHangar,
  onScores,
  onOptions,
  onCallsign,
}: Props) {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [totals, setTotals] = useState(() => getTotals());
  const [sel, setSel] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setScores(getScores());
    setTotals(getTotals());
  }, []);

  const items: { key: Action | "callsign"; label: string; run: () => void }[] = [
    { key: "launch", label: "▶  LAUNCH SORTIE", run: () => onLaunch(false) },
    { key: "endless", label: "∞  ENDLESS ASCENT", run: () => onLaunch(true) },
    { key: "hangar", label: "▣  HANGAR", run: onHangar },
    { key: "scores", label: "★  HIGH SCORES", run: onScores },
    { key: "options", label: "⚙  OPTIONS", run: onOptions },
    { key: "callsign", label: `⌨  CALLSIGN: ${callsign}`, run: () => setEditing(true) },
  ];

  const onKey = (e: KeyboardEvent) => {
    if (editing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      setSel((s) => (s + d + items.length) % items.length);
      audio.play("select");
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const it = items[sel];
      if (it) {
        audio.play("confirm");
        it.run();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const top = scores[0];

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col">
      <Marquee />

      {/* Big wordmark */}
      <div className="mt-[8%] text-center sm:mt-[10%]">
        <FadeIn>
          <h1
            className="glow-p text-2xl leading-none font-black tracking-[0.3em] text-phosphor sm:text-4xl md:text-5xl"
            aria-label="Phosphor Ace"
          >
            PHOSPHOR ACE
          </h1>
        </FadeIn>
        <FadeIn delay={0.08}>
          <div className="mt-2 text-[7px] tracking-[0.36em] text-cyan sm:text-[9px]">
            DOT-MATRIX ARCADE AIR-WAR
          </div>
        </FadeIn>
        <FadeIn delay={0.14}>
          <DotRule className="mt-3 justify-center sm:mt-4" />
        </FadeIn>
      </div>

      {/* Pitch */}
      <FadeIn delay={0.2}>
        <p className="mx-auto mt-4 max-w-[19rem] px-4 text-center text-[9px] leading-relaxed text-dim sm:mt-5 sm:max-w-sm sm:text-[10px]">
          Six sectors of Kabal-Ascension sky. Two capital ships that do not
          intend to land. One dot-matrix panel and everything you can fit on it.
        </p>
      </FadeIn>

      {/* Menu */}
      <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-1.5 sm:mt-6 sm:gap-2">
        {items.map((it, i) => (
          <motion.button
            key={it.key}
            type="button"
            onClick={() => {
              setSel(i);
              audio.play("confirm");
              it.run();
            }}
            onMouseEnter={() => {
              if (sel !== i) audio.play("tick");
              setSel(i);
            }}
            animate={sel === i ? { x: 4, scale: 1.02 } : { x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 480, damping: 28 }}
            className={`btn min-w-[15rem] px-5 py-2 text-[10px] sm:min-w-[18rem] sm:py-2.5 sm:text-[11px] ${
              sel === i ? "btn-primary" : ""
            }`}
          >
            {it.label}
          </motion.button>
        ))}
      </div>

      {/* Stats footer */}
      <div className="pb-8 sm:pb-12">
        <div className="mx-auto flex max-w-lg items-end justify-center gap-5 px-4 sm:gap-8">
          <div className="text-center">
            <Label>BEST</Label>
            <div className="glow-a text-sm font-bold text-amber sm:text-base">
              {top ? formatScore(top.score) : "—"}
            </div>
          </div>
          <DotRule className="hidden flex-1 sm:flex" />
          <div className="text-center">
            <Label>LAUNCHES</Label>
            <div className="glow-p text-sm font-bold text-phosphor sm:text-base">
              {totals.launches}
            </div>
          </div>
          <DotRule className="hidden flex-1 sm:flex" />
          <div className="text-center">
            <Label>FURTHEST</Label>
            <div className="glow-c text-sm font-bold text-cyan sm:text-base">
              W{totals.bestWave || "—"}
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[7px] tracking-[0.24em] text-dim/60">
          ↑↓ SELECT · ENTER LAUNCH · OKANFXLABS AI DESIGN LABS
        </div>
      </div>

      {/* Callsign modal */}
      <AnimatePresence>
        {editing && (
          <CallsignModal
            value={callsign}
            onCancel={() => setEditing(false)}
            onSave={(v) => {
              onCallsign(v);
              setEditing(false);
              audio.play("confirm");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CallsignModal({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onSave(v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [v, onSave, onCancel]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="cabinet grain w-[19rem] p-6"
        role="dialog"
        aria-label="Enter pilot callsign"
      >
        <Label>PILOT CALLSIGN</Label>
        <input
          autoFocus
          value={v}
          maxLength={8}
          onChange={(e) => setV(e.target.value.toUpperCase())}
          aria-label="Callsign"
          className="glow-p mt-2 w-full border-b border-phosphor/40 bg-transparent pb-1 text-center text-2xl font-black tracking-[0.3em] text-phosphor outline-none"
        />
        <p className="mt-2 text-center text-[8px] text-dim">
          Up to 8 characters. Shown on the leaderboard.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <PixelButton onClick={() => onSave(v)}>Save</PixelButton>
          <PixelButton onClick={onCancel} variant="danger">
            Cancel
          </PixelButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ScoreRow({
  s,
  i,
  highlight,
}: {
  s: HighScore;
  i: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 border-b border-white/5 px-2 py-1.5 text-[9px] sm:text-[10px] ${
        highlight ? "bg-phosphor/10" : ""
      }`}
    >
      <span className="w-4 text-dim">{String(i + 1).padStart(2, "0")}</span>
      <span className={`w-16 truncate font-bold ${highlight ? "text-phosphor glow-p" : "text-cyan"}`}>
        {s.callsign}
      </span>
      <span className="flex-1 text-right font-bold text-amber glow-a">
        {formatScore(s.score)}
      </span>
      <span className="w-10 text-right text-dim">W{s.wave}</span>
      <span className="hidden w-12 text-right text-dim sm:inline">
        {s.accuracy.toFixed(0)}%
      </span>
    </div>
  );
}

export function formatDuration(s: number): string {
  return formatTime(s);
}