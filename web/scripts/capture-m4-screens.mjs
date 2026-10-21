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
const M4_SCREENS_DIR = path.resolve(__dirname, "../../docs/screens/m4");

if (!fs.existsSync(M4_SCREENS_DIR)) {
  fs.mkdirSync(M4_SCREENS_DIR, { recursive: true });
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
  console.log("=== Sajag Milestone M4 Playwright Screenshot Capture ===");
  console.log(`Target Directory: ${M4_SCREENS_DIR}`);

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
    const mobile360Vp = { width: 360, height: 800 };

    const shots = [
      { name: "live-idle.png", path: "/live", vp: desktopVp },
      { name: "live-listening.png", path: "/live?mock=listening", vp: desktopVp },
      { name: "live-suspicious.png", path: "/live?mock=suspicious", vp: desktopVp },
      { name: "live-likely-scam-stamp.png", path: "/live?mock=scam", vp: desktopVp },
      { name: "live-error.png", path: "/live?mock=error", vp: desktopVp },
      { name: "live-mobile-360px.png", path: "/live?mock=scam", vp: mobile360Vp, isMobile: true },
    ];

    for (const s of shots) {
      const ctx = await browser.newContext({
        viewport: s.vp,
        isMobile: !!s.isMobile,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}${s.path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const outPath = path.join(M4_SCREENS_DIR, s.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Captured: ${s.name} (${s.vp.width}x${s.vp.height})`);
      await ctx.close();
    }

    console.log("\nAll M4 evidence screenshots successfully captured!");
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
