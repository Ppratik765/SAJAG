/**
 * Client API for Sajag audio transcription and text analysis.
 */

import { resolveApiBaseUrl } from "@/lib/api/backend";
import { analyzeTextWithPlaybook, type PlaybookData } from "@/lib/engine/offlineAnalyzer";
import playbookJson from "@/lib/engine/playbook.json";

const PLAYBOOK = playbookJson as unknown as PlaybookData;

export interface TranscriptSegment {
  index: number;
  text: string;
  duration_s: number;
  offset_s: number;
}

export interface SignalDto {
  id: string;
  category: string;
  weight: number;
  evidence: string;
  segment_index: number;
  start_char: number;
  end_char: number;
  reviewed: boolean;
}

export interface ScamTypeMatchDto {
  type: string;
  confidence: "low" | "medium" | "high";
  matched_categories: string[];
}

export interface FullAnalysisResponse {
  analysis_id: string;
  language_code: string;
  duration_seconds: number;
  transcript: string;
  segments: TranscriptSegment[];
  level: "safe" | "suspicious" | "likely_scam" | "scam";
  score: number;
  primary_type: string;
  types: ScamTypeMatchDto[];
  signals: SignalDto[];
  advice_keys: string[];
  disclaimer_key: string;
  engine_attached?: boolean;
}

export type AnalysisResponse = FullAnalysisResponse;

export interface ApiError {
  code: string;
  message: string;
}

export async function analyzeText(
  text: string,
  languageCode: string = "hi-IN"
): Promise<FullAnalysisResponse> {
  const apiUrl = resolveApiBaseUrl();

  if (!apiUrl) {
    return analyzeTextWithPlaybook(text, PLAYBOOK, languageCode);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`${apiUrl}/api/analyze/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language_code: languageCode }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errPayload: { error?: ApiError } = {};
      try {
        errPayload = await res.json();
      } catch {
        // ignore
      }
      const msg = errPayload.error?.message || `Server responded with ${res.status}`;
      throw new Error(msg);
    }

    const data: FullAnalysisResponse = await res.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (
      isAbort ||
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("NetworkError") ||
      errorMsg.includes("aborted")
    ) {
      return analyzeTextWithPlaybook(text, PLAYBOOK, languageCode);
    }
    throw err;
  }
}

export async function uploadAudioForAnalysis(
  file: File | Blob,
  languageCode: string,
  onProgress?: (step: string, percent: number) => void
): Promise<FullAnalysisResponse> {
  const apiUrl = resolveApiBaseUrl();
  if (!apiUrl) {
    throw new Error(
      "Prototype: not open for testing without the backend server. Use Real examples (/test) or Paste message (/paste)."
    );
  }

  const formData = new FormData();
  formData.append("file", file, (file as File).name || "recording.wav");
  formData.append("language_code", languageCode);

  onProgress?.("Uploading recording to secure pipeline...", 15);

  const res = await fetch(`${apiUrl}/api/analyze/audio`, {
    method: "POST",
    body: formData,
  });

  onProgress?.("Transcribing chunks with Gnani Prisma v2.5...", 60);

  if (!res.ok) {
    let errPayload: { error?: ApiError } = {};
    try {
      errPayload = await res.json();
    } catch {
      // ignore
    }
    const msg = errPayload.error?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }

  onProgress?.("Running deterministic detection engine...", 95);
  const data: FullAnalysisResponse = await res.json();
  onProgress?.("Complete", 100);
  return data;
}
