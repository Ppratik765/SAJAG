import React from "react";

interface SealProps {
  size?: number;
  className?: string;
  variant?: "brand" | "ink" | "alarm" | "safe";
}

export function Seal({ size = 44, className = "", variant = "brand" }: SealProps) {
  const colorMap = {
    brand: "var(--stamp)",
    ink: "var(--ink)",
    alarm: "var(--alarm)",
    safe: "var(--safe)",
  };

  const strokeColor = colorMap[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="सजग सील"
      role="img"
    >
      {/* Outer distressed circular seal rim */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeDasharray="95 3 45 4 60 2"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="50"
        r="39"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeDasharray="2 3"
        opacity="0.7"
      />

      {/* Central Devanagari Wordmark 'सजग' */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={strokeColor}
        fontFamily="var(--font-display), sans-serif"
        fontWeight="800"
        fontSize="25"
        letterSpacing="0.05em"
      >
        सजग
      </text>

      {/* Waveform accent line */}
      <path
        d="M26 68 L36 68 L40 64 L44 72 L48 62 L52 74 L56 65 L60 68 L74 68"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Star dots */}
      <circle cx="50" cy="22" r="2.2" fill={strokeColor} />
      <circle cx="34" cy="26" r="1.5" fill={strokeColor} opacity="0.6" />
      <circle cx="66" cy="26" r="1.5" fill={strokeColor} opacity="0.6" />
    </svg>
  );
}
