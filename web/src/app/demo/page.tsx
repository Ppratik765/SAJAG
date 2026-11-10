"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { LiveTestPlayer } from "@/components/livetest/LiveTestPlayer";

/** Spec 7.6 demo: always the synthetic clip, recorded run only. The richer page is /test. */
export default function DemoPage() {
  const { locale } = useI18n();
  const lang = locale === "hi" ? "hi" : "en";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <div
        id="demo-synthetic-banner"
        className="p-4 rounded-md border-2 border-[var(--stamp)]/30 bg-[var(--stamp)]/5 flex items-start gap-3 shadow-xs"
      >
        <Info className="w-5 h-5 text-[var(--stamp)] shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1 text-xs sm:text-sm">
          <p className="font-bold text-[var(--ink)]">
            Synthetic demo call, pre-recorded. Transcripts were captured earlier from Prisma on this audio. Use Live mode to run on your own audio.
          </p>
          <p className="text-[var(--ink-muted)]">
            सिंथेटिक डेमो कॉल, पहले से रिकॉर्ड किया गया। इस ऑडियो पर पहले से प्रिस्मा से ट्रांसक्रिप्ट कैप्चर किए गए थे। अपने ऑडियो पर चलाने के लिए लाइव मोड का उपयोग करें।
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] tracking-tight">
          {lang === "hi"
            ? "डेमो रीप्ले: डिजिटल अरेस्ट कॉल का पता लगाना"
            : "Demo Replay: Detecting a Digital Arrest Call"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {lang === "hi" ? "स्पीकर बटन दबाएँ और देखें कि चेतावनी कब दिखती है।" : "Press the speaker button and watch when each warning appears."}
        </p>
      </div>

      <LiveTestPlayer fixtureUrl="/live-tests/da_real_01/fixture.json" allowLive={false} />

      <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--sheet)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[var(--ink-muted)]">
          {lang === "hi" ? "और क्लिप और लाइव रन के लिए:" : "More clips, and a live run:"}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/test" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--stamp)] text-white text-sm font-bold hover:opacity-95">
            <span>{lang === "hi" ? "लाइव टेस्ट" : "Live test"}</span>
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <Link href="/live" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] text-sm font-semibold hover:border-[var(--stamp)]">
            Live Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
