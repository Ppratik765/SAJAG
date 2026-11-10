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
          {lang === "hi" ? "असली उदाहरणों पर चलते देखें: सुनिए और देखिए सजग कैसे पकड़ता है" : "See this run on real examples: hear a call, watch Sajag catch it"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          {lang === "hi"
            ? "नीचे दी गई 2 असली कॉल्स में से किसी एक को चुनें और स्पीकर बटन दबाइए। कॉल चलेगी, साथ-साथ लाइव ट्रांसक्रिप्ट बनेगी, ठगी के शब्द लाल रंग में चिह्नित होंगे और खतरा बढ़ने पर इसे ठगी घोषित कर \"फोन काटें\" दिखेगा।"
            : "Choose between the 2 real calls below and press the speaker button. The audio streams as the live transcript builds, scam words are highlighted in red, and the call is flagged as a scam."}
        </p>
      </div>

      {failed && <p role="alert" className="text-sm text-[var(--alarm-text)]">Could not load the list of test clips.</p>}

      {clips && clips.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {lang === "hi" ? "2 असली कॉल्स में से चुनें:" : "Choose between 2 real calls:"}
          </p>
          <div role="tablist" aria-label="Test clips" className="grid sm:grid-cols-2 gap-3">
            {clips.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === selected}
                data-testid={`clip-tab-${c.id}`}
                onClick={() => pickClip(c.id)}
                className={`p-3.5 rounded-lg border text-xs sm:text-sm text-left transition-colors ${
                  c.id === selected
                    ? "border-2 border-[var(--stamp)] bg-[var(--stamp)]/5 font-bold shadow-2xs"
                    : "border-[var(--line)] bg-[var(--sheet)] hover:border-[var(--stamp)]"
                }`}
              >
                <span className="block text-[10px] font-mono uppercase text-[var(--stamp)] mb-0.5">
                  {lang === "hi" ? `उदाहरण ${idx + 1} • असली रिकॉर्डिंग (${Math.round(c.duration_s)}s)` : `Call ${idx + 1} • Real recording (${Math.round(c.duration_s)}s)`}
                </span>
                <span className="text-[var(--ink)]">{lang === "hi" ? c.title_hi : c.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {current && <LiveTestPlayer key={current.id} fixtureUrl={current.fixture_url} allowLive={false} />}

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
