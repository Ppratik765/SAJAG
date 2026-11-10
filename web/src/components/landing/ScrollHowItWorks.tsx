"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { Mark } from "../ui/Mark";
import { MarginNote } from "../ui/MarginNote";
import { VerdictStamp } from "../ui/VerdictStamp";
import { Volume2, Radio, CheckCircle2 } from "lucide-react";

export function ScrollHowItWorks() {
  const { t, locale } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Scroll position driver + interactive click/hover on steps
  const [userPinned, setUserPinned] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion || userPinned) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // Map the section's position while it is comfortably inside the viewport:
      // When rect.top is at 65% of viewport height -> Step 1
      // When rect.top is between 30% and 55% -> Step 2
      // When rect.top is <= 30% -> Step 3
      if (rect.top <= vh * 0.28) {
        setActiveStep(3);
      } else if (rect.top <= vh * 0.52) {
        setActiveStep(2);
      } else {
        setActiveStep(1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldReduceMotion, userPinned]);

  const lines = [
    {
      time: "0:04",
      hi: "नमस्ते जी, मैं सीबीआई हेडक्वार्टर से डीसीपी राजेश कुमार बात कर रहा हूँ।",
      en: "Hello, I am DCP Rajesh Kumar speaking from CBI Headquarters.",
      markHi: "सीबीआई हेडक्वार्टर",
      markEn: "CBI Headquarters",
      noteHi: "सीबीआई का झूठा दावा",
      noteEn: "False CBI claim",
    },
    {
      time: "0:14",
      hi: "सुप्रीम कोर्ट के निर्देशानुसार आप डिजिटल अरेस्ट में हैं। तुरंत पैसे ट्रांसफर करें।",
      en: "Supreme Court orders you under digital arrest. Transfer funds immediately.",
      markHi: "डिजिटल अरेस्ट",
      markEn: "digital arrest",
      noteHi: "अवैध अरेस्ट की धमकी",
      noteEn: "Illegal arrest threat",
    },
  ];

  return (
    <section
      ref={containerRef}
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8"
      aria-label="How Sajag Works"
    >
      <div className="text-center sm:text-left space-y-2">
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[var(--ink)]">
          {t("steps.title")}
        </h2>
        <p className="text-base text-[var(--ink-muted)]">
          {locale === "hi"
            ? "कॉल सुनते ही कागज़ पर धोखे के निशान और बोलकर चेतावनी"
            : "Live marked-up call sheet and spoken warning as the call happens"}
        </p>
      </div>

      {/* Reduced motion fallback: show all 3 steps static */}
      {shouldReduceMotion ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3">
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step1_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step1_desc")}</p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3">
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step2_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step2_desc")}</p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3">
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step3_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step3_desc")}</p>
          </div>
        </div>
      ) : (
        /* Side-by-side Aligned Sheet & Steps Section */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
          {/* Left Column: Live Sheet State */}
          <div className="lg:col-span-6 flex flex-col">
            {/* Step status bar indicator */}
            <div className="flex items-center justify-between mb-3 text-xs font-semibold px-1">
              <span className="text-[var(--ink-muted)]">
                {locale === "hi" ? "लाइव कागज़ की स्थिति" : "Live Sheet State"} —{" "}
                <span className="text-[var(--stamp)] font-bold">
                  {activeStep === 1
                    ? locale === "hi"
                      ? "चरण 1: सुनना"
                      : "Step 1: Listen"
                    : activeStep === 2
                    ? locale === "hi"
                      ? "चरण 2: निशान लगाना"
                      : "Step 2: Mark"
                    : locale === "hi"
                    ? "चरण 3: बोलकर चेतावनी"
                    : "Step 3: Warn"}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-label={`Show step ${s}`}
                    onClick={() => {
                      setUserPinned(true);
                      setActiveStep(s);
                    }}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeStep === s
                        ? "w-7 bg-[var(--stamp)]"
                        : "w-2.5 bg-[var(--line)] hover:bg-[var(--ink-muted)]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* The Interactive Responsive Sheet */}
            <div className="paper-sheet paper-folded p-5 sm:p-6 w-full flex-1 flex flex-col justify-between shadow-md transition-all duration-300">
              <div className="paper-dog-ear" />

              <div>
                {/* Sheet header: clean sentence-case title and state */}
                <div className="border-b border-[var(--line)] pb-2.5 mb-4 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                    {locale === "hi" ? "बातचीत का विवरण" : "Transcript call sheet"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--ink-muted)]">
                    {activeStep === 1
                      ? locale === "hi"
                        ? "सुनना जारी..."
                        : "Listening..."
                      : activeStep === 2
                      ? locale === "hi"
                        ? "निशान लगाए गए"
                        : "Marks applied"
                      : locale === "hi"
                      ? "चेतावनी जारी"
                      : "Warning issued"}
                  </span>
                </div>

                {/* Lines reacting to scroll/selected step */}
                <div className="space-y-4">
                  {lines.map((line, i) => {
                    const text = locale === "hi" ? line.hi : line.en;
                    const markEvidence = locale === "hi" ? line.markHi : line.markEn;
                    const noteText = locale === "hi" ? line.noteHi : line.noteEn;

                    return (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-start gap-2.5 py-2 border-b border-[var(--line)]/40 last:border-b-0"
                      >
                        <div className="w-10 shrink-0 text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums pt-0.5">
                          {line.time}
                        </div>
                        <div className="flex-1 text-[14px] sm:text-[15px] text-[var(--ink)] leading-relaxed">
                          {activeStep === 1 ? (
                            <span>{text}</span>
                          ) : (
                            <span>
                              {text.split(markEvidence)[0]}
                              <Mark
                                category="THREAT_ARREST"
                                kind={i === 0 ? "highlight" : "circle"}
                                weight={3}
                              >
                                {markEvidence}
                              </Mark>
                              {text.split(markEvidence)[1]}
                            </span>
                          )}
                        </div>

                        {/* Margin note draws in on step 2 & 3 */}
                        {activeStep >= 2 && (
                          <div className="sm:w-36 shrink-0 pt-0.5 animate-[penWriteReveal_400ms_ease-out]">
                            <MarginNote text={noteText} category="ALERT" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Stamp & Spoken alert appear (fixed-height footer so card never jumps) */}
              <div className="mt-4 pt-3 border-t border-[var(--line)] min-h-[64px] flex items-center justify-between gap-2">
                {activeStep === 3 ? (
                  <>
                    <div className="flex items-center gap-2 text-[var(--alarm-text)] text-xs sm:text-sm font-bold animate-[penWriteReveal_300ms_ease-out]">
                      <Volume2 size={18} className="text-[var(--alarm)] shrink-0" />
                      <span>
                        {locale === "hi"
                          ? "तुरंत फोन काटें — ठगी है"
                          : "Hang up now — scam detected"}
                      </span>
                    </div>
                    <VerdictStamp level="scam" size="sm" lang={locale} />
                  </>
                ) : (
                  <span className="text-xs text-[var(--ink-muted)]">
                    {activeStep === 1
                      ? locale === "hi"
                        ? "चरण 1: कॉल की आवाज़ को सीधे ट्रांसक्राइब किया जा रहा है…"
                        : "Step 1: Transcribing live speech from speakerphone…"
                      : locale === "hi"
                      ? "चरण 2: ठगी के शब्दों को लाल रंग में चिह्नित किया गया…"
                      : "Step 2: Red flags marked with evidence quotes & margin notes…"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: 3 Compact, Aligned, Interactive Steps (all visible together) */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4 pt-0 lg:pt-7">
            {/* Step 1: Listen */}
            <div
              ref={step1Ref}
              role="button"
              tabIndex={0}
              onClick={() => {
                setUserPinned(true);
                setActiveStep(1);
              }}
              onMouseEnter={() => setActiveStep(1)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setUserPinned(true);
                  setActiveStep(1);
                }
              }}
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                activeStep === 1
                  ? "bg-[var(--sheet)] border-2 border-[var(--stamp)] shadow-md"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80 hover:opacity-100"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center shrink-0 mt-0.5">
                <Radio size={22} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--ink)]">
                  {t("steps.step1_title")}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] mt-1 leading-relaxed">
                  {t("steps.step1_desc")}
                </p>
              </div>
            </div>

            {/* Step 2: Mark */}
            <div
              ref={step2Ref}
              role="button"
              tabIndex={0}
              onClick={() => {
                setUserPinned(true);
                setActiveStep(2);
              }}
              onMouseEnter={() => setActiveStep(2)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setUserPinned(true);
                  setActiveStep(2);
                }
              }}
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                activeStep === 2
                  ? "bg-[var(--sheet)] border-2 border-[var(--alarm)] shadow-md"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80 hover:opacity-100"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--alarm)]/10 text-[var(--alarm)] flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--ink)]">
                  {t("steps.step2_title")}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] mt-1 leading-relaxed">
                  {t("steps.step2_desc")}
                </p>
              </div>
            </div>

            {/* Step 3: Warn */}
            <div
              ref={step3Ref}
              role="button"
              tabIndex={0}
              onClick={() => {
                setUserPinned(true);
                setActiveStep(3);
              }}
              onMouseEnter={() => setActiveStep(3)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setUserPinned(true);
                  setActiveStep(3);
                }
              }}
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                activeStep === 3
                  ? "bg-[var(--sheet)] border-2 border-[var(--safe)] shadow-md"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80 hover:opacity-100"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--safe)]/10 text-[var(--safe-text)] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--ink)]">
                  {t("steps.step3_title")}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] mt-1 leading-relaxed">
                  {t("steps.step3_desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
