"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface PlaceholderPageProps {
  title: string;
  milestone: string;
  description: string;
}

export function PlaceholderPage({
  title,
  milestone,
  description,
}: PlaceholderPageProps) {
  const { t } = useI18n();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-xs font-bold text-[var(--ink-muted)]">
        <Clock size={14} className="text-[var(--stamp)]" />
        <span>Target: Milestone {milestone}</span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[var(--ink)]">
        {title}
      </h1>

      <p className="text-base sm:text-lg text-[var(--ink-muted)] max-w-xl mx-auto leading-relaxed">
        {description}
      </p>

      <div className="p-6 rounded-xl border border-[var(--line)] bg-[var(--sheet)] max-w-md mx-auto text-xs text-[var(--ink-muted)]">
        <span className="font-bold block text-[var(--ink)] mb-1">
          {t("placeholder.milestone_notice")}
        </span>
        This route is part of Milestone {milestone}. In Milestone M0.5, this page confirms that routing, AppShell, fonts, and theme tokens are operational.
      </div>

      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] font-bold text-sm hover:bg-[var(--line)]/10 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{t("placeholder.back_home")}</span>
        </Link>
      </div>
    </main>
  );
}
