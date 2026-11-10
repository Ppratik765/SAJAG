"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, Pause, RotateCcw, PhoneOff, Radio, Info, AlertTriangle } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { CallSheet, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";
import { LevelStrip } from "@/components/ui/LevelStrip";
import { VerdictStamp } from "@/components/ui/VerdictStamp";
import { CATEGORY_PLAIN_NOTES, SCAM_TYPE_NAMES } from "@/lib/engine/labels";
import { resampleTo16k } from "@/lib/audio/resample";
import { floatToPcm16 } from "@/lib/audio/pcm";
import { Framer, FRAME_BYTES } from "@/lib/audio/framer";
import {
  ClipData,
  TestFixture,
  deriveView,
  formatClock,
  framesDue,
} from "@/lib/livetest/view";

type Mode = "recorded" | "live";
type RunState = "idle" | "connecting" | "running" | "ended" | "error";

const FLUSH_SILENT_FRAMES = 47; // same flush the backend/replay tooling uses so the last sentence is closed
const TAIL_WAIT_S = 6; // after the audio ends, keep listening this long for the last transcript

const T = {
  en: {
    speaker: "See live test",
    pause: "Pause",
    restart: "Restart",
    modeRecorded: "Recorded run",
    modeRecordedHint: "Replays what the pipeline produced when this clip was streamed earlier.",
    modeLive: "Run it live now",
    modeLiveHint: "Streams this clip through the real pipeline right now. Needs the live server and uses speech credits.",
    badgeRecorded: "RECORDED RUN: captured earlier from Prisma on this audio",
    badgeLive: "LIVE: being transcribed right now",
    badgeConnecting: "Connecting to the live server…",
    synthetic: "SYNTHETIC CALL",
    real: "REAL RECORDING",
    hangUp: "HANG UP",
    hangUpSub: "This call shows strong signs of a scam. In a real call: hang up, share no codes or money, call 1930.",
    suspiciousSub: "Warning signs so far. Stay careful and do not share any code or money.",
    waiting: "Press the speaker button above to play the call audio. The live transcript and red scam highlights appear here as the call is heard.",
    listeningNow: "Playing call audio & transcribing live speech… first segment arriving…",
    sheetTitle: "Live transcript",
    appeared: "Appeared",
    intoCall: "into the call",
    timingNote: "Times are seconds since the call began, when the line or alert actually showed up. They include the speech-to-text delay.",
    liveFail: "Could not reach the live server. You can still watch the recorded run.",
    liveFailBudget: "The live server stopped this run (daily limit or session limit). The recorded run is still available.",
    realNote: "Real recording, used with permission for education. Transcribed by a machine, so errors are possible. Sajag helps you spot warning signs; it cannot guarantee a call is safe or a scam.",
    synthNote: "Synthetic call: voices are generated, script written for this project.",
    level: { safe: "No warning signs yet", suspicious: "Suspicious", likely_scam: "Likely scam", scam: "Scam" },
    shown: "of",
    segmentsRevealed: "lines shown",
  },
  hi: {
    speaker: "लाइव टेस्ट देखें",
    pause: "रोकें",
    restart: "फिर से शुरू",
    modeRecorded: "रिकॉर्डेड रन",
    modeRecordedHint: "यह क्लिप पहले जब चलाई गई थी, उस समय पाइपलाइन ने जो नतीजे दिए थे उन्हें दोबारा दिखाता है।",
    modeLive: "अभी लाइव चलाएँ",
    modeLiveHint: "इस क्लिप को अभी असली पाइपलाइन से गुज़ारता है। इसके लिए लाइव सर्वर चाहिए और स्पीच क्रेडिट लगते हैं।",
    badgeRecorded: "रिकॉर्डेड रन: इसी ऑडियो पर पहले प्रिस्मा से लिया गया",
    badgeLive: "लाइव: अभी ट्रांसक्राइब हो रहा है",
    badgeConnecting: "लाइव सर्वर से जुड़ रहे हैं…",
    synthetic: "सिंथेटिक कॉल",
    real: "असली रिकॉर्डिंग",
    hangUp: "फोन काटें",
    hangUpSub: "इस कॉल में ठगी के मज़बूत संकेत हैं। असली कॉल में: फोन काट दें, कोई कोड या पैसे न दें, 1930 पर कॉल करें।",
    suspiciousSub: "अब तक चेतावनी संकेत मिले हैं। सावधान रहें, कोई कोड या पैसे न दें।",
    waiting: "कॉल ऑडियो चलाने के लिए ऊपर स्पीकर बटन दबाएँ। कॉल सुनते-सुनते लाइव ट्रांसक्रिप्ट और लाल निशान यहाँ दिखेंगे।",
    listeningNow: "कॉल ऑडियो चल रहा है और लाइव ट्रांसक्राइब हो रहा है… पहली पंक्ति आ रही है…",
    sheetTitle: "लाइव ट्रांसक्रिप्ट",
    appeared: "दिखा",
    intoCall: "कॉल शुरू होने के बाद",
    timingNote: "समय कॉल शुरू होने से सेकंड में है, यानी पंक्ति या चेतावनी असल में कब दिखी। इसमें स्पीच-टू-टेक्स्ट की देरी शामिल है।",
    liveFail: "लाइव सर्वर से नहीं जुड़ सका। आप रिकॉर्डेड रन अब भी देख सकते हैं।",
    liveFailBudget: "लाइव सर्वर ने यह रन रोक दिया (दैनिक या सत्र सीमा)। रिकॉर्डेड रन अब भी उपलब्ध है।",
    realNote: "असली रिकॉर्डिंग, शिक्षा के लिए अनुमति से इस्तेमाल की गई। मशीन से ट्रांसक्राइब हुई है, इसलिए गलतियाँ हो सकती हैं। सजग चेतावनी संकेत पहचानने में मदद करता है; यह गारंटी नहीं दे सकता कि कॉल सुरक्षित है या ठगी।",
    synthNote: "सिंथेटिक कॉल: आवाज़ें बनाई गई हैं, स्क्रिप्ट इसी प्रोजेक्ट के लिए लिखी गई।",
    level: { safe: "अभी कोई संकेत नहीं", suspicious: "संदिग्ध", likely_scam: "संभावित ठगी", scam: "ठगी" },
    shown: "में से",
    segmentsRevealed: "पंक्तियाँ दिखीं",
  },
} as const;

