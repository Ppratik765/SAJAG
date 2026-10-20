"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--sheet)]/60 py-10 mt-20 text-xs text-[var(--ink-muted)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <p className="font-semibold text-[var(--ink)]">
            {t("footer.credits")}
          </p>
          <p>{t("footer.privacy")}</p>
          <p className="text-[11px] opacity-75">{t("footer.disclaimer")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 font-medium">
          <Link href="/about" className="hover:text-[var(--ink)] underline">
            {t("nav.about")}
          </Link>
          <Link href="/accuracy" className="hover:text-[var(--ink)] underline">
            {t("nav.accuracy")}
          </Link>
          <Link href="/dev/ui" className="hover:text-[var(--ink)] underline">
            Dev Gallery
          </Link>
          <a
            href="https://github.com/Ppratik765/SAJAG"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--ink)] underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
