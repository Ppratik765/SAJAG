"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { VerdictStamp, RiskLevel } from "@/components/ui/VerdictStamp";
import { siteUrl } from "@/lib/site";

const ALLOWED_TYPES: Record<string, { en: string; hi: string; descEn: string; descHi: string }> = {
  digital_arrest: {
    en: "Digital Arrest Scam",
    hi: "डिजिटल अरेस्ट ठगी",
    descEn: "Fraudsters pose as police or CBI officers threatening arrest over video call. Real law enforcement agencies never conduct arrests or demand money on video calls.",
    descHi: "ठग पुलिस या सीबीआई अधिकारी बनकर वीडियो कॉल पर गिरफ्तारी की धमकी देते हैं। असली पुलिस या कोर्ट कभी भी वीडियो कॉल पर पैसे नहीं मांगते।",
  },
  bank_kyc: {
    en: "Bank KYC Expiry Fraud",
    hi: "बैंक केवाईसी एक्सपायरी फ्रॉड",
    descEn: "Threats that your bank account or card is blocked. Real banks never ask for passwords, PINs, or OTPs over the phone.",
    descHi: "खाता या कार्ड बंद होने का डर दिखाकर कोड मांगना। बैंक कभी भी फोन पर पासवर्ड या ओटीपी नहीं मांगते।",
  },
  upi_refund: {
    en: "UPI Refund / Wrong Payment",
    hi: "यूपीआई रिफंड / गलत पेमेंट",
    descEn: "Claims money was sent by mistake, asking you to scan a QR code or enter your PIN. You never enter a PIN to receive money.",
    descHi: "पैसे गलती से भेजने का दावा करके क्यूआर कोड स्कैन या पिन डलवाना। पैसे पाने के लिए कभी पिन नहीं डालना होता।",
  },
  utility_disconnect: {
    en: "Electricity Bill Disconnection",
    hi: "बिजली बिल डिस्कनेक्शन",
    descEn: "Threats of immediate power cut tonight unless you download an APK or call a number. Always pay bills through official state portals.",
    descHi: "आज रात बिजली काटने की धमकी देकर अनजान नंबर पर फोन या ऐप डाउनलोड कराना। बिल हमेशा आधिकारिक पोर्टल पर भरें।",
  },
  courier_parcel: {
    en: "Customs / Illegal Parcel",
    hi: "कस्टम्स / अवैध पार्सल",
    descEn: "Claims a parcel in your name contains narcotics or passports and demands customs clearance fees. Disconnect immediately.",
    descHi: "आपके नाम के पार्सल में गैरकानूनी सामान बताकर कस्टम्स शुल्क मांगना। किसी अनजान खाते में पैसे न भेजें।",
  },
  tech_support_remote: {
    en: "Fake Tech Support",
    hi: "फर्जी तकनीकी सहायता",
    descEn: "Requests to install remote desktop apps like AnyDesk. Callers gain control of your device and siphon bank funds.",
    descHi: "एनीडेस्क जैसे रिमोट ऐप डाउनलोड कराने की कोशिश। धोखेबाज आपके फोन का नियंत्रण लेकर पैसे निकाल लेते हैं।",
  },
  family_emergency: {
    en: "Family Emergency Scam",
    hi: "पारिवारिक आपातकाल ठगी",
    descEn: "A distressed voice claiming a relative is in hospital or jail, demanding emergency funds. Always verify with your family directly.",
    descHi: "परिजन के मुसीबत या अस्पताल में होने का झूठा दावा। हमेशा पहले अपने परिजन को सीधे फोन करके जांचें।",
  },
  lottery_prize: {
    en: "Lottery / Prize Scam",
    hi: "लॉटरी / इनाम ठगी",
    descEn: "Claims you won a lottery or car and asks for processing tax upfront. Real prizes never require advance payment.",
    descHi: "इनाम या लॉटरी के पैसे देने के नाम पर पहले टैक्स या प्रोसेसिंग फीस मांगना ठगी है।",
  },
  investment_task: {
    en: "Investment / Part-time Task",
    hi: "निवेश / पार्ट-टाइम टास्क",
    descEn: "Promises of high daily returns for simple online rating tasks or crypto deposits. These are organized fraudulent schemes.",
    descHi: "घर बैठे टास्क या ट्रेडिंग में भारी मुनाफे के वादे। यह एक सुनियोजित वित्तीय धोखाधड़ी है।",
  },
  unknown_suspicious: {
    en: "Suspicious Pressure Call",
    hi: "संदिग्ध कॉल",
    descEn: "The caller exhibited patterns of artificial urgency and pressure. Exercise caution and do not disclose personal codes.",
    descHi: "बातचीत में अनुचित दबाव और गोपनीयता की मांग देखी गई। कोई भी जानकारी साझा न करें।",
  },
};

