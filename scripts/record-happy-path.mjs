#!/usr/bin/env node
/**
 * Records a short APJ-20 happy-path demo (browse → login → checkout → admin).
 * Usage: BASE_URL=http://127.0.0.1:3010 node scripts/record-happy-path.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, existsSync, writeFileSync, cpSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const toolsDir = join(root, ".cursor/skills/verify-aussie-eats/.tools");
const outDir = join("/opt/cursor/artifacts", "apj-20-happy-path");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3010";
const browserExecutablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path));

function ensurePlaywright() {
  try {
    return createRequire(join(toolsDir, "package.json"))("playwright");
  } catch {
    throw new Error("Playwright missing — run a verify drive first to install .tools/");
  }
}

mkdirSync(outDir, { recursive: true });
const videoDir = join(outDir, "raw");
mkdirSync(videoDir, { recursive: true });

const { chromium } = ensurePlaywright();
const browser = await chromium.launch({
  headless: true,
  ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

async function pause(ms = 700) {
  await page.waitForTimeout(ms);
}

try {
  // Browse
  await page.goto(baseUrl + "/restaurants", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Restaurants" }).waitFor();
  await pause(900);

  // Login
  await page.goto(baseUrl + "/login?next=/restaurants/harbour-burger-co", {
    waitUntil: "networkidle",
  });
  await page.locator('input[name="email"]').fill("demo@aussieeats.local");
  await page.locator('input[name="password"]').fill("demo1234");
  await pause(400);
  await Promise.all([
    page.waitForURL(/\/restaurants\/harbour-burger-co/),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  await pause(700);

  // Add + checkout
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByText(/Added ·/i).first().waitFor({ timeout: 5000 });
  await pause(600);
  await page.goto(baseUrl + "/cart", { waitUntil: "networkidle" });
  await pause(500);
  await page.getByRole("link", { name: /^Checkout$/i }).click();
  await page.waitForURL(/\/checkout/);
  await page.waitForLoadState("networkidle");
  await page.locator('input[value="card"]').check();
  await page.getByPlaceholder("4242 4242 4242 4242").fill("4242 4242 4242 4242");
  await page.getByPlaceholder("Taylor Smith").fill("Demo User");
  await page.locator('input[autocomplete="cc-exp"]').fill("12/30");
  await page.locator('input[autocomplete="cc-csc"]').fill("123");
  await pause(600);
  await Promise.all([
    page.waitForURL(/\/orders\/[^/]+/),
    page.getByRole("button", { name: /Pay & place order/i }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  await pause(1000);

  // Admin status
  await page.goto(baseUrl + "/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill("admin@aussieeats.local");
  await page.locator('input[name="password"]').fill("admin1234");
  await Promise.all([
    page.waitForURL(/\/admin\/?$/),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
  await page.goto(baseUrl + "/admin/orders", { waitUntil: "networkidle" });
  const pendingRow = page.locator("tr", { has: page.locator('[data-status="pending"]') }).first();
  await pendingRow.waitFor({ state: "visible", timeout: 15000 });
  await pause(500);
  const preparingBefore = await page.locator('[data-status="preparing"]').count();
  await pendingRow.getByRole("button", { name: /→ Preparing/i }).click();
  await page.waitForFunction(
    (before) => document.querySelectorAll('[data-status="preparing"]').length > before,
    preparingBefore,
    { timeout: 15000 },
  );
  await pause(900);

  // Admin menu edit
  await page.goto(baseUrl + "/admin/restaurants", { waitUntil: "networkidle" });
  const harbourRow = page.locator("tr", { hasText: "Harbour Burger Co" }).first();
  await harbourRow.getByRole("link", { name: "Menu" }).click();
  await page.waitForURL(/\/admin\/restaurants\/[^/]+\/menu/);
  await page.locator("section.panel ul li").first().getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit menu item" });
  await dialog.waitFor({ state: "visible" });
  const priceInput = dialog.locator('input[name="price"]');
  const current = Number(await priceInput.inputValue());
  await priceInput.fill((current + 0.25).toFixed(2));
  await pause(500);
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 15000 });
  await pause(1200);
} finally {
  await context.close();
  await browser.close();
}

const videos = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
if (!videos.length) {
  console.error("no video produced");
  process.exit(1);
}
const dest = join(outDir, "aussieeats-happy-path.webm");
cpSync(join(videoDir, videos[0]), dest);

// Optional mp4 via ffmpeg if available
const mp4 = join(outDir, "aussieeats-happy-path.mp4");
const ff = spawnSync(
  "ffmpeg",
  ["-y", "-i", dest, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", mp4],
  { stdio: "inherit" },
);
const summary = {
  baseUrl,
  webm: dest,
  mp4: ff.status === 0 && existsSync(mp4) ? mp4 : null,
  at: new Date().toISOString(),
};
writeFileSync(join(outDir, "demo.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
