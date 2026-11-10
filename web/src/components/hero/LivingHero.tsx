"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Play, Pause, RotateCcw, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { HEADLINE_CYCLE, CYCLE_INTERVAL_MS, CycleEntry } from "@/lib/i18n/cycle";
import { getHeroScript, ScriptStep } from "./script";
import { Mark, HARD_CATEGORIES } from "../ui/Mark";
import { MarginNote } from "../ui/MarginNote";
import { VerdictStamp, RiskLevel } from "../ui/VerdictStamp";
import { LevelStrip } from "../ui/LevelStrip";
import { CallTimeline, TimelineSignal } from "../ui/CallTimeline";

export function LivingHero() {
  const { t, locale } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  // -------------------------------------------------------------
  // 1. Cycling Headline (P0-1)
  // -------------------------------------------------------------
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isWiping, setIsWiping] = useState(false);
  const [isHeadlinePaused, setIsHeadlinePaused] = useState(false);
  const [scriptFonts, setScriptFonts] = useState<Record<string, string>>({});

  // Lazy load extra script fonts after mount (P0-1)
  useEffect(() => {
    let mounted = true;
    import("@/lib/scriptFonts")
      .then((mod) => {
        if (mounted && mod.SCRIPT_FONT_FAMILIES) {
          setScriptFonts(mod.SCRIPT_FONT_FAMILIES);
        }
      })
      .catch(() => {
        // Fallback: system fonts
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Cycling interval
  useEffect(() => {
    if (shouldReduceMotion || isHeadlinePaused) return;

    const timer = setInterval(() => {
      setIsWiping(true);
      setTimeout(() => {
        setCycleIndex((prev) => (prev + 1) % HEADLINE_CYCLE.length);
        setIsWiping(false);
      }, 260); // Pen-wipe duration
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [shouldReduceMotion, isHeadlinePaused]);

  const currentCycleEntry: CycleEntry = HEADLINE_CYCLE[cycleIndex];
  const activeFontFamily = currentCycleEntry.font
    ? scriptFonts[currentCycleEntry.font] || undefined
    : undefined;

  // -------------------------------------------------------------
  // 2. Living Call Sheet (Scripted Playback + Real Audio)
  // -------------------------------------------------------------
  const scriptData = getHeroScript(locale);
  const heroRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  // Playback state: time in milliseconds (0 to totalDurationMs)
  const [currentTimeMs, setCurrentTimeMs] = useState(
    shouldReduceMotion ? scriptData.totalDurationMs : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hasStartedAutoPlay, setHasStartedAutoPlay] = useState(false);
  const vibratedRef = useRef(false);
  const playedAlertRef = useRef(false);

  const heroAudioSrc = locale === "hi" ? "/audio/hero_hi.mp3" : "/audio/hero_en.mp3";
  const alertAudioSrc =
    locale === "hi"
      ? "/audio/warnings/hi-IN/alert_scam.mp3"
      : "/audio/warnings/en-IN/alert_scam.mp3";

  const stopAudio = useCallback(() => {
    if (callAudioRef.current) {
      callAudioRef.current.pause();
    }
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
  }, []);

  // Reset audio when locale switches
  useEffect(() => {
    stopAudio();
    playedAlertRef.current = false;
    if (callAudioRef.current) {
      callAudioRef.current.currentTime = 0;
    }
  }, [locale, stopAudio]);

  // IntersectionObserver: auto-start when >= 50% visible
  useEffect(() => {
    if (shouldReduceMotion || hasStartedAutoPlay) return;

    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setHasStartedAutoPlay(true);
            setIsPlaying(true);
            observer.disconnect();
          }
        }
      },
      { threshold: [0.45, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldReduceMotion, hasStartedAutoPlay]);

  // Tab visibility: pause when document hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPlaying(false);
        stopAudio();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [stopAudio]);

  // Main playback timer loop (syncs to audio element when soundEnabled is true)
  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return;

    const interval = 50; // 50ms tick for smooth timeline
    const timer = setInterval(() => {
      const audioEl = callAudioRef.current;
      if (soundEnabled && audioEl && !audioEl.paused) {
        const audioMs = Math.round(audioEl.currentTime * 1000);
        if (audioMs >= scriptData.totalDurationMs || audioEl.ended) {
          setIsPlaying(false);
          setCurrentTimeMs(scriptData.totalDurationMs);
          if (!playedAlertRef.current && alertAudioRef.current) {
            playedAlertRef.current = true;
            alertAudioRef.current.currentTime = 0;
            alertAudioRef.current.play().catch(() => {});
          }
        } else {
          setCurrentTimeMs(audioMs);
        }
        return;
      }

      setCurrentTimeMs((prev) => {
        const next = prev + interval;
        if (next >= scriptData.totalDurationMs) {
          setIsPlaying(false);
          if (soundEnabled && !playedAlertRef.current && alertAudioRef.current) {
            playedAlertRef.current = true;
            alertAudioRef.current.currentTime = 0;
            alertAudioRef.current.play().catch(() => {});
          }
          return scriptData.totalDurationMs;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, shouldReduceMotion, soundEnabled, scriptData.totalDurationMs]);

  // Vibrate phone once when alert threshold is crossed
  useEffect(() => {
    if (shouldReduceMotion) return;
    if (currentTimeMs >= scriptData.alertAtMs && !vibratedRef.current) {
      vibratedRef.current = true;
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive
      ) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          // ignore
        }
      }
    } else if (currentTimeMs < scriptData.alertAtMs) {
      vibratedRef.current = false;
    }
  }, [currentTimeMs, scriptData.alertAtMs, shouldReduceMotion]);

  const startPlaybackWithSound = (fromTimeMs?: number) => {
    const targetMs =
      fromTimeMs !== undefined
        ? fromTimeMs
        : currentTimeMs >= scriptData.totalDurationMs
        ? 0
        : currentTimeMs;
    setCurrentTimeMs(targetMs);
    setSoundEnabled(true);
    setIsPlaying(true);
    if (targetMs < scriptData.totalDurationMs) {
      playedAlertRef.current = false;
    }
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
    if (callAudioRef.current) {
      callAudioRef.current.currentTime = targetMs / 1000;
      callAudioRef.current.play().catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      startPlaybackWithSound();
    }
  };

  // Keyboard shortcut: Space toggles play/pause when sheet focused
  const handleSheetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleScrub(Math.max(0, currentTimeMs - 1000));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleScrub(Math.min(scriptData.totalDurationMs, currentTimeMs + 1000));
    }
  };

  const handleReplay = () => {
    startPlaybackWithSound(0);
  };

  const handleScrub = (timeMs: number) => {
    setCurrentTimeMs(timeMs);
    setIsPlaying(false);
    stopAudio();
    if (callAudioRef.current) {
      callAudioRef.current.currentTime = timeMs / 1000;
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      setSoundEnabled(false);
      stopAudio();
    } else {
      startPlaybackWithSound();
    }
  };

  // Pure derived state for border flash and sheet shift
  const isBorderFlashing =
    !shouldReduceMotion &&
    currentTimeMs >= scriptData.alertAtMs &&
    currentTimeMs < scriptData.alertAtMs + 800;

  const isSheetShifting =
    !shouldReduceMotion &&
    currentTimeMs >= scriptData.stampAtMs &&
    currentTimeMs < scriptData.stampAtMs + 240;

  // Derive visible steps and current score from currentTimeMs
  const visibleSteps: ScriptStep[] = scriptData.steps.filter(
    (s) => currentTimeMs >= s.atMs || shouldReduceMotion
  );

  let currentScore = 0;
  for (const s of scriptData.steps) {
    if (currentTimeMs >= s.atMs + 400 || shouldReduceMotion) {
      currentScore = s.scoreAfter;
    }
  }

  const currentLevel: RiskLevel =
    currentScore >= 11
      ? "scam"
      : currentScore >= 7
      ? "likely_scam"
      : currentScore >= 3
      ? "suspicious"
      : "safe";

  const showSpeechBubble =
    currentTimeMs >= scriptData.alertAtMs || shouldReduceMotion;
  const showVerdictStamp =
    currentTimeMs >= scriptData.stampAtMs || shouldReduceMotion;

  // Timeline signals for CallTimeline ruler
  const timelineSignals: TimelineSignal[] = scriptData.steps.flatMap((step) =>
    step.marks.map((m) => ({
      id: m.id,
      category: m.category,
      segmentIndex: step.lineIndex,
      timeSeconds: parseInt(step.time.split(":")[1], 10) || step.lineIndex * 10,
      isHard: m.kind === "circle",
    }))
  );

  // -------------------------------------------------------------
  // 3. P0-2 Desktop Pointer Highlighter Marker
  // -------------------------------------------------------------
  const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set());

  const handleWordHover = (wordId: string) => {
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    setHighlightedWords((prev) => {
      const next = new Set(prev);
      next.add(wordId);
      return next;
    });
    setTimeout(() => {
      setHighlightedWords((prev) => {
        const next = new Set(prev);
        next.delete(wordId);
        return next;
      });
    }, 1500);
  };

  // Auto-scroll inner transcript container when a new line lands (without scrolling the window)
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el && visibleSteps.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleSteps.length]);

  return (
    <section
      ref={heroRef}
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-8"
      aria-label="Sajag Hero: Is this call a scam?"
    >
      <audio ref={callAudioRef} src={heroAudioSrc} preload="auto" />
      <audio ref={alertAudioRef} src={alertAudioSrc} preload="auto" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Cycling headline, quiet pills, subline, 2 CTA buttons, parent link */}
        <div
          className="lg:col-span-5 min-w-0 flex flex-col space-y-3 pt-0.5 sm:pt-2 text-left"
          onMouseEnter={() => setIsHeadlinePaused(true)}
          onMouseLeave={() => setIsHeadlinePaused(false)}
          onFocus={() => setIsHeadlinePaused(true)}
          onBlur={() => setIsHeadlinePaused(false)}
        >
          {/* Screen-reader static sentence */}
          <h1 className="sr-only">
            {locale === "hi" ? "क्या यह कॉल ठगी है?" : "Is this call a scam?"}
          </h1>

          {/* Visible cycling display headline: clamp(48px, 7vw, 112px) desktop, 40px mobile */}
          <div
            aria-hidden="true"
            className="hero-cycling-headline-container hero-cycling-headline w-full"
          >
            <span
              className="inline-block transition-all duration-300 transform-gpu max-w-full"
              style={{
                fontFamily: activeFontFamily,
                fontSize: `calc(1em * ${currentCycleEntry.scale})`,
                clipPath: isWiping
                  ? "inset(0 100% 0 0)"
                  : "inset(0 0 0 0)",
                transition: isWiping
                  ? "clip-path 260ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "clip-path 350ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {shouldReduceMotion
                ? locale === "hi"
                  ? "क्या यह कॉल ठगी है?"
                  : "Is this call a scam?"
                : currentCycleEntry.text}
            </span>
          </div>

          {/* Language quick switcher pills: small, quiet, secondary 14px muted pills placed UNDER headline */}
          <div className="flex flex-wrap items-center gap-1.5 py-0.5 max-w-full">
            {HEADLINE_CYCLE.map((entry, idx) => {
              const isCurrent = cycleIndex === idx;
              return (
                <button
                  key={entry.code}
                  type="button"
                  onMouseEnter={() => {
                    setCycleIndex(idx);
                    setIsHeadlinePaused(true);
                  }}
                  onClick={() => {
                    setCycleIndex(idx);
                    setIsHeadlinePaused(true);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-xs sm:text-[14px] transition-colors shrink-0 ${
                    isCurrent
                      ? "bg-[var(--stamp)]/10 text-[var(--stamp)] font-semibold border border-[var(--stamp)]/40"
                      : "bg-[var(--sheet)] border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                  aria-label={`View headline in ${entry.name}`}
                >
                  {entry.name}
                </button>
              );
            })}
          </div>

          {/* Short subline */}
          <p className="text-xs sm:text-base text-[var(--ink-muted)] max-w-xl leading-snug pt-0.5">
            {t("hero.description")}
          </p>

          {/* TWO buttons max — wrap cleanly inside left column so they never overlap the right column */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href="#real-examples"
              className="btn-stamp inline-flex items-center justify-center min-h-[48px] h-auto py-2.5 px-5 rounded-full bg-[var(--stamp)] text-white font-bold text-xs sm:text-sm text-center hover:opacity-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] leading-tight"
            >
              <span>{t("hero.cta_watch_demo")}</span>
              <ArrowRight size={15} className="ml-1.5 shrink-0" />
            </Link>
            <Link
              href="/spot"
              className="btn-stamp inline-flex items-center justify-center min-h-[48px] h-auto py-2.5 px-5 rounded-full bg-[var(--marker)] text-[var(--ink)] font-bold text-xs sm:text-sm text-center hover:opacity-90 shadow-sm border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] leading-tight"
            >
              <span>{t("hero.cta_spot_game")}</span>
            </Link>
          </div>

          {/* "Set up for my parents" as a small text link */}
          <div className="pt-0.5">
            <Link
              href="/parent"
              className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--stamp)] underline underline-offset-4 decoration-[var(--line)] hover:decoration-[var(--stamp)] transition-colors"
            >
              <span>{t("hero.cta_parent_mode")}</span>
              <ArrowRight size={14} className="ml-1 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Right Column: Call Sheet & Scrubber (Straight, aligned, scrollable fixed height) */}
        <div className="lg:col-span-7 min-w-0 w-full space-y-2.5 pt-0.5 lg:pt-0">
          {/* LevelStrip live ruler needle */}
          <LevelStrip level={currentLevel} score={currentScore} />

          {/* Call Sheet Container: straight, aligned, fixed scrollable height */}
          <div
            ref={sheetRef}
            tabIndex={0}
            onKeyDown={handleSheetKeyDown}
            aria-label="Living Call Sheet demonstration. Press Space to play or pause, left and right arrows to scrub."
            className={`cursor-marker paper-sheet paper-folded p-4 sm:p-5 w-full relative transition-all duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] ${
              isBorderFlashing ? "animate-[vermilionFlash_900ms_ease-out]" : ""
            } ${isSheetShifting ? "animate-[sheetShift_240ms_ease-in-out]" : ""}`}
          >
            <div className="paper-dog-ear" />

            {/* Sheet Header: sentence-case with attached normal-case "Example, written by us" label */}
            <div className="border-b border-[var(--line)] pb-2.5 mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-[var(--ink)] block">
                    {locale === "hi" ? "बातचीत का विवरण" : "Transcript call sheet"}
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    {locale === "hi"
                      ? "दूसरी डिवाइस से रिकॉर्ड किया गया"
                      : "Recorded via second device"}
                  </span>
                </div>
                <span className="text-[11px] font-normal text-[var(--ink-muted)] bg-[var(--line)]/40 rounded px-2 py-0.5 whitespace-nowrap">
                  {t("hero.example_label")}
                </span>
              </div>

              <div className="text-xs font-semibold text-[var(--ink-muted)] tabular-nums shrink-0">
                {visibleSteps.length} / {scriptData.steps.length}{" "}
                {locale === "hi" ? "पंक्तियाँ" : "lines"}
              </div>
            </div>

          {/* Scrollable Transcript Lines (fixed height so it never pushes the page down) */}
          <div
            ref={transcriptBoxRef}
            className="space-y-3 h-[215px] sm:h-[230px] overflow-y-auto pr-2 scroll-smooth"
          >
            {visibleSteps.map((step) => {
              // Word level tokenization for pointer marker interaction (P0-2)
              const words = step.text.split(" ");

              return (
                <div
                  key={step.lineIndex}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-1.5 border-b border-[var(--line)]/50 last:border-b-0 animate-[penWriteReveal_350ms_ease-out]"
                >
                  {/* Left Gutter: Timestamp */}
                  <div className="w-11 sm:w-12 shrink-0 text-[12px] font-semibold text-[var(--ink-muted)] tabular-nums pt-0.5 select-none">
                    {step.time}
                  </div>

                  {/* Main Transcript with Marks */}
                  <div className="flex-1 min-w-0 text-[14px] sm:text-[15px] text-[var(--ink)] leading-relaxed">
                    {/* Render annotated text */}
                    {step.marks.length === 0 ? (
                      <span>
                        {words.map((w, wIdx) => {
                          const wId = `line-${step.lineIndex}-w-${wIdx}`;
                          const isHigh = highlightedWords.has(wId);
                          return (
                            <span
                              key={wIdx}
                              onMouseEnter={() => handleWordHover(wId)}
                              className={`transition-colors duration-200 ${
                                isHigh ? "bg-[var(--marker)] text-[var(--ink)]" : ""
                              }`}
                            >
                              {w}{" "}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <AnnotatedStepText
                        step={step}
                        highlightedWords={highlightedWords}
                        onWordHover={handleWordHover}
                      />
                    )}
                  </div>

                  {/* Right Gutter: Kalam Margin Note */}
                  {step.note && (
                    <div className="sm:w-40 lg:w-44 shrink-0 pl-1 sm:pl-2 pt-0.5 self-start animate-[penWriteReveal_450ms_ease-out]">
                      <MarginNote
                        text={step.note.text}
                        category={step.note.category}
                        className="block"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fixed-height Footer inside Call Sheet for Alert Speech Bubble + VerdictStamp */}
          <div className="mt-3 pt-3 border-t border-[var(--line)] min-h-[72px] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            {showSpeechBubble ? (
              <button
                type="button"
                onClick={() => {
                  if (alertAudioRef.current) {
                    alertAudioRef.current.currentTime = 0;
                    alertAudioRef.current.play().catch(() => {});
                  }
                }}
                className="flex-1 p-2.5 sm:p-3 rounded-xl bg-[var(--alarm)]/10 border border-[var(--alarm)]/30 flex items-center justify-between gap-2.5 text-left text-[var(--alarm-text)] hover:bg-[var(--alarm)]/15 transition-colors animate-[penWriteReveal_300ms_ease-out]"
                role="alert"
                title={locale === "hi" ? "चेतावनी सुनने के लिए क्लिक करें" : "Click to hear spoken warning"}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--alarm)] text-white flex items-center justify-center shrink-0">
                    <Volume2 size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      {t("hero.hang_up_alert")}
                    </span>
                    <span className="text-[11px] opacity-90 block">
                      {scriptData.alertSpeech}
                    </span>
                  </div>
                </div>

                {/* Animated visual waveform */}
                <div className="flex items-center gap-1 h-4 shrink-0 px-1" aria-hidden="true">
                  {[4, 12, 8, 16, 10, 14, 6].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-[var(--alarm)] rounded-full"
                      style={{
                        height: `${h}px`,
                        animation: shouldReduceMotion
                          ? "none"
                          : `waveBar 800ms ease-in-out infinite ${i * 120}ms`,
                      }}
                    />
                  ))}
                </div>
              </button>
            ) : (
              <span className="text-xs text-[var(--ink-muted)] italic">
                {locale === "hi"
                  ? "कॉल का विश्लेषण जारी है… आवाज़ सुनने के लिए नीचे Play / Sound दबाएँ"
                  : "Analyzing call lines… Press Play or Sound below to hear the call aloud"}
              </span>
            )}

            {showVerdictStamp && (
              <div className="shrink-0">
                <VerdictStamp level={currentLevel} size="sm" lang={locale} />
              </div>
            )}
          </div>
        </div>

        {/* 3. Timeline Scrubber and Controls */}
        <div className="p-3 rounded-lg bg-[var(--sheet)] border border-[var(--line)] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--stamp)] text-white text-xs font-bold hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
                aria-label={isPlaying ? "Pause call simulation" : "Play call simulation with sound"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>
                  {isPlaying
                    ? locale === "hi"
                      ? "रोकें"
                      : "Pause"
                    : locale === "hi"
                    ? "आवाज़ के साथ चलाएँ"
                    : "Play with sound"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleReplay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)] hover:text-[var(--stamp)] hover:border-[var(--stamp)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
                aria-label="Replay call simulation with sound from start"
              >
                <RotateCcw size={13} />
                <span>{locale === "hi" ? "दोबारा चलाएं" : "Replay"}</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  soundEnabled
                    ? "border-[var(--stamp)] bg-[var(--stamp)]/10 text-[var(--stamp)]"
                    : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
                aria-label={soundEnabled ? "Mute call audio" : "Unmute call audio"}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{soundEnabled ? (locale === "hi" ? "आवाज़ चालू" : "Sound on") : locale === "hi" ? "आवाज़ सुनें" : "Unmute"}</span>
              </button>
            </div>

            <span className="text-xs font-semibold text-[var(--ink-muted)] tabular-nums">
              {(currentTimeMs / 1000).toFixed(1)}s / {(scriptData.totalDurationMs / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Interactive Scrub Range */}
          <div className="space-y-1">
            <label htmlFor="hero-scrubber" className="sr-only">
              Scrub call timeline
            </label>
            <input
              id="hero-scrubber"
              type="range"
              min={0}
              max={scriptData.totalDurationMs}
              step={100}
              value={currentTimeMs}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="w-full accent-[var(--stamp)] cursor-pointer"
            />
            <CallTimeline
              durationSeconds={scriptData.totalDurationMs / 1000}
              signals={timelineSignals}
              firstCrossed={{ likely_scam: scriptData.alertAtMs / 1000 }}
              onSelectSignal={(segIdx) => {
                const targetStep = scriptData.steps.find((s) => s.lineIndex === segIdx);
                if (targetStep) handleScrub(targetStep.atMs);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}

// Subcomponent: Annotated line text with Mark and word-level hover
function AnnotatedStepText({
  step,
  highlightedWords,
  onWordHover,
}: {
  step: ScriptStep;
  highlightedWords: Set<string>;
  onWordHover: (id: string) => void;
}) {
  const text = step.text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  interface MatchItem {
    start: number;
    end: number;
    mark: ScriptStep["marks"][0];
  }
  const matches: MatchItem[] = [];

  for (const m of step.marks) {
    if (!m.evidence) continue;
    const idx = text.indexOf(m.evidence);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + m.evidence.length, mark: m });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  for (const match of matches) {
    if (match.start > lastIndex) {
      const slice = text.slice(lastIndex, match.start);
      parts.push(
        <span key={`text-${lastIndex}`}>
          {slice.split(" ").map((w, wIdx) => {
            const wId = `step-${step.lineIndex}-${lastIndex}-${wIdx}`;
            const isHigh = highlightedWords.has(wId);
            return (
              <span
                key={wIdx}
                onMouseEnter={() => onWordHover(wId)}
                className={`transition-colors duration-200 ${
                  isHigh ? "bg-[var(--marker)] text-[var(--ink)]" : ""
                }`}
              >
                {w}{" "}
              </span>
            );
          })}
        </span>
      );
    }

    const rawMatch = text.slice(match.start, match.end);
    const isHard = match.mark.kind === "circle" || HARD_CATEGORIES.has(match.mark.category);

    parts.push(
      <Mark
        key={match.mark.id}
        category={match.mark.category}
        kind={isHard ? "circle" : "highlight"}
        explanation={match.mark.explanation}
        weight={match.mark.weight}
      >
        {rawMatch}
      </Mark>
    );

    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    const slice = text.slice(lastIndex);
    parts.push(
      <span key={`text-end`}>
        {slice.split(" ").map((w, wIdx) => {
          const wId = `step-${step.lineIndex}-end-${wIdx}`;
          const isHigh = highlightedWords.has(wId);
          return (
            <span
              key={wIdx}
              onMouseEnter={() => onWordHover(wId)}
              className={`transition-colors duration-200 ${
                isHigh ? "bg-[var(--marker)] text-[var(--ink)]" : ""
              }`}
            >
              {w}{" "}
            </span>
          );
        })}
      </span>
    );
  }

  return <>{parts}</>;
}
