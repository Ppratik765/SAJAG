"use client";

import React, { useRef } from "react";
import { Mark, HARD_CATEGORIES } from "./Mark";
import { MarginNote } from "./MarginNote";
import { VerdictStamp, RiskLevel } from "./VerdictStamp";
import { useI18n, Locale } from "@/lib/i18n/context";

export interface CallSegment {
  index: number;
  text: string;
  time?: string; // e.g. "0:12"
}

export interface CallSignal {
  id: string;
  category: string;
  weight: number;
  evidence: string;
  segment_index: number;
  explanation?: string;
}

export interface CallMarginNoteItem {
  segmentIndex: number;
  category: string;
  text: string;
}

interface CallSheetProps {
  segments: CallSegment[];
  signals?: CallSignal[];
  marginNotes?: CallMarginNoteItem[];
  level: RiskLevel;
  lang?: Locale | string;
  className?: string;
  showStamp?: boolean;
}

export function CallSheet({
  segments,
  signals = [],
  marginNotes = [],
  level,
  lang,
  className = "",
  showStamp = true,
}: CallSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale: contextLocale } = useI18n();
  const activeLang = (lang === "en" || lang === "hi" ? lang : contextLocale) as "en" | "hi";

  // Group signals by segment index
  const signalsBySegment = signals.reduce<Record<number, CallSignal[]>>((acc, sig) => {
    acc[sig.segment_index] = acc[sig.segment_index] || [];
    acc[sig.segment_index].push(sig);
    return acc;
  }, {});

  // Group margin notes by segment index
  const notesBySegment = marginNotes.reduce<Record<number, CallMarginNoteItem[]>>(
    (acc, note) => {
      acc[note.segmentIndex] = acc[note.segmentIndex] || [];
      acc[note.segmentIndex].push(note);
      return acc;
    },
    {}
  );

  // Highlight matches in segment text
  const renderAnnotatedText = (segment: CallSegment) => {
    const segSignals = signalsBySegment[segment.index] || [];
    if (segSignals.length === 0) {
      return <span>{segment.text}</span>;
    }

    // Sort signals by evidence position in text
    const text = segment.text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    interface MatchOccur {
      start: number;
      end: number;
      signal: CallSignal;
    }
    const occurrences: MatchOccur[] = [];

    for (const sig of segSignals) {
      if (!sig.evidence) continue;
      const idx = text.toLowerCase().indexOf(sig.evidence.toLowerCase());
      if (idx !== -1) {
        occurrences.push({
          start: idx,
          end: idx + sig.evidence.length,
          signal: sig,
        });
      }
    }

    occurrences.sort((a, b) => a.start - b.start);

    for (const occ of occurrences) {
      if (occ.start > lastIndex) {
        parts.push(text.slice(lastIndex, occ.start));
      }
      const rawMatch = text.slice(occ.start, occ.end);
      const isHard = HARD_CATEGORIES.has(occ.signal.category);
      parts.push(
        <Mark
          key={`${occ.signal.id}-${occ.start}`}
          category={occ.signal.category}
          kind={isHard ? "circle" : "highlight"}
          explanation={occ.signal.explanation}
          weight={occ.signal.weight}
        >
          {rawMatch}
        </Mark>
      );
      lastIndex = occ.end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <>{parts}</>;
  };

  const headerTitle =
    activeLang === "hi" ? "बातचीत का विवरण" : "Transcript Call Sheet";
  const headerSubtitle =
    activeLang === "hi"
      ? "दूसरी डिवाइस से रिकॉर्ड किया गया"
      : "Recorded via second device";
  const lineCountLabel =
    activeLang === "hi"
      ? `${segments.length} ${segments.length === 1 ? "पंक्ति" : "पंक्तियाँ"}`
      : `${segments.length} ${segments.length === 1 ? "line" : "lines"}`;
  const emptyStateText =
    activeLang === "hi"
      ? "अभी कोई बातचीत रिकॉर्ड नहीं हुई है।"
      : "No call speech recorded yet.";

  return (
    <div
      ref={containerRef}
      className={`paper-sheet paper-folded p-4 sm:p-7 w-full max-w-3xl mx-auto my-2 sm:my-4 transition-colors ${className}`}
      lang={activeLang}
    >
      <div className="paper-dog-ear" />

      {/* Sheet Header: Ruled Paper Title (Single Language) */}
      <div className="border-b border-[var(--line)] pb-3 mb-5 flex items-center justify-between gap-3">
        <div>
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink)] block">
            {headerTitle}
          </span>
          <span className="text-xs text-[var(--ink-muted)]">
            {headerSubtitle}
          </span>
        </div>
        <div className="text-xs font-semibold text-[var(--ink-muted)] tabular-nums shrink-0">
          {lineCountLabel}
        </div>
      </div>

      {/* Transcript Lines */}
      <div className="space-y-4">
        {segments.length === 0 ? (
          <p className="text-center py-10 text-[var(--ink-muted)] italic text-sm">
            {emptyStateText}
          </p>
        ) : (
          segments.map((seg) => {
            const notes = notesBySegment[seg.index] || [];
            return (
              <div
                key={seg.index}
                id={`call-seg-${seg.index}`}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-[var(--line)]/50 last:border-b-0"
              >
                {/* Left Gutter: Tabular Timestamp */}
                <div className="w-12 sm:w-14 shrink-0 text-[12px] font-semibold text-[var(--ink-muted)] tabular-nums pt-0.5 select-none">
                  {seg.time || `0:${(seg.index * 6).toString().padStart(2, "0")}`}
                </div>

                {/* Main Content: Spoken Text with Marks */}
                <div className="flex-1 min-w-0 text-[15px] sm:text-[16px] text-[var(--ink)] leading-relaxed">
                  {renderAnnotatedText(seg)}
                </div>

                {/* Right Gutter: Margin Note (Desktop) or Indented Below (Mobile) */}
                {notes.length > 0 && (
                  <div className="sm:w-44 lg:w-48 shrink-0 pl-1 sm:pl-2 pt-0.5 self-start">
                    {notes.map((n, i) => (
                      <MarginNote
                        key={i}
                        text={n.text}
                        category={n.category}
                        className="block mb-1"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Verdict Stamp if prominent */}
      {showStamp && level !== "safe" && (
        <div className="mt-6 pt-4 border-t border-[var(--line)] flex justify-end">
          <VerdictStamp level={level} size="md" lang={activeLang} />
        </div>
      )}
    </div>
  );
}
