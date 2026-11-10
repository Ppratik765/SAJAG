"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Volume2, FileText, Smartphone, ShieldAlert, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LivingHero } from "@/components/hero/LivingHero";
import { ScrollHowItWorks } from "@/components/landing/ScrollHowItWorks";
import { InteractiveScamIndex } from "@/components/landing/InteractiveScamIndex";
import { LiveTestPlayer } from "@/components/livetest/LiveTestPlayer";
import { Mark } from "@/components/ui/Mark";

const LANGUAGE_PREVIEWS: Record<
  string,
  {
    line: string;
    trigger: string;
    category: string;
    warning: string;
  }
> = {
  हिन्दी: {
    line: "सुप्रीम कोर्ट के आदेश पर आप डिजिटल अरेस्ट में हैं, वीडियो कॉल मत काटना।",
    trigger: "डिजिटल अरेस्ट",
    category: "THREAT_ARREST",
    warning: "तुरंत फोन काटें — पुलिस कभी वीडियो कॉल पर गिरफ़्तार नहीं करती।",
  },
  English: {
    line: "Your Aadhaar is linked to a money laundering FIR. Transfer funds to RBI account now.",
    trigger: "money laundering FIR",
    category: "THREAT_ARREST",
    warning: "Hang up immediately — RBI never asks for verification transfers.",
  },
  Hinglish: {
    line: "Sir aapka parcel customs mein seize hua hai, abhi Skype video call join karo.",
    trigger: "customs mein seize",
    category: "AUTHORITY_CLAIM",
    warning: "Fake courier scam — do not join Skype or WhatsApp video calls.",
  },
  தமிழ்: {
    line: "உங்கள் ஆதார் எண்ணில் சட்டவிரோத பணப்பரிமாற்றம் நடந்துள்ளது, உடனே 6 இலக்க OTP சொல்லுங்கள்.",
    trigger: "6 இலக்க OTP",
    category: "OTP_PIN_REQUEST",
    warning: "உடனே அழைப்பைத் துண்டிக்கவும் — OTP எண்ணை பகிர வேண்டாம்.",
  },
  తెలుగు: {
    line: "మీ పార్శిల్‌లో డ్రగ్స్ దొరికాయి, మీరు డిజిటల్ అరెస్ట్‌లో ఉన్నారు.",
    trigger: "డిజిటల్ అరెస్ట్‌లో",
    category: "THREAT_ARREST",
    warning: "వెంటనే ఫోన్ పెట్టేయండి — ఇది డిజిటల్ అరెస్ట్ మోసం.",
  },
  বাংলা: {
    line: "আপনার ব্যাংক অ্যাকাউন্ট ব্লক হয়ে যাবে, এখনই ওটিপি নম্বরটি বলুন।",
    trigger: "ওটিপি নম্বরটি",
    category: "OTP_PIN_REQUEST",
    warning: "এখনই ফোন কাটুন — কাউকে ওটিপি বা পিন বলবেন না।",
  },
  मराठी: {
    line: "तुमच्या आधार कार्डवर मनी लाँड्रिंगची तक्रार आहे, तात्काळ पैसे ट्रान्सफर करा.",
    trigger: "मनी लाँड्रिंगची तक्रार",
    category: "THREAT_ARREST",
    warning: "लगेच फोन ठेवा — ही डिजिटल अरेस्ट फसवणूक आहे.",
  },
  ગુજરાતી: {
    line: "તમારા પાર્સલમાં ગેરકાયદેસર વસ્તુઓ મળી છે, તમે ડિજિટલ અરેસ્ટ હેઠળ છો.",
    trigger: "ડિજિટલ અરેસ્ટ",
    category: "THREAT_ARREST",
    warning: "તરત જ ફોન કાપો — આ ડિજિટલ અरेस्ट છેતરપિંડી છે.",
  },
  ಕನ್ನಡ: {
    line: "ನಿಮ್ಮ ಆಧಾರ್ ಕಾರ್ಡ್ ಮೇಲೆ ಸಿಬಿಐ ಕೇಸ್ ಇದೆ, ತಕ್ಷಣ ಹಣ ವರ್ಗಾವಣೆ ಮಾಡಿ.",
    trigger: "ಸಿಬಿಐ ಕೇಸ್",
    category: "AUTHORITY_CLAIM",
    warning: "ತಕ್ಷಣ ಕರೆ ಕಟ್ ಮಾಡಿ — ಇದು ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್ ವಂಚನೆ.",
  },
  മലയാളം: {
    line: "നിങ്ങളുടെ അക്കൗണ്ട് മരവിപ്പിക്കാതിരിക്കാൻ ഇപ്പോൾ തന്നെ ഒടിപി പങ്കിടുക.",
    trigger: "ഒടിപി പങ്കിടുക",
    category: "OTP_PIN_REQUEST",
    warning: "ഉടൻ ഫോൺ വെക്കുക — ഒടിപി ആർക്കും നൽകരുത്.",
  },
  ਪੰਜਾਬੀ: {
    line: "ਤੁਹਾਡੇ ਆਧਾਰ ਕਾਰਡ ਤੇ ਮਨੀ ਲਾਂਡਰਿੰਗ ਦਾ ਕੇਸ ਹੈ, ਤੁਰੰਤ ਪੈਸੇ ਟ੍ਰਾਂਸਫਰ ਕਰੋ।",
    trigger: "ਮਨੀ ਲਾਂਡਰਿੰਗ ਦਾ ਕੇਸ",
    category: "THREAT_ARREST",
    warning: "ਤੁਰੰਤ ਫ਼ੋਨ ਕੱਟੋ — ਇਹ ਡਿਜੀਟਲ ਅਰੈਸਟ ਠੱਗੀ ਹੈ।",
  },
};