interface Props {
  fixtureUrl: string;
  /** Show the "Run it live now" option. Defaults to false for static Vercel hosting. */
  allowLive?: boolean;
}

export function LiveTestPlayer({ fixtureUrl, allowLive = false }: Props) {
  const { locale } = useI18n();
  const lang: "en" | "hi" = locale === "hi" ? "hi" : "en";
  const t = T[lang];

  const [fixture, setFixture] = useState<TestFixture | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<Mode>("recorded");
  const [runState, setRunState] = useState<RunState>("idle");
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveData, setLiveData] = useState<ClipData>({ segments: [], signals: [], risk_events: [] });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const rafRef = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedAtRef = useRef<number | null>(null); // performance.now() when audio finished (live mode)
  const modeRef = useRef<Mode>("recorded");
  const durationRef = useRef(0);
  const liveHeardRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    fetch(fixtureUrl)
      .then((r) => {
        if (!r.ok) throw new Error("fixture");
        return r.json();
      })
      .then((f: TestFixture) => {
        if (cancelled) return;
        setFixture(f);
        durationRef.current = f.meta.audio_duration_s;
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [fixtureUrl]);

  /** Stream clock. Recorded: the audio element. Live: audio element, then wall time after the audio ends. */
  const readClock = useCallback((): number => {
    const a = audioRef.current;
    if (!a) return 0;
    if (modeRef.current === "live" && endedAtRef.current !== null) {
      return durationRef.current + (performance.now() - endedAtRef.current) / 1000;
    }
    return a.currentTime;
  }, []);

  const stopLoops = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (sendTimerRef.current !== null) clearInterval(sendTimerRef.current);
    sendTimerRef.current = null;
  }, []);

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startTick = useCallback(() => {
    const tick = () => {
      setClock(readClock());
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [readClock]);

  useEffect(
    () => () => {
      stopLoops();
      closeSocket();
      audioRef.current?.pause();
    },
    [stopLoops, closeSocket]
  );

  const resetAll = useCallback(() => {
    stopLoops();
    closeSocket();
    endedAtRef.current = null;
    liveHeardRef.current = 0;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setIsPlaying(false);
    setClock(0);
    setRunState("idle");
    setLiveNote(null);
    setLiveData({ segments: [], signals: [], risk_events: [] });
  }, [stopLoops, closeSocket]);

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    resetAll();
    setMode(m);
    modeRef.current = m;
  };

  // ---------- Recorded run ----------
  const playRecorded = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = false;
    a.volume = 1.0;
    a.play()
      .then(() => {
        setIsPlaying(true);
        setRunState("running");
        startTick();
      })
      .catch(() => setIsPlaying(false));
  };

  // ---------- Live run ----------
  const startLive = async () => {
    const a = audioRef.current;
    if (!a || !fixture) return;
    resetAll();
    setRunState("connecting");
    try {
      // 1. Decode the exact audio file the listener will hear, turn it into 1,024-byte 16 kHz frames.
      const buf = await (await fetch(fixture.meta.audio_url)).arrayBuffer();
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const decoded = await ctx.decodeAudioData(buf);
      const mono = decoded.getChannelData(0);
      const sampleRate = decoded.sampleRate;
      void ctx.close();
      const framer = new Framer();
      const frames: Uint8Array[] = framer.push(floatToPcm16(resampleTo16k(mono, sampleRate)));
      const silent = new Uint8Array(FRAME_BYTES);
      for (let i = 0; i < FLUSH_SILENT_FRAMES; i++) frames.push(silent);
      const audioFrames = frames.length - FLUSH_SILENT_FRAMES;

      // 2. Open the real WebSocket (same URL rule as /live).
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = process.env.NEXT_PUBLIC_API_WS_URL || `${proto}//${window.location.hostname}:8000`;
      const ws = new WebSocket(`${host.replace(/^http/, "ws")}/ws/live?lang=${fixture.meta.language_code}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      let sent = 0;
      let gotReady = false;

      const fail = (msg: string) => {
        stopLoops();
        closeSocket();
        a.pause();
        setIsPlaying(false);
        setRunState("error");
        setLiveNote(msg);
      };

      ws.onerror = () => {
        if (!gotReady) fail(t.liveFail);
      };
      ws.onclose = () => {
        if (!gotReady) fail(t.liveFail);
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(ev.data);
        } catch {
          return;
        }
        const now = readClock();
        if (m.type === "ready") {
          gotReady = true;
          a.currentTime = 0;
          a.play()
            .then(() => {
              setIsPlaying(true);
              setRunState("running");
              startTick();
            })
            .catch(() => fail(t.liveFail));
          // Pace frames by the audio clock so what is sent matches what is heard.
          sendTimerRef.current = setInterval(() => {
            if (!wsRef.current || ws.readyState !== WebSocket.OPEN) return;
            const clockForSend =
              sent < audioFrames
                ? a.currentTime
                : // after the real audio, send the silent flush frames on wall time
                  (audioFrames * 0.032) + (endedAtRef.current !== null ? (performance.now() - endedAtRef.current) / 1000 : 0);
            const n = framesDue(clockForSend, sent, frames.length);
            for (let i = 0; i < n; i++) ws.send(frames[sent++].buffer as ArrayBuffer);
            if (sent >= frames.length && endedAtRef.current !== null && performance.now() - endedAtRef.current > TAIL_WAIT_S * 1000) {
              stopLoops();
              closeSocket();
              setRunState("ended");
            }
          }, 8);
        } else if (m.type === "transcript") {
          const dur = Number(m.audio_duration_ms ?? 0) / 1000;
          const start = liveHeardRef.current;
          liveHeardRef.current += dur;
          const seg = {
            index: Number(m.index),
            text: String(m.text ?? "").trim(),
            audio_start_s: start,
            audio_end_s: liveHeardRef.current,
            appear_s: now,
          };
          setLiveData((d) => ({ ...d, segments: [...d.segments.filter((s) => s.index !== seg.index), seg].sort((x, y) => x.index - y.index) }));
        } else if (m.type === "risk") {
          const newSignals = ((m.new_signals as Array<Record<string, unknown>>) || []).map((s) => ({
            id: String(s.id),
            category: String(s.category),
            weight: Number(s.weight),
            evidence: String(s.evidence),
            segment_index: Number(s.segment_index),
            appear_s: now,
          }));
          setLiveData((d) => ({
            ...d,
            signals: [...d.signals, ...newSignals.filter((n) => !d.signals.some((o) => o.id === n.id))],
            risk_events: [
              ...d.risk_events,
              { level: m.level as ClipData["risk_events"][number]["level"], score: Number(m.score), primary_type: String(m.primary_type ?? "none"), appear_s: now },
            ],
          }));
        } else if (m.type === "error" || m.type === "end") {
          const reason = String(m.reason ?? m.code ?? "");
          if (m.type === "error" || reason === "budget_exhausted" || reason === "session_limit") {
            fail(t.liveFailBudget);
          }
        }
      };

      a.onended = () => {
        endedAtRef.current = performance.now();
        setIsPlaying(false);
      };
    } catch {
      setRunState("error");
      setLiveNote(t.liveFail);
    }
  };

  const onSpeaker = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (mode === "live") {
      if (runState === "idle" || runState === "ended" || runState === "error") void startLive();
      else {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => undefined);
      }
    } else {
      if (runState === "ended") resetAll();
      playRecorded();
    }
  };

  const onRecordedEnded = () => {
    if (modeRef.current === "recorded") {
      setIsPlaying(false);
      setRunState("ended");
      setClock(audioRef.current?.currentTime ?? 0);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = v;
    setClock(v);
  };

  const data: ClipData = useMemo(
    () => (mode === "live" ? liveData : fixture ?? { segments: [], signals: [], risk_events: [] }),
    [mode, liveData, fixture]
  );
  const view = useMemo(() => deriveView(data, mode === "live" ? Number.POSITIVE_INFINITY : clock), [data, clock, mode]);

  const sheetSignals: CallSignal[] = view.signals.map((s) => ({
    id: s.id,
    category: s.category,
    weight: s.weight,
    evidence: s.evidence,
    segment_index: s.segment_index,
  }));
  const marginNotes: CallMarginNoteItem[] = [];
  for (const s of view.signals) {
    if (!marginNotes.some((n) => n.segmentIndex === s.segment_index && n.category === s.category)) {
      marginNotes.push({
        segmentIndex: s.segment_index,
        category: s.category,
        text: CATEGORY_PLAIN_NOTES[s.category]?.[lang] ?? s.category.replace(/_/g, " "),
      });
    }
  }

  if (loadError) {
    return <p role="alert" className="text-sm text-[var(--alarm-text)]">Could not load this clip.</p>;
  }
  if (!fixture) {
    return <p className="text-sm text-[var(--ink-muted)]">Loading…</p>;
  }

  const duration = fixture.meta.audio_duration_s;
  const hot = view.level === "likely_scam" || view.level === "scam";
  const typeName = SCAM_TYPE_NAMES[view.primaryType]?.[lang];
  const badge =
    mode === "live" ? (runState === "connecting" ? t.badgeConnecting : t.badgeLive) : t.badgeRecorded;
  const f = view.firstAppeared;
  const timings: Array<[string, number | undefined]> = [
    [t.level.suspicious, f.suspicious],
    [t.level.likely_scam, f.likely_scam],
    [t.level.scam, f.scam],
  ];

  return (
    <div className="space-y-5" data-testid="livetest-player">
      {/* Honest labels: what this is, and what kind of audio */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="px-2.5 py-0.5 rounded font-bold uppercase bg-[var(--line)] text-[var(--ink)]" data-testid="kind-badge">
          {fixture.meta.kind === "real" ? t.real : t.synthetic}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-bold ${
            mode === "live" ? "border-[var(--alarm)]/40 text-[var(--alarm-text)]" : "border-[var(--stamp)]/40 text-[var(--stamp)]"
          }`}
          data-testid="mode-badge"
        >
          {mode === "live" && <Radio className="w-3.5 h-3.5" aria-hidden />}
          {badge}
        </span>
      </div>

      {allowLive && (
        <div role="radiogroup" aria-label="Test mode" className="grid sm:grid-cols-2 gap-2">
          {(["recorded", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              data-testid={`mode-${m}`}
              onClick={() => changeMode(m)}
              className={`text-left p-3 rounded-md border transition-colors ${
                mode === m ? "border-[var(--stamp)] bg-[var(--stamp)]/5" : "border-[var(--line)] bg-[var(--sheet)] hover:border-[var(--stamp)]"
              }`}
            >
              <div className="text-sm font-bold text-[var(--ink)]">{m === "recorded" ? t.modeRecorded : t.modeLive}</div>
              <div className="text-xs text-[var(--ink-muted)] mt-0.5">{m === "recorded" ? t.modeRecordedHint : t.modeLiveHint}</div>
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      <div className="paper-sheet p-4 sm:p-5 space-y-4 border border-[var(--line)]">
        <audio ref={audioRef} src={fixture.meta.audio_url} preload="auto" onEnded={onRecordedEnded} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="livetest-speaker-btn"
            data-testid="speaker-btn"
            onClick={onSpeaker}
            disabled={runState === "connecting"}
            aria-label={isPlaying ? t.pause : t.speaker}
            className="inline-flex items-center gap-2.5 pl-4 pr-5 h-14 rounded-full bg-[var(--stamp)] text-white font-bold text-base shadow-sm hover:opacity-90 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isPlaying ? <Pause className="w-6 h-6" aria-hidden /> : <Volume2 className="w-6 h-6" aria-hidden />}
            <span>{isPlaying ? t.pause : t.speaker}</span>
          </button>
          <button
            type="button"
            onClick={resetAll}
            aria-label={t.restart}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--stamp)]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
          </button>
          <span className="font-mono text-xs font-bold text-[var(--ink)] tabular-nums" data-testid="clock">
            {formatClock(clock)} / {formatClock(duration)}
          </span>
        </div>

        {mode === "recorded" && (
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={Math.min(clock, duration)}
            onChange={seek}
            aria-label="Audio position"
            className="w-full h-2 accent-[var(--stamp)]"
          />
        )}

        {liveNote && (
          <p role="alert" data-testid="live-note" className="flex items-start gap-2 text-sm text-[var(--warning-text)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{liveNote}</span>
          </p>
        )}

        <LevelStrip level={view.level} score={view.score} />

        <div aria-live="assertive" className="min-h-[1px]">
          {hot ? (
            <div
              role="alert"
              data-testid="hangup-banner"
              className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border-2 border-[var(--alarm)] bg-[var(--alarm)]/10"
            >
              <PhoneOff className="w-10 h-10 text-[var(--alarm-text)] shrink-0" aria-hidden />
              <div className="text-center sm:text-left flex-1 space-y-1">
                <p className="text-2xl font-display font-black text-[var(--alarm-text)] tracking-tight">{t.hangUp}</p>
                {typeName && view.primaryType !== "unknown_suspicious" && (
                  <p className="text-sm font-bold text-[var(--ink)]">{typeName}</p>
                )}
                <p className="text-xs sm:text-sm text-[var(--ink-muted)]">{t.hangUpSub}</p>
              </div>
              <VerdictStamp level={view.level} lang={lang} size="md" />
            </div>
          ) : view.level === "suspicious" ? (
            <p data-testid="suspicious-banner" className="p-3 rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 text-sm font-semibold text-[var(--warning-text)]">
              {t.suspiciousSub}
            </p>
          ) : null}
        </div>

        {/* When each alert actually appeared, from the arrival times of the events */}
        {timings.some(([, v]) => v !== undefined) && (
          <div className="space-y-1" data-testid="timings">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-[var(--ink)]">
              {timings.map(([label, v]) =>
                v !== undefined ? (
                  <li key={label}>
                    <span className="font-bold">{label}</span>: {t.appeared} {v.toFixed(1)}s {t.intoCall}
                  </li>
                ) : null
              )}
            </ul>
            <p className="text-[11px] text-[var(--ink-muted)]">{t.timingNote}</p>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">{t.sheetTitle}</h2>
          {mode === "recorded" && (
            <span className="text-xs text-[var(--ink-muted)] font-mono">
              {view.segments.length} {t.shown} {fixture.segments.length} {t.segmentsRevealed}
            </span>
          )}
        </div>
        {view.segments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] p-4 rounded-md border border-dashed border-[var(--line)]">
            {isPlaying ? t.listeningNow : t.waiting}
          </p>
        ) : (
          <CallSheet
            segments={view.segments.map((s) => ({ index: s.index, text: s.text, time: formatClock(s.appear_s) }))}
            signals={sheetSignals}
            marginNotes={marginNotes}
            level={view.level}
            lang={lang}
            showStamp={false}
            subtitle={{ en: "Test clip, transcribed by Prisma", hi: "टेस्ट क्लिप, प्रिस्मा से ट्रांसक्राइब" }}
          />
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p>{fixture.meta.kind === "real" ? t.realNote : t.synthNote}</p>
          {fixture.meta.credit && <p data-testid="credit">{fixture.meta.credit}</p>}
        </div>
      </div>
    </div>
  );
}
