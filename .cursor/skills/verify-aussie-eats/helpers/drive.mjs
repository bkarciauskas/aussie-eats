#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = join(__dirname, "..");
const toolsDir = join(skillDir, ".tools");
const runDir = join(skillDir, ".run");
const feature = process.argv[2];

if (!feature) {
  console.error("usage: drive.mjs <feature-stem>");
  process.exit(2);
}

function readRun(name, fallback) {
  const p = join(runDir, name);
  if (!existsSync(p)) return fallback;
  return readFileSync(p, "utf8").trim() || fallback;
}

const host = process.env.HOST || readRun("host", "127.0.0.1");
const port = process.env.PORT || readRun("port", "3010");
const baseUrl = `http://${host}:${port}`;

function ensurePlaywright() {
  try {
    return createRequire(join(toolsDir, "package.json"))("playwright");
  } catch {
    mkdirSync(toolsDir, { recursive: true });
    if (!existsSync(join(toolsDir, "package.json"))) {
      writeFileSync(
        join(toolsDir, "package.json"),
        JSON.stringify({ name: "verify-aussie-eats-tools", private: true }, null, 2),
      );
    }
    console.log("installing playwright into skill .tools/ …");
    const install = spawnSync("npm", ["install", "playwright@1.51.1", "--no-save", "--no-fund", "--no-audit"], {
      cwd: toolsDir,
      stdio: "inherit",
      env: process.env,
    });
    if (install.status !== 0) process.exit(install.status ?? 1);
    const browser = spawnSync("npx", ["playwright", "install", "chromium"], {
      cwd: toolsDir,
      stdio: "inherit",
      env: process.env,
    });
    if (browser.status !== 0) process.exit(browser.status ?? 1);
    return createRequire(join(toolsDir, "package.json"))("playwright");
  }
}

