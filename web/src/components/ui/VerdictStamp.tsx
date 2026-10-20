"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type RiskLevel = "safe" | "suspicious" | "likely_scam" | "scam";

interface VerdictStampProps {
  level: RiskLevel;
  className?: string;
  size?: "sm" | "md" | "lg" | "giant";
}

const STAMP_CONFIG: Record<
  RiskLevel,
  {
    en: string;
    hi: string;
    color: string;
    borderDash: string;
    rotation: number;
    subtext: string;
  }
> = {
  safe: {
    en: "NO SIGNS FOUND",
    hi: "कोई संकेत नहीं",
    color: "var(--safe)",
    borderDash: "6 3",
    rotation: -4,
    subtext: "ALL CLEAR • सुरक्षित",
  },
  suspicious: {
    en: "BE CAREFUL",
    hi: "सावधान रहें",
    color: "var(--stamp)",
    borderDash: "8 2 2 2",
    rotation: -6,
    subtext: "STAY ALERT • सतर्क रहें",
  },
  likely_scam: {
    en: "LIKELY SCAM",
    hi: "ठगी की आशंका",
    color: "var(--alarm)",
    borderDash: "12 2",
    rotation: -7.5,
    subtext: "DO NOT PAY • पैसे न दें",
  },
  scam: {
    en: "SCAM — HANG UP",
    hi: "ठगी — फोन काटें",
    color: "var(--alarm)",
    borderDash: "none",
    rotation: -8,
    subtext: "STOP CALL NOW • तुरंत काटें",
  },
};

export function VerdictStamp({ level, className = "", size = "md" }: VerdictStampProps) {
  const cfg = STAMP_CONFIG[level];
  const shouldReduceMotion = useReducedMotion();

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs min-w-[130px]",
    md: "px-4 py-2.5 text-sm min-w-[180px]",
    lg: "px-6 py-3.5 text-base min-w-[240px]",
    giant: "px-8 py-5 text-xl min-w-[300px]",
  }[size];

  // Animation: thump down once per level change
  const animProps: {
    initial: { scale: number; opacity: number } | boolean;
    animate: { scale: number; opacity: number };
    transition?: { type: "spring"; stiffness: number; damping: number; duration: number };
  } = shouldReduceMotion
    ? { initial: false, animate: { scale: 1, opacity: 1 } }
    : {
        initial: { scale: 1.35, opacity: 0.8 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring", stiffness: 450, damping: 24, duration: 0.18 },
      };

  return (
    <motion.div
      key={level}
      {...animProps}
      className={`inline-flex flex-col items-center justify-center select-none text-center rounded border-4 uppercase font-display tracking-wider font-extrabold shadow-sm ${sizeClasses} ${className}`}
      style={{
        color: cfg.color,
        borderColor: cfg.color,
        transform: `rotate(${cfg.rotation}deg)`,
        borderStyle: level === "safe" ? "dashed" : "solid",
      }}
      role="status"
      aria-live="polite"
    >
      {/* Top Hindi label */}
      <span className="text-[0.88em] leading-tight font-extrabold opacity-95">
        {cfg.hi}
      </span>
      {/* Primary English Stamp */}
      <span className="text-[1.12em] leading-tight tracking-wider font-extrabold mt-0.5">
        {cfg.en}
      </span>
      {/* Subtext margin line */}
      <span className="text-[0.62em] tracking-widest opacity-80 border-t border-current pt-0.5 mt-1 w-full">
        {cfg.subtext}
      </span>
    </motion.div>
  );
}
