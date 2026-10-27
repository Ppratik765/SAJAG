"use client";

import React from "react";
import { RiskLevel } from "./VerdictStamp";

interface LevelStripProps {
  level: RiskLevel;
  score?: number;
  className?: string;
}

export function LevelStrip({ level, score = 0, className = "" }: LevelStripProps) {
  // Score mapping: safe (0-2), suspicious (3-6), likely_scam (7-10), scam (11+)
  const normalizedPercent = Math.min(
    100,
    Math.max(
      4,
      level === "safe"
        ? (score / 3) * 24
        : level === "suspicious"
        ? 25 + ((score - 3) / 4) * 24
        : level === "likely_scam"
        ? 50 + ((score - 7) / 4) * 24
        : 75 + Math.min(25, ((score - 11) / 5) * 25)
    )
  );

  return (
    <div
      className={`w-full max-w-xl mx-auto my-2 select-none ${className}`}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={15}
      aria-label={`Risk level indicator: current status is ${level.replace(/_/g, " ")}, score ${score}`}
    >
      {/* Zone labels: aligned with ruler zones, names only */}
      <div className="grid grid-cols-4 text-[10px] sm:text-xs font-semibold text-[var(--ink-muted)] mb-1 px-1 select-none">
        <span className={`text-left ${level === "safe" ? "text-[var(--safe-text)] font-bold" : ""}`}>
          No warning signs
        </span>
        <span className={`text-center ${level === "suspicious" ? "text-[var(--stamp)] font-bold" : ""}`}>
          Suspicious
        </span>
        <span className={`text-center ${level === "likely_scam" ? "text-[var(--alarm-text)] font-bold" : ""}`}>
          Likely scam
        </span>
        <span className={`text-right ${level === "scam" ? "text-[var(--alarm-text)] font-bold" : ""}`}>
          Scam
        </span>
      </div>

      {/* The School Ruler Strip */}
      <div className="relative h-6 rounded-sm border border-[var(--line)] bg-[var(--sheet)] flex items-center px-1 overflow-hidden">
        {/* 4 coloured subtle zones */}
        <div className="absolute inset-y-0 left-0 w-1/4 bg-[var(--safe)]/10 border-r border-[var(--line)]" />
        <div className="absolute inset-y-0 left-1/4 w-1/4 bg-[var(--marker)]/20 border-r border-[var(--line)]" />
        <div className="absolute inset-y-0 left-2/4 w-1/4 bg-[var(--alarm)]/15 border-r border-[var(--line)]" />
        <div className="absolute inset-y-0 left-3/4 w-1/4 bg-[var(--alarm)]/25" />

        {/* Ruler Tick Marks (millimeter-like) */}
        <div className="absolute inset-x-0 inset-y-0 flex justify-between px-2 items-end pb-0.5 pointer-events-none opacity-40">
          {Array.from({ length: 33 }).map((_, i) => (
            <div
              key={i}
              className={`w-[1px] bg-[var(--ink)] ${
                i % 8 === 0 ? "h-3.5 opacity-80" : i % 4 === 0 ? "h-2.5 opacity-60" : "h-1.5 opacity-30"
              }`}
            />
          ))}
        </div>

        {/* Marker Needle */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-[var(--ink)] rounded-full transition-all duration-300 ease-out shadow-sm -ml-0.5"
          style={{ left: `${normalizedPercent}%` }}
        >
          <div className="absolute -top-1 -left-1 w-3.5 h-2 bg-[var(--stamp)] rounded-xs" />
        </div>
      </div>
    </div>
  );
}
