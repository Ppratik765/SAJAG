"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Volume2,
  Square,
  Share2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { VerdictStamp, RiskLevel } from "./VerdictStamp";

export interface ResultCardSignal {
  id: string;
  category: string;
  evidence: string;
  weight?: number;
  explanation?: string;
}

export interface ResultCardProps {
  level: RiskLevel;
  score: number;
  primaryType: string;
  signals?: ResultCardSignal[];
  adviceKeys?: string[];
  languageCode?: string;
  activeLang?: "hi" | "en";
  showShare?: boolean;
}

const SCAM_TYPE_NAMES: Record<string, { en: string; hi: string }> = {
  digital_arrest: { en: "Digital Arrest Scam", hi: "डिजिटल अरेस्ट ठगी" },
  bank_kyc: { en: "Bank KYC Expiry Fraud", hi: "बैंक केवाईसी एक्सपायरी फ्रॉड" },
  upi_refund: { en: "UPI Refund / Wrong Payment", hi: "यूपीआई रिफंड / गलत पेमेंट" },
  utility_disconnect: { en: "Electricity Bill Disconnection", hi: "बिजली बिल डिस्कनेक्शन" },
  courier_parcel: { en: "Customs / Illegal Parcel", hi: "कस्टम्स / अवैध पार्सल" },
  tech_support_remote: { en: "Fake Tech Support", hi: "फर्जी तकनीकी सहायता" },
  family_emergency: { en: "Family Emergency Scam", hi: "पारिवारिक आपातकाल ठगी" },
  lottery_prize: { en: "Lottery / Prize Scam", hi: "लॉटरी / इनाम ठगी" },
  investment_task: { en: "Investment / Part-time Task", hi: "निवेश / पार्ट-टाइम टास्क" },
  unknown_suspicious: { en: "Suspicious Call", hi: "संदिग्ध कॉल" },
  none: { en: "No warning signs found yet", hi: "अभी कोई संकेत नहीं मिला" },
};

const EXPLAIN_DESCRIPTIONS: Record<string, { en: string; hi: string }> = {
  digital_arrest: {
    en: "Real police and court officials never demand money or conduct arrests over video calls. Hang up and contact the cyber helpline 1930.",
    hi: "असली पुलिस या कोर्ट कभी वीडियो कॉल पर गिरफ्तारी की धमकी देकर पैसे नहीं मांगते। फोन काट दें और साइबर हेल्पलाइन 1930 पर संपर्क करें।",
  },
  bank_kyc: {
    en: "Banks never ask for passwords, PINs, or OTPs over the phone to update KYC. Contact your official bank branch directly.",
    hi: "बैंक कभी भी फोन पर पासवर्ड, पिन या ओटीपी नहीं मांगते और न ही खाता बंद करने की धमकी देते हैं। अपनी बैंक शाखा से संपर्क करें।",
  },
  courier_parcel: {
    en: "Demanding money or customs clearance fees for seized parcels over the phone is a common scam. Do not transfer any funds.",
    hi: "पार्सल या कस्टम के नाम पर गैरकानूनी सामान बताकर पैसे मांगना ठगी है। किसी अनजान खाते में पैसे ट्रांसफर न करें।",
  },
  lottery_prize: {
    en: "Demanding advance fees or processing charges to claim a lottery prize or gift is a scam. Never pay to receive prize money.",
    hi: "किसी भी लॉटरी या इनाम के पैसे पाने के लिए पहले शुल्क या टैक्स देना ठगी का तरीका है। कोई भी भुगतान न करें।",
  },
  upi_refund: {
    en: "You never need to enter a UPI PIN or scan a QR code to receive money or refunds. PIN is only for sending money.",
    hi: "पैसे या रिफंड प्राप्त करने के लिए कभी भी यूपीआई पिन दर्ज करने की आवश्यकता नहीं होती। पिन सिर्फ पैसे भेजने के लिए होता है।",
  },
  utility_disconnect: {
    en: "Threatening immediate disconnection of electricity or water to force app downloads is a scam. Pay bills only via official portals.",
    hi: "बिजली या पानी का कनेक्शन तुरंत काटने की धमकी देकर अनजान ऐप डाउनलोड कराना ठगी है। हमेशा आधिकारिक बिलिंग पोर्टल का उपयोग करें।",
  },
  tech_support_remote: {
    en: "Never download remote access apps like AnyDesk at the request of an unknown caller. They can view your screen and steal your funds.",
    hi: "किसी अनजान कॉलर के कहने पर मोबाइल या कंप्यूटर में रिमोट ऐप जैसे एनीडेस्क कभी डाउनलोड न करें। वे आपका खाता खाली कर सकते हैं।",
  },
  family_emergency: {
    en: "Do not send money in panic if a caller claims a family member is in trouble. Call your relative directly to verify.",
    hi: "किसी रिश्तेदार के मुसीबत या अस्पताल में होने का दावा करने वाली कॉल पर तुरंत पैसे न भेजें। पहले सीधे उस परिजन को फोन करके जांचें।",
  },
  investment_task: {
    en: "Promises of high guaranteed returns for completing online tasks or trading are investment scams. Do not deposit funds into unknown accounts.",
    hi: "ऑनलाइन टास्क या घर बैठे भारी मुनाफे के वादे अक्सर फर्जी निवेश घोटाले होते हैं। अनजान ग्रुप्स में पैसे कभी न लगाएं।",
  },
  unknown_suspicious: {
    en: "This call shows signs of pressure or unusual demands. Do not share codes, passwords, or personal details.",
    hi: "इस बातचीत में दबाव और असामान्य मांगें दिख रही हैं। कोई भी कोड, पासवर्ड या व्यक्तिगत जानकारी साझा न करें।",
  },
};

