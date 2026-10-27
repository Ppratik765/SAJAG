import test from "node:test";
import assert from "node:assert/strict";

// Imports the real module used by /live and /parent (no replica).
const {
  resolveWarningLang,
  decide,
  createPolicyState,
  createWarningPlayer,
  COOLDOWN_MS,
} = await import("../src/lib/warnings/policy.ts");

const BOTH = ["hi-IN", "en-IN"];
const ctx = (over = {}) => ({ lang: "hi-IN", muted: false, gesture: true, reviewed: BOTH, ...over });

function fakeAudioFactory(log, { failPlay = false } = {}) {
  return (src) => {
    const a = {
      src,
      paused: true,
      onended: null,
      play() {
        if (failPlay) return Promise.reject(new Error("NotAllowedError"));
        a.paused = false;
        log.push({ ev: "play", src });
        return Promise.resolve();
      },
      pause() {
        a.paused = true;
        log.push({ ev: "pause", src });
      },
    };
    return a;
  };
}

test("language resolution honours the reviewed list", () => {
  assert.equal(resolveWarningLang("hi-IN", BOTH), "hi-IN");
  assert.equal(resolveWarningLang("ta-IN", BOTH), "hi-IN");
  assert.equal(resolveWarningLang("en-IN", BOTH), "en-IN");
  assert.equal(resolveWarningLang("ta-IN", ["en-IN"]), "en-IN");
  assert.equal(resolveWarningLang("en-IN", ["hi-IN"]), "hi-IN");
  assert.equal(resolveWarningLang("hi-IN", []), null);
});

test("no gesture, muted and unreviewed never play", () => {
  const s = createPolicyState();
  assert.deepEqual(decide(s, "alert_scam", ctx({ gesture: false }), 1e6), { play: false, reason: "no_gesture" });
  assert.deepEqual(decide(s, "alert_scam", ctx({ muted: true }), 1e6), { play: false, reason: "muted" });
  assert.deepEqual(decide(s, "alert_scam", ctx({ reviewed: [] }), 1e6), { play: false, reason: "not_reviewed" });
});

test("60 s cooldown per kind; suspicious never blocks scam", async () => {
  let t = 1_000_000;
  const log = [];
  const p = createWarningPlayer({ makeAudio: fakeAudioFactory(log), now: () => t });

  assert.equal(await p.trigger("alert_suspicious", ctx()), true);
  t += 5_000;
  assert.equal(await p.trigger("alert_scam", ctx()), true, "scam must not be blocked by suspicious cooldown");
  t += 10_000;
  assert.equal(await p.trigger("alert_scam", ctx()), false, "same kind inside 60 s is blocked");
  t += COOLDOWN_MS;
  assert.equal(await p.trigger("alert_scam", ctx()), true, "allowed again after 60 s");
  assert.deepEqual(
    log.filter((e) => e.ev === "play").map((e) => e.src),
    [
      "/audio/warnings/hi-IN/alert_suspicious.mp3",
      "/audio/warnings/hi-IN/alert_scam.mp3",
      "/audio/warnings/hi-IN/alert_scam.mp3",
    ],
  );
});

test("scam alert stops a still-playing suspicious clip", async () => {
  const log = [];
  const p = createWarningPlayer({ makeAudio: fakeAudioFactory(log), now: () => 2_000_000 });
  await p.trigger("alert_suspicious", ctx());
  await p.trigger("alert_scam", ctx());
  assert.deepEqual(log.map((e) => `${e.ev}:${e.src.split("/").pop()}`), [
    "play:alert_suspicious.mp3",
    "pause:alert_suspicious.mp3",
    "play:alert_scam.mp3",
  ]);
  assert.equal(p.state.playingKind, "alert_scam");
});

test("suspicious does not interrupt a playing scam clip", async () => {
  const log = [];
  const p = createWarningPlayer({ makeAudio: fakeAudioFactory(log), now: () => 3_000_000 });
  await p.trigger("alert_scam", ctx());
  assert.equal(await p.trigger("alert_suspicious", ctx()), false);
});

test("cooldown starts only if play() succeeded; failure is reported", async () => {
  let t = 4_000_000;
  const reasons = [];
  const failing = createWarningPlayer({
    makeAudio: fakeAudioFactory([], { failPlay: true }),
    now: () => t,
    onUnavailable: (r) => reasons.push(r),
  });
  assert.equal(await failing.trigger("alert_scam", ctx()), false);
  assert.equal(failing.state.lastPlayed.alert_scam, 0, "no cooldown after failed play");
  assert.deepEqual(reasons, ["play_failed"]);
});

test("unreviewed language reports not_reviewed instead of failing silently", async () => {
  const reasons = [];
  const p = createWarningPlayer({
    makeAudio: fakeAudioFactory([]),
    onUnavailable: (r) => reasons.push(r),
  });
  assert.equal(await p.trigger("alert_scam", ctx({ reviewed: [] })), false);
  assert.deepEqual(reasons, ["not_reviewed"]);
});
