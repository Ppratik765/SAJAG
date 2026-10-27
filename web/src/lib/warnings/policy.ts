/**
 * Spoken-warning playback policy (spec 7.3 / 7.4). Pure TypeScript, no React.
 *
 * Written in type-strippable syntax only (no enums, no parameter properties) so that
 * `node --test` can import this exact file.
 */

export type AlertKind = "alert_suspicious" | "alert_scam";

export const COOLDOWN_MS = 60_000;

const INDIC_PREFIXES = ["hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa"];

export function isIndic(code: string): boolean {
  const base = (code || "").toLowerCase().split("-")[0];
  return INDIC_PREFIXES.includes(base);
}

/**
 * Pick the baked clip folder for a UI/STT language, honouring the reviewed list.
 * Indic -> hi-IN if reviewed, else en-IN if reviewed. Others -> en-IN if reviewed, else hi-IN if reviewed.
 * Returns null when no reviewed language can be used.
 */
export function resolveWarningLang(code: string, reviewed: readonly string[]): string | null {
  const primary = isIndic(code) ? "hi-IN" : "en-IN";
  const secondary = primary === "hi-IN" ? "en-IN" : "hi-IN";
  if (reviewed.includes(primary)) return primary;
  if (reviewed.includes(secondary)) return secondary;
  return null;
}

export function alertSrc(lang: string, kind: AlertKind): string {
  return `/audio/warnings/${lang}/${kind}.mp3`;
}

export function explainSrc(lang: string, scamType: string): string {
  return `/audio/warnings/${lang}/explain_${scamType}.mp3`;
}

export interface TriggerContext {
  lang: string;
  muted: boolean;
  gesture: boolean;
  reviewed: readonly string[];
}

export type Decision =
  | { play: true; src: string; lang: string }
  | { play: false; reason: "no_gesture" | "muted" | "cooldown" | "not_reviewed" | "scam_playing" };

export interface PolicyState {
  lastPlayed: Record<AlertKind, number>;
  playingKind: AlertKind | null;
}

export function createPolicyState(): PolicyState {
  return { lastPlayed: { alert_suspicious: 0, alert_scam: 0 }, playingKind: null };
}

/** Decide whether `kind` may play now. Cooldown is per kind, so a suspicious alert never blocks a scam alert. */
export function decide(state: PolicyState, kind: AlertKind, ctx: TriggerContext, now: number): Decision {
  if (!ctx.gesture) return { play: false, reason: "no_gesture" };
  if (ctx.muted) return { play: false, reason: "muted" };
  const lang = resolveWarningLang(ctx.lang, ctx.reviewed);
  if (!lang) return { play: false, reason: "not_reviewed" };
  if (kind === "alert_suspicious" && state.playingKind === "alert_scam") {
    return { play: false, reason: "scam_playing" };
  }
  const last = state.lastPlayed[kind];
  if (last > 0 && now - last < COOLDOWN_MS) return { play: false, reason: "cooldown" };
  return { play: true, src: alertSrc(lang, kind), lang };
}

export interface AudioLike {
  play(): Promise<void> | void;
  pause(): void;
  onended: ((this: any, ...args: any[]) => any) | null;
}

export interface WarningPlayerOptions {
  makeAudio: (src: string) => AudioLike;
  now?: () => number;
  /** Called when a clip should have played but could not (never fail silently). */
  onUnavailable?: (reason: string) => void;
}

export interface WarningPlayer {
  state: PolicyState;
  trigger(kind: AlertKind, ctx: TriggerContext): Promise<boolean>;
  stop(): void;
}

export function createWarningPlayer(opts: WarningPlayerOptions): WarningPlayer {
  const state = createPolicyState();
  const now = opts.now ?? (() => Date.now());
  let current: AudioLike | null = null;

  function stop(): void {
    if (current) {
      try {
        current.pause();
      } catch {
        /* ignore */
      }
    }
    current = null;
    state.playingKind = null;
  }

  async function trigger(kind: AlertKind, ctx: TriggerContext): Promise<boolean> {
    const d = decide(state, kind, ctx, now());
    if (!d.play) {
      if (d.reason === "not_reviewed") opts.onUnavailable?.("not_reviewed");
      return false;
    }
    // A scam alert interrupts a suspicious clip that is still playing.
    if (kind === "alert_scam" && state.playingKind === "alert_suspicious") stop();

    let audio: AudioLike;
    try {
      audio = opts.makeAudio(d.src);
      await audio.play();
    } catch {
      opts.onUnavailable?.("play_failed");
      return false; // cooldown starts only after a successful play()
    }
    state.lastPlayed[kind] = now();
    state.playingKind = kind;
    current = audio;
    audio.onended = () => {
      if (current === audio) {
        current = null;
        state.playingKind = null;
      }
    };
    return true;
  }

  return { state, trigger, stop };
}