const CATEGORY_NAMES: Record<string, { en: string; hi: string }> = {
  AUTHORITY_CLAIM: { en: "Authority Claim", hi: "अधिकारी होने का दावा" },
  THREAT_ARREST: { en: "Arrest Threat", hi: "गिरफ्तारी की धमकी" },
  ISOLATION: { en: "Isolation / Video Demand", hi: "वीडियो कॉल / अलगाव" },
  SECRECY: { en: "Secrecy Directive", hi: "गोपनीयता की शर्त" },
  OTP_PIN_REQUEST: { en: "OTP / PIN Demand", hi: "ओटीपी या पिन की मांग" },
  MONEY_TRANSFER: { en: "Money Transfer Demand", hi: "पैसे भेजने की मांग" },
  REMOTE_ACCESS_APP: { en: "Remote Access App", hi: "रिमोट ऐप डाउनलोड" },
  ACCOUNT_THREAT: { en: "Account Threat", hi: "खाता बंद करने की धमकी" },
  URGENCY: { en: "Urgency Pressure", hi: "जल्दबाजी का दबाव" },
  PRIZE_REFUND: { en: "Lottery / Refund", hi: "इनाम या रिफंड का दावा" },
  PARCEL: { en: "Parcel / Customs", hi: "पार्सल या कस्टम्स" },
  INVESTMENT: { en: "Investment Task", hi: "फर्जी निवेश टास्क" },
};

