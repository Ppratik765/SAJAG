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
const MOTION_DIR = path.resolve(SCREENS_DIR, "motion");

// Ensure directories exist
if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}
if (!fs.existsSync(MOTION_DIR)) {
  fs.mkdirSync(MOTION_DIR, { recursive: true });
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
  console.log("=== Sajag M0.6 Screenshot & Motion Automation ===");
  console.log(`Screens Directory: ${SCREENS_DIR}`);
  console.log(`Motion Directory: ${MOTION_DIR}`);

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
      { name: "spot", path: "/spot" },
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

    // 1. 320px no-horizontal-scroll verification
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

    // 2. Filmstrip frames of landing hero at t = 0.4, 1.2, 2.5, 4, 6, 8, 10 s
    console.log("\n2. Capturing hero filmstrip frames (desktop & mobile, light & dark)...");
    const filmstripTimes = [
      { label: "0.4s", ms: 400 },
      { label: "1.2s", ms: 1200 },
      { label: "2.5s", ms: 2500 },
      { label: "4.0s", ms: 4000 },
      { label: "6.0s", ms: 6000 },
      { label: "8.0s", ms: 8000 },
      { label: "10.0s", ms: 10000 },
    ];

    for (const vpName of ["desktop", "mobile"]) {
      for (const theme of ["light", "dark"]) {
        const ctx = await browser.newContext({
          viewport: viewports[vpName],
          colorScheme: theme,
        });
        const page = await ctx.newPage();
        await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });

        await page.evaluate((t) => {
          localStorage.setItem("sajag_theme", t);
          document.documentElement.setAttribute("data-theme", t);
        }, theme);

        await page.evaluate(() => document.fonts.ready);

        // Capture each time stamp sequentially
        let elapsed = 0;
        for (const tPoint of filmstripTimes) {
          const waitTime = tPoint.ms - elapsed;
          if (waitTime > 0) {
            await page.waitForTimeout(waitTime);
            elapsed = tPoint.ms;
          }
          const filename = `hero-filmstrip-${vpName}-${theme}-t${tPoint.label}.png`;
          const filePath = path.join(MOTION_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`Captured: ${filename}`);
        }
        await ctx.close();
      }
    }

    // 3. Headline at three different languages
    console.log("\n3. Capturing headline at three different languages...");
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      // Language 1: English
      const enBtn = page.getByRole("button", { name: "View headline in English" });
      if (await enBtn.isVisible()) {
        await enBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(MOTION_DIR, "headline-lang-en.png"),
          clip: { x: 0, y: 50, width: 1440, height: 350 },
        });
        console.log("Captured: headline-lang-en.png");
      }

      // Language 2: Hindi
      const hiBtn = page.getByRole("button", { name: "View headline in हिन्दी" });
      if (await hiBtn.isVisible()) {
        await hiBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(MOTION_DIR, "headline-lang-hi.png"),
          clip: { x: 0, y: 50, width: 1440, height: 350 },
        });
        console.log("Captured: headline-lang-hi.png");
      }

      // Language 3: Tamil
      const taBtn = page.getByRole("button", { name: "View headline in தமிழ்" });
      if (await taBtn.isVisible()) {
        await taBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(MOTION_DIR, "headline-lang-ta.png"),
          clip: { x: 0, y: 50, width: 1440, height: 350 },
        });
        console.log("Captured: headline-lang-ta.png");
      }
      await ctx.close();
    }

    // 4. Feature frames: scam-index row opening, sticky how it works, Spot game
    console.log("\n4. Capturing feature frames (scam-index, how-it-works, spot-game, reduced-motion)...");

    // 4a. Scam-index row opened
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      const panel = page.locator("#scam-panel-digital_arrest");
      await panel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await panel.screenshot({
        path: path.join(MOTION_DIR, "scam-index-opened.png"),
      });
      console.log("Captured: scam-index-opened.png");
      await ctx.close();
    }

    // 4b. Sticky "How it Works" at three scroll positions
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

      // Scroll to Step 1
      await page.evaluate(() => window.scrollTo(0, 950));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(MOTION_DIR, "how-it-works-step1.png"),
        clip: { x: 0, y: 0, width: 1440, height: 750 },
      });
      console.log("Captured: how-it-works-step1.png");

      // Scroll to Step 2
      await page.evaluate(() => window.scrollTo(0, 1350));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(MOTION_DIR, "how-it-works-step2.png"),
        clip: { x: 0, y: 0, width: 1440, height: 750 },
      });
      console.log("Captured: how-it-works-step2.png");

      // Scroll to Step 3
      await page.evaluate(() => window.scrollTo(0, 1750));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(MOTION_DIR, "how-it-works-step3.png"),
        clip: { x: 0, y: 0, width: 1440, height: 750 },
      });
      console.log("Captured: how-it-works-step3.png");
      await ctx.close();
    }

    // 4c. Spot game before and after Check
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/spot`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      // Click 3 words to mark them
      const words = page.locator(".paper-sheet span.cursor-pointer");
      const count = await words.count();
      if (count >= 5) {
        await words.nth(1).click();
        await words.nth(3).click();
        await words.nth(4).click();
      }

      await page.screenshot({
        path: path.join(MOTION_DIR, "spot-game-before-check.png"),
        fullPage: false,
      });
      console.log("Captured: spot-game-before-check.png");

      // Press Check
      const checkBtn = page.getByRole("button", { name: /Check my marks|निशान जाँचें/i });
      if (await checkBtn.isVisible()) {
        await checkBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(MOTION_DIR, "spot-game-after-check.png"),
          fullPage: false,
        });
        console.log("Captured: spot-game-after-check.png");
      }
      await ctx.close();
    }

    // 4d. Reduced motion final state
    {
      const ctx = await browser.newContext({
        viewport: viewports.desktop,
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(MOTION_DIR, "landing-reduced-motion-final.png"),
        fullPage: false,
      });
      console.log("Captured: landing-reduced-motion-final.png");
      await ctx.close();
    }

    // 5. Hero WebM Video Recording (~12 seconds, < 5MB)
    console.log("\n5. Recording landing hero video (~12s) to docs/screens/motion/landing-hero.webm...");
    {
      const videoCtx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: {
          dir: MOTION_DIR,
          size: { width: 1280, height: 800 },
        },
      });
      const page = await videoCtx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      // Let the hero play through its ~9s timeline + controls interaction
      await page.waitForTimeout(11500);

      // Close page to flush video
      const video = page.video();
      await page.close();
      await videoCtx.close();

      if (video) {
        const rawVideoPath = await video.path();
        const destPath = path.join(MOTION_DIR, "landing-hero.webm");
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        fs.renameSync(rawVideoPath, destPath);
        const stats = fs.statSync(destPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Saved video: landing-hero.webm (${sizeMb} MB)`);
      }
    }

    console.log("\nAll M0.6 motion frames & video successfully captured!");
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
