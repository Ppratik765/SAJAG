"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";

export type MarkKind = "highlight" | "circle";

export const HARD_CATEGORIES = new Set([
  "OTP_PIN_REQUEST",
  "MONEY_TRANSFER",
  "REMOTE_ACCESS_APP",
  "ISOLATION",
  "SECRECY",
  "THREAT_ARREST",
]);

interface MarkProps {
  children: React.ReactNode;
  category: string;
  kind?: MarkKind;
  explanation?: string;
  weight?: number;
}

export function Mark({
  children,
  category,
  kind,
  explanation,
  weight = 2,
}: MarkProps) {
  const isHard = kind ? kind === "circle" : HARD_CATEGORIES.has(category);
  const shouldReduceMotion = useReducedMotion();

  const accessibleLabel = `${category.replace(/_/g, " ")}${
    explanation ? `: ${explanation}` : ""
  } (Weight: ${weight})`;

  if (isHard) {
    // Hard category: hand-drawn vermilion irregular circle
    return (
      <span
        tabIndex={0}
        role="mark"
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className="relative inline mx-1 px-1.5 py-0.5 rounded cursor-help font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--alarm)]"
        style={{ color: "var(--alarm-text)" }}
      >
        <span className="relative z-10">{children}</span>
        {/* Vermilion hand-drawn ellipse SVG background */}
        <svg
          className="absolute -inset-x-1.5 -inset-y-1 w-[calc(100%+12px)] h-[calc(100%+8px)] pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 6,50 C 4,18 35,4 65,6 C 92,8 98,28 95,55 C 92,84 65,96 35,94 C 10,92 2,75 7,48 C 10,30 25,12 50,8"
            fill="none"
            stroke="var(--alarm)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: shouldReduceMotion ? "none" : 380,
              strokeDashoffset: shouldReduceMotion ? 0 : 0,
              animation: shouldReduceMotion ? "none" : "drawCircle 450ms ease-out forwards",
            }}
          />
        </svg>
      </span>
    );
  }

  // Soft category: marker stroke highlighter
  return (
    <mark
      tabIndex={0}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="relative inline-block mx-0.5 px-1 py-0.5 rounded-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
      style={{
        backgroundColor: "var(--marker)",
        color: "var(--ink)",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        backgroundPosition: "left bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </mark>
  );
}
