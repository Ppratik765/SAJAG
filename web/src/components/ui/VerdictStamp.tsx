"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n, Locale } from "@/lib/i18n/context";

export type RiskLevel = "safe" | "suspicious" | "likely_scam" | "scam";

interface VerdictStampProps {
  level: RiskLevel;
  className?: string;
  size?: "sm" | "md" | "lg" | "giant";
  lang?: Locale | string;
  showSplatter?: boolean;
}

interface StampLangContent {
  word: string;
  sub: string;
}

interface StampConfigItem {
  en: StampLangContent;
  hi: StampLangContent;
  color: string;
  borderDash: string;
  rotation: number;
}

// Define properly typed config
const FULL_STAMP_CONFIG: Record<RiskLevel, StampConfigItem> = {
  safe: {
    en: { word: "CLEAR", sub: "No warning signs" },
    hi: { word: "साफ़", sub: "अभी कोई संकेत नहीं" },
    color: "var(--safe)",
    borderDash: "6 3",
    rotation: -3.5,
  },
  suspicious: {
    en: { word: "CAUTION", sub: "Stay vigilant" },
    hi: { word: "सतर्क", sub: "सावधान रहें" },
    color: "var(--stamp)",
    borderDash: "8 2 2 2",
    rotation: -5.5,
  },
  likely_scam: {
    en: { word: "SUSPECTED", sub: "Do not pay" },
    hi: { word: "आशंका", sub: "पैसे न भेजें" },
    color: "var(--alarm)",
    borderDash: "10 2",
    rotation: -7,
  },
  scam: {
    en: { word: "SCAM", sub: "Hang up now" },
    hi: { word: "ठगी", sub: "तुरंत फोन काटें" },
    color: "var(--alarm)",
    borderDash: "none",
    rotation: -8,
  },
};

export function VerdictStamp({
  level,
  className = "",
  size = "md",
  lang,
  showSplatter = true,
}: VerdictStampProps) {
  const { locale: contextLocale } = useI18n();
  const activeLang = (lang === "en" || lang === "hi" ? lang : contextLocale) as "en" | "hi";
  const cfg = FULL_STAMP_CONFIG[level];
  const text = cfg[activeLang] || cfg.en;
  const shouldReduceMotion = useReducedMotion();

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs min-w-[120px]",
    md: "px-5 py-2.5 text-sm min-w-[170px]",
    lg: "px-7 py-3.5 text-base min-w-[220px]",
    giant: "px-9 py-5 text-xl min-w-[280px]",
  }[size];

  // Animation: thump down once per level change
  const animProps = shouldReduceMotion
    ? { initial: false, animate: { scale: 1, opacity: 1 } }
    : {
        initial: { scale: 1.5, opacity: 0.85 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring" as const, stiffness: 480, damping: 22, duration: 0.18 },
      };

  return (
    <motion.div
      key={`${level}-${activeLang}`}
      {...animProps}
      className={`relative inline-flex flex-col items-center justify-center select-none text-center rounded border-4 uppercase font-display tracking-wider font-extrabold shadow-sm ${sizeClasses} ${className}`}
      style={{
        color: cfg.color,
        borderColor: cfg.color,
        transform: `rotate(${cfg.rotation}deg)`,
        borderStyle: level === "safe" ? "dashed" : "solid",
      }}
      role="status"
      aria-live="polite"
    >
      {/* Ink splatter spreading out from stamp edges on slam */}
      {showSplatter && !shouldReduceMotion && (
        <svg
          className="absolute -inset-3.5 pointer-events-none w-[calc(100%+28px)] h-[calc(100%+28px)]"
          viewBox="0 0 100 60"
          fill={cfg.color}
          aria-hidden="true"
        >
          <circle cx="4" cy="8" r="1.5" opacity="0.65" />
          <circle cx="8" cy="3" r="1.0" opacity="0.5" />
          <circle cx="2" cy="18" r="0.8" opacity="0.7" />
          <circle cx="96" cy="52" r="1.4" opacity="0.6" />
          <circle cx="98" cy="42" r="1.1" opacity="0.75" />
          <circle cx="94" cy="56" r="0.7" opacity="0.5" />
          <circle cx="70" cy="58" r="1.2" opacity="0.6" />
          <circle cx="28" cy="2" r="1.1" opacity="0.65" />
        </svg>
      )}

      {/* One big primary word in the active language */}
      <span className="text-[1.35em] leading-none tracking-widest font-extrabold">
        {text.word}
      </span>
      {/* One short subtext line */}
      <span className="text-[0.62em] tracking-widest opacity-85 border-t border-current pt-0.5 mt-1 w-full normal-case sm:uppercase">
        {text.sub}
      </span>
    </motion.div>
  );
}
