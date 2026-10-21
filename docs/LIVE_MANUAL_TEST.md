# Sajag Live Manual Second-Device Listening Test Guide

This document describes the exact protocol for evaluating Sajag Live mode in a realistic physical environment: **playing a call on a laptop or secondary speaker while Sajag listens on a smartphone or browser microphone.**

> [!IMPORTANT]
> **Human verification step:** Automated tests use direct PCM streaming over WebSocket. Acoustic speaker-to-mic transmission introduces room acoustics, ambient noise, and microphone digital signal processing (DSP). This manual test measures real-world efficacy across hardware devices.

---

## 1. Test Setup & Equipment

1. **Device A (Call Playback):**
   - Laptop, tablet, or secondary phone.
   - Volume: Set to typical speakerphone conversational level (~65–70 dB SPL at 30 cm).
   - Audio files: Sample clips from `data/corpus/audio/clean/` (e.g., `da_hi_001.wav`, `bk_en_001.wav`, `holdout_legit_ba_en_001.wav`).
2. **Device B (Sajag Live Listener):**
   - Target smartphone (Android Chrome, iOS Safari) or laptop.
   - Browser: Chrome, Safari, or Firefox with microphone permissions allowed.
   - Placement: Positioned 10–25 cm away from Device A's speaker, simulating a phone lying on a desk next to a speakerphone call.
   - URL: `http://<your-local-ip>:3000/live` (or deployed staging URL).

---

## 2. Testing the 3 Microphone DSP Configurations

On Device B, navigate to `/dev` to switch microphone constraint presets before each test batch:

| Preset Name | ID | Constraints Applied | Target Acoustic Environment |
| :--- | :--- | :--- | :--- |
| **Clean Second-Device (Default)** | `clean` | `echoCancellation: false`<br>`noiseSuppression: false`<br>`autoGainControl: true` | **Recommended:** Preserves caller voice dynamics without echo cancellation clipping when audio originates externally. |
| **Raw Unprocessed** | `raw` | `echoCancellation: false`<br>`noiseSuppression: false`<br>`autoGainControl: false` | Direct hardware capture. Best for high-fidelity external mics; may suffer on quiet phone mics. |
| **Aggressive Processing** | `processed` | `echoCancellation: true`<br>`noiseSuppression: true`<br>`autoGainControl: true` | Standard telephony mode. May occasionally suppress or muffle external speaker audio due to noise gating. |

---

## 3. Step-by-Step Test Procedure

For each test run:
1. **Configure Mic Preset:** On Device B, visit `/dev` and select the active preset (`clean`, `raw`, or `processed`).
2. **Navigate to Live:** Click **"Go to Live Mode"** or navigate to `/live`.
3. **Select Language:** Choose the language corresponding to the test clip (e.g. `hi-IN` for Hindi, `en-IN` for English).
4. **Start Listening:** Click the large **"Start Live Listening"** button on Device B. Verify that the "Listening..." indicator appears.
5. **Play Audio Clip:** Immediately start playback of the WAV clip on Device A.
6. **Observe & Record:**
   - Does the speech wave pulse when the caller speaks?
   - Note the elapsed seconds when the first transcript appears.
   - Note when the risk level changes to `suspicious` and `likely_scam`.
   - Did the verdict rubber stamp land when the threat was detected?
7. **Stop Call:** Once playback finishes, click **"Stop Call"** and record the results in the table below.

---

## 4. Manual Results Table Template

Fill in this template with your real-world test observations:

| Run # | Device & OS | Browser | Mic Preset | Clip ID / Label | Language | Detected Level | Time to Detect (s) | Observations (Audio clipping, delay, noise) |
| :---: | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Pixel 8 (Android 14) | Chrome 129 | `clean` | `da_hi_001` (Digital Arrest) | `hi-IN` | `likely_scam` | | |
| **2** | Pixel 8 (Android 14) | Chrome 129 | `raw` | `da_hi_001` (Digital Arrest) | `hi-IN` | | | |
| **3** | Pixel 8 (Android 14) | Chrome 129 | `processed` | `da_hi_001` (Digital Arrest) | `hi-IN` | | | |
| **4** | iPhone 14 (iOS 17) | Safari 17 | `clean` | `bk_en_001` (Bank KYC) | `en-IN` | | | |
| **5** | iPhone 14 (iOS 17) | Safari 17 | `processed` | `bk_en_001` (Bank KYC) | `en-IN` | | | |
| **6** | MacBook Air (macOS) | Chrome 129 | `clean` | `holdout_legit_ba_en_001` (Legit) | `en-IN` | `safe` | — | Verified 0 false positives |
| **7** | | | | | | | | |
| **8** | | | | | | | | |

---

## 5. Verification Checklist

- [ ] "Clean Second-Device" (`clean`) tested on at least one Android and one iOS device.
- [ ] No false positive escalation on legitimate bank/police advisories (`holdout_legit_ba_en_001` stays `safe`).
- [ ] The **"Warn my family"** WhatsApp share button opens WhatsApp with pre-filled warning text containing the scam type and app URL, with **zero** transcript content.
- [ ] Audio warning sound path verified (no unhandled JS exceptions when clip is missing).
