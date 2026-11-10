"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Volume2, FileText, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LivingHero } from "@/components/hero/LivingHero";
import { ScrollHowItWorks } from "@/components/landing/ScrollHowItWorks";
import { InteractiveScamIndex } from "@/components/landing/InteractiveScamIndex";
import { LiveTestPlayer } from "@/components/livetest/LiveTestPlayer";

const REAL_CLIPS = [
  {
    id: "da_real_01",
    duration_s: 66,
    title: "Digital arrest call — Fake Police Station & Video Statement",
    title_hi: "डिजिटल अरेस्ट कॉल — नकली पुलिस स्टेशन और वीडियो बयान",
    fixture_url: "/live-tests/da_real_01/fixture.json",
  },
  {
    id: "da_real_02",
    duration_s: 61,
    title: "Digital arrest fraud — Drugs in Parcel & Money Transfer",
    title_hi: "डिजिटल अरेस्ट धोखाधड़ी — पार्सल में ड्रग्स और पैसे ट्रांसफर",
    fixture_url: "/live-tests/da_real_02/fixture.json",
  },
] as const;

export default function HomePage() {
  const { t, tArray, locale } = useI18n();
  const [selectedClipId, setSelectedClipId] = useState<string>(REAL_CLIPS[0].id);
  const activeClip = REAL_CLIPS.find((c) => c.id === selectedClipId) ?? REAL_CLIPS[0];

  return (
    <main className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* 1. P0-1 The Living Hero */}
      <LivingHero />

      {/* 1b. See this run on real examples (2 real pre-computed calls) */}
      <section id="real-examples" className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--alarm)]/10 text-[var(--alarm-text)] font-mono font-bold text-xs uppercase">
              {locale === "hi" ? "असली रिकॉर्डिंग" : "Real scam call recordings"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
              {locale === "hi" ? "असली उदाहरणों पर चलते देखें" : "See this run on real examples"}
            </h2>
            <p className="text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl">
              {locale === "hi"
                ? "नीचे दी गई 2 असली कॉल्स में से चुनें और स्पीकर बटन दबाएँ। ऑडियो के साथ-साथ लाइव ट्रांसक्रिप्ट दिखेगी, खतरनाक शब्द लाल रंग में हाइलाइट होंगे और कॉल को ठगी के रूप में चिह्नित किया जाएगा।"
                : "Choose between 2 real calls below and press play. The audio streams with live transcription, scam trigger words are highlighted in red, and Sajag flags the call as a scam."}
            </p>
          </div>
          <Link
            href={`/test?clip=${activeClip.id}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--stamp)] hover:underline shrink-0"
          >
            <span>{locale === "hi" ? "पूरे टेस्ट पेज पर खोलें" : "Open full test view"}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div role="tablist" aria-label="Choose between 2 real calls" className="grid sm:grid-cols-2 gap-3">
          {REAL_CLIPS.map((clip, idx) => {
            const isSelected = clip.id === activeClip.id;
            return (
              <button
                key={clip.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedClipId(clip.id)}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? "border-2 border-[var(--stamp)] bg-[var(--stamp)]/5 font-bold shadow-xs"
                    : "border-[var(--line)] bg-[var(--sheet)] hover:border-[var(--stamp)]"
                }`}
              >
                <span className="block text-[11px] font-mono uppercase text-[var(--stamp)] mb-1">
                  {locale === "hi"
                    ? `कॉल ${idx + 1} • असली रिकॉर्डिंग (${clip.duration_s}s)`
                    : `Call ${idx + 1} • Real recording (${clip.duration_s}s)`}
                </span>
                <span className="text-sm sm:text-base text-[var(--ink)] block">
                  {locale === "hi" ? clip.title_hi : clip.title}
                </span>
              </button>
            );
          })}
        </div>

        <LiveTestPlayer key={activeClip.id} fixtureUrl={activeClip.fixture_url} allowLive={false} />
      </section>

      {/* 2. P0-3 Scroll-Driven How It Works */}
      <ScrollHowItWorks />

      {/* 3. Three Ways to Use It */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
            {t("modes.title")}
          </h2>
          <p className="text-sm sm:text-base text-[var(--ink-muted)]">
            {locale === "hi"
              ? "हर स्थिति के लिए सरल विकल्प — लाइव कॉल से लेकर संदेश की जाँच तक"
              : "Practical options for every family situation"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/live"
            className="btn-stamp p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center font-bold">
              <Smartphone size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)]">
              {t("modes.live_title")}
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.live_desc")}
            </p>
          </Link>

          <Link
            href="/check"
            className="btn-stamp p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--marker)]/40 text-[var(--ink)] flex items-center justify-center font-bold">
              <Volume2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)]">
              {t("modes.check_title")}
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.check_desc")}
            </p>
          </Link>

          <Link
            href="/paste"
            className="btn-stamp p-6 rounded-xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--safe)]/15 text-[var(--safe-text)] flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)]">
              {t("modes.paste_title")}
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.paste_desc")}
            </p>
          </Link>
        </div>
      </section>

      {/* 4. Built for How India Speaks */}
      <section className="bg-[var(--sheet)] border-y border-[var(--line)] py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
              {t("languages.title")}
            </h2>
            <p className="text-sm sm:text-base text-[var(--ink-muted)]">
              {t("languages.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:gap-3.5 items-center">
            {tArray("languages.items").map((lang: string) => (
              <span
                key={lang}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-base sm:text-lg text-[var(--ink)] shadow-2xs"
              >
                {lang}
              </span>
            ))}
          </div>

          <p className="text-xs text-[var(--ink-muted)] italic pt-1">
            {locale === "hi"
              ? "प्रिज्मा v2.5 मॉडल भारतीय टेलीफोनी की शोरगुल वाली हिंग्लिश और क्षेत्रीय आवाज़ों को सीधे पहचानते हैं।"
              : "Prisma v2.5 models transcribe code-mixed and noisy Indian telephony speech directly."}{" "}
            <Link href="/accuracy" className="underline font-semibold text-[var(--stamp)]">
              {locale === "hi" ? "सटीकता रिपोर्ट देखें" : "Evaluation report"}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 5. P0-4 Interactive Scam Index */}
      <InteractiveScamIndex />

      {/* 6. Parent Mode Preview Band */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-10 rounded-2xl bg-[var(--sheet)] border-2 border-[var(--stamp)] text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2.5 max-w-xl">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] font-semibold text-xs">
              Parent mode
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
              {t("parent_band.title")}
            </h2>
            <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
              {t("parent_band.description")}
            </p>
          </div>

          <Link
            href="/parent"
            className="btn-stamp shrink-0 min-h-[52px] h-auto py-3 px-8 rounded-full bg-[var(--stamp)] text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-95 text-center whitespace-normal sm:whitespace-nowrap leading-tight"
          >
            <span>{t("parent_band.cta")}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 7. Honest Limits */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-2.5 text-xs sm:text-sm text-[var(--ink-muted)]">
        <h3 className="font-bold text-sm sm:text-base text-[var(--ink)]">{t("limits.title")}</h3>
        <p className="leading-relaxed">{t("limits.body")}</p>
        <Link href="/about" className="inline-block underline font-semibold text-[var(--stamp)] pt-0.5">
          {t("limits.link")}
        </Link>
      </section>
    </main>
  );
}