const MARQUEE_FLAGS = [
  { tag: "THREAT_ARREST", quote: "“You are under Digital Arrest”" },
  { tag: "OTP_PIN_REQUEST", quote: "“Share the 6-digit OTP to unblock KYC”" },
  { tag: "AUTHORITY_CLAIM", quote: "“Calling from CBI / Customs Headquarters”" },
  { tag: "ISOLATION", quote: "“Stay on video call, do not tell family”" },
  { tag: "MONEY_TRANSFER", quote: "“Transfer to RBI verification account”" },
  { tag: "REMOTE_ACCESS", quote: "“Install AnyDesk / QuickSupport now”" },
  { tag: "URGENCY", quote: "“Electricity disconnects tonight at 9 PM”" },
];

const REAL_CLIPS = [
  {
    id: "da_real_02",
    duration_s: 61,
    title: "Digital arrest fraud — Drugs in Parcel & Money Transfer",
    title_hi: "डिजिटल अरेस्ट धोखाधड़ी — पार्सल में ड्रग्स और पैसे ट्रांसफर",
    fixture_url: "/live-tests/da_real_02/fixture.json",
    kind: "dramatised",
  },
  {
    id: "da_real_01",
    duration_s: 66,
    title: "Digital arrest call — Fake Police Station & Video Statement",
    title_hi: "डिजिटल अरेस्ट कॉल — नकली पुलिस स्टेशन और वीडियो बयान",
    fixture_url: "/live-tests/da_real_01/fixture.json",
    kind: "real",
  },
] as const;

