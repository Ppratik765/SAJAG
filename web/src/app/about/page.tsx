import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Cpu, AlertTriangle, ArrowRight, Server, PhoneCall } from "lucide-react";

export const metadata = {
  title: "About • Sajag (सजग)",
  description: "Architecture, zero-retention privacy policy, honest limits, and Gnani AI credits.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-[var(--line)] pb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--stamp)]/10 text-[var(--stamp)] text-xs font-mono font-bold tracking-wide">
          SYSTEM ARCHITECTURE & HONEST POLICY
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-[var(--ink)] tracking-tight">
          About Sajag • सजग के बारे में
        </h1>
        <p className="text-base sm:text-lg text-[var(--ink-muted)] leading-relaxed max-w-2xl">
          A real-time, privacy-first companion that detects phone scam patterns and social-engineering tactics across Indian languages.
        </p>
      </div>

      {/* Helper Not a Guarantee Alert */}
      <div className="p-5 rounded-lg border-2 border-[var(--warning)]/40 bg-[var(--warning)]/5 space-y-2">
        <div className="flex items-center gap-2 text-[var(--warning-text)] font-bold text-base">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Important Notice</span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-[var(--ink)]">
          Sajag is a helper, not a guarantee.
        </p>
        <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
          No automated tool can detect 100% of evolving fraudulent techniques. Never share one-time passwords (OTP), banking PINs, card numbers, or transfer money to unverified callers, regardless of the displayed risk level.
        </p>
      </div>

      {/* How It Works */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--ink)] flex items-center gap-2">
          <Cpu className="w-6 h-6 text-[var(--stamp)]" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="paper-sheet p-5 space-y-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">1. Speech-to-Text with Gnani Prisma</h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              In Live mode and Audio Check, audio frames are streamed to Gnani Prisma speech-to-text engines supporting 10 Indian languages (Hindi, English, Tamil, Telugu, Bengali, Gujarati, Marathi, Kannada, Malayalam, and Punjabi).
            </p>
          </div>
          <div className="paper-sheet p-5 space-y-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">2. Deterministic Detection Engine</h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              Unlike unpredictable generative LLMs that can hallucinate, Sajag uses a frozen, deterministic rules-based scoring engine. Every detected flag cites an exact verbatim snippet from the conversation.
            </p>
          </div>
          <div className="paper-sheet p-5 space-y-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">3. Spoken Voice Warnings</h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              When risk escalates, spoken alerts synthesized with Gnani Timbre warn listeners in their selected regional language, explaining the scam tactic plainly so family members can act before sending money.
            </p>
          </div>
          <div className="paper-sheet p-5 space-y-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">4. Offline Text Analysis</h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              Pasted WhatsApp messages, SMS, or transcripts run purely through the local deterministic engine. Text analysis works even if speech recognition is offline or in maintenance mode, consuming zero cloud credits.
            </p>
          </div>
        </div>
      </section>

      {/* Zero Data Retention Privacy Policy */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--ink)] flex items-center gap-2">
          <Lock className="w-6 h-6 text-[var(--stamp)]" />
          Privacy & Zero-Retention Policy
        </h2>
        <div className="paper-sheet p-6 space-y-4">
          <ul className="space-y-3 text-xs sm:text-sm text-[var(--ink)]">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Uploaded audio is deleted in a guaranteed finally block:</strong> Audio files uploaded for analysis are processed in ephemeral directories and unlinked immediately.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>No transcripts or audio on disk or logs:</strong> Transcripts are held exclusively in memory during analysis. No transcript records, evidence quotes, or audio waveforms are written to server disk or database stores.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>No API keys or caller identities in logs:</strong> Application logs record only anonymized event types, request durations, and credit counters. No credentials or personal data are ever logged.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>No third-party trackers or ad pixels:</strong> Sajag contains no analytics trackers, third-party cookies, or surveillance telemetry.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Honest Limits & Operating System Constraints */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--ink)] flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-[var(--stamp)]" />
          Honest System Limitations
        </h2>
        <div className="paper-sheet p-6 space-y-3 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
          <p>
            <strong>Mobile Sandbox Boundaries:</strong> Modern mobile operating systems (Android and iOS) intentionally prevent web applications and background apps from directly tapping or recording in-call audio from cellular dialers or WhatsApp calls. To analyze live conversations, you place your phone on speakerphone and run Sajag on a nearby tablet, laptop, or second phone.
          </p>
          <p>
            <strong>Acoustic & Noise Limits:</strong> Strong ambient noise, television chatter, or heavy VoIP audio compression can reduce speech recognition clarity.
          </p>
          <p>
            <strong>Advisory False-Positives:</strong> Genuine banking advisories or telecom warnings that explicitly talk about OTP security, SIM blocks, or refunds can trigger cautionary flags. Sajag labels these as warning signs rather than declaring absolute innocence.
          </p>
        </div>
      </section>

      {/* Model Credits & Open Source */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--ink)] flex items-center gap-2">
          <Server className="w-6 h-6 text-[var(--stamp)]" />
          Credits & Technologies
        </h2>
        <div className="paper-sheet p-6 space-y-3 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
          <p>
            Sajag is built for the <strong>Great Indian AI Challenge</strong> utilizing cutting-edge Indian language speech foundation models from <strong>Gnani.ai</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-xs text-[var(--ink)]">
            <li>Gnani Prisma Speech-to-Text (v2.5) — Multi-dialect Indian language ASR</li>
            <li>Gnani Timbre Voice Synthesis (v2.5) — High-intelligibility regional voice warnings</li>
            <li>FastAPI & Python 3.13 — Low-latency async WebSocket streaming pipeline</li>
            <li>Next.js 15 & React 19 — Accessible, mobile-first responsive web client</li>
          </ul>
        </div>
      </section>

      {/* Quick Navigation Footer */}
      <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-[var(--line)]">
        <Link
          href="/"
          className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--stamp)] transition-colors"
        >
          ← Back to Home
        </Link>
        <Link
          href="/accuracy"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--stamp)] hover:underline"
        >
          <span>View Empirical Accuracy Metrics</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
