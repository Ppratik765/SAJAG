"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { CallSheet, CallSegment, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";
import { LevelStrip } from "@/components/ui/LevelStrip";
import { VerdictStamp, RiskLevel } from "@/components/ui/VerdictStamp";
import { ResultCard } from "@/components/ui/ResultCard";
import { analyzeText, FullAnalysisResponse } from "@/lib/api/analyze";
import { CATEGORY_PLAIN_NOTES, SCAM_TYPE_NAMES, ADVICE_TEXTS } from "@/lib/engine/labels";
import {
  FileText,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  PhoneOff,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

interface SampleMessage {
  label: string;
  lang: "hi" | "en";
  text: string;
}

const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    label: "Digital arrest call",
    lang: "en",
    text: "This is officer Vikram calling from Crime Branch police cyber cell. We have issued an arrest warrant against you for international money laundering. You are placed under digital arrest. Stay on this video call, lock your room and keep this strictly confidential.",
  },
  {
    label: "डिजिटल अरेस्ट (Hindi)",
    lang: "hi",
    text: "सीबीआई और पुलिस मुख्यालय से अफसर बोल रहा हूँ। आपका आधार कार्ड गैर-कानूनी पार्सल में पाया गया है। मनी लॉन्ड्रिंग का केस दर्ज है। फोन मत काटना, वीडियो कॉल पर रहिए और सरकारी सेफ अकाउंट में पैसे ट्रांसफर कीजिए।",
  },
  {
    label: "Bank KYC suspend",
    lang: "en",
    text: "Dear SBI customer, your bank account block is scheduled tonight at 9 PM because KYC update is pending. To avoid suspension immediately install QuickSupport and share your OTP.",
  },
  {
    label: "Delivery agent OTP",
    lang: "en",
    text: "Hello sir, Zomato delivery partner is at your gate with your food order. Please share the delivery OTP to complete handover.",
  },
  {
    label: "Genuine bank advisory",
    lang: "en",
    text: "Dear customer, State Bank of India reminds you to never share your OTP, UPI PIN, or CVV with anyone. Bank officials never ask for secret credentials over phone calls.",
  },
];

