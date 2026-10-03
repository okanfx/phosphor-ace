"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { subscribe, getState, setScreen, type Screen } from "@/lib/ui/store";
import { PixelButton, Label } from "./ui/Chrome";
import { audio } from "@/lib/audio/engine";
import { getScores } from "@/lib/data/save";
import { formatScore, formatTime } from "@/lib/game/math";

/**
 * In-flight HUD, pause card, and the debrief. The HUD stays deliberately thin
 * so the dot-matrix panel underneath is the star.
 *
 * An OKANFXLABS AI Design Labs production.
 */

function useStore<T>(selector: (s: ReturnType<typeof getState>) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}

/* ────────────────────────────────────────────────────────────── HUD ───── */

export function Hud() {
  const screen = useStore((s) => s.screen);
  const hud = useStore((s) => s.hud);
  if (screen !== "playing") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-phosphor/80 shadow-[0_0_8px_#3bffb0]" />
          <span className="text-[8px] tracking-[0.3em] text-phosphor/80">
            {hud.callsign}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hud.fps !== undefined && hud.fps < 45 && (
            <span className="text-[8px] tracking-[0.2em] text-amber/70">LOW FPS</span>
          )}
          <button
            type="button"
            onClick={() => {
              setScreen("pause");
            }}
            className="btn btn-ghost px-2 py-1 text-[9px]"
            aria-label="Pause game"
          >
            ❚❚
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(6, hud.lives) }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 bg-phosphor shadow-[0_0_6px_#3bffb0]" />
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(5, hud.bombs) }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 bg-amber shadow-[0_0_6px_#ffe14d]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── PAUSE ───── */

export function Pause({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  onQuit: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault();
        audio.play("back");
        onResume();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onResume]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.94, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="cabinet grain w-[19rem] p-6 text-center"
        role="dialog"
        aria-label="Game paused"
      >
        <Label>FLIGHT HELD</Label>
        <h2 className="glow-a mt-2 text-xl font-black tracking-[0.3em] text-amber">PAUSED</h2>
        <div className="mt-4 flex flex-col gap-2">
          <PixelButton variant="primary" onClick={onResume} autoFocus>
            Resume
          </PixelButton>
          <PixelButton onClick={onQuit} variant="danger">
            Abandon Sortie
          </PixelButton>
        </div>
        <p className="mt-4 text-[8px] text-dim/60">P or ESC to resume</p>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────── GAME OVER ──── */

export function GameOver({
  onRetry,
  onAttract,
  victory,
  callsign,
}: {
  onRetry: () => void;
  onAttract: () => void;
  victory: boolean;
  callsign: string;
}) {
  const [entry, setEntry] = useState(callsign);

  useEffect(() => {
    setEntry(callsign);
  }, [callsign]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex w-full max-w-md flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
        >
          <h2
            className={`glow-d text-2xl font-black tracking-[0.24em] sm:text-3xl ${
              victory ? "text-phosphor glow-p" : "text-danger"
            }`}
          >
            {victory ? "SKY SECURED" : "AIRFRAME LOST"}
          </h2>
          <div className="mt-1 text-center text-[9px] tracking-[0.28em] text-dim">
            {victory
              ? "ALL SIX SECTORS CLEARED — THE KABAL-ASCENSION LINE IS BROKEN"
              : "THE KABAL-ASCENSION LINE HOLDS. FOR NOW."}
          </div>
        </motion.div>

        <Debrief victory={victory} entry={entry} setEntry={setEntry} />

        <div className="mt-6 flex gap-3">
          <PixelButton variant="primary" onClick={onRetry} autoFocus>
            Fly Again
          </PixelButton>
          <PixelButton onClick={onAttract}>Attract</PixelButton>
        </div>
      </motion.div>
    </div>
  );
}

function Debrief({
  victory,
  entry,
  setEntry,
}: {
  victory: boolean;
  entry: string;
  setEntry: (s: string) => void;
}) {
  const result = useStore((s) => s.result);
  const [record, setRecord] = useState(false);

  // The run is already on the table the moment it ends — this only decides
  // whether we offer the callsign editor for a new #1.
  useEffect(() => {
    if (!result) return;
    if (result.rank === 0 && result.score > 0) {
      setRecord(true);
      audio.play("record");
    } else {
      audio.play("gameOver");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="cabinet grain mt-5 w-full p-5"
    >
      <Label>FLIGHT DEBRIEF</Label>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[9px] tracking-[0.2em] text-dim">SCORE</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glow-a text-2xl font-black text-amber"
        >
          {formatScore(result.score)}
        </motion.span>
      </div>

      {record ? (
        <div className="glow-p mt-1 text-center text-[10px] font-bold tracking-[0.24em] text-phosphor">
          ★ NEW CABINET RECORD ★
        </div>
      ) : result.rank > 0 ? (
        <div className="mt-1 text-center text-[9px] tracking-[0.2em] text-cyan">
          RANKED #{result.rank + 1} ON THIS CABINET
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Mini label="WAVE" value={String(result.wave)} tone="cyan" />
        <Mini label="KILLS" value={String(result.kills)} />
        <Mini label="ACCURACY" value={`${result.accuracy.toFixed(1)}%`} tone="amber" />
        <Mini label="BEST CHAIN" value={`${result.maxCombo}`} tone="cyan" />
        <Mini label="AIR TIME" value={formatTime(result.time)} />
        <Mini
          label="CAPITAL SHIPS"
          value={`${result.bosses}`}
          tone={result.bosses > 0 ? "danger" : "dim"}
        />
      </div>

      {record && (
        <div className="mt-4">
          <Label>LOG THIS FLIGHT AS</Label>
          <input
            value={entry}
            maxLength={8}
            onChange={(e) => setEntry(e.target.value.toUpperCase())}
            aria-label="Callsign for this run"
            className="glow-p mt-1 w-full border-b border-phosphor/40 bg-transparent text-center text-lg font-black tracking-[0.3em] text-phosphor outline-none"
          />
          <div className="mt-1 text-center text-[7px] text-dim/60">
            Applies from the next flight on this cabinet.
          </div>
        </div>
      )}

      <Medals victory={victory} />
    </motion.div>
  );
}

function Medals({ victory }: { victory: boolean }) {
  const result = useStore((s) => s.result);
  const medals = useMemo(() => {
    if (!result) return [] as string[];
    const m: string[] = [];
    if (victory) m.push("SKY BREAKER");
    if (result.wave >= 6) m.push("DEEP RUN");
    if (result.bosses >= 1) m.push("CAPITAL SLAYER");
    if (result.accuracy >= 40) m.push("MARKSMAN");
    if (result.maxCombo >= 40) m.push("UNBROKEN CHAIN");
    if (result.score >= 100000) m.push("SIX FIGURES");
    return m;
  }, [result, victory]);
  if (medals.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
      {medals.map((m) => (
        <span
          key={m}
          className="border border-amber/40 bg-amber/10 px-2 py-1 text-[8px] font-bold tracking-[0.2em] text-amber"
        >
          ★ {m}
        </span>
      ))}
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "phos",
}: {
  label: string;
  value: string;
  tone?: "phos" | "cyan" | "amber" | "danger" | "dim";
}) {
  const c =
    tone === "cyan"
      ? "text-cyan glow-c"
      : tone === "amber"
        ? "text-amber glow-a"
        : tone === "danger"
          ? "text-danger glow-d"
          : tone === "dim"
            ? "text-dim"
            : "text-phosphor";
  return (
    <div>
      <div className="text-[7px] tracking-[0.2em] text-dim">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${c}`}>{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── high scores ─── */

export function LeaderboardPreview({ limit = 5 }: { limit?: number }) {
  const [scores, setScores] = useState(() => getScores().slice(0, limit));
  useEffect(() => {
    setScores(getScores().slice(0, limit));
  }, [limit]);
  if (scores.length === 0) return null;
  return (
    <div className="mt-4 w-full max-w-xs">
      <Label>TOP PILOTS</Label>
      <div className="mt-1 flex flex-col gap-0.5">
        {scores.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[9px]">
            <span className={i === 0 ? "font-bold text-phosphor" : "text-cyan"}>
              {s.callsign}
            </span>
            <span className="text-amber glow-a">{formatScore(s.score)}</span>
            <span className="text-dim">W{s.wave}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { AnimatePresence };