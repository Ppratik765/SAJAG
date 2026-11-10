// Drives /test in a real Chromium against the dev server (BASE) and a FAKE /ws/live on :8000
// (scripts/fake_live_server.py). Screenshots are therefore "recorded run" and "live run against a fake server":
// they prove the UI logic, not Gnani accuracy. Usage: node scripts/capture-m8-livetest.mjs [outDir]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3113";
const OUT = process.argv[2] || "../docs/screens/m8";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 } });
await ctx.addInitScript(() => localStorage.setItem("sajag_locale", "en"));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// ---- Recorded run ----
await page.goto(`${BASE}/test`, { waitUntil: "networkidle" });
await page.getByTestId("speaker-btn").waitFor();
check("recorded badge visible", (await page.getByTestId("mode-badge").innerText()).startsWith("RECORDED RUN"));
check("synthetic badge visible", (await page.getByTestId("kind-badge").innerText()).includes("SYNTHETIC"));
check("transcript empty before play", (await page.getByTestId("hangup-banner").count()) === 0);
await page.screenshot({ path: `${OUT}/01_recorded_idle.png` });

await page.getByTestId("speaker-btn").click();
await page.waitForTimeout(5800);
check("line 1 NOT shown at 5.8 s (it had not arrived yet)", (await page.getByText("मनी लॉन्ड्रिंग").count()) === 0);
await page.getByTestId("suspicious-banner").waitFor({ timeout: 4000 });
check("suspicious banner appears around 6.3 s", true);
await page.screenshot({ path: `${OUT}/02_recorded_suspicious.png` });
await page.getByTestId("hangup-banner").waitFor({ timeout: 12000 });
const clockAtHangup = await page.getByTestId("clock").innerText();
check("HANG UP banner appears (clock " + clockAtHangup + ")", true);
await page.screenshot({ path: `${OUT}/03_recorded_hangup.png`, fullPage: true });
const timings = await page.getByTestId("timings").innerText();
check("timings list shows 14.1s for likely scam", timings.includes("14.1s"), timings.replace(/\n/g, " | "));
await page.waitForTimeout(8000);
check("scam stage reached with 21.3s", (await page.getByTestId("timings").innerText()).includes("21.3s"));

// ---- Live run against the fake server ----
await page.getByTestId("mode-live").click();
check("live mode label", (await page.getByTestId("mode-badge").innerText()).startsWith("LIVE"));
check("state reset on mode change", (await page.getByTestId("hangup-banner").count()) === 0);
await page.getByTestId("speaker-btn").click();
await page.getByTestId("hangup-banner").waitFor({ timeout: 30000 });
await page.screenshot({ path: `${OUT}/04_live_hangup_fake_server.png`, fullPage: true });
const liveTimings = await page.getByTestId("timings").innerText();
check("live timings present", /Likely scam: Appeared \d+\.\ds/.test(liveTimings), liveTimings.replace(/\n/g, " | "));

// ---- 360 px phone width ----
const phone = await browser.newContext({ viewport: { width: 360, height: 800 } });
await phone.addInitScript(() => localStorage.setItem("sajag_locale", "hi"));
const p2 = await phone.newPage();
await p2.goto(`${BASE}/test`, { waitUntil: "networkidle" });
await p2.getByTestId("speaker-btn").waitFor();
const overflow = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("no horizontal scroll at 360 px", overflow <= 0, `overflow=${overflow}`);
await p2.screenshot({ path: `${OUT}/05_mobile_360_hindi_idle.png`, fullPage: true });
await p2.getByTestId("speaker-btn").click();
await p2.getByTestId("hangup-banner").waitFor({ timeout: 25000 });
await p2.screenshot({ path: `${OUT}/06_mobile_360_hindi_hangup.png`, fullPage: true });
check("no horizontal scroll with banner", (await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);

// ---- Live server unreachable (caller stops the fake server before this phase with FAIL_PHASE=1) ----
if (process.env.FAIL_PHASE) {
  const p3 = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await p3.goto(`${BASE}/test`, { waitUntil: "networkidle" });
  await p3.getByTestId("mode-live").click();
  await p3.getByTestId("speaker-btn").click();
  await p3.getByTestId("live-note").waitFor({ timeout: 10000 });
  check("unreachable server shows a visible note", true, await p3.getByTestId("live-note").innerText());
  check("recorded mode still offered", (await p3.getByTestId("mode-recorded").count()) === 1);
  await p3.screenshot({ path: `${OUT}/07_live_unreachable.png` });
}

check("no uncaught page errors", errors.length === 0, errors.join(" ; "));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
