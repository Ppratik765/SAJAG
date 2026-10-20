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

const SCAM_KEY_PHRASES: Record<string, { en: string; hi: string }> = {
  digital_arrest: {
    en: "digital arrest",
    hi: "डिजिटल अरेस्ट",
  },
  bank_kyc: {
    en: "Share the 6-digit OTP",
    hi: "6 अंकों का ओटीपी बताएं",
  },
  upi_refund: {
    en: "Enter your UPI PIN",
    hi: "अपना यूपीआई पिन दर्ज करें",
  },
  utility_disconnect: {
    en: "power cuts at 9 PM",
    hi: "रात 9 बजे बिजली कट जाएगी",
  },
  courier_parcel: {
    en: "illegal passports and MDMA drugs",
    hi: "जाली पासपोर्ट और नशीली दवाएं",
  },
  tech_support_remote: {
    en: "install QuickSupport",
    hi: "क्विक-सपोर्ट ऐप इंस्टॉल करें",
  },
  family_emergency: {
    en: "detained in a police raid",
    hi: "पुलिस रेड में पकड़ा गया",
  },
  lottery_prize: {
    en: "Deposit 12,500 rupees GST",
    hi: "12,500 रुपये जीएसटी जमा करें",
  },
  investment_task: {
    en: "Deposit 5,000 for VIP task",
    hi: "5,000 जमा करें",
  },
};

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
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[var(--ink-muted)] block mb-1.5">
                        {locale === "hi"
                          ? "कॉल का उदाहरण (सजग द्वारा चिह्नित)"
                          : "Call excerpt, marked by Sajag"}
                      </span>
                      {(() => {
                        const targetPhrase =
                          (locale === "hi"
                            ? SCAM_KEY_PHRASES[key]?.hi
                            : SCAM_KEY_PHRASES[key]?.en) || "";
                        const hasTarget = targetPhrase && sample.includes(targetPhrase);
                        if (!hasTarget) {
                          return (
                            <div className="text-[15px] sm:text-[16px] text-[var(--ink)] leading-relaxed">
                              &ldquo;{sample}&rdquo;
                            </div>
                          );
                        }
                        const parts = sample.split(targetPhrase);
                        return (
                          <div className="text-[15px] sm:text-[16px] text-[var(--ink)] leading-relaxed font-normal">
                            &ldquo;
                            <span>{parts[0]}</span>
                            <Mark category="THREAT_ARREST" kind="circle" weight={3}>
                              {targetPhrase}
                            </Mark>
                            <span>{parts.slice(1).join(targetPhrase)}</span>
                            &rdquo;
                          </div>
                        );
                      })()}
                    </div>

                    {/* Kalam Margin Note (small) */}
                    <div className="sm:w-44 shrink-0 pt-0.5 self-start">
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
