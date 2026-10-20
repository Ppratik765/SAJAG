import { chromium } from "@playwright/test";
import { spawn, execSync } from "child_process";
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
      mobile: { width: 390, height: 844 },
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
          isMobile: vpName === "mobile",
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
    console.log("\n3. Capturing headline across all 11 languages (desktop & mobile)...");
    const languages = [
      { code: "en", name: "English" },
      { code: "hi", name: "हिन्दी" },
      { code: "hinglish", name: "Hinglish" },
      { code: "ta", name: "தமிழ்" },
      { code: "te", name: "తెలుగు" },
      { code: "bn", name: "বাংলা" },
      { code: "gu", name: "ગુજરાતી" },
      { code: "mr", name: "मराठी" },
      { code: "kn", name: "ಕನ್ನಡ" },
      { code: "ml", name: "മലയാളം" },
      { code: "pa", name: "ਪੰਜਾਬੀ" },
    ];

    // 3a. Desktop 1440x900 verification across all 11 languages
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      let initialButtonsTop = null;
      let initialSheetTop = null;

      for (const lang of languages) {
        const btn = page.getByRole("button", { name: `View headline in ${lang.name}` });
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(300);

          const metrics = await page.evaluate(() => {
            const headlineBox = document.querySelector(".hero-cycling-headline-container")?.getBoundingClientRect();
            const btnEl = document.querySelector(".btn-stamp");
            const buttonsBox = btnEl?.parentElement?.getBoundingClientRect();
            const sheetBox = document.querySelector(".paper-sheet")?.getBoundingClientRect();
            return {
              headlineHeight: headlineBox ? Math.round(headlineBox.height) : 0,
              buttonsTop: buttonsBox ? Math.round(buttonsBox.top) : 0,
              sheetTop: sheetBox ? Math.round(sheetBox.top) : 0,
            };
          });

          if (initialButtonsTop === null) {
            initialButtonsTop = metrics.buttonsTop;
            initialSheetTop = metrics.sheetTop;
          } else {
            if (metrics.buttonsTop !== initialButtonsTop || metrics.sheetTop !== initialSheetTop) {
              console.warn(`[LAYOUT SHIFT DESKTOP] ${lang.code}: buttonsTop ${metrics.buttonsTop} vs ${initialButtonsTop}, sheetTop ${metrics.sheetTop} vs ${initialSheetTop}`);
            }
          }

          const filename = `headline-lang-${lang.code}-desktop.png`;
          await page.screenshot({
            path: path.join(MOTION_DIR, filename),
            clip: { x: 0, y: 50, width: 1440, height: 420 },
          });

          // Also save traditional names for en, hi, ta
          if (lang.code === "en" || lang.code === "hi" || lang.code === "ta") {
            await page.screenshot({
              path: path.join(MOTION_DIR, `headline-lang-${lang.code}.png`),
              clip: { x: 0, y: 50, width: 1440, height: 420 },
            });
          }
          console.log(`Captured desktop: ${filename} (h: ${metrics.headlineHeight}px, btnTop: ${metrics.buttonsTop}px)`);
        }
      }
      await ctx.close();
    }

    // 3b. Mobile 390x844 verification across all 11 languages
    {
      const ctx = await browser.newContext({
        viewport: viewports.mobile,
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      let initialButtonsTop = null;
      let initialSheetTop = null;

      for (const lang of languages) {
        const btn = page.getByRole("button", { name: `View headline in ${lang.name}` });
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(300);

          const metrics = await page.evaluate(() => {
            const headlineBox = document.querySelector(".hero-cycling-headline-container")?.getBoundingClientRect();
            const btnEl = document.querySelector(".btn-stamp");
            const buttonsBox = btnEl?.parentElement?.getBoundingClientRect();
            const sheetBox = document.querySelector(".paper-sheet")?.getBoundingClientRect();
            return {
              headlineHeight: headlineBox ? Math.round(headlineBox.height) : 0,
              buttonsTop: buttonsBox ? Math.round(buttonsBox.top) : 0,
              sheetTop: sheetBox ? Math.round(sheetBox.top) : 0,
            };
          });

          if (initialButtonsTop === null) {
            initialButtonsTop = metrics.buttonsTop;
            initialSheetTop = metrics.sheetTop;
          } else {
            if (metrics.buttonsTop !== initialButtonsTop || metrics.sheetTop !== initialSheetTop) {
              console.warn(`[LAYOUT SHIFT MOBILE] ${lang.code}: buttonsTop ${metrics.buttonsTop} vs ${initialButtonsTop}, sheetTop ${metrics.sheetTop} vs ${initialSheetTop}`);
            }
          }

          const filename = `headline-lang-${lang.code}-mobile.png`;
          await page.screenshot({
            path: path.join(MOTION_DIR, filename),
            clip: { x: 0, y: 50, width: 390, height: 500 },
          });
          console.log(`Captured mobile: ${filename} (h: ${metrics.headlineHeight}px, btnTop: ${metrics.buttonsTop}px, sheetTop: ${metrics.sheetTop}px)`);
        }
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

    // 4e. Check recording page processing and result (desktop & mobile)
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/check`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const fileInput = page.locator("#audio-upload-input");
      await fileInput.setInputFiles({
        name: "sample_recording.wav",
        mimeType: "audio/wav",
        buffer: Buffer.from("RIFFdummydata"),
      });
      await page.waitForTimeout(200);

      const transcribeBtn = page.getByRole("button", { name: "Transcribe recording" });
      await transcribeBtn.click();

      // Capture during processing (showing living ruler progress track)
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENS_DIR, "check-processing-desktop.png"),
      });
      console.log("Captured: check-processing-desktop.png");

      // Wait for complete
      await page.waitForSelector("text=Speech-to-Text verified", { timeout: 15000 }).catch(() => page.waitForTimeout(4500));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENS_DIR, "check-result-desktop.png"),
      });
      console.log("Captured: check-result-desktop.png");
      await ctx.close();
    }

    {
      const ctx = await browser.newContext({
        viewport: viewports.mobile,
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/check`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const fileInput = page.locator("#audio-upload-input");
      await fileInput.setInputFiles({
        name: "sample_recording.wav",
        mimeType: "audio/wav",
        buffer: Buffer.from("RIFFdummydata"),
      });
      await page.waitForTimeout(200);

      const transcribeBtn = page.getByRole("button", { name: "Transcribe recording" });
      await transcribeBtn.click();
      await page.waitForSelector("text=Speech-to-Text verified", { timeout: 15000 }).catch(() => page.waitForTimeout(4500));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENS_DIR, "check-result-mobile.png"),
      });
      console.log("Captured: check-result-mobile.png");
      await ctx.close();
    }

    // 5. Desktop Hero WebM Video Recording (~12s, 1440x900)
    console.log("\n5. Recording desktop landing hero video (~12s, 1440x900)...");
    {
      const videoCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        recordVideo: {
          dir: MOTION_DIR,
          size: { width: 1440, height: 900 },
        },
      });
      const page = await videoCtx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      // Play through hero playback (~12 seconds)
      await page.waitForTimeout(12000);

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
        console.log(`Saved desktop video: landing-hero.webm (${sizeMb} MB)`);
      }
    }

    // 6. Mobile Hero WebM Video Recording (~12s, 390x844)
    console.log("\n6. Recording mobile landing hero video (~12s, 390x844)...");
    {
      const videoCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        recordVideo: {
          dir: MOTION_DIR,
          size: { width: 390, height: 844 },
        },
      });
      const page = await videoCtx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      // Play through hero playback (~12 seconds)
      await page.waitForTimeout(12000);

      const video = page.video();
      await page.close();
      await videoCtx.close();

      if (video) {
        const rawVideoPath = await video.path();
        const destPath = path.join(MOTION_DIR, "landing-hero-mobile.webm");
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        fs.renameSync(rawVideoPath, destPath);
        const stats = fs.statSync(destPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Saved mobile video: landing-hero-mobile.webm (${sizeMb} MB)`);
      }
    }

    // 7. First Viewport captures for evidence verification
    console.log("\n7. Capturing first-viewport evidence frames...");
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(MOTION_DIR, "hero-desktop-1440x900-viewport.png"), fullPage: false });
      console.log("Captured: hero-desktop-1440x900-viewport.png");
      await ctx.close();
    }

    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const heroLayout = await page.evaluate(() => {
        const headline = document.querySelector(".hero-cycling-headline")?.getBoundingClientRect();
        const pills = document.querySelector(".hero-cycling-headline + div")?.getBoundingClientRect();
        const subline = document.querySelector("p")?.getBoundingClientRect();
        const buttons = document.querySelector(".btn-stamp")?.getBoundingClientRect();
        const levelStrip = document.querySelector('[role="progressbar"]')?.getBoundingClientRect();
        const sheet = document.querySelector(".paper-sheet")?.getBoundingClientRect();
        const sublineEl = document.querySelector("p");
        const btnEl = document.querySelector(".btn-stamp");
        const headlineEl = document.querySelector(".hero-cycling-headline");
        const matchedRules = [];
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.selectorText && sublineEl?.matches(rule.selectorText)) {
                matchedRules.push({ selector: rule.selectorText, css: rule.cssText });
              }
            }
          } catch {
            // cross-origin stylesheets may throw
          }
        }
        return {
          headline: headline ? { top: Math.round(headline.top), height: Math.round(headline.height), bottom: Math.round(headline.bottom), fontSize: headlineEl ? window.getComputedStyle(headlineEl).fontSize : null } : null,
          pills: pills ? { top: Math.round(pills.top), height: Math.round(pills.height), bottom: Math.round(pills.bottom) } : null,
          subline: subline ? { top: Math.round(subline.top), height: Math.round(subline.height), bottom: Math.round(subline.bottom), fontSize: sublineEl ? window.getComputedStyle(sublineEl).fontSize : null, text: sublineEl?.innerText, matchedRules } : null,
          buttons: buttons ? { top: Math.round(buttons.top), height: Math.round(buttons.height), bottom: Math.round(buttons.bottom), fontSize: btnEl ? window.getComputedStyle(btnEl).fontSize : null } : null,
          levelStrip: levelStrip ? { top: Math.round(levelStrip.top), height: Math.round(levelStrip.height), bottom: Math.round(levelStrip.bottom) } : null,
          sheet: sheet ? { top: Math.round(sheet.top), height: Math.round(sheet.height), bottom: Math.round(sheet.bottom) } : null,
        };
      });
      console.log("Mobile Hero layout bounding boxes:", JSON.stringify(heroLayout, null, 2));
      await page.screenshot({ path: path.join(MOTION_DIR, "hero-mobile-390x844-viewport.png"), fullPage: false });
      console.log("Captured: hero-mobile-390x844-viewport.png");
      await ctx.close();
    }

    // 8. Header below 1100px collapse verification
    {
      const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(MOTION_DIR, "header-collapsed-1024.png"), clip: { x: 0, y: 0, width: 1024, height: 75 } });
      console.log("Captured: header-collapsed-1024.png");
      await ctx.close();
    }

    // 9. Generate ffmpeg contact sheets from the videos
    console.log("\n9. Generating contact sheets from videos using ffmpeg...");
    try {
      execSync(
        `ffmpeg -y -i "${path.join(MOTION_DIR, "landing-hero.webm")}" -vf "fps=1,scale=480:-1,tile=4x3" -frames:v 1 "${path.join(MOTION_DIR, "landing-hero-contact-sheet.png")}"`,
        { stdio: "pipe" }
      );
      console.log("Generated: landing-hero-contact-sheet.png");
      execSync(
        `ffmpeg -y -i "${path.join(MOTION_DIR, "landing-hero-mobile.webm")}" -vf "fps=1,scale=240:-1,tile=4x3" -frames:v 1 "${path.join(MOTION_DIR, "landing-hero-mobile-contact-sheet.png")}"`,
        { stdio: "pipe" }
      );
      console.log("Generated: landing-hero-mobile-contact-sheet.png");
    } catch (e) {
      console.warn("Ffmpeg contact sheet generation warning:", e.message);
    }

    console.log("\nAll M0.6b motion frames, videos & contact sheets successfully captured!");
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
