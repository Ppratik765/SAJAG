/**
 * Pure helpers for the "See live test" player (no React, no browser APIs) so they can be unit-tested.
 * Every time is on the STREAM CLOCK: seconds since the first audio frame was sent, which is also the audio
 * element's currentTime. `appear_s` = when that transcript line / alert actually arrived.
 */

export type Level = "safe" | "suspicious" | "likely_scam" | "scam";

export interface TestSegment {
  index: number;
  text: string;
  audio_start_s: number;
  audio_end_s: number;
  appear_s: number;
}
export interface TestSignal {
  id: string;
  category: string;
  weight: number;
  evidence: string;
  segment_index: number;
  appear_s: number;
}
export interface TestRisk {
  level: Level;
  score: number;
  primary_type: string;
  appear_s: number;
}
export interface TestFixture {
  meta: {
    id: string;
    kind: "synthetic" | "real" | "dramatised";
    title: string;
    title_hi: string;
    language_code: string;
    audio_url: string;
    audio_duration_s: number;
    credit: string;
    captured_with?: string;
    final_level: Level;
    primary_type: string;
  };
  segments: TestSegment[];
  signals: TestSignal[];
  risk_events: TestRisk[];
}
export interface ClipData {
  segments: TestSegment[];
  signals: TestSignal[];
  risk_events: TestRisk[];
}

const RANK: Record<Level, number> = { safe: 0, suspicious: 1, likely_scam: 2, scam: 3 };

export interface View {
  segments: TestSegment[];
  signals: TestSignal[];
  level: Level;
  score: number;
  primaryType: string;
  firstAppeared: Partial<Record<"suspicious" | "likely_scam" | "scam", number>>;
}

/** Everything that has already ARRIVED by stream time `t`. Level never goes down (matches the server rule). */
export function deriveView(data: ClipData, t: number): View {
  const segments = data.segments.filter((s) => s.appear_s <= t);
  const signals = data.signals.filter((s) => s.appear_s <= t);
  const risks = data.risk_events.filter((r) => r.appear_s <= t);
  let level: Level = "safe";
  let score = 0;
  let primaryType = "none";
  const firstAppeared: View["firstAppeared"] = {};
  for (const r of risks) {
    if (RANK[r.level] > RANK[level]) level = r.level;
    score = Math.max(score, r.score);
    if (r.primary_type && r.primary_type !== "none") primaryType = r.primary_type;
    for (const name of ["suspicious", "likely_scam", "scam"] as const) {
      if (RANK[r.level] >= RANK[name] && firstAppeared[name] === undefined) firstAppeared[name] = r.appear_s;
    }
  }
  return { segments, signals, level, score, primaryType, firstAppeared };
}

export function formatClock(s: number): string {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, "0")}`;
}

/** Pace for sending frames: frame n (0-based) is due once the clock reaches n * 0.032 s. */
export const FRAME_SECONDS = 0.032;
export function framesDue(clockS: number, alreadySent: number, total: number): number {
  const due = Math.min(total, Math.floor(clockS / FRAME_SECONDS) + 1);
  return Math.max(0, due - alreadySent);
}

/** Only these ids may be requested from the manifest (blocks path tricks in ?clip=). */
export function safeClipId(raw: string | null | undefined): string | null {
  return raw && /^[a-z0-9][a-z0-9_-]{1,40}$/.test(raw) ? raw : null;
}
