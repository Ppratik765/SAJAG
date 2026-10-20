import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENS_DIR = path.resolve(__dirname, "../../docs/screens");

if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // Desktop 1440x900
  const deskContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const deskPage = await deskContext.newPage();
  await deskPage.goto("http://localhost:3000/accuracy", { waitUntil: "networkidle" });
  await deskPage.waitForTimeout(1000);
  const deskPath = path.join(SCREENS_DIR, "accuracy-desktop.png");
  await deskPage.screenshot({ path: deskPath, fullPage: true });
  console.log(`Saved desktop screenshot: ${deskPath}`);
  await deskContext.close();

  // Mobile 390x844
  const mobContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const mobPage = await mobContext.newPage();
  await mobPage.goto("http://localhost:3000/accuracy", { waitUntil: "networkidle" });
  await mobPage.waitForTimeout(1000);
  const mobPath = path.join(SCREENS_DIR, "accuracy-mobile.png");
  await mobPage.screenshot({ path: mobPath, fullPage: true });
  console.log(`Saved mobile screenshot: ${mobPath}`);
  await mobContext.close();

  await browser.close();
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
