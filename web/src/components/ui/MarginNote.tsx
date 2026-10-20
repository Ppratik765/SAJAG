import React from "react";

interface MarginNoteProps {
  text: string;
  category?: string;
  rotation?: number; // e.g. -1.5 to +1.5
  className?: string;
}

export function MarginNote({
  text,
  category,
  rotation = -1.2,
  className = "",
}: MarginNoteProps) {
  return (
    <aside
      className={`inline-flex items-start gap-1.5 font-hand text-sm text-[var(--ink-muted)] select-none max-w-full ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      aria-label={category ? `Margin note for ${category}: ${text}` : text}
    >
      {/* Thin hand-drawn pointer arrow */}
      <svg
        width="18"
        height="12"
        viewBox="0 0 24 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 mt-0.5 opacity-75"
        aria-hidden="true"
      >
        <path d="M 22,8 C 16,7 10,9 3,8" />
        <path d="M 8,3 L 2,8 L 8,13" />
      </svg>
      <span className="font-medium leading-snug break-words">
        {text}
      </span>
    </aside>
  );
}
