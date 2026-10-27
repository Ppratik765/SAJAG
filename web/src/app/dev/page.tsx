"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MIC_PRESETS,
  MicPreset,
  getActiveMicPreset,
  setActiveMicPreset,
} from "@/lib/audio/constraints";

export default function DevIndexPage() {
  const [selectedPreset, setSelectedPreset] = useState<MicPreset["id"]>(() => {
    if (typeof window !== "undefined") {
      try {
        return getActiveMicPreset().id;
      } catch {
        return "clean";
      }
    }
    return "clean";
  });
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const handleSelectPreset = (id: MicPreset["id"]) => {
    setSelectedPreset(id);
    setActiveMicPreset(id);
  };

  const handleTestMic = async () => {
    if (isMicTesting) {
      setIsMicTesting(false);
      return;
    }

    try {
      const preset = MIC_PRESETS[selectedPreset];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: preset.constraints,
      });
      setIsMicTesting(true);

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 50);

      // Stop after 10s
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        setIsMicTesting(false);
        setVolumeLevel(0);
      }, 10000);
    } catch (err) {
      alert(`Mic test failed: ${err}`);
      setIsMicTesting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-[var(--line)] pb-4">
        <div className="inline-block px-2.5 py-1 rounded bg-[var(--marker)] text-[var(--ink)] text-xs font-semibold mb-2">
          Internal Dev Panel
        </div>
        <h1 className="text-3xl font-display font-extrabold text-[var(--ink)]">
          Developer Tools & Audio Constraints
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Configure microphone DSP presets for Live mode, inspect UI components, and test audio capture.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link
          href="/dev/ui"
          className="px-4 py-2 rounded border border-[var(--line)] bg-[var(--sheet)] text-sm font-semibold hover:border-[var(--stamp)] text-[var(--ink)]"
        >
          View UI Components Gallery →
        </Link>
        <Link
          href="/live"
          className="px-4 py-2 rounded bg-[var(--stamp)] text-white text-sm font-semibold hover:opacity-90"
        >
          Go to Live Mode →
        </Link>
      </div>

      {/* Mic Constraints Selector */}
      <section className="space-y-4 paper-sheet p-6">
        <h2 className="text-xl font-display font-bold text-[var(--ink)]">
          Live Mode Microphone Constraints Preset
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Choose the hardware DSP constraints applied when <code>navigator.mediaDevices.getUserMedia</code> is invoked on <code>/live</code>.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(MIC_PRESETS) as MicPreset["id"][]).map((key) => {
            const preset = MIC_PRESETS[key];
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`text-left p-4 rounded border-2 transition-all ${
                  isSelected
                    ? "border-[var(--stamp)] bg-[var(--stamp)]/5"
                    : "border-[var(--line)] bg-[var(--sheet)] hover:border-[var(--ink-muted)]"
                }`}
              >
                <div className="font-bold text-sm text-[var(--ink)] flex items-center justify-between">
                  {preset.name}
                  {isSelected && (
                    <span className="text-xs text-[var(--stamp)] font-semibold">Active</span>
                  )}
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-2 leading-relaxed">
                  {preset.description}
                </div>
                <pre className="mt-3 text-[11px] font-mono p-2 bg-[var(--bg)] rounded overflow-x-auto text-[var(--ink)]">
                  {JSON.stringify(preset.constraints, null, 2)}
                </pre>
              </button>
            );
          })}
        </div>

        {/* Live Level Meter */}
        <div className="mt-6 pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleTestMic}
            className={`px-4 py-2 rounded text-sm font-bold ${
              isMicTesting
                ? "bg-[var(--alarm)] text-white"
                : "bg-[var(--ink)] text-[var(--sheet)]"
            }`}
          >
            {isMicTesting ? "Stop Mic Test (Listening...)" : "Test Active Microphone Preset"}
          </button>

          {isMicTesting && (
            <div className="flex-1 w-full max-w-xs flex items-center gap-3">
              <span className="text-xs text-[var(--ink-muted)] font-mono">Input:</span>
              <div className="flex-1 h-3 bg-[var(--line)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--stamp)] transition-all duration-75"
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
              <span className="text-xs font-mono text-[var(--ink)] w-8 text-right">
                {volumeLevel}%
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
