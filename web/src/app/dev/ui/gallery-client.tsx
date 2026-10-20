"use client";

import React, { useState } from "react";
import { VerdictStamp, RiskLevel } from "@/components/ui/VerdictStamp";
import { LevelStrip } from "@/components/ui/LevelStrip";
import { CallTimeline } from "@/components/ui/CallTimeline";
import { Seal } from "@/components/ui/Seal";
import { Mark } from "@/components/ui/Mark";
import { MarginNote } from "@/components/ui/MarginNote";
import { CallSheet, CallSegment, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";

// FIXTURE DATA FOR DEV GALLERY REVIEW ONLY
const FIXTURE_SCAM_SEGMENTS: CallSegment[] = [
  { index: 0, text: "नमस्ते श्रीमान, मैं दिल्ली पुलिस क्राइम ब्रांच से सब-इंस्पेक्टर विजय बोल रहा हूँ।", time: "0:04" },
  { index: 1, text: "आपके आधार नंबर पर मुंबई कस्टम्स में एक पार्सल ज़ब्त हुआ है जिसमें अवैध सामग्री पाई गई है।", time: "0:12" },
  { index: 2, text: "आपके खिलाफ मनी लॉन्ड्रिंग का केस दर्ज हो चुका है और अरेस्ट वारंट जारी हुआ है।", time: "0:19" },
  { index: 3, text: "आप इस समय डिजिटल अरेस्ट पर हैं। तुरंत वीडियो कॉल पर रहिए और फोन बिल्कुल मत काटना।", time: "0:28" },
  { index: 4, text: "यह बेहद गोपनीय मामला है, किसी को भी मत बताना। अपनी सुरक्षा के लिए वेरिफिकेशन अकाउंट में पचास हज़ार रुपये ट्रांसफर कीजिए।", time: "0:39" },
];

const FIXTURE_SCAM_SIGNALS: CallSignal[] = [
  { id: "s1", category: "AUTHORITY_CLAIM", evidence: "दिल्ली पुलिस क्राइम ब्रांच", weight: 2, segment_index: 0, explanation: "दावा करता है कि वह पुलिस या जांच एजेंसी से है" },
  { id: "s2", category: "PARCEL", evidence: "पार्सल ज़ब्त हुआ है", weight: 2, segment_index: 1, explanation: "पार्सल या कूरियर में अवैध सामान का आरोप" },
  { id: "s3", category: "THREAT_ARREST", evidence: "अरेस्ट वारंट", weight: 3, segment_index: 2, explanation: "गिरफ्तारी या मुकदमे की धमकी" },
  { id: "s4", category: "ISOLATION", evidence: "डिजिटल अरेस्ट", weight: 3, segment_index: 3, explanation: "कॉल पर बने रहने का दबाव" },
  { id: "s5", category: "ISOLATION", evidence: "फोन बिल्कुल मत काटना", weight: 3, segment_index: 3, explanation: "कॉल काटने से मना करना" },
  { id: "s6", category: "SECRECY", evidence: "किसी को भी मत बताना", weight: 3, segment_index: 4, explanation: "परिवार से छिपाने का निर्देश" },
  { id: "s7", category: "MONEY_TRANSFER", evidence: "पचास हज़ार रुपये ट्रांसफर कीजिए", weight: 3, segment_index: 4, explanation: "पैसे ट्रांसफर करने का दबाव" },
];

const FIXTURE_SCAM_NOTES: CallMarginNoteItem[] = [
  { segmentIndex: 0, category: "AUTHORITY_CLAIM", text: "नकली पुलिस का दावा" },
  { segmentIndex: 2, category: "THREAT_ARREST", text: "गिरफ्तारी का डर" },
  { segmentIndex: 3, category: "ISOLATION", text: "फोन काटने से मना किया" },
  { segmentIndex: 4, category: "MONEY_TRANSFER", text: "पैसे तुरंत भेजने की मांग" },
];

export function UiGalleryClient() {
  const [activeLevel, setActiveLevel] = useState<RiskLevel>("scam");
  const [activeScore, setActiveScore] = useState<number>(12);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">
      {/* Dev Header */}
      <div className="border-b border-[var(--line)] pb-4">
        <div className="inline-block px-2.5 py-1 rounded bg-[var(--marker)] text-[var(--ink)] text-xs font-semibold mb-2">
          Dev-only UI gallery (fixture data)
        </div>
        <h1 className="text-3xl font-display font-extrabold text-[var(--ink)]">
          Signature Components Inventory
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Reviewing all states: Empty, Safe, Suspicious, Likely Scam, Scam, Reduced Motion, and Micro-interactions.
        </p>
      </div>

      {/* 1. Verdict Stamp States */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          1. Verdict Rubber Stamp (`&lt;VerdictStamp&gt;`)
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          Bilingual rubber stamp with ink pad texture, rotated -7 deg. Thumps down with 180ms spring on escalation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[var(--ink-muted)]">SAFE</span>
            <VerdictStamp level="safe" size="md" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[var(--ink-muted)]">SUSPICIOUS</span>
            <VerdictStamp level="suspicious" size="md" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[var(--ink-muted)]">LIKELY SCAM</span>
            <VerdictStamp level="likely_scam" size="md" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[var(--ink-muted)]">SCAM</span>
            <VerdictStamp level="scam" size="md" />
          </div>
        </div>

        {/* Stamp Sizes */}
        <div className="flex flex-wrap items-center gap-6 p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <VerdictStamp level="scam" size="sm" />
          <VerdictStamp level="scam" size="md" />
          <VerdictStamp level="scam" size="lg" />
        </div>
      </section>

      {/* 2. Level Strip States */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          2. Level Strip (`&lt;LevelStrip&gt;`)
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          School-ruler horizontal zone strip replacing any generic orb or meter.
        </p>
        <div className="space-y-6 p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <div>
            <span className="text-xs font-bold text-[var(--ink-muted)]">Score 1 (Safe)</span>
            <LevelStrip level="safe" score={1} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--ink-muted)]">Score 5 (Suspicious)</span>
            <LevelStrip level="suspicious" score={5} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--ink-muted)]">Score 8 (Likely Scam)</span>
            <LevelStrip level="likely_scam" score={8} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--ink-muted)]">Score 13 (Confirmed Scam)</span>
            <LevelStrip level="scam" score={13} />
          </div>
        </div>
      </section>

      {/* 3. Call Timeline */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          3. Call Timeline (`&lt;CallTimeline&gt;`)
        </h2>
        <div className="p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <CallTimeline
            durationSeconds={45}
            firstCrossed={{ suspicious: 12, likely_scam: 28 }}
            signals={[
              { id: "1", category: "AUTHORITY_CLAIM", segmentIndex: 0, timeSeconds: 4, isHard: false },
              { id: "2", category: "THREAT_ARREST", segmentIndex: 2, timeSeconds: 19, isHard: true },
              { id: "3", category: "ISOLATION", segmentIndex: 3, timeSeconds: 28, isHard: true },
              { id: "4", category: "MONEY_TRANSFER", segmentIndex: 4, timeSeconds: 39, isHard: true },
            ]}
          />
        </div>
      </section>

      {/* 4. Marks and Margin Notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          4. Marks and Margin Notes (`&lt;Mark&gt;`, `&lt;MarginNote&gt;`)
        </h2>
        <div className="p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg space-y-4 text-lg">
          <p>
            Example soft mark:{" "}
            <Mark category="AUTHORITY_CLAIM" kind="highlight" explanation="Claims authority">
              दिल्ली पुलिस क्राइम ब्रांच
            </Mark>{" "}
            से सब-इंस्पेक्टर विजय।
          </p>
          <p>
            Example hard circle mark:{" "}
            <Mark category="OTP_PIN_REQUEST" kind="circle" explanation="Demands UPI PIN" weight={4}>
              अपना यूपीआई पिन बताइए
            </Mark>{" "}
            ताकि रिफंड भेजा जा सके।
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-[var(--ink-muted)] block mb-1">
              Handwritten Kalam Margin Note:
            </span>
            <MarginNote text="पैसे तुरंत भेजने की मांग" category="MONEY_TRANSFER" />
          </div>
        </div>
      </section>

      {/* 5. Brand Seal */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          5. Brand Seal (`&lt;Seal&gt;`)
        </h2>
        <div className="flex items-center gap-6 p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <Seal size={40} variant="brand" />
          <Seal size={56} variant="brand" />
          <Seal size={72} variant="alarm" />
          <Seal size={56} variant="safe" />
        </div>
      </section>

      {/* 6. Full CallSheet in All States */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-[var(--ink)]">
            6. Full Call Sheet (`&lt;CallSheet&gt;`)
          </h2>
          <div className="flex items-center gap-2">
            {(["safe", "suspicious", "likely_scam", "scam"] as RiskLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setActiveLevel(lvl);
                  setActiveScore(lvl === "safe" ? 0 : lvl === "suspicious" ? 4 : lvl === "likely_scam" ? 8 : 12);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  activeLevel === lvl
                    ? "bg-[var(--stamp)] text-white border-[var(--stamp)]"
                    : "bg-[var(--sheet)] border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <LevelStrip level={activeLevel} score={activeScore} />

        <CallSheet
          level={activeLevel}
          segments={FIXTURE_SCAM_SEGMENTS}
          signals={activeLevel === "safe" ? [] : FIXTURE_SCAM_SIGNALS}
          marginNotes={activeLevel === "safe" ? [] : FIXTURE_SCAM_NOTES}
        />

        {/* Empty State */}
        <div className="pt-6">
          <h3 className="text-sm font-bold text-[var(--ink-muted)] mb-2">Empty Sheet State:</h3>
          <CallSheet level="safe" segments={[]} />
        </div>
      </section>

      {/* 7. Controls & Buttons */}
      <section className="space-y-4 pb-12">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          7. Interactive Controls
        </h2>
        <div className="flex flex-wrap items-center gap-4 p-6 bg-[var(--sheet)] border border-[var(--line)] rounded-lg">
          <button className="h-[52px] px-8 rounded-full bg-[var(--stamp)] text-white font-bold text-base hover:opacity-95 active:scale-98 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] focus:ring-offset-2">
            Start listening • सुनना शुरू करें
          </button>
          <button className="h-[52px] px-8 rounded-full border-2 border-[var(--stamp)] text-[var(--stamp)] font-bold text-base hover:bg-[var(--stamp)]/5 active:scale-98 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]">
            Check a recording
          </button>
          <button className="h-[52px] px-8 rounded-full bg-[var(--alarm)] text-white font-bold text-base hover:opacity-95 active:scale-98 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--alarm)] focus:ring-offset-2">
            Tell my family • परिवार को बताएं
          </button>
        </div>
      </section>
    </main>
  );
}
