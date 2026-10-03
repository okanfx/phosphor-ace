"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PixelButton, DotRule, Label, Marquee } from "./ui/Chrome";
import { ScoreRow } from "./Attract";
import { getScores, getTotals, clearScores, type HighScore } from "@/lib/data/save";
import { audio } from "@/lib/audio/engine";
import { formatScore, formatTime } from "@/lib/game/math";

/**
 * High score table + career telemetry.
 *
 * An OKANFXLABS AI Design Labs production.
 */

interface Props {
  onBack: () => void;
}

export default function Scores({ onBack }: Props) {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [totals, setTotals] = useState(getTotals());
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setScores(getScores());
    setTotals(getTotals());
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        audio.play("back");
        onBack();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onBack]);

  const acc = totals.shots > 0 ? (totals.hits / totals.shots) * 100 : 0;
  const kd = totals.kills;

  return (
    <div className="absolute inset-0 z-30 flex flex-col px-4 py-[5%] sm:px-7">
      <Marquee small />
      <div className="mt-6 flex items-end justify-between sm:mt-8">
        <div>
          <Label>PERSONAL BEST</Label>
          <h2 className="glow-a text-lg font-black tracking-[0.24em] text-amber sm:text-2xl">
            HIGH SCORE TABLE
          </h2>
        </div>
        <div className="flex gap-2">
          {scores.length > 0 && (
            <PixelButton
              onClick={() => {
                audio.play("confirm");
                setConfirmClear(true);
              }}
              variant="danger"
            >
              Clear
            </PixelButton>
          )}
          <PixelButton onClick={onBack}>← Back</PixelButton>
        </div>
      </div>

      <DotRule className="mt-3" />

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto border border-white/10 bg-black/25">
          <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5 text-[8px] tracking-[0.2em] text-dim">
            <span className="w-4">#</span>
            <span className="w-16">PILOT</span>
            <span className="flex-1 text-right">SCORE</span>
            <span className="w-10 text-right">WAVE</span>
            <span className="hidden w-12 text-right sm:inline">ACC</span>
          </div>
          {scores.length === 0 ? (
            <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="text-2xl text-dim/30" aria-hidden>
                ▓▓▓
              </div>
              <p className="text-[10px] text-dim">
                No flights logged. The table is wide open.
              </p>
              <p className="text-[8px] text-dim/60">
                Fly a sortie and put a name on it.
              </p>
            </div>
          ) : (
            scores.map((s, i) => <ScoreRow key={`${s.callsign}-${s.date}-${i}`} s={s} i={i} highlight={i === 0} />)
          )}
        </div>

        {/* Career */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="shrink-0 border border-white/10 bg-black/25 p-3 lg:w-52"
        >
          <Label>CAREER</Label>
          <DotRule className="my-2" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[9px] lg:grid-cols-1">
            <Row k="LAUNCHES" v={totals.launches} />
            <Row k="BEST SCORE" v={formatScore(totals.bestScore)} tone="amber" />
            <Row k="FURTHEST" v={`WAVE ${totals.bestWave || "—"}`} />
            <Row k="KILLS" v={totals.kills} />
            <Row k="ACCURACY" v={`${acc.toFixed(1)}%`} tone="cyan" />
            <Row k="BEST K/D" v={kd.toFixed(1)} />
            <Row k="CAPITAL SHIPS" v={totals.bosses} tone="danger" />
            <Row k="BOMBS SPENT" v={totals.bombs} />
            <Row k="FLAWLESS RUNS" v={totals.flawless} />
            <Row k="AIR TIME" v={formatTime(totals.seconds)} />
          </div>
        </motion.div>
      </div>

      <div className="mt-3 text-center text-[7px] tracking-[0.24em] text-dim/50">
        STORED LOCALLY ON THIS CABINET · ESC TO RETURN
      </div>

      {confirmClear && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <div className="cabinet grain w-[18rem] p-5">
            <Label>DANGER</Label>
            <p className="mt-2 text-[10px] text-danger glow-d">
              Erase every logged flight? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <PixelButton
                variant="danger"
                onClick={() => {
                  clearScores();
                  setScores([]);
                  setTotals(getTotals());
                  setConfirmClear(false);
                  audio.play("confirm");
                }}
              >
                Erase
              </PixelButton>
              <PixelButton onClick={() => setConfirmClear(false)}>Keep</PixelButton>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Row({ k, v, tone = "phos" }: { k: string; v: string | number; tone?: "phos" | "amber" | "cyan" | "danger" }) {
  const c =
    tone === "amber" ? "text-amber glow-a" : tone === "cyan" ? "text-cyan glow-c" : tone === "danger" ? "text-danger glow-d" : "text-phosphor";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-dim">{k}</span>
      <span className={`font-bold ${c}`}>{v}</span>
    </div>
  );
}