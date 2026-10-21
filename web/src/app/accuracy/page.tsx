import fs from "fs";
import path from "path";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, FileText, ArrowLeft, RefreshCw } from "lucide-react";

interface EvalReport {
  timestamp: string;
  git_commit: string;
  config: {
    format: string;
    variants: string[];
    scripts_count: number;
  };
  overall: {
    total_clips: number;
    tp: number;
    fp: number;
    tn: number;
    fn: number;
    precision: number;
    recall: number;
    f1: number;
    false_positive_rate: number;
    type_accuracy: number;
    mean_cer: number | null;
  };
  per_split?: Record<string, any>;
  per_language: Record<string, any>;
  per_variant: Record<string, any>;
  items: Array<{
    script_id: string;
    language: string;
    variant: string;
    split: string;
    label: string;
    legit_kind: string | null;
    is_true_scam: boolean;
    detected_level: string;
    is_detected_scam: boolean;
    primary_type: string;
    score: number;
    signals_count: number;
    transcript: string;
    audio_duration_seconds: number;
    time_to_detect_likely_scam: number | null;
    cer: number;
  }>;
  limitations: string[];
}

function getLatestResults(): EvalReport | null {
  try {
    // Check both potential locations (inside web dir or repository root)
    const candidates = [
      path.join(process.cwd(), "..", "eval", "results", "latest.json"),
      path.join(process.cwd(), "eval", "results", "latest.json"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ p, "utf-8");
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error("Failed to read latest.json:", err);
  }
  return null;
}

export default function AccuracyPage() {
  const data = getLatestResults();

  if (!data) {
    return (
      <main className="min-h-screen py-16 px-4 max-w-4xl mx-auto text-center" style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}>
        <h1 className="text-3xl font-display font-bold mb-4">Accuracy Benchmark • सटीकता रिपोर्ट</h1>
        <p className="text-muted-foreground mb-8">No evaluation run results found in eval/results/latest.json yet.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white" style={{ backgroundColor: "var(--stamp)" }}>
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
      </main>
    );
  }

  const { overall, config, per_language, per_variant, items, limitations, per_split } = data;

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}>
      {/* Navigation & Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium mb-2 transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Home • मुख्य पृष्ठ
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Accuracy & Evaluation <span className="font-normal opacity-70 block sm:inline sm:ml-2">मॉडल सटीकता</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Live benchmark numbers computed from <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "var(--paper-subtle)" }}>eval/results/latest.json</code>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border font-mono" style={{ backgroundColor: "var(--paper-subtle)", borderColor: "var(--rule)", color: "var(--muted)" }}>
          <span>Git: {data.git_commit.slice(0, 7)}</span>
          <span>•</span>
          <span>Run: {data.timestamp}</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Precision • परिशुद्धता
          </div>
          <div className="text-3xl sm:text-4xl font-display font-bold" style={{ color: "var(--stamp)" }}>
            {overall.fp + overall.tn === 0 ? "N/A" : `${(overall.precision * 100).toFixed(1)}%`}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {overall.fp + overall.tn === 0 ? "Scam-only batch (recall evaluation)" : `${overall.tp} true scams / ${overall.tp + overall.fp} flagged`}
          </p>
        </div>

        <div className="p-5 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Recall • संवेदनशीलता
          </div>
          <div className="text-3xl sm:text-4xl font-display font-bold" style={{ color: "var(--stamp)" }}>
            {(overall.recall * 100).toFixed(1)}%
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {overall.tp} detected / {overall.tp + overall.fn} actual scams
          </p>
        </div>

        <div className="p-5 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Legit False-Alarm • गलत चेतावनी
          </div>
          <div className="text-3xl sm:text-4xl font-display font-bold" style={{ color: overall.false_positive_rate === 0 ? "#15803d" : "var(--stamp)" }}>
            {overall.fp + overall.tn === 0 ? "N/A" : `${(overall.false_positive_rate * 100).toFixed(1)}%`}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {overall.fp + overall.tn === 0 ? "0 legit clips in this run" : `${overall.fp} false alarms on ${overall.fp + overall.tn} legit calls`}
          </p>
        </div>

        <div className="p-5 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Type Accuracy • प्रकार पहचान
          </div>
          <div className="text-3xl sm:text-4xl font-display font-bold" style={{ color: "var(--stamp)" }}>
            {(overall.type_accuracy * 100).toFixed(1)}%
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Exact scam type matched on detected calls
          </p>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="p-4 rounded-xl border mb-10 flex flex-wrap items-center justify-between gap-4 text-sm" style={{ backgroundColor: "var(--paper-subtle)", borderColor: "var(--rule)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Streaming Latency: <strong>Measured in M4</strong> (chunked REST simulation reflects 25s window)</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>STT Mean CER: <strong>{overall.mean_cer !== null && overall.mean_cer !== undefined ? `${(overall.mean_cer * 100).toFixed(1)}%` : "N/A"}</strong> (hi-IN & en-IN matching scripts only)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>F1 Score: <strong>{overall.fp + overall.tn === 0 ? "N/A (scam recall run)" : overall.f1.toFixed(3)}</strong></span>
        </div>
      </div>

      {/* Per-Split Table (Dev vs Test vs Holdout) */}
      {per_split && Object.keys(per_split).length > 0 && (
        <div className="p-6 rounded-xl border mb-10" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <div className="mb-4">
            <h2 className="text-lg font-display font-semibold">Performance by Dataset Split • डेटासेट विभाजन के अनुसार</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Dev (used for pattern tuning), Test (unseen partition), Holdout (30 fresh scripts evaluated exactly once after playbook freeze)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                <tr>
                  <th className="pb-2">Split</th>
                  <th className="pb-2">Clips</th>
                  <th className="pb-2">Precision</th>
                  <th className="pb-2">Recall</th>
                  <th className="pb-2">F1 Score</th>
                  <th className="pb-2">False-Alarm Rate</th>
                  <th className="pb-2">Type Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--rule)" }}>
                {Object.entries(per_split).map(([splitName, m]: [string, any]) => (
                  <tr key={splitName} className="py-2">
                    <td className="py-2.5 font-medium">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        splitName === "holdout" 
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300" 
                          : splitName === "test"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}>
                        {splitName.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5">{m.total_clips}</td>
                    <td className="py-2.5">{m.fp + m.tn === 0 ? "N/A" : `${(m.precision * 100).toFixed(1)}%`}</td>
                    <td className="py-2.5">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5">{m.f1.toFixed(3)}</td>
                    <td className="py-2.5" style={{ color: m.false_positive_rate === 0 ? "#15803d" : "var(--stamp)" }}>
                      {(m.false_positive_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5">{(m.type_accuracy * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Tables */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Per-Language Table */}
        <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <h2 className="text-lg font-display font-semibold mb-4">By Language • भाषा के अनुसार</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                <tr>
                  <th className="pb-2">Language</th>
                  <th className="pb-2">Clips</th>
                  <th className="pb-2">Prec</th>
                  <th className="pb-2">Recall</th>
                  <th className="pb-2">CER</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--rule)" }}>
                {Object.entries(per_language).map(([lang, m]: [string, any]) => (
                  <tr key={lang} className="py-2">
                    <td className="py-2.5 font-medium">{lang}</td>
                    <td className="py-2.5">{m.total_clips}</td>
                    <td className="py-2.5">{(m.precision * 100).toFixed(0)}%</td>
                    <td className="py-2.5">{(m.recall * 100).toFixed(0)}%</td>
                    <td className="py-2.5">
                      {m.mean_cer !== null && m.mean_cer !== undefined && lang !== "hi-en"
                        ? `${(m.mean_cer * 100).toFixed(1)}%`
                        : "not comparable (Latin vs Devanagari)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-Variant Table */}
        <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
          <h2 className="text-lg font-display font-semibold mb-4">By Channel Variant • ऑडियो चैनल</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                <tr>
                  <th className="pb-2">Variant</th>
                  <th className="pb-2">Clips</th>
                  <th className="pb-2">Precision</th>
                  <th className="pb-2">Recall</th>
                  <th className="pb-2">FPR</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--rule)" }}>
                {Object.entries(per_variant).map(([variant, m]: [string, any]) => (
                  <tr key={variant}>
                    <td className="py-2.5 font-medium">{variant}</td>
                    <td className="py-2.5">{m.total_clips}</td>
                    <td className="py-2.5">{(m.precision * 100).toFixed(0)}%</td>
                    <td className="py-2.5">{(m.recall * 100).toFixed(0)}%</td>
                    <td className="py-2.5">{(m.false_positive_rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Evaluated Clips Detail Table */}
      <div className="p-6 rounded-xl border mb-10" style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule)" }}>
        <h2 className="text-lg font-display font-semibold mb-4">Calibration Evaluation Clips ({items.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
              <tr>
                <th className="pb-2">Script ID</th>
                <th className="pb-2">Lang</th>
                <th className="pb-2">Ground Truth</th>
                <th className="pb-2">Detected Level</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">CER</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--rule)" }}>
              {items.map((it) => (
                <tr key={it.script_id}>
                  <td className="py-2.5 font-mono text-xs">{it.script_id}</td>
                  <td className="py-2.5">{it.language}</td>
                  <td className="py-2.5 font-medium">
                    {it.label === "legit" ? (
                      <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs">
                        legit ({it.legit_kind})
                      </span>
                    ) : (
                      <span className="text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded text-xs">
                        {it.label}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: it.detected_level === "safe" ? "rgba(22, 101, 52, 0.1)" : it.detected_level === "suspicious" ? "rgba(202, 138, 4, 0.1)" : "rgba(185, 28, 28, 0.1)",
                        color: it.detected_level === "safe" ? "#15803d" : it.detected_level === "suspicious" ? "#b45309" : "#b91c1c",
                      }}
                    >
                      {it.detected_level}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs font-mono">{it.primary_type}</td>
                  <td className="py-2.5 text-xs">
                    {it.cer !== null && it.cer !== undefined ? `${(it.cer * 100).toFixed(1)}%` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Limitations Callout */}
      <div className="p-6 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <h3 className="font-display font-semibold text-base">Honest Limitations • मॉडल की सीमाएं</h3>
        </div>
        <ul className="space-y-2 text-sm pl-7 list-disc">
          <li>
            <strong>Process Invariant:</strong> The synthetic dialogue scripts and the detection rules were authored by the same engineering process.
          </li>
          <li>
            <strong>Audio Cleanliness:</strong> Synthetic TTS speech passed directly to STT is substantially cleaner than real telephony calls (lacks low-bitrate carrier codecs, packet drop, acoustic echo, and heavy background noise).
          </li>
          <li>
            <strong>Headline Benchmark:</strong> The definitive headline accuracy numbers will come from an unseen holdout set (evaluated exactly once after playbook freeze) and staged human-voice calls.
          </li>
          <li>
            Audio tested here was generated with Timbre TTS and degraded via standard telephony simulation. Staged real-voice calls with background noise will be reported separately in M7.
          </li>
        </ul>
      </div>
    </main>
  );
}
