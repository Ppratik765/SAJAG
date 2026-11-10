import test from "node:test";
import assert from "node:assert/strict";

const { deriveView, framesDue, formatClock, safeClipId } = await import("../src/lib/livetest/view.ts");
import fs from "node:fs";

const fx = JSON.parse(fs.readFileSync(new URL("../public/live-tests/da_hi_002/fixture.json", import.meta.url), "utf8"));

test("nothing is visible before the first transcript arrives", () => {
  const v = deriveView(fx, 0);
  assert.equal(v.segments.length, 0);
  assert.equal(v.level, "safe");
});

test("a line is NOT shown before it arrived (segment 1 spans 0-5.7 s of audio but appears at ~6.1 s)", () => {
  assert.equal(deriveView(fx, 5.9).segments.length, 0);
  assert.equal(deriveView(fx, 6.2).segments.length, 1);
});

test("levels escalate at the recorded arrival times and never go down", () => {
  assert.equal(deriveView(fx, 6.3).level, "suspicious");
  assert.equal(deriveView(fx, 14.2).level, "likely_scam");
  assert.equal(deriveView(fx, 21.4).level, "scam");
  assert.equal(deriveView(fx, 21.4).firstAppeared.likely_scam, 14.147);
  const order = ["safe", "suspicious", "likely_scam", "scam"];
  let prev = 0;
  for (let t = 0; t <= 30; t += 0.25) {
    const r = order.indexOf(deriveView(fx, t).level);
    assert.ok(r >= prev);
    prev = r;
  }
});

test("every signal's evidence is an exact substring of its segment text", () => {
  for (const s of fx.signals) {
    const seg = fx.segments.find((x) => x.index === s.segment_index);
    assert.ok(seg.text.includes(s.evidence), `${s.id}`);
  }
});

test("frame pacing: frame n is due at n*32 ms", () => {
  assert.equal(framesDue(0, 0, 100), 1);
  assert.equal(framesDue(0.032, 1, 100), 1);
  assert.equal(framesDue(0.1, 4, 100), 0);
  assert.equal(framesDue(99, 0, 10), 10);
});

test("clock format and clip id allowlist", () => {
  assert.equal(formatClock(65.9), "1:05");
  assert.equal(safeClipId("da_hi_002"), "da_hi_002");
  assert.equal(safeClipId("da_real_01"), "da_real_01");
  assert.equal(safeClipId("da_real_02"), "da_real_02");
  assert.equal(safeClipId("../etc/passwd"), null);
  assert.equal(safeClipId("A"), null);
});

test("real example clips in manifest have valid fixtures, exact evidence substrings, and flag as scam", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../public/live-tests/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.clips.length, 2);
  for (const clip of manifest.clips) {
    assert.equal(clip.kind, "real");
    const realFx = JSON.parse(fs.readFileSync(new URL(`../public${clip.fixture_url}`, import.meta.url), "utf8"));
    const finalView = deriveView(realFx, realFx.meta.audio_duration_s + 5);
    assert.equal(finalView.level, "scam");
    for (const s of realFx.signals) {
      const seg = realFx.segments.find((x) => x.index === s.segment_index);
      assert.ok(seg && seg.text.includes(s.evidence), `${clip.id}:${s.id}`);
    }
  }
});
