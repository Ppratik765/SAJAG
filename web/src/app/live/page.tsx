"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Square,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Share2,
  Clock,
  Volume2,
  Info,
} from "lucide-react";

import { useI18n, Locale } from "@/lib/i18n/context";
import { CallSheet, CallSegment, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";
import { LevelStrip } from "@/components/ui/LevelStrip";
import { VerdictStamp, RiskLevel } from "@/components/ui/VerdictStamp";
import { CallTimeline, TimelineSignal } from "@/components/ui/CallTimeline";
import { getActiveMicPreset } from "@/lib/audio/constraints";
import { resampleTo16k } from "@/lib/audio/resample";
import { floatToPcm16 } from "@/lib/audio/pcm";
import { Framer } from "@/lib/audio/framer";

const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", label: "हिन्दी (Hindi)", script: "Devanagari" },
  { code: "en-IN", label: "English", script: "Latin" },
  { code: "ta-IN", label: "தமிழ் (Tamil)", script: "Tamil" },
  { code: "te-IN", label: "తెలుగు (Telugu)", script: "Telugu" },
  { code: "bn-IN", label: "বাংলা (Bengali)", script: "Bengali" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)", script: "Gujarati" },
  { code: "mr-IN", label: "मराठी (Marathi)", script: "Devanagari" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", script: "Kannada" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", script: "Malayalam" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)", script: "Gurmukhi" },
];

const SCAM_TYPE_LABELS: Record<string, { en: string; hi: string }> = {
  digital_arrest: { en: "Digital Arrest Scam", hi: "डिजिटल अरेस्ट ठगी" },
  bank_kyc: { en: "Fake Bank KYC", hi: "फर्जी बैंक केवाईसी" },
  upi_refund: { en: "UPI Refund / Wrong Payment", hi: "यूपीआई रिफंड / गलत पेमेंट" },
  utility_disconnect: { en: "Electricity Bill Disconnection", hi: "बिजली बिल डिस्कनेक्शन" },
  courier_parcel: { en: "Illegal Parcel / Customs", hi: "कस्टम्स / अवैध पार्सल" },
  tech_support_remote: { en: "Fake Tech Support", hi: "फर्जी तकनीकी सहायता" },
  family_emergency: { en: "Family Emergency Scam", hi: "पारिवारिक आपातकाल ठगी" },
  lottery_prize: { en: "Lottery / Prize Scam", hi: "लॉटरी / इनाम ठगी" },
  investment_task: { en: "Investment / Part-time Task", hi: "निवेश / पार्ट-टाइम टास्क" },
  unknown_suspicious: { en: "Suspicious Call", hi: "संदिग्ध कॉल" },
  none: { en: "No Scam Detected", hi: "कोई ठगी नहीं मिली" },
};

const CATEGORY_NOTE_LABELS: Record<string, { en: string; hi: string }> = {
  AUTHORITY_CLAIM: { en: "Claimed police/agency", hi: "पुलिस/एजेंसी का दावा" },
  THREAT_ARREST: { en: "Arrest/jail threat", hi: "गिरफ्तारी की धमकी" },
  ISOLATION: { en: "Demanded staying on call", hi: "कॉल काटने से मना किया" },
  SECRECY: { en: "Told to keep secret", hi: "गोपनीय रखने को कहा" },
  OTP_PIN_REQUEST: { en: "Asked for OTP / PIN", hi: "ओटीपी या पिन मांगा" },
  MONEY_TRANSFER: { en: "Demanded money transfer", hi: "पैसे ट्रांसफर की मांग" },
  REMOTE_ACCESS_APP: { en: "Asked to install app", hi: "ऐप डाउनलोड करने को कहा" },
  ACCOUNT_THREAT: { en: "Account block threat", hi: "खाता ब्लॉक की धमकी" },
  URGENCY: { en: "Created artificial rush", hi: "जल्दबाजी का दबाव" },
};

type LiveSessionState = "idle" | "connecting" | "listening" | "ended" | "error";

