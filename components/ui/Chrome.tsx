"use client";

import { motion } from "framer-motion";

/**
 * Shared arcade chrome: the CRT cabinet shell, marquee, side rails and the
 * physical-feeling buttons. Everything is keyboard reachable and announces
 * itself to assistive tech.
 *
 * An OKANFXLABS AI Design Labs production.
 */

/* ────────────────────────────────────────────────────────── cabinet ──── */

export function Cabinet({
  children,
  side = "right",
  className = "",
}: {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`cabinet grain relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
    >
      <div className="relative flex h-full w-full items-center justify-center gap-2 p-2 sm:gap-4 sm:p-4">
        <div className="relative flex h-full min-w-0 items-center justify-center">
          {children}
        </div>
      </div>
      <span className="sr-only">Arcade cabinet, screen is {side}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── buttons ─── */

type ButtonVariant = "primary" | "ghost" | "danger";

export function PixelButton({
  children,
  onClick,
  variant = "ghost",
  className = "",
  disabled,
  autoFocus,
  ariaLabel,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
}) {
  const v =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className={`btn px-4 py-2 text-[11px] sm:px-5 sm:py-2.5 sm:text-xs ${v} ${disabled ? "pointer-events-none opacity-35" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────── marquee ─── */

export function Marquee({ small = false }: { small?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-3 sm:pt-5">
      <div className="pointer-events-none select-none">
        <div
          className={`glow-p font-black tracking-[0.42em] text-phosphor ${
            small ? "text-[10px] sm:text-xs" : "text-xs sm:text-base"
          }`}
        >
          PHOSPHOR&nbsp;ACE
        </div>
        <div className="mt-0.5 text-center text-[6px] tracking-[0.34em] text-dim sm:text-[7px]">
          OKANFXLABS AI DESIGN LABS
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── panel frame ── */

export function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full w-full">
      <div className="bezel grain relative h-full w-full overflow-hidden">
        {children}
        <div className="pointer-events-none absolute inset-0 scanlines opacity-60" />
      </div>
      {/* Physical bezel lip + corner rivets. */}
      <div className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/5" />
      {(
        [
          "left-3 top-3",
          "right-3 top-3",
          "left-3 bottom-3",
          "right-3 bottom-3",
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          className={`pointer-events-none absolute ${pos} h-1.5 w-1.5 rounded-full bg-white/10 shadow-[0_0_4px_rgba(255,255,255,0.2)]`}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── dot separators ─ */

export function DotRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="h-[3px] w-[3px] bg-phosphor/30"
          style={{ opacity: i % 6 === 0 ? 0.9 : 0.3 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── slide wrapper ─ */

export const panelFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────── labels ─ */

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[8px] tracking-[0.3em] text-dim uppercase sm:text-[9px]">{children}</div>
  );
}

export function Stat({
  label,
  value,
  tone = "phos",
}: {
  label: string;
  value: string | number;
  tone?: "phos" | "cyan" | "amber" | "danger";
}) {
  const c =
    tone === "cyan"
      ? "text-cyan glow-c"
      : tone === "amber"
        ? "text-amber glow-a"
        : tone === "danger"
          ? "text-danger glow-d"
          : "text-phosphor glow-p";
  return (
    <div className="flex flex-col gap-0.5">
      <Label>{label}</Label>
      <div className={`text-sm leading-none font-bold sm:text-base ${c}`}>{value}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── power strip ─ */

export function PowerStrip() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-3 pb-2 sm:px-5 sm:pb-3">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-phosphor/70 shadow-[0_0_6px_#3bffb0]" />
        <span className="text-[6px] tracking-[0.3em] text-dim sm:text-[7px]">PWR</span>
      </div>
      <div className="text-[6px] tracking-[0.3em] text-dim/70 sm:text-[7px]">
        MODEL PA-1 · 1983
      </div>
    </div>
  );
}