export default function HomePage() {
  const { t, tArray, locale } = useI18n();
  const [selectedClipId, setSelectedClipId] = useState<string>(REAL_CLIPS[0].id);
  const activeClip = REAL_CLIPS.find((c) => c.id === selectedClipId) ?? REAL_CLIPS[0];
  const langItems = tArray("languages.items");
  const [activeLangPill, setActiveLangPill] = useState<string>("हिन्दी");
  const [langPinned, setLangPinned] = useState(false);

  useEffect(() => {
    if (langPinned || langItems.length === 0) return;
    const id = setInterval(() => {
      setActiveLangPill((prev) => {
        const idx = langItems.indexOf(prev);
        return langItems[(idx + 1) % langItems.length] || "हिन्दी";
      });
    }, 3600);
    return () => clearInterval(id);
  }, [langPinned, langItems]);

  const activeLangData = LANGUAGE_PREVIEWS[activeLangPill] || LANGUAGE_PREVIEWS["हिन्दी"];

  return (
    <main className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* 1. P0-1 The Living Hero */}
      <LivingHero />

      {/* Kinetic Live Red-Flag Ticker Ribbon */}
      <div
        className="w-full overflow-hidden border-y border-[var(--line)] bg-[var(--sheet)]/90 py-3 select-none"
        aria-label="Live red flag patterns monitored by Sajag"
      >
        <div className="marquee-track items-center gap-6">
          {[...MARQUEE_FLAGS, ...MARQUEE_FLAGS].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-xs whitespace-nowrap shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--alarm)] animate-pulse" />
              <span className="font-mono font-bold text-[10px] text-[var(--alarm-text)] uppercase">
                {item.tag}
              </span>
              <span className="font-medium text-[var(--ink)]">{item.quote}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 1b. See this run on real examples (2 real pre-computed calls) */}
      <section id="real-examples" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--alarm)]/10 text-[var(--alarm-text)] font-mono font-bold text-xs uppercase">
              {locale === "hi" ? "असली रिकॉर्डिंग" : "Real scam call recordings"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
              {locale === "hi" ? "उदाहरणों पर चलते देखें" : "See it on examples"}
            </h2>
            <p className="text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl">
              {locale === "hi"
                ? "नीचे दिए 2 उदाहरणों में से एक चुनें और प्ले दबाएँ। ट्रांसक्रिप्ट कॉल के साथ बनेगी (रिकॉर्डेड रन, पहले प्रिस्मा से लिया गया), खतरनाक शब्द लाल घेरे में दिखेंगे और खतरा ज़्यादा होने पर कॉल चिह्नित होगी।"
                : "Choose one of 2 examples below and press play. The transcript builds as the call plays (recorded runs, captured earlier from Prisma), scam trigger words are circled in red, and Sajag flags the call when the risk is high."}
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

        <div role="tablist" aria-label="Choose between 2 examples" className="grid sm:grid-cols-2 gap-3">
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
                    ? `कॉल ${idx + 1} • ${clip.kind === "real" ? "असली रिकॉर्डिंग" : "नाट्य रूपांतरण"} (${clip.duration_s}s)`
                    : `Call ${idx + 1} • ${clip.kind === "real" ? "Real recording" : "Awareness dramatisation"} (${clip.duration_s}s)`}
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
            className="card-interactive btn-stamp p-6 rounded-2xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 hover:border-[var(--stamp)] block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Smartphone size={20} />
              </div>
              <div className="inline-flex items-end gap-1 h-4 px-2 py-1 rounded-full bg-[var(--stamp)]/10">
                {[5, 11, 7, 13, 8].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-[var(--stamp)] rounded-full"
                    style={{
                      height: `${h}px`,
                      animation: `waveBar ${650 + i * 90}ms ease-in-out infinite ${i * 110}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)] flex items-center justify-between">
              <span>{t("modes.live_title")}</span>
              <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--stamp)]" />
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.live_desc")}
            </p>
          </Link>

          <Link
            href="/check"
            className="card-interactive btn-stamp p-6 rounded-2xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 hover:border-[var(--stamp)] block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[var(--marker)]/40 text-[var(--ink)] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Volume2 size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--marker)]/30 text-[var(--ink)] font-mono text-[10px] font-bold">
                MP3 / WAV / M4A
              </span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)] flex items-center justify-between">
              <span>{t("modes.check_title")}</span>
              <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--stamp)]" />
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.check_desc")}
            </p>
          </Link>

          <Link
            href="/paste"
            className="card-interactive btn-stamp p-6 rounded-2xl bg-[var(--sheet)] border border-[var(--line)] space-y-3 hover:border-[var(--stamp)] block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[var(--safe)]/15 text-[var(--safe-text)] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--alarm)]/10 text-[var(--alarm-text)] font-mono text-[10px] font-bold">
                SMS / WhatsApp
              </span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--stamp)] flex items-center justify-between">
              <span>{t("modes.paste_title")}</span>
              <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--stamp)]" />
            </h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {t("modes.paste_desc")}
            </p>
          </Link>
        </div>
      </section>

      {/* 4. Built for How India Speaks — Interactive Live Multi-Language Showcase */}
      <section className="bg-[var(--sheet)] border-y border-[var(--line)] py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] font-mono font-bold text-xs uppercase">
                <Sparkles size={12} />
                <span>{locale === "hi" ? "इंटरैक्टिव भाषा डेमो" : "Interactive language preview"}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
                {t("languages.title")}
              </h2>
              <p className="text-sm sm:text-base text-[var(--ink-muted)]">
                {t("languages.subtitle")}
              </p>
            </div>
            <span className="text-xs font-semibold text-[var(--stamp)]">
              {locale === "hi"
                ? "किसी भी भाषा पर क्लिक करें ↓"
                : "Click any language below to test ↓"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {langItems.map((lang: string) => {
              const isSelected = lang === activeLangPill;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setLangPinned(true);
                    setActiveLangPill(lang);
                  }}
                  onMouseEnter={() => setActiveLangPill(lang)}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border font-bold text-base sm:text-lg transition-all cursor-pointer ${
                    isSelected
                      ? "border-2 border-[var(--stamp)] bg-[var(--stamp)] text-white shadow-sm -translate-y-0.5"
                      : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--stamp)] shadow-2xs"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* Live Interactive Call Excerpt for Selected Indian Language */}
          <div
            key={activeLangPill}
            className="paper-sheet p-5 sm:p-6 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-[penWriteReveal_300ms_ease-out]"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--stamp)]">
                <span className="w-2 h-2 rounded-full bg-[var(--alarm)] animate-ping" />
                <span>{activeLangPill} • Live Scam Detection</span>
              </div>
              <p className="text-base sm:text-lg text-[var(--ink)] font-medium leading-relaxed">
                &ldquo;
                {activeLangData.line.split(activeLangData.trigger)[0]}
                <Mark category={activeLangData.category} kind="circle" weight={4}>
                  {activeLangData.trigger}
                </Mark>
                {activeLangData.line.split(activeLangData.trigger)[1]}
                &rdquo;
              </p>
            </div>

            <div className="md:w-72 shrink-0 p-3.5 rounded-xl bg-[var(--alarm)]/10 border border-[var(--alarm)]/30 flex items-start gap-2.5 text-[var(--alarm-text)]">
              <ShieldAlert size={18} className="shrink-0 mt-0.5 text-[var(--alarm)]" />
              <div className="text-xs leading-snug">
                <span className="font-bold block mb-0.5 uppercase font-mono text-[10px]">
                  {locale === "hi" ? "सजग की बोलती चेतावनी" : "Sajag Spoken Warning"}
                </span>
                <span className="font-semibold">{activeLangData.warning}</span>
              </div>
            </div>
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
