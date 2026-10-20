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

  // Scroll position driver (scrubbable in both directions)
  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleScroll = () => {
      const s1 = step1Ref.current?.getBoundingClientRect();
      const s2 = step2Ref.current?.getBoundingClientRect();
      const s3 = step3Ref.current?.getBoundingClientRect();
      const mid = window.innerHeight * 0.45;

      if (s3 && s3.top <= mid) {
        setActiveStep(3);
      } else if (s2 && s2.top <= mid) {
        setActiveStep(2);
      } else if (s1 && s1.top <= mid) {
        setActiveStep(1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldReduceMotion]);

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
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[var(--stamp)]/10 text-[var(--stamp)]">
              Step 1
            </span>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step1_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step1_desc")}</p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3">
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[var(--marker)]/40 text-[var(--ink)]">
              Step 2
            </span>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step2_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step2_desc")}</p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3">
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[var(--alarm)]/15 text-[var(--alarm-text)]">
              Step 3
            </span>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step3_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)]">{t("steps.step3_desc")}</p>
          </div>
        </div>
      ) : (
        /* Scroll-driven Sticky Sheet Section */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          {/* Left Column: Pinned Sticky Sheet (desktop) / Compact Sticky Strip (mobile) */}
          <div className="lg:col-span-6 sticky top-20 z-20">
            {/* Step status bar indicator */}
            <div className="flex items-center justify-between mb-2 text-xs font-semibold px-1">
              <span className="text-[var(--ink-muted)]">
                {locale === "hi" ? "लाइव कागज़ की स्थिति" : "Live Sheet State"}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeStep === s
                        ? "w-6 bg-[var(--stamp)]"
                        : "w-2 bg-[var(--line)]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* The Interactive Responsive Sheet */}
            <div className="paper-sheet paper-folded p-4 sm:p-6 w-full shadow-md transition-all duration-300">
              <div className="paper-dog-ear" />

              {/* Sheet header */}
              <div className="border-b border-[var(--line)] pb-2.5 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                  {locale === "hi" ? "सजग विश्लेषण पत्र" : "Sajag Call Analysis"}
                </span>
                <span className="text-[11px] font-semibold text-[var(--ink-muted)]">
                  {activeStep === 1
                    ? locale === "hi"
                      ? "1. सुनना चालू..."
                      : "1. Listening..."
                    : activeStep === 2
                    ? locale === "hi"
                      ? "2. निशान लगाए गए"
                      : "2. Marks applied"
                    : locale === "hi"
                    ? "3. ठगी की पुष्टि!"
                    : "3. Confirmed scam!"}
                </span>
              </div>

              {/* Lines reacting to scroll step */}
              <div className="space-y-3.5 min-h-[160px]">
                {lines.map((line, i) => {
                  const text = locale === "hi" ? line.hi : line.en;
                  const markEvidence = locale === "hi" ? line.markHi : line.markEn;
                  const noteText = locale === "hi" ? line.noteHi : line.noteEn;

                  return (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 py-1 border-b border-[var(--line)]/40 last:border-b-0"
                    >
                      <div className="w-10 shrink-0 text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums">
                        {line.time}
                      </div>
                      <div className="flex-1 text-[14px] text-[var(--ink)] leading-relaxed">
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

              {/* Step 3: Stamp & Spoken alert appear */}
              {activeStep === 3 && (
                <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2 animate-[penWriteReveal_300ms_ease-out]">
                  <div className="flex items-center gap-2 text-[var(--alarm-text)] text-xs font-bold">
                    <Volume2 size={16} className="text-[var(--alarm)] shrink-0" />
                    <span>
                      {locale === "hi"
                        ? "तुरंत फोन काटें — ठगी है"
                        : "Hang up now — scam detected"}
                    </span>
                  </div>
                  <VerdictStamp level="scam" size="sm" lang={locale} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 3 Detailed Scrolling Steps */}
          <div className="lg:col-span-6 space-y-24 py-6">
            {/* Step 1: Listen */}
            <div
              ref={step1Ref}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 ${
                activeStep === 1
                  ? "bg-[var(--sheet)] border-[var(--stamp)] shadow-md scale-[1.02]"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center mb-4">
                <Radio size={24} />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--stamp)]">
                {locale === "hi" ? "चरण 1" : "Step 1"}
              </span>
              <h3 className="text-2xl font-bold font-display text-[var(--ink)] mt-1">
                {t("steps.step1_title")}
              </h3>
              <p className="text-base text-[var(--ink-muted)] mt-2 leading-relaxed">
                {t("steps.step1_desc")}
              </p>
            </div>

            {/* Step 2: Mark */}
            <div
              ref={step2Ref}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 ${
                activeStep === 2
                  ? "bg-[var(--sheet)] border-[var(--alarm)] shadow-md scale-[1.02]"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--alarm)]/10 text-[var(--alarm)] flex items-center justify-center mb-4">
                <svg
                  width="26"
                  height="26"
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
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--alarm-text)]">
                {locale === "hi" ? "चरण 2" : "Step 2"}
              </span>
              <h3 className="text-2xl font-bold font-display text-[var(--ink)] mt-1">
                {t("steps.step2_title")}
              </h3>
              <p className="text-base text-[var(--ink-muted)] mt-2 leading-relaxed">
                {t("steps.step2_desc")}
              </p>
            </div>

            {/* Step 3: Warn */}
            <div
              ref={step3Ref}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 ${
                activeStep === 3
                  ? "bg-[var(--sheet)] border-[var(--safe)] shadow-md scale-[1.02]"
                  : "bg-[var(--sheet)]/60 border-[var(--line)] opacity-80"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--safe)]/10 text-[var(--safe-text)] flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--safe-text)]">
                {locale === "hi" ? "चरण 3" : "Step 3"}
              </span>
              <h3 className="text-2xl font-bold font-display text-[var(--ink)] mt-1">
                {t("steps.step3_title")}
              </h3>
              <p className="text-base text-[var(--ink-muted)] mt-2 leading-relaxed">
                {t("steps.step3_desc")}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
