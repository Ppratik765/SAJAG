"use client";

import React, { useState } from "react";
import { siteUrl } from "@/lib/site";
import Link from "next/link";
import { Share2, RotateCcw, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import digitalArrestData from "@/data/spot/digital_arrest.json";
import bankKycData from "@/data/spot/bank_kyc.json";
import familyEmergencyData from "@/data/spot/family_emergency.json";
import genuineAdvisoryData from "@/data/spot/genuine_bank_advisory.json";

interface SpotMark {
  substring: string;
  category: string;
  explanation: string;
  plainNote?: string;
}

interface SpotLine {
  index: number;
  text: string;
  trueMarks: SpotMark[];
}

interface SpotCallData {
  id: string;
  title: { en: string; hi: string };
  isGenuine: boolean;
  description: { en: string; hi: string };
  lines: SpotLine[];
}

const CALLS: SpotCallData[] = [
  digitalArrestData as SpotCallData,
  bankKycData as SpotCallData,
  familyEmergencyData as SpotCallData,
  genuineAdvisoryData as SpotCallData,
];

export default function SpotGamePage() {
  const { locale } = useI18n();
  const [activeCallIndex, setActiveCallIndex] = useState(0);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [isChecked, setIsChecked] = useState(false);

  const activeCall = CALLS[activeCallIndex];

  // Reset selection when changing call
  const handleSelectCall = (idx: number) => {
    setActiveCallIndex(idx);
    setSelectedWordIds(new Set());
    setIsChecked(false);
  };

  const toggleWordSelection = (wordId: string) => {
    if (isChecked) return;
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const handleReset = () => {
    setSelectedWordIds(new Set());
    setIsChecked(false);
  };

  // Compute total true marks
  const allTrueMarks: { lineIndex: number; mark: SpotMark }[] = [];
  for (const line of activeCall.lines) {
    for (const tm of line.trueMarks) {
      allTrueMarks.push({ lineIndex: line.index, mark: tm });
    }
  }

  // Calculate score: how many true marks intersect with user's selected words
  let foundMarksCount = 0;
  if (isChecked) {
    for (const item of allTrueMarks) {
      const line = activeCall.lines[item.lineIndex];
      const words = line.text.split(" ");
      // Check if any word of this mark was selected by user
      const markWords = item.mark.substring.split(" ");
      const hasOverlap = markWords.some((mw) => {
        return words.some((w, wIdx) => {
          const wId = `spot-${line.index}-${wIdx}`;
          return selectedWordIds.has(wId) && w.toLowerCase().includes(mw.toLowerCase());
        });
      });
      if (hasOverlap) {
        foundMarksCount++;
      }
    }
  }

  // Handle Share: Web Share API with WhatsApp fallback
  const handleShare = () => {
    const total = allTrueMarks.length;
    const url = `${siteUrl()}/spot`;
    const shareText = activeCall.isGenuine
      ? `I correctly spotted a genuine advisory call with 0 scam traps on Sajag! Can you? ${url}`
      : `I caught ${foundMarksCount} of ${total} warning signs in this fake scam call. Can you? ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Spot the red flags — Sajag",
        text: shareText,
        url: url,
      }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8" aria-label="Spot the Red Flags Game">
      {/* Title & Rules */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--marker)] text-[var(--ink)] font-semibold text-xs">
          <span>{locale === "hi" ? "शैक्षणिक खेल" : "Interactive training game"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[var(--ink)] tracking-tight">
          {locale === "hi" ? "धोखा पहचानें: लाल निशान खोजें" : "Spot the Red Flags"}
        </h1>
        <p className="text-base sm:text-lg text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          {locale === "hi"
            ? "कॉल का विवरण पढ़ें और संदिग्ध शब्दों पर टैप करके निशान लगाएं। फिर 'जाँचें' दबाकर देखें कि आप कितने खतरे पकड़ पाए।"
            : "Read the fake call excerpt and tap words or phrases you think are warning signs. Tap Check to reveal Sajag's analysis."}
        </p>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-[var(--line)] pb-4">
        {CALLS.map((call, idx) => {
          const isActive = activeCallIndex === idx;
          const title = call.title[locale === "hi" ? "hi" : "en"];
          return (
            <button
              key={call.id}
              type="button"
              onClick={() => handleSelectCall(idx)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? "bg-[var(--stamp)] text-white shadow-xs"
                  : "bg-[var(--sheet)] border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--stamp)]"
              }`}
              aria-pressed={isActive}
            >
              {title}
            </button>
          );
        })}
      </div>

      {/* Honesty disclaimer and description */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)] px-1">
        <span className="font-semibold px-2 py-0.5 rounded bg-[var(--line)]/50 text-[var(--ink)]">
          {locale === "hi" ? "काल्पनिक उदाहरण, हमारे द्वारा लिखित" : "Example, written by us"}
        </span>
        <span className="italic">
          {activeCall.description[locale === "hi" ? "hi" : "en"]}
        </span>
      </div>

      {/* The Ruled Paper Call Sheet for Game */}
      <div className="paper-sheet paper-folded p-4 sm:p-8 w-full shadow-md space-y-6">
        <div className="paper-dog-ear" />

        {/* Sheet Header */}
        <div className="border-b border-[var(--line)] pb-3 flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--ink)] block">
              {activeCall.title[locale === "hi" ? "hi" : "en"]}
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              {isChecked
                ? locale === "hi"
                  ? "सजग द्वारा विश्लेषित परिणाम"
                  : "Sajag verified analysis"
                : locale === "hi"
                ? "संदिग्ध शब्दों पर टैप करें"
                : "Tap any suspicious words to highlight"}
            </span>
          </div>
          <div className="text-xs font-semibold text-[var(--ink-muted)]">
            {selectedWordIds.size} {locale === "hi" ? "शब्द चुने गए" : "words marked"}
          </div>
        </div>

        {/* Transcript Interactive Lines with merged continuous phrases */}
        <div className="space-y-3.5">
          {activeCall.lines.map((line) => {
            const words = line.text.split(" ");

            // Grouping logic for unverified state: group consecutive words with identical isSelected status
            const unverifiedRuns: { isSelected: boolean; words: { text: string; id: string }[] }[] = [];
            for (let wIdx = 0; wIdx < words.length; wIdx++) {
              const wId = `spot-${line.index}-${wIdx}`;
              const isSel = selectedWordIds.has(wId);
              const last = unverifiedRuns[unverifiedRuns.length - 1];
              if (last && last.isSelected === isSel) {
                last.words.push({ text: words[wIdx], id: wId });
              } else {
                unverifiedRuns.push({ isSelected: isSel, words: [{ text: words[wIdx], id: wId }] });
              }
            }

            // Matching logic for verified state: continuous highlight or circle per trueMark
            interface MarkMatch {
              mark: SpotMark;
              start: number;
              end: number;
              isFound: boolean;
            }
            const matches: MarkMatch[] = [];
            if (isChecked && line.trueMarks.length > 0) {
              for (const tm of line.trueMarks) {
                const idx = line.text.indexOf(tm.substring);
                if (idx !== -1) {
                  const markWords = tm.substring.split(" ");
                  const isFound = markWords.some((mw) =>
                    words.some((w, wIdx) => {
                      const wId = `spot-${line.index}-${wIdx}`;
                      return selectedWordIds.has(wId) && w.toLowerCase().includes(mw.toLowerCase());
                    })
                  );
                  matches.push({
                    mark: tm,
                    start: idx,
                    end: idx + tm.substring.length,
                    isFound,
                  });
                }
              }
              matches.sort((a, b) => a.start - b.start);
            }

            return (
              <div
                key={line.index}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2 border-b border-[var(--line)]/40 last:border-b-0"
              >
                {/* Timestamp */}
                <div className="w-10 shrink-0 text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums pt-1 select-none">
                  0:{(line.index * 6).toString().padStart(2, "0")}
                </div>

                {/* Main Transcript Text with Continuous Highlights/Circles */}
                <div className="flex-1 text-[15px] sm:text-[17px] text-[var(--ink)] leading-relaxed select-none">
                  {!isChecked ? (
                    <span>
                      {unverifiedRuns.map((run, rIdx) => {
                        if (run.isSelected) {
                          return (
                            <mark
                              key={rIdx}
                              className="bg-[var(--marker)] text-[var(--ink)] font-semibold rounded px-1.5 py-0.5 inline transition-colors"
                            >
                              {run.words.map((w, i) => (
                                <span
                                  key={w.id}
                                  onClick={() => toggleWordSelection(w.id)}
                                  className="cursor-pointer hover:opacity-80"
                                >
                                  {w.text}
                                  {i < run.words.length - 1 ? " " : ""}
                                </span>
                              ))}
                              {" "}
                            </mark>
                          );
                        }
                        return (
                          <span key={rIdx}>
                            {run.words.map((w) => (
                              <span
                                key={w.id}
                                onClick={() => toggleWordSelection(w.id)}
                                className="cursor-pointer hover:bg-[var(--marker)]/40 rounded-xs transition-colors"
                              >
                                {w.text}{" "}
                              </span>
                            ))}
                          </span>
                        );
                      })}
                    </span>
                  ) : matches.length > 0 ? (
                    (() => {
                      const elements: React.ReactNode[] = [];
                      let lastPos = 0;
                      for (let mIdx = 0; mIdx < matches.length; mIdx++) {
                        const m = matches[mIdx];
                        if (m.start > lastPos) {
                          elements.push(
                            <span key={`text-${lastPos}`}>
                              {line.text.slice(lastPos, m.start)}
                            </span>
                          );
                        }
                        if (m.isFound) {
                          elements.push(
                            <mark
                              key={`mark-${mIdx}`}
                              className="bg-[var(--safe)]/20 text-[var(--safe-text)] border-b-2 border-[var(--safe)] font-semibold px-1.5 py-0.5 rounded-sm inline"
                            >
                              {m.mark.substring}
                            </mark>
                          );
                        } else {
                          elements.push(
                            <mark
                              key={`mark-${mIdx}`}
                              className="border-2 border-[var(--alarm)] bg-[var(--alarm)]/10 text-[var(--alarm-text)] font-semibold px-1.5 py-0.5 rounded-md inline"
                            >
                              {m.mark.substring}
                            </mark>
                          );
                        }
                        lastPos = m.end;
                      }
                      if (lastPos < line.text.length) {
                        elements.push(
                          <span key={`text-${lastPos}`}>
                            {line.text.slice(lastPos)}
                          </span>
                        );
                      }
                      return <span>{elements}</span>;
                    })()
                  ) : (
                    <span>
                      {unverifiedRuns.map((run, rIdx) => {
                        if (run.isSelected) {
                          return (
                            <mark
                              key={rIdx}
                              className="bg-[var(--line)] text-[var(--ink-muted)] line-through px-1.5 py-0.5 rounded inline"
                            >
                              {run.words.map((w) => w.text).join(" ")}{" "}
                            </mark>
                          );
                        }
                        return (
                          <span key={rIdx}>
                            {run.words.map((w) => w.text).join(" ")}{" "}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>

                {/* Reveal Kalam margin notes in plain words */}
                {isChecked && line.trueMarks.length > 0 && (
                  <div className="sm:w-44 lg:w-48 shrink-0 pl-1 sm:pl-2 pt-0.5 self-start space-y-1 select-none animate-[penWriteReveal_350ms_ease-out]">
                    {line.trueMarks.map((tm, mIdx) => (
                      <aside
                        key={mIdx}
                        className="inline-flex items-start gap-1 font-hand text-sm text-[var(--alarm-text)]"
                        style={{ transform: "rotate(-1deg)" }}
                      >
                        <span className="opacity-75 mt-0.5 shrink-0">←</span>
                        <span className="leading-snug break-words">
                          {tm.plainNote || tm.explanation}
                        </span>
                      </aside>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
          {!isChecked ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                {locale === "hi" ? "निशान हटाएं" : "Clear marks"}
              </button>

              <button
                type="button"
                onClick={() => setIsChecked(true)}
                className="btn-stamp px-8 py-3 rounded-full bg-[var(--stamp)] text-white font-bold text-sm shadow-sm hover:opacity-95"
              >
                {locale === "hi" ? "निशान जाँचें" : "Check my marks"}
              </button>
            </>
          ) : (
            <div className="w-full space-y-4">
              {/* Score Results Card */}
              <div className="p-4 sm:p-6 rounded-xl bg-[var(--sheet)] border-2 border-[var(--stamp)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-[var(--stamp)]">
                    {locale === "hi" ? "परिणाम" : "Results"}
                  </span>
                  <h3 className="text-2xl font-bold font-display text-[var(--ink)]">
                    {activeCall.isGenuine
                      ? locale === "hi"
                        ? "यह एक वास्तविक परामर्श था! (0 खतरे)"
                        : "This was a genuine bank advisory! (0 red flags)"
                      : locale === "hi"
                      ? `आपने ${allTrueMarks.length} में से ${foundMarksCount} खतरे पकड़े`
                      : `You caught ${foundMarksCount} of ${allTrueMarks.length} warning signs`}
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {locale === "hi"
                      ? "यह एक शैक्षणिक प्रशिक्षण उपकरण है, सजग की सटीकता का दावा नहीं।"
                      : "This is an educational game, not a claim of detection accuracy."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-stamp inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--safe)] text-white font-bold text-sm shadow-sm"
                  >
                    <Share2 size={16} />
                    <span>{locale === "hi" ? "शेयर करें" : "Share score"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-2.5 rounded-full border border-[var(--line)] text-[var(--ink)] hover:text-[var(--stamp)]"
                    aria-label="Try again"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Next Call Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSelectCall((activeCallIndex + 1) % CALLS.length)}
                  className="btn-stamp inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-[var(--stamp)] text-[var(--stamp)] font-bold text-sm hover:bg-[var(--stamp)]/5"
                >
                  <span>{locale === "hi" ? "अगली कॉल खेलें" : "Try next scenario"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back to Home Link */}
      <div className="text-center pt-4">
        <Link href="/" className="text-sm font-semibold underline text-[var(--stamp)]">
          {locale === "hi" ? "← मुख्य पृष्ठ पर वापस जाएं" : "← Back to Home"}
        </Link>
      </div>
    </main>
  );
}
