import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const M5_SCREENS_DIR = path.resolve(__dirname, "../../docs/screens/m5");

if (!fs.existsSync(M5_SCREENS_DIR)) {
  fs.mkdirSync(M5_SCREENS_DIR, { recursive: true });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) {
            resolve();
          } else {
            setTimeout(check, 300);
          }
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url}`));
          } else {
            setTimeout(check, 300);
          }
        });
    };
    check();
  });
}

async function isServerRunning(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 304);
      })
      .on("error", () => resolve(false));
  });
}

async function main() {
  console.log("=== Sajag Milestone M5 Playwright Screenshot Capture ===");
  console.log(`Target Directory: ${M5_SCREENS_DIR}`);

  let serverProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`Starting Next.js server on port ${PORT}...`);
    const nextBin = path.resolve(__dirname, "../node_modules/next/dist/bin/next");
    serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
    });

    await waitForServer(BASE_URL, 35000);
    console.log(`Next.js server is ready at ${BASE_URL}`);
  } else {
    console.log(`Next.js server is already running at ${BASE_URL}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const desktopVp = { width: 1440, height: 900 };

    // 1. Part 2 Listen Button screenshot
    console.log("\n1. Capturing Listen button state on /live?mock=scam...");
    const ctx = await browser.newContext({ viewport: desktopVp });
    const page = await ctx.newPage();

    // Mock Audio in browser to track play requests without requiring audio device
    await page.addInitScript(() => {
      window.__playedAudioSources = [];
      const origAudio = window.Audio;
      window.Audio = class MockAudio {
        constructor(src) {
          this.src = src;
          this.currentTime = 0;
          this.paused = true;
        }
        play() {
          this.paused = false;
          window.__playedAudioSources.push(this.src);
          return Promise.resolve();
        }
        pause() {
          this.paused = true;
        }
      };
    });

    await page.goto(`${BASE_URL}/live?mock=scam`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const listenBtn = page.locator("#listen-warning-btn");
    await listenBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("Found #listen-warning-btn on ResultCard");

    // Capture screenshot of result card with Listen button
    const resultCard = page.locator('[data-testid="result-card"]');
    await resultCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const outPath = path.join(M5_SCREENS_DIR, "listen_button_mocked.png");
    await resultCard.screenshot({ path: outPath });
    console.log(`Captured: listen_button_mocked.png [mocked scam ResultCard with Listen button]`);

    // Click Listen button to test audio invocation
    await listenBtn.click();
    await page.waitForTimeout(300);

    const playedSrcs = await page.evaluate(() => window.__playedAudioSources);
    console.log(`Played audio sources on Listen click: ${JSON.stringify(playedSrcs)}`);
    if (!playedSrcs.some((s) => s.includes("explain_digital_arrest.mp3"))) {
      throw new Error(`Expected explain_digital_arrest.mp3 in played audio, got: ${JSON.stringify(playedSrcs)}`);
    }
    console.log("[PASS] Listen button triggered /audio/warnings/hi-IN/explain_digital_arrest.mp3");

    await ctx.close();
    console.log("\nPart 2 Playwright verification completed successfully!");
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
