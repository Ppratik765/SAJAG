"use client";

import React, { useState, useRef, useCallback, Suspense, useMemo, useEffect } from "react";
import { siteUrl } from "@/lib/site";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mic,
  Square,
  ShieldCheck,
  AlertTriangle,
  PhoneOff,
  Share2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { VerdictStamp, RiskLevel } from "@/components/ui/VerdictStamp";
import { Framer } from "@/lib/audio/framer";
import { floatToPcm16 } from "@/lib/audio/pcm";
import { resampleTo16k } from "@/lib/audio/resample";
import { getActiveMicPreset } from "@/lib/audio/constraints";
import { createWarningPlayer, WarningPlayer } from "@/lib/warnings/policy";
import { useServerMeta } from "@/lib/warnings/useServerMeta";

type ParentSessionState = "idle" | "connecting" | "listening" | "ended" | "error";

const SCAM_TYPE_NAMES: Record<string, { hi: string; en: string }> = {
  digital_arrest: { hi: "डिजिटल अरेस्ट ठगी", en: "Digital Arrest Scam" },
  bank_kyc: { hi: "बैंक केवाईसी एक्सपायरी फ्रॉड", en: "Bank KYC Expiry Fraud" },
  upi_refund: { hi: "यूपीआई रिफंड फ्रॉड", en: "UPI Refund Scam" },
  utility_disconnect: { hi: "बिजली बिल डिस्कनेक्शन ठगी", en: "Electricity Bill Disconnection" },
  courier_parcel: { hi: "कस्टम्स / अवैध पार्सल ठगी", en: "Customs / Illegal Parcel" },
  tech_support_remote: { hi: "फर्जी तकनीकी सहायता", en: "Fake Tech Support" },
  family_emergency: { hi: "पारिवारिक आपातकाल ठगी", en: "Family Emergency Scam" },
  lottery_prize: { hi: "लॉटरी / इनाम ठगी", en: "Lottery / Prize Scam" },
  investment_task: { hi: "फर्जी निवेश टास्क", en: "Investment / Part-time Task" },
  unknown_suspicious: { hi: "संदिग्ध कॉल", en: "Suspicious Call" },
  none: { hi: "अभी कोई संकेत नहीं मिला", en: "No warning signs found yet" },
};

