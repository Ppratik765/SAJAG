"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Volume2, FileText, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LivingHero } from "@/components/hero/LivingHero";
import { ScrollHowItWorks } from "@/components/landing/ScrollHowItWorks";
import { InteractiveScamIndex } from "@/components/landing/InteractiveScamIndex";

export default function HomePage() {
  const { t, tArray, locale } = useI18n();

  return (
    <main className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* 1. P0-1 The Living Hero */}
      <LivingHero />

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
