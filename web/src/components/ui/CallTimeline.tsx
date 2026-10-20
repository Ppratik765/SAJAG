"use client";

import React from "react";

export interface TimelineSignal {
  id: string;
  category: string;
  segmentIndex: number;
  timeSeconds: number;
  isHard?: boolean;
}

interface CallTimelineProps {
  durationSeconds: number;
  signals: TimelineSignal[];
  firstCrossed?: {
    suspicious?: number | null;
    likely_scam?: number | null;
  };
  onSelectSignal?: (segmentIndex: number) => void;
  className?: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function CallTimeline({
  durationSeconds,
  signals,
  firstCrossed,
  onSelectSignal,
  className = "",
}: CallTimelineProps) {
  const safeDuration = Math.max(durationSeconds, 1);

  return (
    <div className={`w-full select-none text-xs text-[var(--ink-muted)] ${className}`}>
      {/* Time header: only show first flagged if computed */}
      <div className="flex justify-between items-center mb-1 text-[11px] tabular-nums">
        <span>0:00</span>
        {firstCrossed?.likely_scam && (
          <span className="text-[var(--alarm-text)] font-semibold">
            First flagged at {formatTime(firstCrossed.likely_scam)}
          </span>
        )}
        <span>{formatTime(durationSeconds)}</span>
      </div>

      {/* The Track */}
      <div className="relative h-2 w-full bg-[var(--line)] rounded-full overflow-visible">
        {/* Signal dots */}
        {signals.map((sig) => {
          const leftPercent = Math.min(
            100,
            Math.max(0, (sig.timeSeconds / safeDuration) * 100)
          );
          return (
            <button
              key={sig.id}
              type="button"
              onClick={() => onSelectSignal?.(sig.segmentIndex)}
              aria-label={`Jump to ${sig.category.replace(/_/g, " ")} at ${formatTime(
                sig.timeSeconds
              )}`}
              title={`${sig.category.replace(/_/g, " ")} (${formatTime(
                sig.timeSeconds
              )})`}
              className="absolute -top-1 w-4 h-4 -ml-2 rounded-full border-2 border-[var(--sheet)] shadow-xs transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
              style={{
                left: `${leftPercent}%`,
                backgroundColor: sig.isHard ? "var(--alarm)" : "var(--marker)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