function ParentContent() {
  const searchParams = useSearchParams();
  const mockParam = searchParams.get("mock");
  const { meta } = useServerMeta();

  // Derive mock states without triggering set-state-in-effect lint error
  const mockState = useMemo(() => {
    if (!mockParam) return null;
    if (mockParam === "idle") {
      return { session: "idle" as ParentSessionState, level: "safe" as RiskLevel, primary: "none" };
    }
    if (mockParam === "safe" || mockParam === "listening") {
      return { session: "listening" as ParentSessionState, level: "safe" as RiskLevel, primary: "none" };
    }
    if (mockParam === "suspicious") {
      return { session: "listening" as ParentSessionState, level: "suspicious" as RiskLevel, primary: "bank_kyc" };
    }
    if (mockParam === "scam") {
      return { session: "listening" as ParentSessionState, level: "likely_scam" as RiskLevel, primary: "digital_arrest" };
    }
    return null;
  }, [mockParam]);

  const [realSessionState, setRealSessionState] = useState<ParentSessionState>("idle");
  const [realLevel, setRealLevel] = useState<RiskLevel>("safe");
  const [realPrimaryType, setRealPrimaryType] = useState<string>("none");
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const sessionState = mockState ? mockState.session : realSessionState;
  const level = mockState ? mockState.level : realLevel;
  const primaryType = mockState ? mockState.primary : realPrimaryType;

  // Audio refs & playback tracking
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const currentLevelRef = useRef<RiskLevel>("safe");
  const userGestureStarted = useRef<boolean>(Boolean(mockParam));
  const playerRef = useRef<WarningPlayer | null>(null);

  useEffect(() => {
    playerRef.current = createWarningPlayer({
      makeAudio: (src) => new Audio(src),
      onUnavailable: () => setAudioUnavailable(true),
    });
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  // Play warning audio via policy (spec 7.3 & 7.4)
  const playWarning = useCallback(
    (kind: "alert_suspicious" | "alert_scam") => {
      if (!userGestureStarted.current) return;
      if (!playerRef.current) return;
      playerRef.current.trigger(kind, {
        lang: "hi-IN",
        muted: false,
        gesture: userGestureStarted.current,
        reviewed: meta.reviewed_warning_languages,
      });
    },
    [meta.reviewed_warning_languages]
  );

  const stopAudio = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    stopAudio();
    setRealSessionState("ended");
  }, [stopAudio]);

  const handleStart = async () => {
    if (mockParam) return;
    stopAudio();
    setRealSessionState("connecting");
    setRealLevel("safe");
    currentLevelRef.current = "safe";
    setRealPrimaryType("none");
    userGestureStarted.current = true;

    try {
      const preset = getActiveMicPreset();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: preset.constraints,
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      await audioCtx.audioWorklet.addModule("/worklets/audio-stream-processor.js");
      const workletNode = new AudioWorkletNode(audioCtx, "audio-stream-processor");
      workletNodeRef.current = workletNode;
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(workletNode);

      const framer = new Framer();
      const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || "ws://127.0.0.1:8000";
      const ws = new WebSocket(`${wsUrl}/ws/live?lang=hi-IN`);
      websocketRef.current = ws;

      workletNode.port.onmessage = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const rawSamples = event.data;
        const resampled = resampleTo16k(rawSamples, audioCtx.sampleRate);
        const pcm16 = floatToPcm16(resampled);
        const frames = framer.push(pcm16);
        for (const frame of frames) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(frame.buffer);
          }
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ready") {
            setRealSessionState("listening");
          } else if (data.type === "risk") {
            const prevLevel = currentLevelRef.current;
            currentLevelRef.current = data.level;
            setRealLevel(data.level);
            if (data.primary_type && data.primary_type !== "none") {
              setRealPrimaryType(data.primary_type);
            }

            if (data.level === "likely_scam" || data.level === "scam") {
              if (prevLevel !== "likely_scam" && prevLevel !== "scam") {
                playWarning("alert_scam");
              }
            } else if (data.level === "suspicious") {
              if (prevLevel === "safe") {
                playWarning("alert_suspicious");
              }
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        setRealSessionState("error");
        stopAudio();
      };
      ws.onclose = () => {
        setRealSessionState((prev) => (prev === "listening" || prev === "connecting" ? "ended" : prev));
      };
    } catch {
      setRealSessionState("error");
      stopAudio();
    }
  };

  const isScam = level === "likely_scam" || level === "scam";
  const isSuspicious = level === "suspicious";

  // Build WhatsApp URL with scam type name and app link, NO transcript (spec 7.4)
  const scamDisplayName = SCAM_TYPE_NAMES[primaryType]?.hi || (isScam ? "संभावित ठगी" : "संदिग्ध कॉल");
  const waShareText = `सजग चेतावनी: मुझे एक संदिग्ध कॉल आ रही है (${scamDisplayName})। कृपया सतर्क रहें और मुझे सीधे फोन करें। ${siteUrl()}/report?type=${primaryType}&level=${level}&lang=hi`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  return (
    <main
      className="min-h-screen w-full flex flex-col justify-between overflow-x-hidden select-none transition-colors duration-300"
      style={{
        backgroundColor:
          sessionState === "idle"
            ? "var(--bg)"
            : isScam
            ? "#b91c1c" // Vermilion full screen
            : isSuspicious
            ? "#d97706" // Marker yellow full screen
            : "#15803d", // Green full screen
        color: sessionState === "idle" ? "var(--ink)" : "#ffffff",
      }}
    >
      {/* Top Bar Navigation */}
      <header className="p-3 sm:p-5 flex items-center justify-between border-b" style={{ borderColor: sessionState === "idle" ? "var(--line)" : "rgba(255,255,255,0.2)" }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-base sm:text-lg font-bold font-display hover:opacity-80 transition-opacity shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>मुख्य पृष्ठ</span>
        </Link>
        <span className="text-sm sm:text-base font-bold uppercase tracking-wider font-display opacity-90 text-right">
          माता-पिता मोड • PARENT MODE
        </span>
      </header>

      {/* Unreviewed warning language notice (spec M7 Part A) */}
      {meta.reviewed_warning_languages.length === 0 && (
        <div
          data-testid="parent-unreviewed-banner"
          className="bg-amber-100 text-amber-950 py-2 px-4 text-center text-xs sm:text-sm font-bold border-b border-amber-300"
        >
          बोलकर चेतावनी अभी बंद है (Spoken warnings are off until the voices have been reviewed)
        </div>
      )}
      {audioUnavailable && (
        <div
          data-testid="parent-audio-unavailable-banner"
          className="bg-amber-100 text-amber-950 py-2 px-4 text-center text-xs sm:text-sm font-bold border-b border-amber-300"
        >
          ऑडियो चेतावनी अनुपलब्ध है (Warning audio unavailable)
        </div>
      )}

      {/* Main Full-Screen Status Field */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center max-w-xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* 1. IDLE STATE */}
        {sessionState === "idle" && (
          <div className="space-y-8 w-full">
            <div className="w-24 h-24 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shadow-md">
              <Mic className="w-12 h-12" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display leading-tight">
                फ़ोन स्पीकर पर रखें
              </h1>
              <p className="text-2xl leading-relaxed text-[var(--ink-muted)]">
                बातचीत शुरू होने पर नीचे दिया गया बड़ा बटन दबाएं।
              </p>
            </div>

            <button
              id="parent-start-btn"
              data-testid="parent-start-btn"
              type="button"
              onClick={handleStart}
              className="w-full py-6 px-6 rounded-2xl bg-[#b91c1c] text-white text-2xl sm:text-3xl font-extrabold shadow-xl hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-4"
            >
              <Mic className="w-8 h-8" />
              <span>सुनना शुरू करें</span>
            </button>
          </div>
        )}

        {/* 2. CONNECTING STATE */}
        {sessionState === "connecting" && (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-3xl font-bold">जुड़ रहे हैं...</p>
          </div>
        )}

        {/* 3. ACTIVE LISTENING: GREEN / YELLOW / VERMILION COLOR FIELD */}
        {(sessionState === "listening" || sessionState === "ended") && (
          <div className="space-y-6 sm:space-y-8 w-full flex flex-col items-center">
            {/* Status Icon */}
            {isScam ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-[#b91c1c] flex items-center justify-center shadow-2xl animate-pulse">
                <PhoneOff className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
            ) : isSuspicious ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-[#d97706] flex items-center justify-center shadow-2xl">
                <AlertTriangle className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-[#15803d] flex items-center justify-center shadow-2xl">
                <ShieldCheck className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
            )}

            {/* Large Verdict Headline (>= 28px) */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight">
                {isScam
                  ? "यह ठगी जैसी लगती है। फोन काटें!"
                  : isSuspicious
                  ? "सावधान रहें!"
                  : "अभी कोई संकेत नहीं मिला"}
              </h1>
              <p className="text-2xl sm:text-3xl font-bold opacity-95">
                {isScam
                  ? "पैसे न भेजें, कोई कोड न बताएं।"
                  : isSuspicious
                  ? "इस कॉल में ठगी के कुछ संकेत हैं।"
                  : "फिर भी अनजान को कोड, पिन या पैसे न दें।"}
              </p>
            </div>

            {/* Giant Rubber Stamp with white badge backing for high contrast */}
            <div className="py-2 px-5 rounded-2xl bg-white/95 shadow-xl border border-white/40 scale-105 sm:scale-115">
              <VerdictStamp level={level} size="giant" lang="hi" showSplatter={false} />
            </div>

            {/* Action Buttons: Tell my Family (WhatsApp) & Stop */}
            <div className="w-full space-y-4 pt-2">
              {/* WhatsApp Family Alert Button (Spec 7.4) */}
              <a
                id="parent-whatsapp-btn"
                data-testid="parent-whatsapp-btn"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 px-6 rounded-2xl bg-white text-emerald-800 text-2xl font-black shadow-xl hover:bg-emerald-50 active:scale-98 transition-all flex items-center justify-center gap-3 border-2 border-emerald-900/20"
              >
                <Share2 className="w-7 h-7" />
                <span>परिवार को बताएं (WhatsApp)</span>
              </a>

              {sessionState === "listening" && (
                <button
                  id="parent-stop-btn"
                  data-testid="parent-stop-btn"
                  type="button"
                  onClick={handleStop}
                  className="w-full py-4 px-6 rounded-2xl bg-black/30 text-white text-xl font-bold border-2 border-white/40 hover:bg-black/40 transition-all flex items-center justify-center gap-2"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>सुनना रोकें • Stop</span>
                </button>
              )}

              {sessionState === "ended" && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-[#b91c1c] text-xl font-bold shadow-md hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>नई कॉल शुरू करें</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. ERROR STATE */}
        {sessionState === "error" && (
          <div className="space-y-6 w-full">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">माइक्रोफ़ोन से संपर्क नहीं हो सका</h1>
            <p className="text-2xl opacity-90">कृपया माइक की अनुमति दें और पुनः प्रयास करें।</p>
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-5 px-6 rounded-2xl bg-[#b91c1c] text-white text-2xl font-bold"
            >
              पुनः प्रयास करें
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="p-4 text-center text-lg opacity-80" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
        <span>राष्ट्रीय साइबर हेल्पलाइन: <strong>1930</strong> • सजग सहायता</span>
      </footer>
    </main>
  );
}

export default function ParentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-2xl">लोड हो रहा है...</div>}>
      <ParentContent />
    </Suspense>
  );
}