export default function LivePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading Live Mode...</div>}>
      <LiveContent />
    </React.Suspense>
  );
}

function LiveContent() {
  const searchParams = useSearchParams();
  const mockParam = searchParams.get("mock");

  const { locale } = useI18n();
  const activeLang = locale === "hi" ? "hi" : "en";

  // Session State
  const [sessionState, setSessionState] = useState<LiveSessionState>("idle");
  const [selectedLang, setSelectedLang] = useState<string>("hi-IN");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const [errorMessage, setErrorMessage] = useState<{ code: string; text: string } | null>(null);

  // Analysis State
  const [level, setLevel] = useState<RiskLevel>("safe");
  const [score, setScore] = useState(0);
  const [primaryType, setPrimaryType] = useState<string>("none");
  const [segments, setSegments] = useState<CallSegment[]>([]);
  const [signals, setSignals] = useState<CallSignal[]>([]);
  const [marginNotes, setMarginNotes] = useState<CallMarginNoteItem[]>([]);
  const [firstCrossed, setFirstCrossed] = useState<{ suspicious?: number | null; likely_scam?: number | null }>({});

  // Audio & WS refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const framerRef = useRef<Framer | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningPlayTime = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Mock fixture preview handler (dev & screenshots)
  useEffect(() => {
    if (!mockParam) return;

    if (mockParam === "listening") {
      setSessionState("listening");
      setLevel("safe");
      setScore(0);
      setIsSpeaking(true);
      setSegments([
        { index: 0, text: "हाँ जी, मैं आपकी बात सुन रहा हूँ, बताइए क्या काम है?", time: "0:04" },
      ]);
    } else if (mockParam === "suspicious") {
      setSessionState("listening");
      setLevel("suspicious");
      setScore(4);
      setPrimaryType("bank_kyc");
      setFirstCrossed({ suspicious: 6.4 });
      setSegments([
        { index: 0, text: "नमस्ते श्रीमान, मैं एसबीआई कार्ड विभाग से बोल रहा हूँ।", time: "0:03" },
        { index: 1, text: "आपके क्रेडिट कार्ड की केवाईसी ब्लॉक हो जाएगी, कृपया अलर्ट रहें।", time: "0:08" },
      ]);
      setSignals([
        { id: "m1", category: "AUTHORITY_CLAIM", weight: 2, evidence: "एसबीआई कार्ड विभाग", segment_index: 0 },
        { id: "m2", category: "ACCOUNT_THREAT", weight: 2, evidence: "केवाईसी ब्लॉक हो जाएगी", segment_index: 1 },
      ]);
      setMarginNotes([
        { segmentIndex: 0, category: "AUTHORITY_CLAIM", text: "बैंक का दावा" },
        { segmentIndex: 1, category: "ACCOUNT_THREAT", text: "खाता बंद करने की चेतावनी" },
      ]);
    } else if (mockParam === "scam") {
      setSessionState("listening");
      setLevel("likely_scam");
      setScore(10);
      setPrimaryType("digital_arrest");
      setFirstCrossed({ suspicious: 5.2, likely_scam: 11.4 });
      setSegments([
        { index: 0, text: "नमस्ते जी, मैं दिल्ली पुलिस क्राइम ब्रांच से सब-इंस्पेक्टर राजेश बात कर रहा हूँ।", time: "0:04" },
        { index: 1, text: "आपके आधार नंबर पर मनी लॉन्ड्रिंग और गैरकानूनी पार्सल का केस दर्ज है। अरेस्ट वारंट जारी हुआ है।", time: "0:12" },
        { index: 2, text: "सुप्रीम कोर्ट के आदेशानुसार आप डिजिटल अरेस्ट पर हैं। तुरंत वीडियो कॉल पर रहिए, फोन मत काटना।", time: "0:21" },
        { index: 3, text: "वेरिफिकेशन के लिए तुरंत सरकारी सेफ अकाउंट में पचास हज़ार रुपये ट्रांसफर कीजिए।", time: "0:32" },
      ]);
      setSignals([
        { id: "m1", category: "AUTHORITY_CLAIM", weight: 2, evidence: "दिल्ली पुलिस क्राइम ब्रांच", segment_index: 0 },
        { id: "m2", category: "THREAT_ARREST", weight: 3, evidence: "अरेस्ट वारंट जारी हुआ है", segment_index: 1 },
        { id: "m3", category: "ISOLATION", weight: 3, evidence: "डिजिटल अरेस्ट पर हैं", segment_index: 2 },
        { id: "m4", category: "ISOLATION", weight: 3, evidence: "फोन मत काटना", segment_index: 2 },
        { id: "m5", category: "MONEY_TRANSFER", weight: 3, evidence: "पचास हज़ार रुपये ट्रांसफर कीजिए", segment_index: 3 },
      ]);
      setMarginNotes([
        { segmentIndex: 0, category: "AUTHORITY_CLAIM", text: "नकली पुलिस अधिकारी" },
        { segmentIndex: 1, category: "THREAT_ARREST", text: "गिरफ्तारी की धमकी" },
        { segmentIndex: 2, category: "ISOLATION", text: "कॉल काटने से मना किया" },
        { segmentIndex: 3, category: "MONEY_TRANSFER", text: "पैसे तुरंत भेजने की मांग" },
      ]);
    } else if (mockParam === "error") {
      setSessionState("error");
      setErrorMessage({
        code: "upstream_quota",
        text: "Upstream speech recognition credits limit reached. Please try text paste analysis.",
      });
    }
  }, [mockParam]);

  // Warning audio playback stub (safely no-ops if file missing, ready for M5)
  const playWarning = useCallback((kind: "alert_suspicious" | "alert_scam", lang: string) => {
    const now = Date.now();
    // Do not play more than once every 60s
    if (now - lastWarningPlayTime.current < 60000) return;
    lastWarningPlayTime.current = now;

    try {
      const audio = new Audio(`/audio/warnings/${lang}/${kind}.mp3`);
      audio.play().catch(() => {
        // Safe no-op when M5 clip files are not generated yet
      });
    } catch {
      // Safe no-op
    }
  }, []);

  // Cleanup helper
  const stopAudio = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    framerRef.current = null;
    setIsSpeaking(false);
  }, []);

  const handleStop = useCallback(() => {
    stopAudio();
    setSessionState("ended");
  }, [stopAudio]);

  // Start live session
  const handleStart = async () => {
    if (mockParam) return;
    stopAudio();
    setErrorMessage(null);
    setSessionState("connecting");
    setSegments([]);
    setSignals([]);
    setMarginNotes([]);
    setLevel("safe");
    setScore(0);
    setPrimaryType("none");
    setFirstCrossed({});
    setRemainingSeconds(180);

    try {
      // 1. Get mic media stream with active DSP preset
      const preset = getActiveMicPreset();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: preset.constraints,
      });
      mediaStreamRef.current = stream;

      // 2. Initialize AudioContext and AudioWorklet
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      await audioCtx.audioWorklet.addModule("/worklets/pcm-worklet.js");

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtx, "pcm-worklet-processor");
      workletNodeRef.current = workletNode;
      sourceNode.connect(workletNode);

      // 3. Connect to backend WebSocket
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = process.env.NEXT_PUBLIC_API_WS_URL || `${wsProtocol}//${window.location.hostname}:8000`;
      const wsUrl = `${wsHost.replace(/^http/, "ws")}/ws/live?lang=${selectedLang}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      websocketRef.current = ws;

      const framer = new Framer();
      framerRef.current = framer;

      // 4. Audio worklet message handler -> resample -> frame -> ws send
      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (isMuted || ws.readyState !== WebSocket.OPEN) return;
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

      // 5. WebSocket message handlers
      ws.onopen = () => {
        // Await ready
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === "ready") {
            setSessionState("listening");
            // Start countdown timer
            timerIntervalRef.current = setInterval(() => {
              setRemainingSeconds((prev) => {
                if (prev <= 1) {
                  handleStop();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else if (data.type === "speech") {
            setIsSpeaking(true);
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1200);
          } else if (data.type === "transcript") {
            const newSeg: CallSegment = {
              index: data.index,
              text: data.text,
              time: formatSeconds(180 - remainingSeconds),
            };
            setSegments((prev) => {
              const existing = prev.filter((s) => s.index !== data.index);
              return [...existing, newSeg].sort((a, b) => a.index - b.index);
            });
          } else if (data.type === "risk") {
            const prevLevel = level;
            setLevel(data.level);
            setScore(data.score);
            if (data.primary_type && data.primary_type !== "none") {
              setPrimaryType(data.primary_type);
            }
            if (data.first_crossed) {
              setFirstCrossed(data.first_crossed);
            }

            // Audio warning check
            if (data.level === "likely_scam" || data.level === "scam") {
              if (prevLevel !== "likely_scam" && prevLevel !== "scam") {
                playWarning("alert_scam", selectedLang.split("-")[0]);
              }
            } else if (data.level === "suspicious") {
              if (prevLevel === "safe") {
                playWarning("alert_suspicious", selectedLang.split("-")[0]);
              }
            }

            // Ingest new signals and build margin notes
            if (data.new_signals && data.new_signals.length > 0) {
              setSignals((prev) => {
                const combined = [...prev];
                for (const sig of data.new_signals) {
                  if (!combined.some((s) => s.id === sig.id)) {
                    combined.push({
                      id: sig.id,
                      category: sig.category,
                      weight: sig.weight,
                      evidence: sig.evidence,
                      segment_index: sig.segment_index,
                      explanation:
                        CATEGORY_NOTE_LABELS[sig.category]?.[activeLang] ||
                        sig.category.replace(/_/g, " "),
                    });
                  }
                }
                return combined;
              });

              setMarginNotes((prev) => {
                const updated = [...prev];
                for (const sig of data.new_signals) {
                  const noteText =
                    CATEGORY_NOTE_LABELS[sig.category]?.[activeLang] ||
                    sig.category.replace(/_/g, " ");
                  if (
                    !updated.some(
                      (n) => n.segmentIndex === sig.segment_index && n.category === sig.category
                    )
                  ) {
                    updated.push({
                      segmentIndex: sig.segment_index,
                      category: sig.category,
                      text: noteText,
                    });
                  }
                }
                return updated;
              });
            }
          } else if (data.type === "error") {
            stopAudio();
            setSessionState("error");
            setErrorMessage({
              code: data.code || "unknown_error",
              text: data.message || "An error occurred with the live stream.",
            });
          } else if (data.type === "end") {
            stopAudio();
            setSessionState("ended");
            if (data.reason === "budget_exhausted") {
              setErrorMessage({
                code: "budget_exhausted",
                text: "Daily STT budget reached. Further live calls cannot be transcribed today.",
              });
            }
          }
        } catch (err) {
          console.error("Failed to parse live WS message:", err);
        }
      };

      ws.onerror = () => {
        stopAudio();
        setSessionState("error");
        setErrorMessage({
          code: "ws_error",
          text: "Could not connect to live audio server. Check that backend is running.",
        });
      };

      ws.onclose = () => {
        if (sessionState === "listening" || sessionState === "connecting") {
          setSessionState("ended");
        }
      };
    } catch (err: unknown) {
      stopAudio();
      setSessionState("error");
      const errStr = String(err);
      if (errStr.includes("NotAllowedError") || errStr.includes("Permission denied")) {
        setErrorMessage({
          code: "mic_permission_denied",
          text: "Microphone access was denied. Please allow microphone permissions in your browser address bar.",
        });
      } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
        setErrorMessage({
          code: "no_mic_found",
          text: "No microphone detected on your system. Please connect an input device.",
        });
      } else {
        setErrorMessage({
          code: "mic_init_error",
          text: `Failed to initialize microphone: ${errStr}`,
        });
      }
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // toggling
      });
    }
  };

  // Build timeline signals from CallSignals
  const timelineSignals: TimelineSignal[] = signals.map((s) => ({
    id: s.id,
    category: s.category,
    segmentIndex: s.segment_index,
    timeSeconds: Math.min(180 - remainingSeconds, s.segment_index * 6 + 2),
    isHard: ["OTP_PIN_REQUEST", "ISOLATION", "REMOTE_ACCESS_APP", "THREAT_ARREST"].includes(
      s.category
    ),
  }));

  // WhatsApp Warn My Family URL
  const scamTypeName =
    SCAM_TYPE_LABELS[primaryType]?.[activeLang] ||
    (primaryType === "none" ? "Suspected Scam" : primaryType.replace(/_/g, " "));

  const whatsappMessage = encodeURIComponent(
    activeLang === "hi"
      ? `सावधान: मुझे अभी एक संदिग्ध कॉल (${scamTypeName}) आई। कृपया सतर्क रहें: किसी को भी ओटीपी या यूपीआई पिन न बताएं और पैसे न भेजें। सजग पर जांचें: https://sajag.ai`
      : `WARNING: I just encountered a suspected call (${scamTypeName}). Please stay vigilant: never share OTP or UPI PIN, and do not transfer money. Check with Sajag: https://sajag.ai`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--stamp)]">
              {activeLang === "hi" ? "सजग लाइव सुरक्षा" : "Sajag Live Protection"}
            </span>
            {sessionState === "listening" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--alarm)]/15 text-[var(--alarm-text)]">
                <span className="w-2 h-2 rounded-full bg-[var(--alarm)] animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--ink)]">
            {activeLang === "hi" ? "लाइव कॉल सुरक्षा" : "Live Call Protection"}
          </h1>
        </div>

        {/* Language selector & Dev link */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="live-lang" className="sr-only">
            Speech Recognition Language
          </label>
          <select
            id="live-lang"
            value={selectedLang}
            disabled={sessionState === "listening" || sessionState === "connecting"}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold px-3 py-2 rounded border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <Link
            href="/dev"
            title="Configure mic presets"
            className="p-2 rounded border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink-muted)] hover:text-[var(--stamp)]"
          >
            <Info className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Screen Reader Level Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {sessionState === "listening"
          ? `Current risk status is ${level.replace(/_/g, " ")}, score ${score}`
          : ""}
      </div>

      {/* 1. IDLE STATE: Permission & Start Gesture */}
      {sessionState === "idle" && (
        <section className="paper-sheet p-6 sm:p-8 space-y-6 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] flex items-center justify-center">
              <Mic className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-display font-bold text-[var(--ink)]">
              {activeLang === "hi"
                ? "दूसरी डिवाइस या स्पीकर के पास रखें"
                : "Listen to a live phone call"}
            </h2>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              {activeLang === "hi"
                ? "अपने फोन को स्पीकरफोन पर रखें और इस डिवाइस को पास रखें। सजग बातचीत सुनकर लाल झंडों को तुरंत चिह्नित करेगा।"
                : "Put your call on speaker and place this device nearby. Sajag listens locally, transcribes via Gnani Prisma, and marks warning signs in real time."}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              id="live-start-btn"
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-md font-display font-bold text-base sm:text-lg bg-[var(--stamp)] text-white hover:opacity-95 shadow-md active:scale-98 transition-transform"
            >
              <Mic className="w-5 h-5" />
              {activeLang === "hi" ? "सुनना शुरू करें" : "Start Live Listening"}
            </button>
            <p className="text-xs text-[var(--ink-muted)] mt-3">
              {activeLang === "hi"
                ? "माइक अनुमति मांगी जाएगी। कोई भी ऑडियो सेव नहीं किया जाता है।"
                : "Microphone permission required. Audio is streamed securely and never stored."}
            </p>
          </div>
        </section>
      )}

      {/* 2. CONNECTING STATE */}
      {sessionState === "connecting" && (
        <section className="paper-sheet p-10 text-center space-y-4">
          <div className="w-10 h-10 mx-auto border-3 border-[var(--stamp)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[var(--ink)]">
            {activeLang === "hi"
              ? "माइक्रोफ़ोन और वाक सेवा से जुड़ रहे हैं..."
              : "Connecting to speech recognition stream..."}
          </p>
        </section>
      )}

      {/* 3. ERROR STATE */}
      {sessionState === "error" && errorMessage && (
        <section className="p-6 rounded-md border-2 border-[var(--alarm)]/30 bg-[var(--alarm)]/5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[var(--alarm)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)]">
                {errorMessage.code === "mic_permission_denied"
                  ? activeLang === "hi"
                    ? "माइक्रोफ़ोन अनुमति नहीं मिली"
                    : "Microphone Permission Denied"
                  : activeLang === "hi"
                  ? "लाइव कनेक्शन में त्रुटि"
                  : "Connection Error"}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                {errorMessage.text}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[var(--stamp)] text-white text-xs sm:text-sm font-bold hover:opacity-95"
            >
              <RefreshCw className="w-4 h-4" />
              {activeLang === "hi" ? "पुनः प्रयास करें" : "Try Again"}
            </button>
            <Link
              href="/paste"
              className="text-xs sm:text-sm font-semibold text-[var(--stamp)] hover:underline"
            >
              {activeLang === "hi" ? "टेक्स्ट पेस्ट करके जांचें →" : "Check pasted text instead →"}
            </Link>
          </div>
        </section>
      )}

      {/* 4. ACTIVE CALL OR ENDED SUMMARY */}
      {(sessionState === "listening" || sessionState === "ended") && (
        <div className="space-y-6">
          {/* Active Call Controls Bar */}
          <div className="paper-sheet p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            {/* Status & Speech Pulse */}
            <div className="flex items-center gap-3">
              {isSpeaking ? (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--stamp)] bg-[var(--stamp)]/10 px-2.5 py-1 rounded">
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  <span>{activeLang === "hi" ? "आवाज आ रही है..." : "Caller speaking..."}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] px-2.5 py-1 select-none">
                  <span className="w-2 h-2 rounded-full bg-[var(--line)]" />
                  <span>{activeLang === "hi" ? "सुन रहे हैं..." : "Listening..."}</span>
                </div>
              )}

              {/* Countdown Timer */}
              {sessionState === "listening" && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--ink)] bg-[var(--bg)] px-2.5 py-1 rounded select-none">
                  <Clock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                  <span>{formatSeconds(remainingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: Stop & Mute */}
            <div className="flex items-center gap-2">
              {sessionState === "listening" && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      isMuted
                        ? "bg-[var(--alarm)]/10 border-[var(--alarm)] text-[var(--alarm-text)]"
                        : "bg-[var(--sheet)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--stamp)]"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isMuted ? "Unmute" : "Mute"}</span>
                  </button>

                  <button
                    type="button"
                    id="live-stop-btn"
                    onClick={handleStop}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[var(--alarm)] text-white hover:opacity-95 shadow-xs"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{activeLang === "hi" ? "समाप्त करें" : "Stop Call"}</span>
                  </button>
                </>
              )}

              {sessionState === "ended" && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[var(--stamp)] text-white hover:opacity-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{activeLang === "hi" ? "नई कॉल शुरू करें" : "New Call"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Level Strip & Timeline */}
          <div className="paper-sheet p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)]">
                {activeLang === "hi" ? "जोखिम पैमाना" : "Risk Level Meter"}
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--ink-muted)]">
                Score: {score}
              </span>
            </div>
            <LevelStrip level={level} score={score} />

            {/* Timeline */}
            <div className="pt-2 border-t border-[var(--line)]">
              <CallTimeline
                durationSeconds={180 - remainingSeconds}
                signals={timelineSignals}
                firstCrossed={firstCrossed}
              />
            </div>
          </div>

          {/* CRITICAL WARNING BANNER WHEN LIKELY SCAM */}
          {(level === "likely_scam" || level === "scam") && (
            <div className="p-5 rounded-md border-2 border-[var(--alarm)] bg-[var(--alarm)]/10 space-y-4 animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-7 h-7 text-[var(--alarm)] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-display font-extrabold text-[var(--alarm-text)]">
                      {activeLang === "hi"
                        ? "तुरंत फोन काट दें! ठगी के स्पष्ट संकेत मिले हैं"
                        : "Hang up now! High risk of fraud detected"}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--ink)] mt-1 font-medium">
                      {SCAM_TYPE_LABELS[primaryType]?.[activeLang] || "Suspected Scam"}:{" "}
                      {activeLang === "hi"
                        ? "कोई भी अधिकारी फोन पर पैसे या ओटीपी नहीं मांगता।"
                        : "No legitimate official or bank demands money transfer or OTP over the phone."}
                    </p>
                  </div>
                </div>

                <VerdictStamp level={level} size="sm" lang={activeLang} showSplatter={false} />
              </div>

              {/* Actionable "What to do now" */}
              <div className="bg-[var(--sheet)] p-3.5 rounded border border-[var(--alarm)]/30 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--alarm-text)] block">
                  {activeLang === "hi" ? "अभी क्या करें:" : "What to do immediately:"}
                </span>
                <ul className="text-xs text-[var(--ink)] space-y-1 list-disc list-inside">
                  <li>
                    <strong>{activeLang === "hi" ? "फोन काटें:" : "Hang up:"}</strong>{" "}
                    {activeLang === "hi"
                      ? "कॉल जारी न रखें, डरने की कोई बात नहीं है।"
                      : "Disconnect the call now. Real police or courts never 'digitally arrest'."}
                  </li>
                  <li>
                    <strong>{activeLang === "hi" ? "गोपनीयता:" : "Never share:"}</strong>{" "}
                    {activeLang === "hi"
                      ? "ओटीपी, पासवर्ड, कार्ड नंबर या यूपीआई पिन कभी न दें।"
                      : "Do not share OTP, card details, or UPI PIN under any pretext."}
                  </li>
                  <li>
                    <strong>{activeLang === "hi" ? "पैसे न भेजें:" : "No money transfer:"}</strong>{" "}
                    {activeLang === "hi"
                      ? "किसी भी 'सुरक्षित' या वेरिफिकेशन खाते में पैसे न भेजें।"
                      : "Never send money to any 'verification account'."}
                  </li>
                  <li>
                    <strong>{activeLang === "hi" ? "हेल्पलाइन:" : "Helpline:"}</strong>{" "}
                    {activeLang === "hi"
                      ? "साइबर अपराध की शिकायत 1930 पर दर्ज करें।"
                      : "Report cyber fraud immediately at national helpline 1930."}
                  </li>
                </ul>
              </div>

              {/* Warn My Family Button */}
              <div className="pt-1 flex flex-wrap gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded font-display font-bold text-sm bg-[#25D366] text-white hover:opacity-95 shadow-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{activeLang === "hi" ? "परिवार को सतर्क करें" : "Warn my family"}</span>
                </a>

                <Link
                  href={`/report?type=${primaryType}&level=${level}&lang=${selectedLang}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded text-xs font-bold border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] hover:border-[var(--stamp)]"
                >
                  <span>{activeLang === "hi" ? "रिपोर्ट कार्ड देखें" : "View share card"}</span>
                </Link>
              </div>
            </div>
          )}

          {/* The Call Sheet with Rolling Transcript */}
          <CallSheet
            segments={segments}
            signals={signals}
            marginNotes={marginNotes}
            level={level}
            lang={activeLang}
            showStamp={sessionState === "ended"}
          />
        </div>
      )}

      {/* Reassuring Footer Disclaimer */}
      <footer className="text-center text-xs text-[var(--ink-muted)] pt-6 border-t border-[var(--line)] select-none">
        <p>
          {activeLang === "hi"
            ? "सजग एक सहायक प्रणाली है, कोई कानूनी गारंटी नहीं। आपात स्थिति में 1930 पर कॉल करें।"
            : "Sajag is an assistive helper, not a guarantee. Call 1930 for national cybercrime support."}
        </p>
      </footer>
    </main>
  );
}

function formatSeconds(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