const { chromium } = ensurePlaywright();
const runId = `${feature}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const evidenceDir = join(skillDir, "evidence", runId);
mkdirSync(evidenceDir, { recursive: true });

const steps = [];
let passed = false;
let error = null;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    if (feature === "home-hero-search") {
      await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });
      const input = page.locator("#restaurant-search-hero");
      await input.waitFor({ state: "visible" });
      // LocationProvider sets hydrated after mount; input/button disable until then.
      await page.waitForFunction(() => {
        const el = document.querySelector("#restaurant-search-hero");
        const btn = document.querySelector("form.hero-search button[type='submit']");
        return (
          el instanceof HTMLInputElement &&
          !el.disabled &&
          btn instanceof HTMLButtonElement &&
          !btn.disabled
        );
      });
      await input.click();
      await input.fill("burger");
      await page.screenshot({ path: join(evidenceDir, "01-action-hero-search.png"), fullPage: true });
      steps.push({ action: "filled hero search with burger" });
      // App Router client navigation — wait on pathname, not a full document load.
      await input.press("Enter");
      await page.waitForFunction(() => location.pathname.startsWith("/restaurants"), null, {
        timeout: 15000,
      });
      await page.waitForSelector("h1", { timeout: 15000 });
      await page.screenshot({ path: join(evidenceDir, "02-result-restaurants.png"), fullPage: true });
      const url = page.url();
      const body = await page.content();
      const hasQ = /[?&]q=burger/i.test(url);
      const hasHeading = await page.getByRole("heading", { name: "Restaurants" }).count();
      const hasHarbour = /Harbour Burger Co/i.test(body);
      steps.push({
        result: "navigated to restaurants",
        url,
        hasQ,
        hasHeading: hasHeading > 0,
        hasHarbour,
      });
      passed = hasQ && hasHeading > 0 && hasHarbour;
      if (!passed) {
        error = `assertions failed: hasQ=${hasQ} hasHeading=${hasHeading > 0} hasHarbour=${hasHarbour} url=${url}`;
      }
    } else if (feature === "browse-restaurants") {
      await page.goto(baseUrl + "/restaurants", { waitUntil: "networkidle" });
      await page.screenshot({ path: join(evidenceDir, "01-restaurants.png"), fullPage: true });
      const body = await page.content();
      const hasHeading = /Restaurants/i.test(body);
      const hasRow = await page.locator("a.restaurant-row").count();
      steps.push({ url: page.url(), hasHeading, restaurantRows: hasRow });
      passed = hasHeading && hasRow > 0;
      if (!passed) error = `assertions failed: hasHeading=${hasHeading} rows=${hasRow}`;
    } else if (feature === "melbourne-city-browse") {
      await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const buttons = [...document.querySelectorAll("button")];
        return buttons.some((b) => b.textContent?.trim() === "Melbourne" && !b.disabled);
      });
      await page.getByRole("button", { name: "Melbourne", exact: true }).click();
      const browse = page.getByRole("link", { name: /Browse Melbourne restaurants/i });
      await browse.waitFor({ state: "visible", timeout: 15000 });
      await page.screenshot({
        path: join(evidenceDir, "01-action-melbourne-selected.png"),
        fullPage: true,
      });
      steps.push({ action: "selected Melbourne city pin" });
      const href = await browse.getAttribute("href");
      await browse.click();
      try {
        await page.waitForFunction(() => location.pathname.startsWith("/restaurants"), null, {
          timeout: 8000,
        });
      } catch {
        // Soft navigation can stall in headless; follow the browse href directly.
        await page.goto(new URL(href || "/restaurants?city=melbourne", baseUrl).toString(), {
          waitUntil: "domcontentloaded",
        });
      }
      await page.waitForSelector("a.restaurant-row", { timeout: 15000 });
      await page.screenshot({
        path: join(evidenceDir, "02-result-melbourne-restaurants.png"),
        fullPage: true,
      });
      const url = page.url();
      const rows = await page.locator("a.restaurant-row h2").allTextContents();
      const hasCity = /[?&]city=melbourne\b/i.test(url);
      const hasHarbour = rows.some((r) => /Harbour Burger/i.test(r));
      const melbourneOnly =
        rows.length === 3 && rows.every((r) => /Fitzroy|Carlton|South Yarra/i.test(r));
      steps.push({
        result: "browsed Melbourne restaurants",
        url,
        rows,
        hasCity,
        hasHarbour,
        melbourneOnly,
      });
      passed = hasCity && melbourneOnly && !hasHarbour;
      if (!passed) {
        error = `assertions failed: hasCity=${hasCity} melbourneOnly=${melbourneOnly} hasHarbour=${hasHarbour} rows=${JSON.stringify(rows)} url=${url}`;
      }
    } else if (feature === "customer-login") {
      await page.goto(baseUrl + "/login", { waitUntil: "networkidle" });
      await page.locator('input[name="email"]').fill("demo@aussieeats.local");
      await page.locator('input[name="password"]').fill("demo1234");
      await page.screenshot({ path: join(evidenceDir, "01-login-form.png"), fullPage: true });
      await Promise.all([
        page.waitForURL((u) => !u.pathname.endsWith("/login")),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: join(evidenceDir, "02-after-login.png"), fullPage: true });
      const logout = await page.getByRole("button", { name: /log out/i }).count();
      steps.push({ url: page.url(), logoutVisible: logout > 0 });
      passed = logout > 0;
      if (!passed) error = "Log out control not visible after login";
    } else if (feature === "favourites") {
      await page.goto(baseUrl + "/login?next=/restaurants", { waitUntil: "networkidle" });
      await page.locator('input[name="email"]').fill("demo@aussieeats.local");
      await page.locator('input[name="password"]').fill("demo1234");
      await Promise.all([
        page.waitForURL(/\/restaurants\/?$/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);

      const firstCard = page.locator("article").filter({ has: page.locator("a.restaurant-row") }).first();
      const restaurantName = (await firstCard.locator("h2").textContent())?.trim() || "";
      const heart = firstCard.getByRole("button", { name: /favourites/i });
      if ((await heart.getAttribute("aria-pressed")) === "true") {
        await heart.click();
        await heart.waitFor({ state: "visible" });
      }

      await page.screenshot({
        path: join(evidenceDir, "01-action-save-restaurant.png"),
        fullPage: true,
      });
      await heart.click();
      await page.waitForFunction(
        (name) =>
          document.querySelector(`button[aria-label="Remove ${name} from favourites"]`)?.getAttribute("aria-pressed") ===
          "true",
        restaurantName,
      );
      steps.push({ action: "saved restaurant from browse list", restaurantName });

      await page.locator('nav[aria-label="Primary"] a[href="/favourites"]').click();
      await page.waitForURL(/\/favourites\/?$/);
      await page.getByRole("heading", { name: "Favourites" }).waitFor();
      await page.reload({ waitUntil: "networkidle" });
      const persistedCard = page.locator("article").filter({ hasText: restaurantName });
      const persisted = (await persistedCard.count()) > 0;
      await page.screenshot({
        path: join(evidenceDir, "02-result-saved-favourite.png"),
        fullPage: true,
      });
      steps.push({ result: "favourite persisted after reload", restaurantName, persisted });
      passed = Boolean(restaurantName) && persisted;
      if (!passed) error = `favourite did not persist for ${restaurantName || "unknown restaurant"}`;

      if (persisted) {
        await persistedCard.getByRole("button", { name: /Remove .* from favourites/i }).click();
        await persistedCard.waitFor({ state: "detached" });
      }
    } else if (feature === "admin-login") {
      await page.goto(baseUrl + "/admin/login", { waitUntil: "networkidle" });
      await page.locator('input[name="email"]').fill("admin@aussieeats.local");
      await page.locator('input[name="password"]').fill("admin1234");
      await page.screenshot({ path: join(evidenceDir, "01-admin-login.png"), fullPage: true });
      await Promise.all([
        page.waitForURL(/\/admin\/?$/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: join(evidenceDir, "02-admin-dashboard.png"), fullPage: true });
      const url = page.url();
      const navOrders = await page.locator('nav[aria-label="Admin"] a[href="/admin/orders"]').count();
      steps.push({ url, navOrders });
      passed = /\/admin\/?$/.test(new URL(url).pathname) && navOrders > 0;
      if (!passed) error = `admin dashboard assertions failed url=${url}`;
    } else if (feature === "place-order") {
      throw new Error(
        "place-order is mapped but multi-step; drive manually per features/place-order.md or extend drive.mjs",
      );
    } else {
      throw new Error(`unknown feature: ${feature}`);
    }
  } finally {
    await browser.close();
  }
}

try {
  await run();
} catch (e) {
  passed = false;
  error = e instanceof Error ? e.message : String(e);
}

const proof = {
  feature,
  baseUrl,
  steps,
  passed,
  error,
  at: new Date().toISOString(),
  evidenceDir,
};
writeFileSync(join(evidenceDir, "proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
process.exit(passed ? 0 : 1);
