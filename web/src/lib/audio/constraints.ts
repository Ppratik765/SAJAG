/**
 * Microphone constraint presets and storage for Sajag Live.
 *
 * Default: Second-device listening (no echo/noise suppression to prevent clipping caller voice).
 */

export interface MicPreset {
  id: "clean" | "raw" | "processed";
  name: "Clean Second-Device (Default)" | "Raw Unprocessed" | "Aggressive Processing";
  description: string;
  constraints: MediaTrackConstraints;
}

export const MIC_PRESETS: Record<MicPreset["id"], MicPreset> = {
  clean: {
    id: "clean",
    name: "Clean Second-Device (Default)",
    description: "echoCancellation: false, noiseSuppression: false, autoGainControl: true. Recommended for phone-to-speaker listening.",
    constraints: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    },
  },
  raw: {
    id: "raw",
    name: "Raw Unprocessed",
    description: "echoCancellation: false, noiseSuppression: false, autoGainControl: false. Direct unmodulated audio stream.",
    constraints: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  },
  processed: {
    id: "processed",
    name: "Aggressive Processing",
    description: "echoCancellation: true, noiseSuppression: true, autoGainControl: true. Standard telephony / video conference mode.",
    constraints: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};

const STORAGE_KEY = "sajag_mic_preset";

export function getActiveMicPreset(): MicPreset {
  if (typeof window === "undefined") {
    return MIC_PRESETS.clean;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as MicPreset["id"] | null;
    if (saved && MIC_PRESETS[saved]) {
      return MIC_PRESETS[saved];
    }
  } catch {
    // Ignore localStorage access failures
  }
  return MIC_PRESETS.clean;
}

export function setActiveMicPreset(presetId: MicPreset["id"]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
  } catch {
    // Ignore localStorage failures
  }
}
