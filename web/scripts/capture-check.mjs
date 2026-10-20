import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENS_DIR = path.resolve(__dirname, "../../docs/screens");
const BASE_URL = "http://localhost:3000";

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
  let serverProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log("Starting Next.js server...");
    const nextBin = path.resolve(__dirname, "../node_modules/next/dist/bin/next");
    serverProcess = spawn(process.execPath, [nextBin, "start", "-p", "3000"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, ENABLE_DEV_UI: "true" },
      stdio: "pipe",
    });
    await waitForServer(BASE_URL, 35000);
    console.log("Server ready.");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    // Desktop
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/check`, { waitUntil: "networkidle" });
      await page.locator("#audio-upload-input").setInputFiles({
        name: "sample_recording.wav",
        mimeType: "audio/wav",
        buffer: Buffer.from("RIFFdummydata"),
      });
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: "Transcribe recording" }).click();
      await page.waitForSelector("text=Speech-to-Text verified", { timeout: 15000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENS_DIR, "check-result-desktop.png") });
      console.log("Captured check-result-desktop.png");
      await ctx.close();
    }

    // Mobile
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/check`, { waitUntil: "networkidle" });
      await page.locator("#audio-upload-input").setInputFiles({
        name: "sample_recording.wav",
        mimeType: "audio/wav",
        buffer: Buffer.from("RIFFdummydata"),
      });
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: "Transcribe recording" }).click();
      await page.waitForSelector("text=Speech-to-Text verified", { timeout: 15000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENS_DIR, "check-result-mobile.png"), fullPage: true });
      console.log("Captured check-result-mobile.png (fullPage)");
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
