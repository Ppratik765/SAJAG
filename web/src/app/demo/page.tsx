"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { CallSheet, CallSegment, CallSignal, CallMarginNoteItem } from "@/components/ui/CallSheet";
import { LevelStrip } from "@/components/ui/LevelStrip";
import { RiskLevel } from "@/components/ui/VerdictStamp";

interface FixtureMeta {
  clip_id: string;
  title: string;
  title_hi: string;
  language_code: string;
  audio_url: string;
  audio_duration_s: number;
  final_level: RiskLevel;
  final_score: number;
  primary_type: string;
  flagged_at: {
    suspicious_audio_s: number;
    suspicious_wall_s: number;
    likely_scam_audio_s: number;
    likely_scam_wall_s: number;
    scam_audio_s: number;
    scam_wall_s: number;
  };
}

interface FixtureSegment {
  index: number;
  text: string;
  duration_s: number;
  start_audio_s: number;
  end_audio_s: number;
  wall_arrival_s: number;
}

interface FixtureSignal {
  id: string;
  category: string;
  evidence: string;
  weight: number;
  segment_index: number;
  start_char?: number;
  end_char?: number;
  wall_arrival_s: number;
  audio_time_s: number;
}

interface FixtureMarginNote {
  id: string;
  signal_id: string;
  segment_index: number;
  category: string;
  note_en: string;
  note_hi: string;
  wall_arrival_s: number;
}

interface FixtureRiskEvent {
  level: RiskLevel;
  score: number;
  primary_type: string;
  wall_arrival_s: number;
  audio_time_s: number;
}

interface FixtureData {
  meta: FixtureMeta;
  segments: FixtureSegment[];
  signals: FixtureSignal[];
  margin_notes: FixtureMarginNote[];
  risk_events: FixtureRiskEvent[];
}

