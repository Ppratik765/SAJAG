import test from "node:test";
import assert from "node:assert/strict";

// Import pure audio modules
const { resampleTo16k } = await import("../src/lib/audio/resample.ts");
const { floatToPcm16 } = await import("../src/lib/audio/pcm.ts");
const { Framer, FRAME_BYTES, FRAME_SAMPLES } = await import("../src/lib/audio/framer.ts");

test("Frame size invariant: every emitted frame is exactly 1,024 bytes (512 samples)", () => {
  const framer = new Framer();

  // Test across diverse chunk sizes
  const chunkSizes = [128, 256, 512, 1024, 73, 999, 1024, 33];
  for (const size of chunkSizes) {
    const chunk = new Int16Array(size);
    const frames = framer.push(chunk);
    for (const frame of frames) {
      assert.strictEqual(
        frame.byteLength,
        FRAME_BYTES,
        `Frame must be exactly ${FRAME_BYTES} bytes, got ${frame.byteLength}`
      );
      assert.strictEqual(
        frame.byteLength / 2,
        FRAME_SAMPLES,
        `Frame must contain exactly ${FRAME_SAMPLES} 16-bit samples`
      );
    }
  }
});

test("No samples lost or duplicated across arbitrary buffer boundaries", () => {
  const framer = new Framer();
  const totalSamples = 10000;
  const original = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    // Unique sequential pattern (modulo 32767)
    original[i] = ((i % 65000) - 32500);
  }

  // Push through irregular chunk sizes
  const chunkSizes = [1, 7, 13, 100, 511, 512, 513, 2048, 89, 400];
  let srcOffset = 0;
  let chunkIdx = 0;
  const emittedSamples = [];

  while (srcOffset < totalSamples) {
    const size = Math.min(chunkSizes[chunkIdx % chunkSizes.length], totalSamples - srcOffset);
    const chunk = original.subarray(srcOffset, srcOffset + size);
    srcOffset += size;
    chunkIdx++;

    const frames = framer.push(chunk);
    for (const frame of frames) {
      const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
      for (let s = 0; s < FRAME_SAMPLES; s++) {
        emittedSamples.push(view.getInt16(s * 2, true));
      }
    }
  }

  // Number of emitted samples should be totalSamples minus what's still held in buffer
  const remaining = framer.remainingSamples;
  assert.strictEqual(
    emittedSamples.length + remaining,
    totalSamples,
    `Sample conservation invariant failed: ${emittedSamples.length} emitted + ${remaining} remaining != ${totalSamples} total`
  );

  // Check sample-by-sample fidelity of emitted samples
  for (let i = 0; i < emittedSamples.length; i++) {
    assert.strictEqual(
      emittedSamples[i],
      original[i],
      `Sample mismatch at index ${i}: expected ${original[i]}, got ${emittedSamples[i]}`
    );
  }
});

test("Resampling 48k and 44.1k to 16k keeps duration within 1 frame (512 samples)", () => {
  // Test 1.0 second duration
  const durSec = 1.0;
  const expectedSamples16k = 16000;

  // 48 kHz
  const samples48k = new Float32Array(Math.round(48000 * durSec));
  const resampled48k = resampleTo16k(samples48k, 48000);
  const diff48k = Math.abs(resampled48k.length - expectedSamples16k);
  assert.ok(
    diff48k <= 1,
    `48k -> 16k sample count mismatch: got ${resampled48k.length}, expected ${expectedSamples16k}`
  );
  assert.ok(diff48k < FRAME_SAMPLES, "Duration difference must be within 1 frame");

  // 44.1 kHz
  const samples44k = new Float32Array(Math.round(44100 * durSec));
  const resampled44k = resampleTo16k(samples44k, 44100);
  const diff44k = Math.abs(resampled44k.length - expectedSamples16k);
  assert.ok(
    diff44k <= 1,
    `44.1k -> 16k sample count mismatch: got ${resampled44k.length}, expected ${expectedSamples16k}`
  );
  assert.ok(diff44k < FRAME_SAMPLES, "Duration difference must be within 1 frame");

  // Test arbitrary duration: 2.37 seconds
  const arbitraryDur = 2.37;
  const targetSamples = Math.round(16000 * arbitraryDur);
  const in48k = new Float32Array(Math.round(48000 * arbitraryDur));
  const out48k = resampleTo16k(in48k, 48000);
  assert.ok(
    Math.abs(out48k.length - targetSamples) < FRAME_SAMPLES,
    "48k arbitrary duration within 1 frame"
  );

  const in44k = new Float32Array(Math.round(44100 * arbitraryDur));
  const out44k = resampleTo16k(in44k, 44100);
  assert.ok(
    Math.abs(out44k.length - targetSamples) < FRAME_SAMPLES,
    "44.1k arbitrary duration within 1 frame"
  );
});

test("Clipping: Float32 audio samples outside [-1.0, 1.0] clip safely", () => {
  const input = new Float32Array([1.5, 2.0, 100.0, -1.2, -5.0, 0.0, 0.5, -0.5, 1.0, -1.0]);
  const pcm = floatToPcm16(input);

  // Positive saturation
  assert.strictEqual(pcm[0], 32767, "1.5 should clip to 32767");
  assert.strictEqual(pcm[1], 32767, "2.0 should clip to 32767");
  assert.strictEqual(pcm[2], 32767, "100.0 should clip to 32767");

  // Negative saturation
  assert.strictEqual(pcm[3], -32768, "-1.2 should clip to -32768");
  assert.strictEqual(pcm[4], -32768, "-5.0 should clip to -32768");

  // Zero and linear range
  assert.strictEqual(pcm[5], 0, "0.0 should convert to 0");
  assert.strictEqual(pcm[6], Math.round(0.5 * 32767));
  assert.strictEqual(pcm[7], Math.round(-0.5 * 32768));
  assert.strictEqual(pcm[8], 32767, "1.0 should convert to 32767");
  assert.strictEqual(pcm[9], -32768, "-1.0 should convert to -32768");
});