const ALLOWED_LEVELS = new Set(["suspicious", "likely_scam", "scam"]);

function ReportContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type");
  const rawLevel = searchParams.get("level");
  const rawLang = searchParams.get("lang");

  const [copied, setCopied] = useState(false);

  // Strict allowlist validation: unknown parameters result in a neutral, safe page
  const isValidType = rawType && rawType in ALLOWED_TYPES;
  const isValidLevel = rawLevel && ALLOWED_LEVELS.has(rawLevel);
  const isHindi = rawLang === "hi" || rawLang === "hi-IN";

  if (!isValidType || !isValidLevel) {
    return (
      <main className="min-h-screen py-12 px-4 max-w-2xl mx-auto space-y-6">
        <div className="paper-sheet p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold font-display text-[var(--ink)]">
            सजग सुरक्षा केंद्र • Sajag Security Center
          </h1>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            यह एक सुरक्षित सार्वजनिक सुरक्षा चेतावनी पृष्ठ है। यदि आपको कोई संदिग्ध फोन कॉल आई है, तो आप सजग पर तुरंत उसकी जांच कर सकते हैं।
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/live"
              className="px-6 py-2.5 rounded-lg bg-[var(--stamp)] text-white font-bold text-sm shadow hover:opacity-95"
            >
              लाइव कॉल जांचें • Start Live Check
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] font-semibold text-sm hover:opacity-95"
            >
              मुख्य पृष्ठ • Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const typeKey = rawType as keyof typeof ALLOWED_TYPES;
  const levelKey = rawLevel as RiskLevel;
  const typeInfo = ALLOWED_TYPES[typeKey];

  const scamTitle = isHindi ? typeInfo.hi : typeInfo.en;
  const scamDesc = isHindi ? typeInfo.descHi : typeInfo.descEn;
  const isAlarm = levelKey === "likely_scam" || levelKey === "scam";

  const ogImageUrl = `/api/og?type=${typeKey}&level=${levelKey}&lang=${isHindi ? "hi" : "en"}`;

  const currentUrl = `${siteUrl()}/report?type=${typeKey}&level=${levelKey}&lang=${isHindi ? "hi" : "en"}`;
  const waShareText = isHindi
    ? `⚠️ सजग धोखाधड़ी चेतावनी: मुझे एक संदिग्ध कॉल प्राप्त हुई है (${scamTitle})। कृपया सतर्क रहें, फोन तुरंत काटें और कोई भी कोड साझा न करें। विवरण देखें: ${currentUrl}`
    : `⚠️ Sajag Scam Warning: Alert regarding a suspected scam call (${scamTitle}). Hang up immediately and never share OTPs. Details: ${currentUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen py-8 sm:py-12 px-4 max-w-3xl mx-auto space-y-8 select-none">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink-muted)] hover:text-[var(--stamp)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? "मुख्य पृष्ठ" : "Back to Sajag Home"}</span>
        </Link>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted)]">
          Public Safety Advisory • जनहित चेतावनी
        </span>
      </div>

      {/* Main Warning Card */}
      <div
        className="p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6"
        style={{
          backgroundColor: "var(--paper)",
          borderColor: isAlarm ? "var(--stamp)" : "var(--warning)",
        }}
      >
        {/* Header with Risk Level and Stamp */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isAlarm ? (
                <ShieldAlert className="w-6 h-6" style={{ color: "var(--stamp)" }} />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
              <span
                className="text-xs sm:text-sm font-extrabold uppercase tracking-widest"
                style={{ color: isAlarm ? "var(--stamp)" : "#b45309" }}
              >
                {isAlarm
                  ? isHindi ? "गंभीर ठगी चेतावनी • SCAM WARNING" : "CRITICAL FRAUD RISK WARNING"
                  : isHindi ? "सतर्कता चेतावनी • CAUTION" : "SUSPICIOUS ACTIVITY ADVISORY"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight" style={{ color: "var(--ink)" }}>
              {scamTitle}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-muted)] max-w-xl">
              {scamDesc}
            </p>
          </div>

          <div className="pt-2">
            <VerdictStamp level={levelKey} size="lg" lang={isHindi ? "hi" : "en"} />
          </div>
        </div>

        {/* Immediate Emergency Action Directives (Spec 7.2) */}
        <div
          className="p-5 rounded-2xl border space-y-4"
          style={{
            backgroundColor: isAlarm ? "rgba(185, 28, 28, 0.05)" : "var(--paper-subtle)",
            borderColor: isAlarm ? "rgba(185, 28, 28, 0.2)" : "var(--rule)",
          }}
        >
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--stamp)]">
            {isHindi ? "तुरंत क्या करें (Immediate Protective Directives):" : "Immediate Protective Directives:"}
          </h2>

          <ul className="text-sm sm:text-base space-y-3 font-medium text-[var(--ink)]">
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[var(--stamp)] text-lg leading-none shrink-0">•</span>
              <span>
                <strong>{isHindi ? "तुरंत फोन काटें (Hang up):" : "Hang up the call immediately."}</strong>{" "}
                {isHindi
                  ? "धमकी देने वाले या जल्दीबाजी का दबाव बनाने वाले किसी भी कॉलर से तुरंत संपर्क समाप्त करें।"
                  : "Never remain on the line with callers threatening arrest or account closure."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[var(--stamp)] text-lg leading-none shrink-0">•</span>
              <span>
                <strong>{isHindi ? "कोई कोड साझा न करें (Never share codes):" : "Do not share verification codes."}</strong>{" "}
                {isHindi
                  ? "ओटीपी, पासवर्ड, यूपीआई पिन या बैंक विवरण किसी को भी न बताएं।"
                  : "Never share OTP, passwords, or UPI PIN under any circumstance."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[var(--stamp)] text-lg leading-none shrink-0">•</span>
              <span>
                <strong>{isHindi ? "पैसे ट्रांसफर न करें (Never send funds):" : "Never transfer money to verify."}</strong>{" "}
                {isHindi
                  ? "किसी भी 'सुरक्षित' या सरकारी सत्यापन खाते में पैसे न भेजें।"
                  : "Government agencies and courts never demand money transfers to clear charges."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[var(--stamp)] text-lg leading-none shrink-0">•</span>
              <span>
                <strong>{isHindi ? "राष्ट्रीय साइबर हेल्पलाइन (Helpline 1930):" : "National Cyber-Crime Helpline 1930."}</strong>{" "}
                {isHindi
                  ? "धोखाधड़ी होने या संदेह होने पर तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट करें।"
                  : "Report financial cyber fraud immediately to helpline 1930 or cybercrime.gov.in."}
              </span>
            </li>
          </ul>
        </div>

        {/* Share and Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <a
            id="share-whatsapp-btn"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[200px] py-3.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>{isHindi ? "परिवार को सतर्क करें (WhatsApp)" : "Warn Family on WhatsApp"}</span>
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-3.5 px-5 rounded-xl border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? (isHindi ? "लिंक कॉपी हो गया!" : "Link Copied!") : (isHindi ? "लिंक कॉपी करें" : "Copy Link")}</span>
          </button>
        </div>

        {/* Open Graph Card Image Preview */}
        <div className="space-y-2 pt-4 border-t" style={{ borderColor: "var(--rule)" }}>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {isHindi ? "सोशल शेयर कार्ड पूर्वावलोकन (Open Graph Card):" : "Social Share Card Preview:"}
          </span>
          <div className="rounded-xl overflow-hidden border border-[var(--line)] shadow-sm bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="og-preview-img"
              src={ogImageUrl}
              alt={scamTitle}
              className="w-full h-auto aspect-[1200/630] object-cover"
            />
          </div>
        </div>

        {/* Footer with link to check own call */}
        <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs" style={{ borderColor: "var(--rule)" }}>
          <p className="text-[11px] text-[var(--muted)]">
            {isHindi
              ? "सजग राष्ट्रीय सार्वजनिक जागरूकता हेतु निर्मित एक सहायक प्रणाली है।"
              : "Sajag is an assistive public safety tool for scam call detection."}
          </p>

          <Link
            href="/live"
            className="inline-flex items-center gap-1.5 font-bold text-[var(--stamp)] hover:underline"
          >
            <span>{isHindi ? "सजग पर अपनी कॉल जांचें" : "Check your own call on Sajag"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ReportClient() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-lg">Loading advisory card...</div>}>
      <ReportContent />
    </Suspense>
  );
}
