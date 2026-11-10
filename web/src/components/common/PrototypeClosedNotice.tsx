"use client";

import React from "react";
import Link from "next/link";
import {
  Lock,
  Volume2,
  FileText,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Eye,
} from "lucide-react";

export type PrototypeClosedMode = "live" | "check" | "parent";

interface PrototypeClosedNoticeProps {
  mode: PrototypeClosedMode;
  lang: "en" | "hi";
}

const MODE_COPY: Record<
  PrototypeClosedMode,
  {
    en: { feature: string; body: string };
    hi: { feature: string; body: string };
  }
> = {
  live: {
    en: {
      feature: "Live Call Listening",
      body: "Live microphone streaming requires the FastAPI server and Gnani Prisma speech-to-text credits, which are closed on this public static demo.",
    },
    hi: {
      feature: "लाइव कॉल सुरक्षा",
      body: "लाइव माइक्रोफ़ोन स्ट्रीमिंग के लिए FastAPI बैकएंड सर्वर और Gnani Prisma स्पीच क्रेडिट की आवश्यकता होती है, जो इस पब्लिक डेमो पर खुले नहीं हैं।",
    },
  },
  check: {
    en: {
      feature: "Upload & Recording Check",
      body: "Transcribing uploaded or browser-recorded audio requires the FastAPI + ffmpeg backend and Gnani Prisma credits, which are closed on this public static demo.",
    },
    hi: {
      feature: "रिकॉर्डिंग जाँच",
      body: "ऑडियो फ़ाइल या रिकॉर्डिंग ट्रांसक्राइब करने के लिए FastAPI + ffmpeg बैकएंड सर्वर और Gnani Prisma क्रेडिट चाहिए, जो इस पब्लिक डेमो पर खुले नहीं हैं।",
    },
  },
  parent: {
    en: {
      feature: "Parent Mode Live Listening",
      body: "Live speakerphone monitoring requires the FastAPI server and Gnani speech credits, which are closed on this public static demo.",
    },
    hi: {
      feature: "माता-पिता मोड (लाइव)",
      body: "स्पीकरफोन पर लाइव सुनने के लिए FastAPI बैकएंड सर्वर और स्पीच क्रेडिट चाहिए, जो इस पब्लिक डेमो पर अभी खुले नहीं हैं।",
    },
  },
};

export function PrototypeClosedNotice({ mode, lang }: PrototypeClosedNoticeProps) {
  const copy = MODE_COPY[mode][lang];

  return (
    <section
      data-testid="prototype-closed-notice"
      className="paper-sheet p-6 sm:p-8 lg:p-10 space-y-6 text-left border-2 border-[var(--stamp)]/25"
    >
      {/* Status Pill & Icon */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[var(--line)] pb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center shrink-0">
          <Lock className="w-6 h-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] font-mono text-[11px] font-bold uppercase tracking-wider">
            {copy.feature} • STATIC SHOWCASE
          </span>
          <h2
            data-testid="prototype-closed-heading"
            className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] tracking-tight leading-tight"
          >
            {lang === "hi"
              ? "प्रोटोटाइप: अभी परीक्षण के लिए खुला नहीं है"
              : "Prototype: not open for testing"}
          </h2>
          {lang === "hi" && (
            <p className="text-xs font-mono font-semibold text-[var(--ink-muted)]">
              Prototype: not open for testing
            </p>
          )}
        </div>
      </div>

      {/* Clear Explanation */}
      <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
        {copy.body}
      </p>

      {/* Parent Mode UI Preview CTA */}
      {mode === "parent" && (
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--stamp)]/5 border border-[var(--stamp)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-[var(--ink)]">
              {lang === "hi"
                ? "माता-पिता चेतावनी स्क्रीन का रूप देखें"
                : "Want to see what Parent Mode looks like on a scam call?"}
            </p>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
              {lang === "hi"
                ? "बड़े अक्षरों वाला लाल 'फोन काटें' और WhatsApp परिवार चेतावनी डेमो स्क्रीन देखें।"
                : "Open the full-screen high-contrast HANG UP + WhatsApp family alert preview screen."}
            </p>
          </div>
          <Link
            href="/parent?mock=scam"
            data-testid="parent-preview-mock-btn"
            className="btn-stamp shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#b91c1c] text-white text-sm font-bold shadow-sm hover:opacity-95"
          >
            <Eye className="w-4 h-4" aria-hidden />
            <span>{lang === "hi" ? "स्क्रीन प्रीव्यू देखें" : "Preview Parent Screen"}</span>
          </Link>
        </div>
      )}

      {/* Working Zero-Backend Alternatives */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          {lang === "hi"
            ? "बिना सर्वर के अभी आज़माएँ:"
            : "Try what works right now in your browser:"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/test"
            className="card-interactive p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 hover:border-[var(--stamp)] flex flex-col justify-between gap-3 group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[var(--stamp)]">
                <Volume2 className="w-5 h-5" aria-hidden />
                <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                {lang === "hi" ? "असली उदाहरण सुनें" : "Recorded examples"}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {lang === "hi"
                  ? "कॉल ऑडियो के साथ लाइव टाइमिंग और लाल निशान देखें।"
                  : "Hear real & dramatised calls with timed transcripts and alerts."}
              </p>
            </div>
          </Link>

          <Link
            href="/paste"
            className="card-interactive p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 hover:border-[var(--stamp)] flex flex-col justify-between gap-3 group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[var(--safe-text)]">
                <FileText className="w-5 h-5" aria-hidden />
                <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                {lang === "hi" ? "संदेश पेस्ट करके जाँचें" : "Paste text / SMS"}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {lang === "hi"
                  ? "व्हाट्सएप या एसएमएस टेक्स्ट पर पूरा नियम इंजन तुरंत चलाएँ।"
                  : "Run the full deterministic playbook engine directly on pasted text."}
              </p>
            </div>
          </Link>

          <Link
            href="/spot"
            className="card-interactive p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 hover:border-[var(--stamp)] flex flex-col justify-between gap-3 group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[var(--warning-text)]">
                <ShieldAlert className="w-5 h-5" aria-hidden />
                <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                {lang === "hi" ? "खेल: धोखा पहचानें" : "Spot red flags"}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {lang === "hi"
                  ? "कॉल की पंक्तियों में ठगी के संकेत पहचानने का अभ्यास करें।"
                  : "Interactive practice spotting scam pressure tactics line by line."}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Developer Local Setup Tip */}
      <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
        <p>
          {lang === "hi"
            ? "अपने माइक्रोफ़ोन या ऑडियो फ़ाइल पर चलाने के लिए प्रोजेक्ट को लोकल चलाएँ।"
            : "Running locally? Start the FastAPI backend with a Gnani key to unlock live speech mode."}
        </p>
        <div className="flex items-center gap-4 shrink-0 font-semibold">
          <Link href="/about" className="text-[var(--stamp)] hover:underline">
            {lang === "hi" ? "आर्किटेक्चर पढ़ें" : "Read architecture"}
          </Link>
          <a
            href="https://github.com/Ppratik765/SAJAG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--ink)] hover:text-[var(--stamp)] hover:underline"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}

