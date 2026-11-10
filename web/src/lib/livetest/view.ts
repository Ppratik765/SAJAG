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
    kind: "synthetic" | "real";
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

/**
 * Word-by-word live streaming view for pre-computed fixtures:
 * - Each segment starts appearing at `audio_start_s + 0.05` and streams its words proportionally up to `audio_end_s`.
 * - Each signal triggers as soon as its `evidence` phrase has been spoken in the streamed words.
 * - Risk levels escalate at the exact moment the corresponding segment's trigger phrase is spoken.
 */
export function deriveStreamingView(data: ClipData, t: number): View {
  const lagS = 1.0;
  const streamT = t - lagS;
  if (streamT <= 0) {
    return { segments: [], signals: [], level: "safe", score: 0, primaryType: "none", firstAppeared: {} };
  }

  const segments: TestSegment[] = [];
  const segTextMap = new Map<number, string>();
  const segByIndex = new Map<number, TestSegment>();

  for (const s of data.segments) {
    segByIndex.set(s.index, s);
    if (streamT < s.audio_start_s) continue;
    const words = s.text.split(" ").filter(Boolean);
    if (words.length === 0) continue;
    const dur = Math.max(0.25, s.audio_end_s - s.audio_start_s);
    const progress = Math.max(0, Math.min(1, (streamT - s.audio_start_s) / dur));
    const wordCount = streamT >= s.audio_end_s ? words.length : Math.max(1, Math.ceil(progress * words.length));
    const partialText = words.slice(0, wordCount).join(" ");
    segTextMap.set(s.index, partialText);
    segments.push({
      ...s,
      text: partialText,
    });
  }

  const signalStreamTime = (sig: TestSignal): number => {
    const seg = segByIndex.get(sig.segment_index);
    if (!seg) return sig.appear_s;
    const words = seg.text.split(" ").filter(Boolean);
    const dur = Math.max(0.25, seg.audio_end_s - seg.audio_start_s);
    for (let k = 1; k <= words.length; k++) {
      if (words.slice(0, k).join(" ").includes(sig.evidence)) {
        return Number((seg.audio_start_s + (Math.max(0, k - 1) / words.length) * dur + lagS).toFixed(2));
      }
    }
    return seg.audio_end_s + lagS;
  };

  const signals = data.signals.filter((sig) => {
    const partial = segTextMap.get(sig.segment_index);
    return partial !== undefined && partial.includes(sig.evidence);
  });
  const activeSigIds = new Set(signals.map((s) => s.id));

  let level: Level = "safe";
  let score = 0;
  let primaryType = "none";
  const firstAppeared: View["firstAppeared"] = {};

  for (const r of data.risk_events) {
    const relatedSigs = data.signals.filter((s) => s.appear_s <= r.appear_s + 0.05);
    const allRelatedActive =
      relatedSigs.length > 0 ? relatedSigs.every((s) => activeSigIds.has(s.id)) : t >= r.appear_s;
    if (allRelatedActive) {
      const effectiveAppearS =
        relatedSigs.length > 0 ? Math.max(...relatedSigs.map(signalStreamTime)) : r.appear_s;
      if (RANK[r.level] > RANK[level]) level = r.level;
      score = Math.max(score, r.score);
      if (r.primary_type && r.primary_type !== "none") primaryType = r.primary_type;
      for (const name of ["suspicious", "likely_scam", "scam"] as const) {
        if (RANK[r.level] >= RANK[name] && firstAppeared[name] === undefined) {
          firstAppeared[name] = effectiveAppearS;
        }
      }
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
