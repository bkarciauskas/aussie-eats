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
      await page.getByRole("heading", { name: "Restaurants" }).waitFor({ timeout: 15000 });
      // Soft App Router navigation can paint the shell before RSC rows arrive.
      const harbourRow = page.locator("a.restaurant-row").filter({ hasText: /Harbour Burger Co/i });
      await harbourRow.first().waitFor({ state: "visible", timeout: 20000 });
      await page.screenshot({ path: join(evidenceDir, "02-result-restaurants.png"), fullPage: true });
      const url = page.url();
      const hasQ = /[?&]q=burger/i.test(url);
      const hasHeading = await page.getByRole("heading", { name: "Restaurants" }).count();
      const hasHarbour = (await harbourRow.count()) > 0;
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
    } else if (feature === "search-suggestions") {
      await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });
      const input = page.locator("#restaurant-search-hero");
      await input.waitFor({ state: "visible" });
      await page.waitForFunction(() => {
        const el = document.querySelector("#restaurant-search-hero");
        return el instanceof HTMLInputElement && !el.disabled;
      });
      await input.click();
      await input.fill("burger");
      const listbox = page.locator("#restaurant-search-hero-suggestions");
      await listbox.waitFor({ state: "visible", timeout: 15000 });
      const harbourOption = listbox.getByRole("option").filter({ hasText: /Harbour Burger Co/i });
      await harbourOption.waitFor({ state: "visible", timeout: 15000 });
      const harbourKind = await harbourOption.locator(".search-suggest-kind").textContent();
      await page.screenshot({
        path: join(evidenceDir, "01-action-burger-suggestions.png"),
        fullPage: true,
      });
      steps.push({
        action: "typed burger; Harbour Burger Co restaurant suggestion visible",
        harbourKind: harbourKind?.trim() || null,
      });

      await input.fill("");
      await input.fill("bur");
      // Option text includes the kind label ("Burgers" + "Cuisine"), so match via strong.
      const cuisineOption = listbox.getByRole("option").filter({
        has: page.locator("strong", { hasText: /^Burgers$/i }),
      }).filter({
        has: page.locator(".search-suggest-kind", { hasText: /^Cuisine$/i }),
      });
      await cuisineOption.first().waitFor({ state: "visible", timeout: 15000 });
      await cuisineOption.first().locator("button").click();
      await page.waitForFunction(() => location.pathname.startsWith("/restaurants"), null, {
        timeout: 15000,
      });
      await page.waitForSelector("h1", { timeout: 15000 });
      const cuisineUrl = page.url();
      const hasCuisine = /[?&]cuisine=Burgers\b/i.test(cuisineUrl);
      await page.screenshot({
        path: join(evidenceDir, "02-result-cuisine-filter.png"),
        fullPage: true,
      });
      steps.push({ result: "selected Burgers cuisine suggestion", cuisineUrl, hasCuisine });

      await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const el = document.querySelector("#restaurant-search-hero");
        return el instanceof HTMLInputElement && !el.disabled;
      });
      const homeInput = page.locator("#restaurant-search-hero");
      await homeInput.click();
      await homeInput.fill("");
      await page.getByText("Recent searches").waitFor({ state: "visible", timeout: 10000 });
      const recentBurgers = page
        .locator("#restaurant-search-hero-suggestions")
        .getByRole("option")
        .filter({ has: page.locator("strong", { hasText: /^Burgers$/i }) });
      await recentBurgers.first().waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({
        path: join(evidenceDir, "03-action-recent-searches.png"),
        fullPage: true,
      });
      steps.push({ action: "focused empty hero; Burgers under Recent searches" });

      await page
        .locator(".search-suggest-heading")
        .getByRole("button", { name: /^Clear$/i })
        .click();
      await page.locator("#restaurant-search-hero-suggestions").waitFor({ state: "hidden", timeout: 10000 });
      await page.screenshot({
        path: join(evidenceDir, "04-result-recents-cleared.png"),
        fullPage: true,
      });
      const listboxGone = (await page.locator("#restaurant-search-hero-suggestions").count()) === 0;
      steps.push({ result: "cleared recent searches", listboxGone });
      passed =
        /Restaurant/i.test(harbourKind || "") && hasCuisine && listboxGone;
      if (!passed) {
        error = `search-suggestions assertions failed: harbourKind=${harbourKind} hasCuisine=${hasCuisine} listboxGone=${listboxGone} cuisineUrl=${cuisineUrl}`;
      }
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
      // Harbour Burger Co is Sydney — must not appear under city=melbourne.
      const hasHarbour = rows.some((r) => /Harbour Burger/i.test(r));
      // Snapshot restore has ~100+ Melbourne venues; handwritten seed has 3. Require ≥3.
      const enoughRows = rows.length >= 3;
      const hasKnownMelbourneSeed = rows.some((r) =>
        /Fitzroy Smash|Carlton Nonna|South Yarra Sushi/i.test(r),
      );
      steps.push({
        result: "browsed Melbourne restaurants",
        url,
        rowCount: rows.length,
        sampleRows: rows.slice(0, 8),
        hasCity,
        hasHarbour,
        enoughRows,
        hasKnownMelbourneSeed,
      });
      passed = hasCity && enoughRows && !hasHarbour && hasKnownMelbourneSeed;
      if (!passed) {
        error = `assertions failed: hasCity=${hasCity} enoughRows=${enoughRows} hasHarbour=${hasHarbour} hasKnownMelbourneSeed=${hasKnownMelbourneSeed} rowCount=${rows.length} url=${url}`;
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
      const navRestaurants = await page
        .locator('nav[aria-label="Admin"] a[href="/admin/restaurants"]')
        .count();
      const body = await page.content();
      const hasRestaurantLabel = /Restaurants/i.test(body);
      steps.push({ url, navOrders, navRestaurants, hasRestaurantLabel });
      passed =
        /\/admin\/?$/.test(new URL(url).pathname) &&
        navOrders > 0 &&
        navRestaurants > 0 &&
        hasRestaurantLabel;
      if (!passed) {
        error = `admin dashboard assertions failed url=${url} navOrders=${navOrders} navRestaurants=${navRestaurants}`;
      }
    } else if (feature === "place-order") {
      await page.goto(baseUrl + "/login?next=/restaurants/harbour-burger-co", {
        waitUntil: "networkidle",
      });
      await page.locator('input[name="email"]').fill("demo@aussieeats.local");
      await page.locator('input[name="password"]').fill("demo1234");
      await Promise.all([
        page.waitForURL(/\/restaurants\/harbour-burger-co/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");

      const addButtons = page.getByRole("button", { name: "Add", exact: true });
      await addButtons.first().waitFor({ state: "visible", timeout: 15000 });
      await addButtons.first().click();
      await page.getByText(/Added ·/i).first().waitFor({ timeout: 5000 });
      await page.screenshot({ path: join(evidenceDir, "01-action-add-to-cart.png"), fullPage: true });
      steps.push({ action: "added menu item at Harbour Burger Co" });

      await page.goto(baseUrl + "/cart", { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /^Checkout$/i }).click();
      await page.waitForURL(/\/checkout/);
      await page.waitForLoadState("networkidle");

      await page.locator('input[value="card"]').check();
      await page.getByPlaceholder("4242 4242 4242 4242").fill("4242 4242 4242 4242");
      await page.getByPlaceholder("Taylor Smith").fill("Demo User");
      await page.locator('input[autocomplete="cc-exp"]').fill("12/30");
      await page.locator('input[autocomplete="cc-csc"]').fill("123");
      await page.screenshot({ path: join(evidenceDir, "02-action-checkout.png"), fullPage: true });
      steps.push({ action: "filled checkout with demo card" });

      await Promise.all([
        page.waitForURL(/\/orders\/[^/]+/),
        page.getByRole("button", { name: /Pay & place order/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      const orderUrl = page.url();
      const orderBody = await page.content();
      const hasPending = /data-status="pending"/.test(orderBody);
      const hasCard = /Visa ending 4242|Card · Visa/i.test(orderBody);
      await page.screenshot({ path: join(evidenceDir, "03-result-order.png"), fullPage: true });
      steps.push({ result: "order placed", orderUrl, hasPending, hasCard });
      passed = /\/orders\//.test(orderUrl) && hasPending && hasCard;
      if (!passed) {
        error = `place-order assertions failed url=${orderUrl} hasPending=${hasPending} hasCard=${hasCard}`;
      }
    } else if (feature === "guest-checkout") {
      // Stay logged out — guest checkout must not require demo@aussieeats.local.
      await page.goto(baseUrl + "/restaurants/harbour-burger-co", {
        waitUntil: "networkidle",
      });
      const addButtons = page.getByRole("button", { name: "Add", exact: true });
      await addButtons.first().waitFor({ state: "visible", timeout: 15000 });
      await addButtons.first().click();
      await page.getByText(/Added ·/i).first().waitFor({ timeout: 5000 });
      await page.screenshot({ path: join(evidenceDir, "01-action-add-to-cart.png"), fullPage: true });
      steps.push({ action: "added menu item while anonymous" });

      await page.goto(baseUrl + "/cart", { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /^Checkout$/i }).click();
      await page.waitForURL(/\/checkout/);
      await page.waitForLoadState("networkidle");

      const guestEmail = `guest.${Date.now()}@example.com`;
      await page.locator('input[name="guestName"]').fill("Alex Guest");
      await page.locator('input[name="guestEmail"]').fill(guestEmail);
      await page.locator('input[value="card"]').check();
      await page.getByPlaceholder("4242 4242 4242 4242").fill("4242 4242 4242 4242");
      await page.getByPlaceholder("Taylor Smith").fill("Alex Guest");
      await page.locator('input[autocomplete="cc-exp"]').fill("12/30");
      await page.locator('input[autocomplete="cc-csc"]').fill("123");
      await page.screenshot({ path: join(evidenceDir, "02-action-guest-checkout.png"), fullPage: true });
      steps.push({ action: "filled guest checkout with name, email, and demo card", guestEmail });

      await Promise.all([
        page.waitForURL(/\/orders\/[^/]+/),
        page.getByRole("button", { name: /Pay & place order/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      const orderUrl = page.url();
      const orderBody = await page.content();
      const hasPending = /data-status="pending"/.test(orderBody);
      const hasGuestCopy = /Guest order|full order history/i.test(orderBody);
      const hasCard = /Visa ending 4242|Card · Visa/i.test(orderBody);
      await page.screenshot({ path: join(evidenceDir, "03-result-guest-order.png"), fullPage: true });
      steps.push({ result: "guest order placed", orderUrl, hasPending, hasGuestCopy, hasCard });
      passed = /\/orders\//.test(orderUrl) && hasPending && hasGuestCopy && hasCard;
      if (!passed) {
        error = `guest-checkout assertions failed url=${orderUrl} hasPending=${hasPending} hasGuestCopy=${hasGuestCopy} hasCard=${hasCard}`;
      }
    } else if (feature === "admin-order-status") {
      await page.goto(baseUrl + "/admin/login", { waitUntil: "networkidle" });
      await page.locator('input[name="email"]').fill("admin@aussieeats.local");
      await page.locator('input[name="password"]').fill("admin1234");
      await Promise.all([
        page.waitForURL(/\/admin\/?$/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.goto(baseUrl + "/admin/orders", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Orders" }).waitFor();

      const pendingBefore = await page.locator('[data-status="pending"]').count();
      const preparingBefore = await page.locator('[data-status="preparing"]').count();
      const pendingRow = page.locator("tr", { has: page.locator('[data-status="pending"]') }).first();
      await pendingRow.waitFor({ state: "visible", timeout: 15000 });
      await page.screenshot({
        path: join(evidenceDir, "01-action-orders-pending.png"),
        fullPage: true,
      });
      steps.push({ action: "opened admin orders with pending row", pendingBefore, preparingBefore });

      await pendingRow.getByRole("button", { name: /→ Preparing/i }).click();
      // Orders page has no status filter; wait on page-level status pill counts after revalidate.
      await page.waitForFunction(
        ({ pendingBefore: p0, preparingBefore: r0 }) => {
          const pending = document.querySelectorAll('[data-status="pending"]').length;
          const preparing = document.querySelectorAll('[data-status="preparing"]').length;
          return pending < p0 && preparing > r0;
        },
        { pendingBefore, preparingBefore },
        { timeout: 15000 },
      );
      await page.screenshot({
        path: join(evidenceDir, "02-result-status-preparing.png"),
        fullPage: true,
      });
      const pendingAfter = await page.locator('[data-status="pending"]').count();
      const preparingAfter = await page.locator('[data-status="preparing"]').count();
      steps.push({
        result: "advanced pending → preparing",
        pendingAfter,
        preparingAfter,
      });
      passed = pendingAfter < pendingBefore && preparingAfter > preparingBefore;
      if (!passed) {
        error = `order status did not advance: pending ${pendingBefore}→${pendingAfter}, preparing ${preparingBefore}→${preparingAfter}`;
      }
    } else if (feature === "live-order-status") {
      // Customer places an order, keeps detail open; admin advances status; poll catches it.
      await page.goto(baseUrl + "/login?next=/restaurants/harbour-burger-co", {
        waitUntil: "networkidle",
      });
      await page.locator('input[name="email"]').fill("demo@aussieeats.local");
      await page.locator('input[name="password"]').fill("demo1234");
      await Promise.all([
        page.waitForURL(/\/restaurants\/harbour-burger-co/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => {
        localStorage.setItem(
          "aussieeats_location_v1",
          JSON.stringify({
            label: "Sydney",
            suburb: "Sydney",
            state: "NSW",
            postcode: "2000",
            lat: -33.8688,
            lng: 151.2093,
          }),
        );
      });

      const addButtons = page.getByRole("button", { name: "Add", exact: true });
      await addButtons.first().waitFor({ state: "visible", timeout: 15000 });
      await addButtons.first().click();
      await page.getByText(/Added ·/i).first().waitFor({ timeout: 5000 });
      await page.goto(baseUrl + "/cart", { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /^Checkout$/i }).click();
      await page.waitForURL(/\/checkout/);
      await page.waitForLoadState("networkidle");
      await page.locator('input[value="pay_on_delivery"]').check();
      await Promise.all([
        page.waitForURL(/\/orders\/[^/]+/),
        page.getByRole("button", { name: /Place order|Pay & place order/i }).click(),
      ]);
      await page.waitForLoadState("networkidle");
      const orderUrl = page.url();
      const orderId = new URL(orderUrl).pathname.split("/").pop();

      await page.waitForSelector('[data-live-order-status="pending"]', { timeout: 10000 });
      await page.waitForSelector('[data-live-polling="true"]', { timeout: 5000 });
      await page.waitForSelector("[data-courier-eta]", { timeout: 10000 });
      await page.screenshot({
        path: join(evidenceDir, "01-action-customer-order-live.png"),
        fullPage: true,
      });
      steps.push({
        action: "opened live order detail",
        orderUrl,
        orderId,
        livePending: true,
      });

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await adminPage.goto(baseUrl + "/admin/login", { waitUntil: "networkidle" });
      await adminPage.locator('input[name="email"]').fill("admin@aussieeats.local");
      await adminPage.locator('input[name="password"]').fill("admin1234");
      await Promise.all([
        adminPage.waitForURL(/\/admin\/?$/),
        adminPage.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await adminPage.goto(baseUrl + "/admin/orders", { waitUntil: "networkidle" });
      // Newest first; match demo customer + Harbour so we advance the order just placed.
      const targetRow = adminPage
        .locator("tr", { has: adminPage.locator('[data-status="pending"]') })
        .filter({ hasText: "demo@aussieeats.local" })
        .filter({ hasText: "Harbour Burger" })
        .first();
      await targetRow.waitFor({ state: "visible", timeout: 15000 });
      await targetRow.getByRole("button", { name: /→ Preparing/i }).click();
      await adminPage.waitForFunction(
        () => document.querySelectorAll('[data-status="preparing"]').length > 0,
        null,
        { timeout: 15000 },
      );
      await adminPage.screenshot({
        path: join(evidenceDir, "02-action-admin-advanced.png"),
        fullPage: true,
      });
      steps.push({ action: "admin advanced order to preparing", orderId });
      await adminContext.close();

      await page.waitForSelector('[data-live-order-status="preparing"]', { timeout: 12000 });
      const liveStatus = await page.locator("[data-live-order-status]").getAttribute("data-live-order-status");
      const eta = await page.locator("[data-courier-eta]").getAttribute("data-courier-eta");
      await page.screenshot({
        path: join(evidenceDir, "03-result-customer-preparing.png"),
        fullPage: true,
      });
      steps.push({
        result: "customer view picked up preparing via poll",
        liveStatus,
        eta,
      });
      passed = liveStatus === "preparing" && Boolean(eta);
      if (!passed) {
        error = `live-order-status failed: liveStatus=${liveStatus} eta=${eta} orderUrl=${orderUrl}`;
      }
    } else if (feature === "admin-menu-edit") {
      await page.goto(baseUrl + "/admin/login", { waitUntil: "networkidle" });
      await page.locator('input[name="email"]').fill("admin@aussieeats.local");
      await page.locator('input[name="password"]').fill("admin1234");
      await Promise.all([
        page.waitForURL(/\/admin\/?$/),
        page.getByRole("button", { name: /sign in/i }).click(),
      ]);
      await page.goto(baseUrl + "/admin/restaurants", { waitUntil: "networkidle" });
      const harbourRow = page.locator("tr", { hasText: "Harbour Burger Co" }).first();
      await harbourRow.waitFor({ state: "visible", timeout: 15000 });
      await harbourRow.getByRole("link", { name: "Menu" }).click();
      await page.waitForURL(/\/admin\/restaurants\/[^/]+\/menu/);
      await page.getByRole("heading", { name: /Menu · Harbour Burger Co/i }).waitFor();

      const firstItem = page.locator("section.panel ul li").first();
      const beforeText = (await firstItem.locator("p.font-medium").first().textContent()) || "";
      const beforeMatch = beforeText.match(/\$(\d+\.\d{2})/);
      const beforePrice = beforeMatch ? beforeMatch[1] : null;
      await firstItem.getByRole("button", { name: "Edit" }).click();
      const dialog = page.getByRole("dialog", { name: "Edit menu item" });
      await dialog.waitFor({ state: "visible" });
      const priceInput = dialog.locator('input[name="price"]');
      const current = Number(await priceInput.inputValue());
      const nextPrice = (current + 0.5).toFixed(2);
      await priceInput.fill(nextPrice);
      await page.screenshot({
        path: join(evidenceDir, "01-action-edit-price.png"),
        fullPage: true,
      });
      steps.push({ action: "edited menu item price", beforePrice, nextPrice });
      await dialog.getByRole("button", { name: "Save" }).click();
      await dialog.waitFor({ state: "hidden", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.reload({ waitUntil: "networkidle" });
      const afterText = (await page.locator("section.panel ul li").first().locator("p.font-medium").first().textContent()) || "";
      const hasNewPrice = afterText.includes(`$${nextPrice}`);
      await page.screenshot({
        path: join(evidenceDir, "02-result-price-updated.png"),
        fullPage: true,
      });
      steps.push({ result: "menu price persisted", afterText, hasNewPrice });
      passed = hasNewPrice;
      if (!passed) {
        error = `menu price not updated; before=${beforePrice} expected=$${nextPrice} after=${afterText}`;
      }
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
