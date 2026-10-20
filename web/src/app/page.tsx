"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Volume2, FileText, Smartphone } from "lucide-react";
import { CallSheet, CallSegment, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";
import { useI18n } from "@/lib/i18n/context";

// Hero static example sheet: clearly labelled "Example, written by us" per spec 7.1C
const HERO_EXAMPLE_SEGMENTS: CallSegment[] = [
  { index: 0, text: "नमस्ते जी, मैं सीबीआई हेडक्वार्टर से डीसीपी राजेश कुमार बात कर रहा हूँ।", time: "0:04" },
  { index: 1, text: "आपके आधार से लिंक बैंक खाते में संदिग्ध विदेशी फंड आए हैं। मनी लॉन्ड्रिंग की एफआईआर दर्ज है।", time: "0:14" },
  { index: 2, text: "सुप्रीम कोर्ट के निर्देशानुसार आप डिजिटल अरेस्ट में हैं। तुरंत वीडियो कॉल पर रहिए, फोन मत काटना।", time: "0:25" },
  { index: 3, text: "वेरिफिकेशन के लिए तुरंत सेफ अकाउंट में चालीस हज़ार रुपये भेजिए।", time: "0:36" },
];

const HERO_EXAMPLE_SIGNALS: CallSignal[] = [
  { id: "e1", category: "AUTHORITY_CLAIM", evidence: "सीबीआई हेडक्वार्टर", weight: 2, segment_index: 0, explanation: "Claims CBI authority" },
  { id: "e2", category: "THREAT_ARREST", evidence: "मनी लॉन्ड्रिंग की एफआईआर दर्ज है", weight: 3, segment_index: 1, explanation: "Legal threat" },
  { id: "e3", category: "ISOLATION", evidence: "डिजिटल अरेस्ट", weight: 3, segment_index: 2, explanation: "Isolation order" },
  { id: "e4", category: "ISOLATION", evidence: "फोन मत काटना", weight: 3, segment_index: 2, explanation: "Refuses hang up" },
  { id: "e5", category: "MONEY_TRANSFER", evidence: "सेफ अकाउंट में चालीस हज़ार रुपये भेजिए", weight: 3, segment_index: 3, explanation: "Demands money" },
];

const HERO_EXAMPLE_NOTES: CallMarginNoteItem[] = [
  { segmentIndex: 0, category: "AUTHORITY_CLAIM", text: "सीबीआई का झूठा दावा" },
  { segmentIndex: 2, category: "ISOLATION", text: "फोन पर रहने का दबाव" },
  { segmentIndex: 3, category: "MONEY_TRANSFER", text: "पैसे ट्रांसफर की मांग" },
];

export default function HomePage() {
  const { t, tArray, locale } = useI18n();

  return (
    <main className="space-y-24 py-10 sm:py-16">
      {/* 1. Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headlines & Actions */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-[var(--ink)] tracking-tight leading-[1.05]">
              {t("hero.title_primary")}
            </h1>
            <p className="font-display font-bold text-2xl sm:text-3xl text-[var(--ink-muted)] opacity-90">
              {t("hero.title_secondary")}
            </p>
          </div>

          <p className="text-lg sm:text-xl text-[var(--ink-muted)] max-w-xl leading-relaxed">
            {t("hero.description")}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center h-[52px] px-8 rounded-full bg-[var(--stamp)] text-white font-bold text-base hover:opacity-95 active:scale-98 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] focus:ring-offset-2"
            >
              {t("hero.cta_watch_demo")}
            </Link>

            <Link
              href="/parent"
              className="inline-flex items-center justify-center h-[52px] px-8 rounded-full border-2 border-[var(--stamp)] text-[var(--stamp)] font-bold text-base hover:bg-[var(--stamp)]/5 active:scale-98 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
            >
              {t("hero.cta_parent_mode")}
            </Link>
          </div>

          <div className="pt-2 text-xs font-semibold text-[var(--ink-muted)] flex flex-wrap items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--safe)]" />
            <span>{t("hero.disclaimer")}</span>
            <span className="opacity-40">•</span>
            <Link href="/check" className="underline hover:text-[var(--ink)]">
              {t("hero.cta_check_recording")}
            </Link>
          </div>
        </div>

        {/* Right Column: Hero Sheet Preview */}
        <div className="lg:col-span-6 relative">
          {/* Label banner per spec 7.1C */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs text-[var(--ink-muted)] px-1">
            <span className="font-semibold uppercase tracking-wider bg-[var(--line)]/50 px-2 py-0.5 rounded text-[11px]">
              Example, written by us • काल्पनिक उदाहरण
            </span>
            <span className="text-[11px] opacity-75">Static demonstration</span>
          </div>

          <div className="transform sm:rotate-[1.5deg] transition-transform hover:rotate-0 duration-300">
            <CallSheet
              level="scam"
              segments={HERO_EXAMPLE_SEGMENTS}
              signals={HERO_EXAMPLE_SIGNALS}
              marginNotes={HERO_EXAMPLE_NOTES}
              lang={locale}
              showStamp={true}
            />
          </div>
        </div>
      </section>

      {/* 2. Three Ways to Use It */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)] mb-8 text-center sm:text-left">
          {t("modes.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/live"
            className="p-6 rounded-lg bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
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
            className="p-6 rounded-lg bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
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
            className="p-6 rounded-lg bg-[var(--sheet)] border border-[var(--line)] space-y-3 transition-colors hover:border-[var(--stamp)] block group"
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

      {/* 3. How It Works (Three real steps with custom SVGs) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)] mb-8 text-center sm:text-left">
          {t("steps.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="space-y-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              stroke="var(--stamp)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="18" y="10" width="28" height="44" rx="4" />
              <line x1="28" y1="16" x2="36" y2="16" />
              <circle cx="32" cy="46" r="2" fill="currentColor" />
              <path d="M52 26 C56 30 56 34 52 38" />
              <path d="M12 26 C8 30 8 34 12 38" />
            </svg>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step1_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{t("steps.step1_desc")}</p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              stroke="var(--alarm)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 10 L52 10 L52 54 L12 54 Z" />
              <path d="M20 22 L44 22" stroke="var(--marker)" strokeWidth="6" opacity="0.6" />
              <ellipse cx="32" cy="38" rx="14" ry="7" stroke="var(--alarm)" strokeWidth="2.5" />
            </svg>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step2_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{t("steps.step2_desc")}</p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              stroke="var(--safe)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="14,24 26,24 40,12 40,52 26,40 14,40" />
              <path d="M48 24 C52 28 52 36 48 40" />
              <path d="M54 18 C60 26 60 38 54 46" />
            </svg>
            <h3 className="text-xl font-bold text-[var(--ink)]">{t("steps.step3_title")}</h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{t("steps.step3_desc")}</p>
          </div>
        </div>
      </section>

      {/* 4. Built for How India Speaks */}
      <section className="bg-[var(--sheet)] border-y border-[var(--line)] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-display font-extrabold text-[var(--ink)]">
              {t("languages.title")}
            </h2>
            <p className="text-base text-[var(--ink-muted)]">
              {t("languages.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {tArray("languages.items").map((lang: string) => (
              <span
                key={lang}
                className="px-5 py-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-lg sm:text-xl text-[var(--ink)]"
              >
                {lang}
              </span>
            ))}
          </div>

          <p className="text-xs text-[var(--ink-muted)] italic">
            Prisma v2.5 models transcribe code-mixed and noisy Indian telephony speech directly. Accuracy figures are reported on the{" "}
            <Link href="/accuracy" className="underline font-semibold">
              Evaluation page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 5. Scams Sajag Knows (Typographic Index per 7.1C) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-[var(--ink)]">
            {t("scams.title")}
          </h2>
          <p className="text-base text-[var(--ink-muted)] mt-1">
            {t("scams.subtitle")}
          </p>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {[
            "digital_arrest",
            "bank_kyc",
            "upi_refund",
            "utility_disconnect",
            "courier_parcel",
            "tech_support_remote",
            "family_emergency",
            "lottery_prize",
            "investment_task",
          ].map((scamKey) => (
            <div
              key={scamKey}
              className="py-4 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-baseline"
            >
              <div className="md:col-span-4 font-display font-bold text-lg sm:text-xl text-[var(--ink)]">
                {t(`scams.${scamKey}.title`)}
              </div>
              <div className="md:col-span-8 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
                {t(`scams.${scamKey}.desc`)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Parent Mode Preview Band */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-2xl bg-[var(--sheet)] border-2 border-[var(--stamp)] text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] font-bold text-xs uppercase tracking-wider">
              Parent Mode
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[var(--ink)]">
              {t("parent_band.title")}
            </h2>
            <p className="text-base text-[var(--ink-muted)]">
              {t("parent_band.description")}
            </p>
          </div>

          <Link
            href="/parent"
            className="shrink-0 h-[56px] px-8 rounded-full bg-[var(--stamp)] text-white font-bold text-lg flex items-center gap-2 hover:opacity-95 active:scale-98 transition-all"
          >
            <span>{t("parent_band.cta")}</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* 7. Honest Limits */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-3 text-sm text-[var(--ink-muted)]">
        <h3 className="font-bold text-base text-[var(--ink)]">{t("limits.title")}</h3>
        <p className="leading-relaxed">{t("limits.body")}</p>
        <Link href="/about" className="inline-block underline font-medium text-[var(--stamp)] pt-1">
          {t("limits.link")}
        </Link>
      </section>
    </main>
  );
}
