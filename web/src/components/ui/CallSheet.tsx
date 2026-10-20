"use client";

import React, { useRef } from "react";
import { Mark, HARD_CATEGORIES } from "./Mark";
import { MarginNote } from "./MarginNote";
import { VerdictStamp, RiskLevel } from "./VerdictStamp";

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
  lang?: string;
  className?: string;
  showStamp?: boolean;
}

export function CallSheet({
  segments,
  signals = [],
  marginNotes = [],
  level,
  lang = "hi",
  className = "",
  showStamp = true,
}: CallSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Collect occurrences
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

    // Sort by start position
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

  return (
    <div
      ref={containerRef}
      className={`paper-sheet paper-folded p-3.5 sm:p-8 w-full max-w-3xl mx-auto my-4 transition-colors ${className}`}
      lang={lang}
    >
      <div className="paper-dog-ear" />

      {/* Sheet Header: Ruled Paper Title */}
      <div className="border-b border-[var(--line)] pb-3 mb-6 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block">
            Transcript Call Sheet • बातचीत का विवरण
          </span>
          <span className="text-xs text-[var(--ink-muted)]">
            Recorded via second device • दूसरी डिवाइस से रिकॉर्डेड
          </span>
        </div>
        <div className="text-xs font-semibold text-[var(--ink-muted)] tabular-nums">
          {segments.length} {segments.length === 1 ? "line" : "lines"}
        </div>
      </div>

      {/* Transcript Lines */}
      <div className="space-y-4">
        {segments.length === 0 ? (
          <p className="text-center py-12 text-[var(--ink-muted)] italic text-sm">
            No call speech recorded yet. • अभी कोई बातचीत रिकॉर्ड नहीं हुई है।
          </p>
        ) : (
          segments.map((seg) => {
            const notes = notesBySegment[seg.index] || [];
            return (
              <div
                key={seg.index}
                id={`call-seg-${seg.index}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start py-1.5 border-b border-[var(--line)]/50 last:border-b-0"
              >
                {/* Left Gutter: Tabular Timestamp */}
                <div className="md:col-span-2 text-[12px] font-semibold text-[var(--ink-muted)] tabular-nums pt-0.5 select-none">
                  {seg.time || `0:${(seg.index * 6).toString().padStart(2, "0")}`}
                </div>

                {/* Main Content: Spoken Text with Marks */}
                <div className="md:col-span-7 text-[16px] sm:text-[17px] text-[var(--ink)] leading-relaxed">
                  {renderAnnotatedText(seg)}
                </div>

                {/* Right Gutter: Margin Note (Desktop) or Below Line (Mobile) */}
                <div className="md:col-span-3 pt-0.5">
                  {notes.map((n, i) => (
                    <MarginNote
                      key={i}
                      text={n.text}
                      category={n.category}
                      className="block mb-1"
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Verdict Stamp if prominent */}
      {showStamp && level !== "safe" && (
        <div className="mt-8 pt-4 border-t border-[var(--line)] flex justify-end">
          <VerdictStamp level={level} size="md" />
        </div>
      )}
    </div>
  );
}
