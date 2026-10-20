"use client";

import React, { useState, useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

export type MarkKind = "highlight" | "circle";

export const HARD_CATEGORIES = new Set([
  "OTP_PIN_REQUEST",
  "MONEY_TRANSFER",
  "REMOTE_ACCESS_APP",
  "ISOLATION",
  "SECRECY",
  "THREAT_ARREST",
  "AUTHORITY_CLAIM",
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
  const [showTooltip, setShowTooltip] = useState(false);
  const markRef = useRef<HTMLSpanElement>(null);

  const readableCategory = category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const accessibleLabel = `${readableCategory}${
    explanation ? `: ${explanation}` : ""
  } (Weight: ${weight})`;

  // Close tooltip on outside click or Escape
  useEffect(() => {
    if (!showTooltip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTooltip(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (markRef.current && !markRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showTooltip]);

  const toggleTooltip = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setShowTooltip((prev) => !prev);
  };

  const tooltipElement = showTooltip && (
    <div
      role="tooltip"
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded bg-[var(--sheet)] border border-[var(--line)] shadow-lg z-50 text-left pointer-events-auto"
      style={{
        boxShadow: "0 6px 20px -2px rgba(20, 22, 58, 0.15)",
      }}
    >
      <div className="flex items-center justify-between gap-1 border-b border-[var(--line)] pb-1 mb-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: isHard ? "var(--alarm-text)" : "var(--stamp)" }}
        >
          {readableCategory}
        </span>
        <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
          Risk +{weight}
        </span>
      </div>
      <p className="text-xs text-[var(--ink)] leading-snug">
        {explanation || "Identified red flag pattern in this conversation."}
      </p>
      {/* Tooltip triangle tail */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[var(--sheet)]" />
    </div>
  );

  if (isHard) {
    // Hard category: hand-drawn vermilion irregular circle
    return (
      <span
        ref={markRef}
        tabIndex={0}
        role="mark"
        aria-label={accessibleLabel}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={toggleTooltip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleTooltip(e);
          }
        }}
        className="relative inline-block mx-0.5 px-1.5 py-0.5 rounded cursor-pointer font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--alarm)] select-text"
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

        {tooltipElement}
      </span>
    );
  }

  // Soft category: marker stroke highlighter swipe
  return (
    <mark
      ref={markRef as unknown as React.RefObject<HTMLElement>}
      tabIndex={0}
      aria-label={accessibleLabel}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={toggleTooltip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          toggleTooltip(e);
        }
      }}
      className="relative inline-block mx-0.5 px-1 py-0.5 rounded-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] select-text"
      style={{
        backgroundColor: "var(--marker)",
        color: "var(--ink)",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
      {tooltipElement}
    </mark>
  );
}
