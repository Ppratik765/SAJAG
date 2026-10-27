import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const M7_SCREENS_DIR = path.resolve(__dirname, "../../docs/screens/m7");

if (!fs.existsSync(M7_SCREENS_DIR)) {
  fs.mkdirSync(M7_SCREENS_DIR, { recursive: true });
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
  console.log("=== Sajag Milestone M7 Screenshot & Accessibility Capture ===");
  console.log(`Target Directory: ${M7_SCREENS_DIR}`);

  let serverProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log("Starting Next.js production server (npm run start)...");
    serverProcess = spawn("npm.cmd", ["run", "start"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
      shell: true,
    });

    serverProcess.stdout.on("data", (d) => process.stdout.write(d.toString()));
    serverProcess.stderr.on("data", (d) => process.stderr.write(d.toString()));

    console.log("Waiting for server to become responsive on port 3000...");
    await waitForServer(BASE_URL);
    console.log("Server is ready!");
  } else {
    console.log("Using existing web server on port 3000.");
  }

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile_360px", width: 360, height: 800 },
  ];

  const pages = [
    { name: "01_home", path: "/" },
    { name: "02_live", path: "/live?mock=scam" },
    { name: "03_parent", path: "/parent?mock=scam" },
    { name: "04_check", path: "/check" },
    { name: "05_paste", path: "/paste" },
    { name: "06_demo", path: "/demo" },
    { name: "07_accuracy", path: "/accuracy" },
    { name: "08_about", path: "/about" },
    { name: "09_report", path: "/report?level=scam&score=16&type=digital_arrest&lang=hi-IN" },
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n--- Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });

      for (const p of pages) {
        const page = await ctx.newPage();
        const url = `${BASE_URL}${p.path}`;
        console.log(`Navigating to ${p.name}: ${url}`);

        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);

        // Verify no horizontal overflow at 360px
        if (vp.width === 360) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          if (scrollWidth > 360) {
            console.warn(`[A11y Warning] Page ${p.name} has horizontal overflow at 360px: scrollWidth=${scrollWidth}px`);
          } else {
            console.log(`[A11y Check Passed] Page ${p.name} fits perfectly at 360px (scrollWidth=${scrollWidth}px)`);
          }
        }

        const outPath = path.join(M7_SCREENS_DIR, `${p.name}_${vp.name}.png`);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`Saved: ${outPath}`);
        await page.close();
      }

      await ctx.close();
    }

    console.log("\nAll M7 screenshots captured successfully!");
  } finally {
    await browser.close();
    if (serverProcess) {
      console.log("Shutting down web server...");
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
