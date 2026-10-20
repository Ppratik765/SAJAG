"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Mic,
  Square,
  Play,
  RotateCcw,
  Copy,
  Check,
  FileAudio,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { uploadAudioForAnalysis, AnalysisResponse, TranscriptSegment } from "@/lib/api/analyze";
import { useI18n } from "@/lib/i18n/context";

const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "en-IN", label: "English (Indian)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
];

export default function CheckPage() {
  const { t, locale } = useI18n();

  // State
  const [selectedLang, setSelectedLang] = useState(locale === "hi" ? "hi-IN" : "en-IN");
  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update default lang when locale changes
  useEffect(() => {
    setSelectedLang(locale === "hi" ? "hi-IN" : "en-IN");
  }, [locale]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 179) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setRecordSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(500);
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        locale === "hi"
          ? "माइक्रोफ़ोन एक्सेस नहीं मिला। कृपया अनुमति दें।"
          : "Microphone access denied or unavailable. Please grant permission."
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle file drop/selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 25 * 1024 * 1024) {
        setErrorMessage("File exceeds 25 MB limit.");
        return;
      }
      setFile(selected);
      setRecordedBlob(null);
    }
  };

  // Process audio
  const handleProcessAudio = async () => {
    const audioPayload = file || recordedBlob;
    if (!audioPayload) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStep("Initializing pipeline...");

    try {
      const data = await uploadAudioForAnalysis(audioPayload, selectedLang, (step, pct) => {
        setProgressStep(step);
        setProgressPercent(pct);
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setRecordedBlob(null);
    setResult(null);
    setRecordSeconds(0);
    setErrorMessage(null);
    setProgressPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Copy transcript
  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-left mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--stamp)]/10 text-[var(--stamp)] text-xs font-semibold mb-3 border border-[var(--stamp)]/20">
          <span>Prisma v2.5 pipeline</span>
          <span className="text-[var(--ink-muted)]">•</span>
          <span>Up to 3 minutes</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[var(--ink)] tracking-tight leading-[1.08] mb-3">
          Check a call recording
        </h1>
        <p className="text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          Upload an audio note from WhatsApp or record live. Sajag splits the call into
          seamless 25-second segments, transcribing multi-lingual speech with Gnani Prisma.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Record Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Surface */}
          <div className="bg-[var(--sheet)] border border-[var(--line)] rounded-xl p-5 shadow-sm space-y-5">
            {/* Language Selector */}
            <div>
              <label htmlFor="language-select" className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                Spoken language
              </label>
              <select
                id="language-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                disabled={isProcessing || isRecording}
                className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] font-medium"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg bg-[var(--bg)] p-1 border border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  setErrorMessage(null);
                }}
                disabled={isProcessing || isRecording}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "upload"
                    ? "bg-[var(--sheet)] text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Upload size={14} />
                <span>Upload audio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("record");
                  setErrorMessage(null);
                }}
                disabled={isProcessing}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "record"
                    ? "bg-[var(--sheet)] text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Mic size={14} />
                <span>Record in browser</span>
              </button>
            </div>

            {/* Tab 1: Upload File */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac"
                  onChange={handleFileChange}
                  className="hidden"
                  id="audio-upload-input"
                />
                <label
                  htmlFor="audio-upload-input"
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    file
                      ? "border-[var(--stamp)] bg-[var(--stamp)]/5"
                      : "border-[var(--line)] hover:border-[var(--ink-muted)] bg-[var(--bg)]/50"
                  }`}
                >
                  <FileAudio
                    size={32}
                    className={`mb-2 ${file ? "text-[var(--stamp)]" : "text-[var(--ink-muted)]"}`}
                  />
                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)] truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
                        Click to select audio or drag and drop
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                        WAV, MP3, M4A, OGG, AAC (max 3 mins, 25 MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Tab 2: Record Live in Browser */}
            {activeTab === "record" && (
              <div className="space-y-4">
                <div className="border border-[var(--line)] bg-[var(--bg)]/60 rounded-xl p-6 text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-[var(--alarm)] text-white shadow-lg animate-pulse"
                          : "bg-[var(--sheet)] border border-[var(--line)] text-[var(--ink)]"
                      }`}
                    >
                      <Mic size={28} />
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-mono font-bold text-[var(--ink)]">
                      {formatSeconds(recordSeconds)}
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      {isRecording ? "Listening to mic audio..." : recordedBlob ? "Recording captured" : "Max 3 minutes"}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="btn-stamp px-5 py-2.5 rounded-full bg-[var(--stamp)] text-white text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 flex items-center gap-1.5"
                      >
                        <Play size={14} />
                        <span>Start recording</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="btn-stamp px-5 py-2.5 rounded-full bg-[var(--alarm)] text-white text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 flex items-center gap-1.5"
                      >
                        <Square size={14} />
                        <span>Stop recording</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-[var(--alarm)]/10 border border-[var(--alarm)]/30 text-[var(--alarm-text)] text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* CTA Process Button */}
            <div>
              <button
                type="button"
                onClick={handleProcessAudio}
                disabled={isProcessing || isRecording || (!file && !recordedBlob)}
                className="w-full btn-stamp min-h-[50px] py-3 px-6 rounded-full bg-[var(--stamp)] text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Processing chunks...</span>
                ) : (
                  <span>Transcribe recording</span>
                )}
              </button>
            </div>

            {/* Privacy notice */}
            <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed text-center">
              Audio is securely processed with Gnani Prisma and never retained. Only record
              or upload calls you have permission to analyze.
            </p>
          </div>
        </div>

        {/* Right Column: Living Call Sheet & Progress Ruler */}
        <div className="lg:col-span-7 space-y-4">
          {/* Ruler-Style Progress Track (Visible when processing or completed) */}
          {(isProcessing || result) && (
            <div className="bg-[var(--sheet)] border border-[var(--line)] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--stamp)] animate-ping" />
                  <span>{progressStep}</span>
                </span>
                <span className="font-mono text-[var(--ink-muted)]">{progressPercent}%</span>
              </div>

              {/* Engineering ruler scale */}
              <div className="relative pt-2">
                {/* Ruler ticks bar */}
                <div className="h-6 w-full bg-[var(--bg)] border border-[var(--line)] rounded flex items-end px-2 overflow-hidden relative">
                  {/* Millimeter ticks */}
                  <div className="absolute inset-0 flex justify-between items-end px-1 pointer-events-none opacity-40">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-[1px] bg-[var(--ink)] ${i % 5 === 0 ? "h-4" : "h-2"}`}
                      />
                    ))}
                  </div>

                  {/* Progress fill needle */}
                  <div
                    className="h-full bg-[var(--stamp)]/20 border-r-2 border-[var(--stamp)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Ruler timestamp markings */}
                <div className="flex justify-between text-[10px] font-mono text-[var(--ink-muted)] mt-1 px-1">
                  <span>0s</span>
                  <span>25s</span>
                  <span>50s</span>
                  <span>75s</span>
                  <span>100s</span>
                  <span>120s+</span>
                </div>
              </div>
            </div>
          )}

          {/* Paper Call Sheet */}
          <div className="paper-sheet p-6 sm:p-8 min-h-[420px] flex flex-col justify-between">
            <div>
              {/* Paper Top bar */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-4 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
                    Call transcript sheet
                  </h2>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {result
                      ? `Duration: ${result.duration_seconds}s • ${result.segments.length} chunks reassembled`
                      : isProcessing
                      ? "Listening and writing live..."
                      : "Awaiting audio input"}
                  </p>
                </div>

                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-[var(--safe)]" /> : <Copy size={14} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Ruled Lines Content */}
              {result ? (
                <div className="space-y-4">
                  {result.segments.map((seg: TranscriptSegment, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 py-2 border-b border-[var(--line)]/60 text-sm leading-relaxed"
                    >
                      <span className="font-mono text-xs text-[var(--ink-muted)] shrink-0 pt-0.5">
                        {formatSeconds(seg.offset_s)}
                      </span>
                      <p className="text-[var(--ink)] font-medium flex-1">
                        {seg.text}
                      </p>
                    </div>
                  ))}

                  {/* M1 Note */}
                  <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-start gap-2.5 bg-[var(--bg)]/50 p-4 rounded-lg">
                    <Sparkles size={18} className="text-[var(--stamp)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-[var(--ink)]">
                        Pipeline status: Speech-to-Text verified
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5 leading-normal">
                        All audio chunks transcribed cleanly with Gnani Prisma.
                        Rule-based scam red flag detection engine attaches in Milestone M2.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isProcessing ? (
                /* Live typing mock while processing */
                <div className="space-y-4 py-4 animate-pulse">
                  <div className="flex items-center gap-4 py-2 border-b border-[var(--line)]/60">
                    <span className="font-mono text-xs text-[var(--stamp)]">0:00</span>
                    <div className="h-4 bg-[var(--stamp)]/15 rounded w-3/4" />
                  </div>
                  <div className="flex items-center gap-4 py-2 border-b border-[var(--line)]/60">
                    <span className="font-mono text-xs text-[var(--stamp)]">0:25</span>
                    <div className="h-4 bg-[var(--stamp)]/15 rounded w-5/6" />
                  </div>
                  <div className="flex items-center gap-4 py-2 border-b border-[var(--line)]/60">
                    <span className="font-mono text-xs text-[var(--stamp)]">0:50</span>
                    <div className="h-4 bg-[var(--stamp)]/15 rounded w-1/2" />
                  </div>
                </div>
              ) : (
                /* Blank ruled paper empty state */
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--ink-muted)]">
                    <FileAudio size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Paper sheet is blank
                  </p>
                  <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto leading-relaxed">
                    Upload an audio file or start recording on the left to see the transcript
                    written here line by line.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom note */}
            <div className="pt-6 border-t border-[var(--line)] flex justify-between items-center text-[11px] text-[var(--ink-muted)]">
              <span>Sajag Transcription Pipeline • M1</span>
              <span>Chunk limit ≤ 28s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
