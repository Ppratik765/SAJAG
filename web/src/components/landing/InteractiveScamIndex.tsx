"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Mark } from "../ui/Mark";
import { MarginNote } from "../ui/MarginNote";

const SCAM_KEYS = [
  "digital_arrest",
  "bank_kyc",
  "upi_refund",
  "utility_disconnect",
  "courier_parcel",
  "tech_support_remote",
  "family_emergency",
  "lottery_prize",
  "investment_task",
] as const;

export function InteractiveScamIndex() {
  const { t, locale } = useI18n();
  const [openKey, setOpenKey] = useState<string | null>("digital_arrest");

  const toggleRow = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8"
      aria-label="Interactive Scam Index"
    >
      <div className="space-y-2">
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[var(--ink)]">
          {t("scams.title")}
        </h2>
        <p className="text-base text-[var(--ink-muted)] max-w-2xl">
          {t("scams.subtitle")}
        </p>
      </div>

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {SCAM_KEYS.map((key) => {
          const isOpen = openKey === key;
          const title = t(`scams.${key}.title`);
          const desc = t(`scams.${key}.desc`);
          const sample = t(`scams.${key}.sample`);
          const note = t(`scams.${key}.note`);

          return (
            <div
              key={key}
              className={`transition-colors duration-200 ${
                isOpen ? "bg-[var(--sheet)]/60" : "hover:bg-[var(--sheet)]/30"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleRow(key)}
                aria-expanded={isOpen}
                aria-controls={`scam-panel-${key}`}
                className="w-full py-5 px-3 sm:px-4 text-left flex items-start justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] rounded-md"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-baseline flex-1">
                  <div className="md:col-span-5 font-display font-extrabold text-xl sm:text-2xl text-[var(--ink)] tracking-tight">
                    {title}
                  </div>
                  <div className="md:col-span-7 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
                    {desc}
                  </div>
                </div>

                <div
                  className={`p-1 rounded-full text-[var(--ink-muted)] transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180 text-[var(--stamp)]" : ""
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown size={20} />
                </div>
              </button>

              {/* Expanded interactive one-line example with drawing marks and margin note */}
              {isOpen && (
                <div
                  id={`scam-panel-${key}`}
                  role="region"
                  aria-label={`Demonstration of ${title}`}
                  className="px-4 pb-6 pt-1 sm:px-6 animate-[penWriteReveal_300ms_ease-out]"
                >
                  <div className="p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex flex-col sm:flex-row items-start justify-between gap-4">
                    {/* Transcript Quote */}
                    <div className="flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1">
                        {locale === "hi"
                          ? "कॉल का उदाहरण (सजग द्वारा मार्क किया गया)"
                          : "Call Excerpt (Marked by Sajag)"}
                      </span>
                      <div className="text-[15px] sm:text-[16px] text-[var(--ink)] font-medium leading-relaxed">
                        &ldquo;
                        <Mark category="THREAT_ARREST" kind="circle" weight={3}>
                          {sample}
                        </Mark>
                        &rdquo;
                      </div>
                    </div>

                    {/* Kalam Margin Note */}
                    <div className="sm:w-52 shrink-0 pt-1">
                      <MarginNote text={note} category="SCAM_TRAP" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
