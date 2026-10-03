"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cabinet, Marquee, PowerStrip } from "./ui/Chrome";
import Attract from "./Attract";
import Briefing from "./Briefing";
import Hangar from "./Hangar";
import Scores from "./Scores";
import Options from "./Options";
import { Hud, Pause, GameOver, LeaderboardPreview } from "./Hud";
import { subscribe, getState, setScreen, setHud, setResult, type Screen } from "@/lib/ui/store";
import { getSettings, updateSettings, sanitizeCallsign } from "@/lib/data/save";
import { audio } from "@/lib/audio/engine";
import { PANEL_H, PANEL_W } from "@/lib/game/config";
import type { RunStats } from "@/lib/game/engine";

/**
 * PHOSPHOR ACE — cabinet shell.
 * Owns routing between screens, keyboard routing, and the CRT-cabinet toggle.
 *
 * An OKANFXLABS AI Design Labs production.
 */

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

type Route =
  | "attract"
  | "brief"
  | "hangar"
  | "scores"
  | "options"
  | "playing"
  | "debrief";

export default function Arcade() {
  const [route, setRoute] = useState<Route>("attract");
  const [runToken, setRunToken] = useState(0);
  const [paused, setPaused] = useState(false);
  const [endless, setEndless] = useState(false);
  const [callsign, setCallsign] = useState("ACE");
  const [result, setResultState] = useState<RunStats | null>(null);
  const [victory, setVictory] = useState(false);
  const [cabinet, setCabinet] = useState(true);
  const [booted, setBooted] = useState(false);
  const [touch] = useState(false);
  const inputGate = useRef<HTMLDivElement | null>(null);

  const screen = useSyncExternalStore(
    subscribe,
    () => getState().screen,
    () => "boot",
  ) as Screen;

  /* ── boot: load saved state, warm the sprite bank, show the attract screen ── */
  useEffect(() => {
    const s = getSettings();
    setCallsign(sanitizeCallsign("ACE"));
    // On phones, default to panel mode (no cabinet chrome) so the game fills the screen.
    // Users can still toggle the cabinet via the button.
    const isPhone = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    setCabinet(s.crtCabinet ?? !isPhone);
    // Detect touch once so we can nudge the copy.
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      // touch flag intentionally unused in copy; keep detection for future overlays
    }
    setBooted(true);
    setScreen("attract");
    setHud({ callsign, demo: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── audio unlock on the very first gesture anywhere ─────────────────── */
  const onFirstGesture = useCallback(() => {
    void audio.init().then(() => {
      const s = getSettings();
      audio.setMusicEnabled(s.music);
      audio.setSfxEnabled(s.sfx);
      audio.setIntensity(route === "attract" ? 0.25 : 1);
      audio.setAmbience(1);
    });
  }, [route]);

  /* ── routing helpers ─────────────────────────────────────────────────── */
  const go = useCallback((r: Route) => {
    audio.play("select");
    setRoute(r);
    const map: Record<Route, Screen> = {
      attract: "attract",
      brief: "brief",
      hangar: "hangar",
      scores: "scores",
      options: "options",
      playing: "playing",
      debrief: "gameover",
    };
    setScreen(map[r]);
  }, []);



  const launch = useCallback((endlessMode: boolean) => {
    audio.play("confirm");
    setEndless(endlessMode);
    setResultState(null);
    setVictory(false);
    setPaused(false);
    setRoute("playing");
    setScreen("playing");
    setResult(null);
    setRunToken((t) => t + 1);
  }, []);

  const setEndlessMode = useCallback((v: boolean) => {
    setEndless(v);
  }, []);

  const toAttract = useCallback(() => {
    audio.play("back");
    setRoute("attract");
    setScreen("attract");
    setPaused(false);
    setResultState(null);
    setHud({ demo: true, callsign, announce: "", announceOn: false });
  }, [callsign]);

  const onRunEnd = useCallback((stats: RunStats) => {
    setResultState(stats);
    setVictory(false);
  }, []);

  /* ── global escape routing ───────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (route === "playing") {
          if (paused) {
            setPaused(false);
            setScreen("playing");
          } else {
            setPaused(true);
            setScreen("pause");
          }
        }
      }
      if (e.key === "Enter" && route === "attract") {
        audio.play("confirm");
        launch(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [route, paused, launch]);

  /* ── when the engine reports the run is over, show the debrief ──────── */
  useEffect(() => {
    if (route === "playing" && screen === "gameover" && result) {
      setVictory(false);
      setRoute("debrief");
      setScreen("debrief" as Screen);
    } else if (route === "playing" && screen === "victory" && result) {
      setVictory(true);
      setRoute("debrief");
      setScreen("victory");
    }
  }, [route, screen, result]);

  /* ── responsive touch detection for control hints ────────────────────── */
  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined") {
        document.documentElement.dataset.touch =
          window.matchMedia("(pointer: coarse)").matches ? "1" : "0";
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      className={`relative h-[100dvh] w-full overflow-hidden ${
        cabinet ? "bg-void p-0 sm:p-2 md:p-4" : "bg-black"
      }`}
    >
      {/* Ambient room glow behind the cabinet. */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-x-0 top-0 h-1/3 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,255,176,0.08),transparent)]" />
      </div>

      <div
        className={`relative mx-auto flex h-full w-full items-center justify-center ${
          cabinet ? "max-w-[1280px]" : ""
        }`}
      >
        {cabinet ? (
          <Cabinet side="right">
            <div className="relative flex h-full w-full items-center justify-center">
              {/* The screen: fixed 3:4 aspect, letterboxed. */}
              <div
                className="relative aspect-[3/4] h-full max-h-full"
                style={{ maxWidth: "min(100%, calc((100dvh - 2rem) * 0.75))" }}
              >
                <ScreenShell
                  booted={booted}
                  onFirstGesture={onFirstGesture}
                  route={route}
                  runToken={runToken}
                  endless={endless}
                  paused={paused}
                  setPaused={setPaused}
                  onRunEnd={onRunEnd}
                  callsign={callsign}
                  setCallsign={setCallsign}
                  go={go}
                  launch={launch}
                  toAttract={toAttract}
                  setEndlessMode={setEndlessMode}
                  result={result}
                  victory={victory}
                  inputGate={inputGate}
                />
              </div>
              <Marquee />
              <PowerStrip />
            </div>
          </Cabinet>
        ) : (
          <div className="relative h-full w-full">
            <ScreenShell
              booted={booted}
              onFirstGesture={onFirstGesture}
              route={route}
              runToken={runToken}
              endless={endless}
              paused={paused}
              setPaused={setPaused}
              onRunEnd={onRunEnd}
              callsign={callsign}
              setCallsign={setCallsign}
              go={go}
              launch={launch}
              toAttract={toAttract}
              setEndlessMode={setEndlessMode}
              result={result}
              victory={victory}
              inputGate={inputGate}
            />
          </div>
        )}
      </div>

      {/* Cabinet toggle — always reachable. */}
      <button
        type="button"
        onClick={() => {
          const next = !cabinet;
          setCabinet(next);
          updateSettings({ crtCabinet: next });
          audio.play("tick");
        }}
        className="absolute right-2 bottom-2 z-40 rounded border border-white/10 bg-black/50 px-2 py-1 text-[8px] tracking-[0.2em] text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        aria-label={cabinet ? "Hide cabinet frame" : "Show cabinet frame"}
      >
        {cabinet ? "▣ CABINET" : "▢ PANEL"}
      </button>
      {void touch}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── screen ──── */

function ScreenShell({
  booted,
  onFirstGesture,
  route,
  runToken,
  endless,
  paused,
  setPaused,
  onRunEnd,
  callsign,
  setCallsign,
  go,
  launch,
  toAttract,
  setEndlessMode,
  result,
  victory,
  inputGate,
}: {
  booted: boolean;
  onFirstGesture: () => void;
  route: Route;
  runToken: number;
  endless: boolean;
  paused: boolean;
  setPaused: (v: boolean) => void;
  onRunEnd: (s: RunStats) => void;
  callsign: string;
  setCallsign: (v: string) => void;
  go: (r: Route) => void;
  launch: (endless: boolean) => void;
  toAttract: () => void;
  setEndlessMode: (v: boolean) => void;
  result: RunStats | null;
  victory: boolean;
  inputGate: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative h-full w-full">
      {/* The canvas is always mounted — the attract screen plays live. */}
      <GameCanvas
        runToken={route === "playing" ? runToken : 0}
        endless={endless}
        paused={paused || route !== "playing"}
        onRunEnd={onRunEnd}
        onFirstGesture={onFirstGesture}
      />

      {/* DOM overlay screens. */}
      <AnimatePresence mode="wait">
        {route === "attract" && booted && (
          <motion.div
            key="attract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            ref={inputGate}
          >
            <Attract
              callsign={callsign}
              onLaunch={(e) => {
                setEndlessMode(e);
                go("brief");
              }}
              onHangar={() => go("hangar")}
              onScores={() => go("scores")}
              onOptions={() => go("options")}
              onCallsign={(v) => {
                setCallsign(v);
                setHud({ callsign: v });
              }}
            />
          </motion.div>
        )}
        {route === "brief" && booted && (
          <motion.div key="brief" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Briefing
              endless={endless}
              callsign={callsign}
              onStart={() => launch(endless)}
              onBack={() => go("attract")}
            />
          </motion.div>
        )}
        {route === "hangar" && booted && (
          <motion.div key="hangar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Hangar
              onBack={() => go("attract")}
              bestWave={bestWave()}
              bosses={bossesKilled()}
            />
          </motion.div>
        )}
        {route === "scores" && booted && (
          <motion.div key="scores" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Scores onBack={() => go("attract")} />
          </motion.div>
        )}
        {route === "options" && booted && (
          <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Options onBack={() => go("attract")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay. */}
      <AnimatePresence>
        {route === "playing" && paused && (
          <Pause
            onResume={() => {
              setPaused(false);
              setScreen("playing");
            }}
            onQuit={() => {
              setPaused(false);
              toAttract();
            }}
          />
        )}
      </AnimatePresence>

      {/* Debrief overlay (game over or victory). */}
      <AnimatePresence>
        {route === "debrief" && result && (
          <GameOverWithLeaderboard
            victory={victory}
            callsign={callsign}
            onRetry={() => launch(endless)}
            onAttract={toAttract}
          />
        )}
      </AnimatePresence>

      {/* The thin in-flight HUD sits above the canvas during play. */}
      {route === "playing" && !paused && <Hud />}
    </div>
  );
}

function GameOverWithLeaderboard({
  victory,
  callsign,
  onRetry,
  onAttract,
}: {
  victory: boolean;
  callsign: string;
  onRetry: () => void;
  onAttract: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 overflow-y-auto">
      <GameOverInner victory={victory} callsign={callsign} onRetry={onRetry} onAttract={onAttract} />
    </div>
  );
}

function GameOverInner({
  victory,
  callsign,
  onRetry,
  onAttract,
}: {
  victory: boolean;
  callsign: string;
  onRetry: () => void;
  onAttract: () => void;
}) {
  return (
    <GameOverWrap>
      <GameOverBody victory={victory} callsign={callsign} onRetry={onRetry} onAttract={onAttract} />
    </GameOverWrap>
  );
}

function GameOverWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-black/60 px-5 py-8 backdrop-blur-sm">
      {children}
    </div>
  );
}

function GameOverBody({
  victory,
  callsign,
  onRetry,
  onAttract,
}: {
  victory: boolean;
  callsign: string;
  onRetry: () => void;
  onAttract: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center">
      <GameOver
        victory={victory}
        callsign={callsign}
        onRetry={onRetry}
        onAttract={onAttract}
      />
      <LeaderboardPreview limit={3} />
    </div>
  );
}

/* ────────────────────────────────────────────── tiny local helpers ──── */

let endlessFlagCache = false;
function setEndlessFlag(v: boolean): void {
  endlessFlagCache = v;
}
function _unused(): void {
  void setEndlessFlag;
}
function bestWave(): number {
  try {
    const raw = localStorage.getItem("phosphor-ace/v1");
    if (!raw) return 0;
    const d = JSON.parse(raw) as { totals?: { bestWave?: number } };
    return d.totals?.bestWave ?? 0;
  } catch {
    return 0;
  }
}
function bossesKilled(): number {
  try {
    const raw = localStorage.getItem("phosphor-ace/v1");
    if (!raw) return 0;
    const d = JSON.parse(raw) as { totals?: { bosses?: number } };
    return d.totals?.bosses ?? 0;
  } catch {
    return 0;
  }
}

export { PANEL_W, PANEL_H };