export default function DemoPage() {
  const { locale } = useI18n();
  const activeLang = locale === "hi" ? "hi" : "en";

  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(26.86);

  // Synced live state
  const [displayedSegments, setDisplayedSegments] = useState<CallSegment[]>([]);
  const [displayedSignals, setDisplayedSignals] = useState<CallSignal[]>([]);
  const [displayedNotes, setDisplayedNotes] = useState<CallMarginNoteItem[]>([]);
  const [currentLevel, setCurrentLevel] = useState<RiskLevel>("safe");
  const [currentScore, setCurrentScore] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Load pre-recorded fixture
  useEffect(() => {
    fetch("/demo/fixture.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load demo fixture");
        return res.json();
      })
      .then((data: FixtureData) => {
        setFixture(data);
        if (data.meta?.audio_duration_s) {
          setDuration(data.meta.audio_duration_s);
        }
      })
      .catch((err) => console.error("Could not load demo fixture:", err));
  }, []);

  // 2. Synchronize visual sheet and verdict with current audio playback position
  const syncPlaybackState = useCallback(
    (t: number) => {
      if (!fixture) return;

      // Filter segments that have started
      const visibleSegs: CallSegment[] = fixture.segments
        .filter((s) => s.start_audio_s <= t)
        .map((s) => ({
          index: s.index,
          text: s.text,
          time: `0:${Math.floor(s.start_audio_s).toString().padStart(2, "0")}`,
        }));
      setDisplayedSegments(visibleSegs);

      // Filter signals that have landed
      const visibleSigs: CallSignal[] = fixture.signals
        .filter((s) => s.audio_time_s <= t)
        .map((s) => ({
          id: s.id,
          category: s.category,
          weight: s.weight,
          evidence: s.evidence,
          segment_index: s.segment_index,
        }));
      setDisplayedSignals(visibleSigs);

      // Filter margin notes
      const visibleNotes: CallMarginNoteItem[] = fixture.margin_notes
        .filter((n) => {
          const matchingSig = fixture.signals.find((s) => s.id === n.signal_id);
          return matchingSig ? matchingSig.audio_time_s <= t : true;
        })
        .map((n) => ({
          segmentIndex: n.segment_index,
          category: n.category,
          text: activeLang === "hi" ? n.note_hi : n.note_en,
        }));
      setDisplayedNotes(visibleNotes);

      // Find current risk level from risk events
      const relevantRisks = fixture.risk_events.filter((r) => r.audio_time_s <= t);
      if (relevantRisks.length > 0) {
        const latest = relevantRisks[relevantRisks.length - 1];
        setCurrentLevel(latest.level);
        setCurrentScore(latest.score);
      } else {
        setCurrentLevel("safe");
        setCurrentScore(0);
      }
    },
    [fixture, activeLang]
  );

  // Playback tick loop
  useEffect(() => {
    const tick = () => {
      if (audioRef.current) {
        const cur = audioRef.current.currentTime;
        setCurrentTime(cur);
        syncPlaybackState(cur);
      }
      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, syncPlaybackState]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleReset = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    syncPlaybackState(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
    syncPlaybackState(val);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Flagged timing line computed from fixture
  const flaggedLine = fixture?.meta?.flagged_at ? (
    currentLevel === "likely_scam" || currentLevel === "scam" ? (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--alarm)]/10 border border-[var(--alarm)]/30 text-[var(--alarm-text)] text-xs sm:text-sm font-semibold">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>
          {activeLang === "hi"
            ? `कॉल शुरू होने के ${fixture.meta.flagged_at.likely_scam_audio_s}s ऑडियो पर संभावित फ्रॉड चिह्नित (वास्तविक समय: ${fixture.meta.flagged_at.likely_scam_wall_s}s)`
            : `Flagged as likely scam after ${fixture.meta.flagged_at.likely_scam_audio_s}s of audio (${fixture.meta.flagged_at.likely_scam_wall_s}s wall-clock time)`}
        </span>
      </div>
    ) : currentLevel === "suspicious" ? (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning-text)] text-xs sm:text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {activeLang === "hi"
            ? `कॉल शुरू होने के ${fixture.meta.flagged_at.suspicious_audio_s}s ऑडियो पर संदिग्ध चिह्नित (वास्तविक समय: ${fixture.meta.flagged_at.suspicious_wall_s}s)`
            : `Flagged as suspicious after ${fixture.meta.flagged_at.suspicious_audio_s}s of audio (${fixture.meta.flagged_at.suspicious_wall_s}s wall-clock time)`}
        </span>
      </div>
    ) : null
  ) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* 1. MANDATORY EXACT SPEC BANNER */}
      <div
        id="demo-synthetic-banner"
        className="p-4 rounded-md border-2 border-[var(--stamp)]/30 bg-[var(--stamp)]/5 flex items-start gap-3 shadow-xs"
      >
        <Info className="w-5 h-5 text-[var(--stamp)] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm">
          <p className="font-bold text-[var(--ink)]">
            Synthetic demo call, pre-recorded. Transcripts were captured earlier from Prisma on this audio. Use Live mode to run on your own audio.
          </p>
          <p className="text-[var(--ink-muted)]">
            सिंथेटिक डेमो कॉल, पहले से रिकॉर्ड किया गया। इस ऑडियो पर पहले से प्रिस्मा से ट्रांसक्रिप्ट कैप्चर किए गए थे। अपने ऑडियो पर चलाने के लिए लाइव मोड का उपयोग करें।
          </p>
        </div>
      </div>

      {/* 2. Header and Context */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded bg-[var(--line)] text-[var(--ink)]">
            DEMO REPLAY
          </span>
          <span className="text-xs text-[var(--ink-muted)] font-mono">
            {fixture?.meta?.clip_id || "da_hi_002"} • {activeLang === "hi" ? "डिजिटल अरेस्ट फ्रॉड" : "Digital Arrest Scam"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] tracking-tight">
          {activeLang === "hi"
            ? "डेमो रीप्ले: डिजिटल अरेस्ट कॉल का वास्तविक समय पता लगाना"
            : "Demo Replay: Real-Time Detection of a Digital Arrest Call"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
          {activeLang === "hi"
            ? "नीचे दिया गया ऑडियो चलाएं और देखें कि कैसे बातचीत आगे बढ़ने पर सजग चेतावनी संकेतों को चिह्नित करता है और स्कोर बढ़ाता है।"
            : "Play the audio below to watch Sajag flag warning signs and escalate risk in exact sync with caller speech."}
        </p>
      </div>

      {/* 3. Audio Player & Controls Bar */}
      <div className="paper-sheet p-4 sm:p-5 space-y-4 shadow-sm border border-[var(--line)]">
        <audio
          ref={audioRef}
          src="/demo/call.mp3"
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          preload="auto"
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Play/Pause & Reset buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="demo-play-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause demo" : "Play demo"}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--stamp)] text-white hover:opacity-90 active:scale-95 transition-transform shadow-sm"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Restart demo"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--stamp)] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--ink)] ml-2">
              <Clock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              <span>{formatTime(currentTime)}</span>
              <span className="text-[var(--ink-muted)]">/</span>
              <span className="text-[var(--ink-muted)]">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Timing Line (Computed from fixture) */}
          {flaggedLine}
        </div>

        {/* Scrubber Range Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 26.86}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Demo audio scrubber"
            className="w-full h-2 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--stamp)]"
          />
        </div>

        {/* Dynamic Risk Level Strip */}
        <div className="pt-2">
          <LevelStrip level={currentLevel} score={currentScore} />
        </div>
      </div>

      {/* 4. Synced Call Sheet using exact live components */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
            {activeLang === "hi" ? "लाइव शीट रिकॉर्ड" : "Live Transcript Sheet"}
          </h2>
          <span className="text-xs text-[var(--ink-muted)] font-mono">
            {displayedSegments.length} of {fixture?.segments.length || 4} segments revealed
          </span>
        </div>

        <CallSheet
          segments={displayedSegments}
          signals={displayedSignals}
          marginNotes={displayedNotes}
          level={currentLevel}
          lang={activeLang}
          showStamp={true}
        />
      </div>

      {/* 5. Next Step Action Card */}
      <div className="p-6 rounded-xl border border-[var(--line)] bg-[var(--sheet)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-[var(--ink)]">
            {activeLang === "hi" ? "अपने खुद के कॉल की जांच करें" : "Ready to check your own calls?"}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
            {activeLang === "hi"
              ? "लाइव मोड में वास्तविक माइक्रोफोन से सुनें या टेक्स्ट संदेश पेस्ट करें।"
              : "Use Live Mode on a live speakerphone call or paste message text for offline analysis."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/live"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--stamp)] text-white text-xs sm:text-sm font-bold hover:opacity-95 transition-opacity"
          >
            <span>Live Mode</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/paste"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] text-xs sm:text-sm font-semibold hover:border-[var(--stamp)] transition-colors"
          >
            <span>Paste Text</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