export function ResultCard({
  level,
  score,
  primaryType,
  signals = [],
  languageCode = "hi-IN",
  activeLang = "hi",
  showShare = true,
}: ResultCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const isAlarm = level === "scam" || level === "likely_scam";
  const isSuspicious = level === "suspicious";

  // Resolve audio path for explanation
  const resolveAudioSrc = (): string => {
    const isIndic = languageCode.startsWith("hi") || languageCode.startsWith("ta") ||
      languageCode.startsWith("te") || languageCode.startsWith("kn") || languageCode.startsWith("ml") ||
      languageCode.startsWith("mr") || languageCode.startsWith("bn") || languageCode.startsWith("gu") ||
      languageCode.startsWith("pa");

    const langFolder = isIndic ? "hi-IN" : "en-IN";
    const typeKey = primaryType && primaryType !== "none" ? primaryType : null;

    if (typeKey && typeKey in EXPLAIN_DESCRIPTIONS) {
      return `/audio/warnings/${langFolder}/explain_${typeKey}.mp3`;
    }
    if (isAlarm) {
      return `/audio/warnings/${langFolder}/alert_scam.mp3`;
    }
    return `/audio/warnings/${langFolder}/alert_suspicious.mp3`;
  };

  const handleToggleListen = () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    const src = resolveAudioSrc();
    setAudioUnavailable(false);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
      } else {
        audioRef.current.src = src;
      }

      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
      };

      audioRef.current.onerror = () => {
        setIsPlayingAudio(false);
        setAudioUnavailable(true);
      };

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingAudio(true);
          })
          .catch(() => {
            setIsPlayingAudio(false);
            setAudioUnavailable(true);
          });
      }
    } catch {
      setIsPlayingAudio(false);
      setAudioUnavailable(true);
    }
  };

  const isSafe = level === "safe";
  const scamTypeName = SCAM_TYPE_NAMES[primaryType]?.[activeLang] || primaryType;
  const explainText =
    EXPLAIN_DESCRIPTIONS[primaryType]?.[activeLang] ||
    (isAlarm
      ? activeLang === "hi"
        ? "इस कॉल में ठगी के गंभीर संकेत मिले हैं। तुरंत फोन काट दें।"
        : "Critical red flags of financial fraud detected. Disconnect immediately."
      : isSuspicious
      ? activeLang === "hi"
        ? "इस कॉल में सतर्क रहने के संकेत हैं। कोई भी कोड न बताएं।"
        : "Exercise caution. Do not share personal verification codes."
      : activeLang === "hi"
      ? "अभी कोई संकेत नहीं मिला। फिर भी अनजान कॉलर के साथ कोड, पिन या पैसे साझा न करें।"
      : "No warning signs found yet. Still do not share codes, PINs or money with unknown callers.");

  const topEvidence = signals.slice(0, 5);

  return (
    <div
      data-testid="result-card"
      className="p-5 sm:p-6 rounded-2xl border shadow-sm space-y-5 transition-all"
      style={{
        backgroundColor: "var(--paper)",
        borderColor: isAlarm ? "var(--stamp)" : isSuspicious ? "var(--warning)" : "var(--rule)",
      }}
    >
      {/* Header with Level & Stamp */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--rule)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isAlarm ? (
              <ShieldAlert className="w-5 h-5" style={{ color: "var(--stamp)" }} />
            ) : isSuspicious ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isAlarm ? "var(--stamp)" : isSuspicious ? "#b45309" : "#15803d" }}>
              {isAlarm
                ? activeLang === "hi" ? "गंभीर चेतावनी • SCAM ALERT" : "FRAUD RISK ALERT"
                : isSuspicious
                ? activeLang === "hi" ? "सतर्क रहें • CAUTION" : "SUSPICIOUS ACTIVITY"
                : activeLang === "hi" ? "अभी कोई संकेत नहीं • NO WARNING SIGNS" : "NO WARNING SIGNS FOUND YET"}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-display font-bold" style={{ color: "var(--ink)" }}>
            {scamTypeName}
          </h3>

          <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            Score: {score} • {signals.length} {activeLang === "hi" ? "संकेत मिले" : "signals identified"}
          </p>
        </div>

        <VerdictStamp level={level} size="md" lang={activeLang} />
      </div>

      {/* Why This Looks Like A Scam (Explanation) & Listen Button */}
      <div
        className="p-4 rounded-xl border space-y-3"
        style={{
          backgroundColor: isAlarm ? "rgba(185, 28, 28, 0.05)" : "var(--paper-subtle)",
          borderColor: isAlarm ? "rgba(185, 28, 28, 0.2)" : "var(--rule)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {isSafe
              ? (activeLang === "hi" ? "सलाह और स्थिति:" : "Advisory & status:")
              : (activeLang === "hi" ? "यह ठगी क्यों लगती है:" : "Why this looks like a scam:")}
          </span>

          {/* Listen Button (Spec 7.5) */}
          <button
            id="listen-warning-btn"
            data-testid="listen-warning-btn"
            type="button"
            onClick={handleToggleListen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-colors"
            style={{
              backgroundColor: isPlayingAudio ? "var(--stamp)" : "var(--paper)",
              color: isPlayingAudio ? "#ffffff" : "var(--ink)",
              border: "1px solid var(--rule)",
            }}
            aria-label={isPlayingAudio ? "Stop spoken warning" : "Listen to spoken warning"}
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{activeLang === "hi" ? "रोकें • Stop" : "Stop"}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{activeLang === "hi" ? "सुनें • Listen" : "Listen"}</span>
              </>
            )}
          </button>
        </div>

        <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--ink)" }}>
          {explainText}
        </p>

        {audioUnavailable && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold" data-testid="audio-unavailable-note">
            ⚠️ {activeLang === "hi" ? "ऑडियो चेतावनी अनुपलब्ध है।" : "Voice warning audio unavailable."}
          </p>
        )}
      </div>

      {/* Top 5 Evidence Quotes */}
      {topEvidence.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {activeLang === "hi" ? "पहचाने गए मुख्य शब्द और प्रमाण (अधिकतम 5):" : "Key Evidence Quotes (Top 5):"}
          </h4>
          <div className="space-y-1.5">
            {topEvidence.map((sig, idx) => (
              <div
                key={sig.id || idx}
                className="p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2"
                style={{ backgroundColor: "var(--paper-subtle)", borderColor: "var(--rule)" }}
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 mr-2">
                    {CATEGORY_NAMES[sig.category]?.[activeLang] || sig.category}
                  </span>
                  <span className="font-mono text-xs text-[var(--ink)]">
                    &ldquo;{sig.evidence}&rdquo;
                  </span>
                </div>
                {sig.weight && (
                  <span className="font-mono text-[11px] font-bold text-[var(--muted)] shrink-0">
                    +{sig.weight}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Advice List */}
      <div className="space-y-2 pt-1 border-t" style={{ borderColor: "var(--rule)" }}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          {activeLang === "hi" ? "सुरक्षा निर्देश:" : "Immediate Protective Action:"}
        </h4>
        <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: "var(--ink)" }}>
          <li>
            <strong>{activeLang === "hi" ? "फोन तुरंत काटें:" : "Hang up:"}</strong>{" "}
            {activeLang === "hi"
              ? "अधिकारी बनकर धमकी देने वालों से तुरंत कॉल डिस्कनेक्ट करें।"
              : "Disconnect the call now. Real officials never conduct video arrests."}
          </li>
          <li>
            <strong>{activeLang === "hi" ? "कोई कोड न दें:" : "Never share codes:"}</strong>{" "}
            {activeLang === "hi"
              ? "ओटीपी, पासवर्ड, कार्ड नंबर या यूपीआई पिन किसी को न बताएं।"
              : "Never share OTP, passwords, or UPI PIN under any pretext."}
          </li>
          <li>
            <strong>{activeLang === "hi" ? "पैसे न भेजें:" : "Never send funds:"}</strong>{" "}
            {activeLang === "hi"
              ? "किसी भी 'सुरक्षित' या वेरिफिकेशन खाते में पैसे ट्रांसफर न करें।"
              : "Do not transfer money to any 'safe account' for verification."}
          </li>
          <li>
            <strong>{activeLang === "hi" ? "साइबर हेल्पलाइन 1930:" : "Helpline 1930:"}</strong>{" "}
            {activeLang === "hi"
              ? "धोखाधड़ी होने पर तुरंत राष्ट्रीय हेल्पलाइन 1930 पर शिकायत करें।"
              : "Call the national cybercrime helpline 1930 immediately."}
          </li>
        </ul>
      </div>

      {/* Share and Disclaimer Footer */}
      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: "var(--rule)" }}>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          {activeLang === "hi"
            ? "सजग एक सहायक प्रणाली है, कानूनी गारंटी नहीं।"
            : "Sajag is an assistive helper, not a guarantee."}
        </p>

        {showShare && (
          <Link
            id="share-report-btn"
            data-testid="share-report-btn"
            href={`/report?type=${primaryType}&level=${level}&lang=${languageCode}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--paper-subtle)", borderColor: "var(--rule)", color: "var(--ink)" }}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{activeLang === "hi" ? "चेतावनी साझा करें" : "Share this warning"}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
