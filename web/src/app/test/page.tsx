"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { LiveTestPlayer } from "@/components/livetest/LiveTestPlayer";
import { safeClipId } from "@/lib/livetest/view";

interface ManifestClip {
  id: string;
  kind: "synthetic" | "real";
  title: string;
  title_hi: string;
  language_code: string;
  duration_s: number;
  fixture_url: string;
}

export default function LiveTestPage() {
  const { locale } = useI18n();
  const lang = locale === "hi" ? "hi" : "en";
  const [clips, setClips] = useState<ManifestClip[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/live-tests/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error("manifest");
        return r.json();
      })
      .then((m: { clips: ManifestClip[] }) => {
        setClips(m.clips);
        const wanted = safeClipId(new URLSearchParams(window.location.search).get("clip"));
        const pick = m.clips.find((c) => c.id === wanted) ?? m.clips[0];
        setSelected(pick ? pick.id : null);
      })
      .catch(() => setFailed(true));
  }, []);

  const current = clips?.find((c) => c.id === selected) ?? null;

  const pickClip = (id: string) => {
    setSelected(id);
    try {
      window.history.replaceState(null, "", `/test?clip=${id}`);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] tracking-tight">
          {lang === "hi" ? "लाइव टेस्ट: सुनिए और देखिए सजग कैसे पकड़ता है" : "Live test: hear a call, watch Sajag catch it"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          {lang === "hi"
            ? "स्पीकर बटन दबाइए। कॉल चलेगी, उसी समय ट्रांसक्रिप्ट बनेगी, चेतावनी संकेत चिह्नित होंगे और खतरा बढ़ने पर \"फोन काटें\" दिखेगा।"
            : "Press the speaker button. The call plays, the transcript builds as it is heard, warning signs get marked, and when the risk is high it tells you to hang up."}
        </p>
      </div>

      {failed && <p role="alert" className="text-sm text-[var(--alarm-text)]">Could not load the list of test clips.</p>}

      {clips && clips.length > 1 && (
        <div role="tablist" aria-label="Test clips" className="flex flex-wrap gap-2">
          {clips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === selected}
              data-testid={`clip-tab-${c.id}`}
              onClick={() => pickClip(c.id)}
              className={`px-3 py-2 rounded-md border text-xs sm:text-sm text-left transition-colors ${
                c.id === selected ? "border-[var(--stamp)] bg-[var(--stamp)]/5 font-bold" : "border-[var(--line)] bg-[var(--sheet)] hover:border-[var(--stamp)]"
              }`}
            >
              <span className="block text-[10px] font-mono uppercase text-[var(--ink-muted)]">
                {c.kind === "real" ? (lang === "hi" ? "असली रिकॉर्डिंग" : "Real recording") : lang === "hi" ? "सिंथेटिक" : "Synthetic"}
              </span>
              {lang === "hi" ? c.title_hi : c.title}
            </button>
          ))}
        </div>
      )}

      {current && <LiveTestPlayer key={current.id} fixtureUrl={current.fixture_url} />}

      <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--sheet)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[var(--ink-muted)]">
          {lang === "hi" ? "अपनी असली कॉल पर आज़माना है?" : "Want to try it on your own call?"}
        </p>
        <Link href="/live" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--stamp)] text-white text-sm font-bold hover:opacity-95">
          <span>{lang === "hi" ? "लाइव मोड" : "Live Mode"}</span>
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
