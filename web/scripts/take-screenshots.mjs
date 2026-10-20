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
const SCREENS_DIR = path.resolve(__dirname, "../../docs/screens");

// Ensure docs/screens exists
if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
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
  console.log("=== Sajag Screenshot Automation ===");
  console.log(`Output Directory: ${SCREENS_DIR}`);

  let serverProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`Starting Next.js server on port ${PORT}...`);
    const nextBin = path.resolve(__dirname, "../node_modules/next/dist/bin/next");
    serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, ENABLE_DEV_UI: "true" },
      stdio: "pipe",
    });

    await waitForServer(BASE_URL, 35000);
    console.log(`Next.js server is ready at ${BASE_URL}`);
  } else {
    console.log(`Next.js server is already running at ${BASE_URL}`);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const viewports = {
      desktop: { width: 1440, height: 900 },
      mobile: { width: 360, height: 800 },
      compact: { width: 320, height: 600 }, // for checking 320px horizontal overflow
    };

    const routes = [
      { name: "landing", path: "/" },
      { name: "dev-ui", path: "/dev/ui" },
      { name: "live", path: "/live" },
      { name: "check", path: "/check" },
      { name: "paste", path: "/paste" },
      { name: "parent", path: "/parent" },
      { name: "demo", path: "/demo" },
      { name: "accuracy", path: "/accuracy" },
      { name: "about", path: "/about" },
      { name: "report", path: "/report?type=digital_arrest&level=scam&lang=hi" },
    ];

    console.log("\n1. Testing 320px horizontal overflow on all routes...");
    for (const route of routes) {
      const ctx = await browser.newContext({ viewport: viewports.compact });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        console.warn(`[WARN] Horizontal overflow detected at 320px on ${route.path}!`);
      } else {
        console.log(`[PASS] 320px width clean on ${route.name}`);
      }
      await ctx.close();
    }

    console.log("\n2. Capturing desktop & mobile screenshots (Light & Dark themes)...");

    for (const route of routes) {
      for (const vpName of ["desktop", "mobile"]) {
        for (const theme of ["light", "dark"]) {
          const ctx = await browser.newContext({
            viewport: viewports[vpName],
            colorScheme: theme,
          });
          const page = await ctx.newPage();

          await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });

          // Ensure theme attribute is set
          await page.evaluate((t) => {
            localStorage.setItem("sajag_theme", t);
            document.documentElement.setAttribute("data-theme", t);
            if (t === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }, theme);

          // Wait for fonts & animations
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(400);

          const filename = `${route.name}-${vpName}-${theme}.png`;
          const filePath = path.join(SCREENS_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: true });
          console.log(`Captured: ${filename}`);

          await ctx.close();
        }
      }
    }

    // 3. Capturing prefers-reduced-motion screenshot
    console.log("\n3. Capturing reduced-motion variant...");
    {
      const ctx = await browser.newContext({
        viewport: viewports.desktop,
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const filePath = path.join(SCREENS_DIR, "landing-desktop-reduced-motion.png");
      await page.screenshot({ path: filePath, fullPage: false });
      console.log("Captured: landing-desktop-reduced-motion.png");
      await ctx.close();
    }

    console.log("\nAll screenshots captured successfully in docs/screens/!");
  } finally {
    await browser.close();
    if (serverProcess) {
      console.log("Stopping Next.js server...");
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
