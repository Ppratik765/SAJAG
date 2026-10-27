import test from "node:test";
import assert from "node:assert/strict";

// Helper replicating the live warning resolution logic
function resolveWarningLang(code) {
  const isIndic =
    code.startsWith("hi") ||
    code.startsWith("ta") ||
    code.startsWith("te") ||
    code.startsWith("kn") ||
    code.startsWith("ml") ||
    code.startsWith("mr") ||
    code.startsWith("bn") ||
    code.startsWith("gu") ||
    code.startsWith("pa");
  return isIndic ? "hi-IN" : "en-IN";
}

function resolveAudioSrc({ level, primaryType, languageCode }) {
  const langFolder = resolveWarningLang(languageCode);
  const knownTypes = [
    "digital_arrest",
    "bank_kyc",
    "courier_parcel",
    "lottery_prize",
    "upi_refund",
    "utility_disconnect",
    "tech_support_remote",
    "family_emergency",
    "investment_task",
  ];

  if (primaryType && knownTypes.includes(primaryType)) {
    return `/audio/warnings/${langFolder}/explain_${primaryType}.mp3`;
  }
  if (level === "scam" || level === "likely_scam") {
    return `/audio/warnings/${langFolder}/alert_scam.mp3`;
  }
  return `/audio/warnings/${langFolder}/alert_suspicious.mp3`;
}

// 60-second rule simulator
class WarningAudioController {
  constructor() {
    this.lastAlertTimes = {
      alert_scam: 0,
      alert_suspicious: 0,
    };
    this.userGestureStarted = false;
    this.isMuted = false;
    this.playedClips = [];
  }

  playWarning(kind, langCode, now = Date.now()) {
    if (!this.userGestureStarted) return false;
    if (this.isMuted) return false;

    const last = this.lastAlertTimes[kind] || 0;
    if (now - last < 60000) {
      return false; // suppressed by 60s rule
    }

    this.lastAlertTimes[kind] = now;
    const resolvedLang = resolveWarningLang(langCode);
    const src = `/audio/warnings/${resolvedLang}/${kind}.mp3`;
    this.playedClips.push({ kind, src, time: now });
    return true;
  }
}

test("Warning audio path resolution: Hindi, Indic fallbacks, and English", () => {
  assert.strictEqual(
    resolveAudioSrc({ level: "likely_scam", primaryType: "digital_arrest", languageCode: "hi-IN" }),
    "/audio/warnings/hi-IN/explain_digital_arrest.mp3"
  );

  // Indic fallback to hi-IN
  assert.strictEqual(
    resolveAudioSrc({ level: "likely_scam", primaryType: "bank_kyc", languageCode: "ta-IN" }),
    "/audio/warnings/hi-IN/explain_bank_kyc.mp3"
  );

  // English resolved to en-IN
  assert.strictEqual(
    resolveAudioSrc({ level: "likely_scam", primaryType: "upi_refund", languageCode: "en-IN" }),
    "/audio/warnings/en-IN/explain_upi_refund.mp3"
  );

  // General alert fallback when primary type is none
  assert.strictEqual(
    resolveAudioSrc({ level: "likely_scam", primaryType: "none", languageCode: "hi-IN" }),
    "/audio/warnings/hi-IN/alert_scam.mp3"
  );
  assert.strictEqual(
    resolveAudioSrc({ level: "suspicious", primaryType: "none", languageCode: "en-IN" }),
    "/audio/warnings/en-IN/alert_suspicious.mp3"
  );
});

test("60-second cooldown rule: prevents duplicate alerts within 60 seconds", () => {
  const ctrl = new WarningAudioController();
  ctrl.userGestureStarted = true;

  const t0 = 1000000;
  // First alert plays
  const played1 = ctrl.playWarning("alert_scam", "hi-IN", t0);
  assert.strictEqual(played1, true);
  assert.strictEqual(ctrl.playedClips.length, 1);
  assert.strictEqual(ctrl.playedClips[0].src, "/audio/warnings/hi-IN/alert_scam.mp3");

  // Immediate repeat within 60s (at t0 + 10s) is blocked
  const played2 = ctrl.playWarning("alert_scam", "hi-IN", t0 + 10000);
  assert.strictEqual(played2, false);
  assert.strictEqual(ctrl.playedClips.length, 1);

  // Different kind (alert_suspicious) is NOT blocked by alert_scam timer
  const playedSuspicious = ctrl.playWarning("alert_suspicious", "hi-IN", t0 + 15000);
  assert.strictEqual(playedSuspicious, true);
  assert.strictEqual(ctrl.playedClips.length, 2);

  // At t0 + 59s, alert_scam is still blocked
  const played3 = ctrl.playWarning("alert_scam", "hi-IN", t0 + 59999);
  assert.strictEqual(played3, false);

  // At t0 + 60.1s, alert_scam is permitted again
  const played4 = ctrl.playWarning("alert_scam", "hi-IN", t0 + 60100);
  assert.strictEqual(played4, true);
  assert.strictEqual(ctrl.playedClips.length, 3);
});

test("Mute and autoplay gesture gating", () => {
  const ctrl = new WarningAudioController();

  const t = 2000000;
  // Without user gesture, no audio
  assert.strictEqual(ctrl.playWarning("alert_scam", "hi-IN", t), false);
  assert.strictEqual(ctrl.playedClips.length, 0);

  // With user gesture but muted, no audio
  ctrl.userGestureStarted = true;
  ctrl.isMuted = true;
  assert.strictEqual(ctrl.playWarning("alert_scam", "hi-IN", t), false);
  assert.strictEqual(ctrl.playedClips.length, 0);

  // Unmuted -> plays
  ctrl.isMuted = false;
  assert.strictEqual(ctrl.playWarning("alert_scam", "hi-IN", t), true);
  assert.strictEqual(ctrl.playedClips.length, 1);
});