export default function PastePage() {
  const { locale } = useI18n();
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLang = locale === "hi" ? "hi" : "en";

  const handleAnalyze = async (textToAnalyze?: string) => {
    const rawText = (textToAnalyze !== undefined ? textToAnalyze : text).trim();
    if (!rawText) return;

    setIsAnalyzing(true);
    try {
      const res = await analyzeText(rawText, activeLang === "hi" ? "hi-IN" : "en-IN");
      setResult(res);
    } catch (err) {
      console.error("Text analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = (sample: SampleMessage) => {
    setText(sample.text);
    handleAnalyze(sample.text);
  };

  const handleReset = () => {
    setText("");
    setResult(null);
  };

  const handleCopy = () => {
    if (result?.transcript) {
      navigator.clipboard.writeText(result.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Convert API result into CallSheet props
  const sheetSegments: CallSegment[] = result
    ? result.transcript
        .split(/(?<=[.?!।॥\n])\s+/)
        .filter((s) => s.trim().length > 0)
        .map((sentence, idx) => ({
          index: idx,
          text: sentence.trim(),
          time: `0:${(idx * 8).toString().padStart(2, "0")}`,
        }))
    : [];

  // Map API signals to CallSheet signals
  const sheetSignals: CallSignal[] = result
    ? result.signals.map((s, idx) => {
        // Determine which sentence segment contains this evidence
        let segIdx = 0;
        sheetSegments.forEach((seg, i) => {
          if (seg.text.toLowerCase().includes(s.evidence.toLowerCase())) {
            segIdx = i;
          }
        });

        const plainNote =
          CATEGORY_PLAIN_NOTES[s.category]?.[activeLang] || s.category.toLowerCase().replace(/_/g, " ");

        return {
          id: s.id || `sig_${idx}`,
          category: s.category,
          weight: s.weight,
          evidence: s.evidence,
          segment_index: segIdx,
          explanation: plainNote,
        };
      })
    : [];

  // Generate plain margin notes for sheet
  const sheetMarginNotes: CallMarginNoteItem[] = sheetSignals.map((s) => ({
    segmentIndex: s.segment_index,
    category: s.category,
    text: s.explanation || "",
  }));

  const riskLevel: RiskLevel = result ? result.level : "safe";
  const scamTypeName = result
    ? SCAM_TYPE_NAMES[result.primary_type]?.[activeLang] || result.primary_type
    : "";

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--sheet)] border border-[var(--line)] text-xs font-semibold text-[var(--ink-muted)] mb-3 shadow-xs">
          <Sparkles size={13} className="text-[var(--stamp)]" />
          <span>Deterministic rules engine • 0 API credits used</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[var(--ink)] tracking-tight">
          {activeLang === "hi" ? "संदेश या कॉल टेक्स्ट जाँचें" : "Paste a message or call transcript"}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          {activeLang === "hi"
            ? "व्हाट्सएप मैसेज, एसएमएस या कॉल बातचीत यहाँ पेस्ट करें। हमारे नियम आधारित प्लेबुक इंजन से तुरंत लाल निशान और चेतावनी देखें।"
            : "Paste suspicious WhatsApp forwards, SMS threats, or conversation transcripts. Evaluated instantly by our deterministic scam rules engine."}
        </p>
      </div>

      {/* Main Grid: Input Column Left, Sheet & Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Input Card & Quick Samples */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--sheet)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="paste-input" className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                <FileText size={16} className="text-[var(--stamp)]" />
                <span>Message or transcript text</span>
              </label>
              {text && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Textarea */}
            <textarea
              id="paste-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste message or transcript text here (e.g. 'You are under digital arrest...')"
              rows={8}
              className="w-full p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] resize-y leading-relaxed"
            />

            {/* Quick Sample Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-[var(--ink-muted)] block mb-2">
                Or try a verified test sample:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_MESSAGES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(s)}
                    className="text-xs py-1 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg)]/60 hover:bg-[var(--bg)] text-[var(--ink)] transition-colors font-medium flex items-center gap-1"
                  >
                    <span>{s.label}</span>
                    <ArrowRight size={10} className="text-[var(--ink-muted)]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || !text.trim()}
              className="w-full btn-stamp min-h-[50px] py-3 px-6 rounded-full bg-[var(--stamp)] text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <span>Evaluating red flags...</span>
              ) : (
                <span>Analyze text</span>
              )}
            </button>
          </div>

          {/* Result Summary Card (Visible when result exists) */}
          {result && (
            <ResultCard
              level={riskLevel}
              score={result.score}
              primaryType={result.primary_type}
              signals={result.signals}
              adviceKeys={result.advice_keys}
              languageCode={result.language_code || (activeLang === "hi" ? "hi-IN" : "en-IN")}
              activeLang={activeLang}
              showShare={true}
            />
          )}
        </div>

        {/* Right Column: Marked up Call Sheet & Level Strip */}
        <div className="lg:col-span-7 space-y-4">
          {/* Level Strip Indicator */}
          {result && (
            <div className="bg-[var(--sheet)] border border-[var(--line)] rounded-xl p-4 shadow-xs">
              <div className="flex justify-between items-center mb-2 text-xs font-semibold text-[var(--ink)]">
                <span>Threat Gauge</span>
                <span className="font-mono text-[var(--ink-muted)]">Score: {result.score}</span>
              </div>
              <LevelStrip level={riskLevel} score={result.score} />
            </div>
          )}

          {/* Living Paper Call Sheet */}
          {result && sheetSegments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-[var(--ink-muted)]">
                  Live paper call sheet with annotated evidence:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--sheet)] hover:bg-[var(--bg)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1 shadow-2xs"
                >
                  {copied ? <Check size={12} className="text-[var(--safe)]" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <CallSheet
                segments={sheetSegments}
                signals={sheetSignals}
                marginNotes={sheetMarginNotes}
                level={riskLevel}
                lang={activeLang}
                showStamp={true}
              />
            </div>
          ) : (
            /* Blank ruled paper empty state */
            <div className="paper-sheet paper-folded p-8 sm:p-12 text-center min-h-[440px] flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-muted)]">
                <FileText size={26} />
              </div>
              <h3 className="text-base font-bold text-[var(--ink)]">
                Call sheet is blank
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-sm leading-relaxed">
                Paste a suspicious message or click one of the test samples on the left. The call sheet will mark all scam red flags with handwritten margin notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
