import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4173";
const productName = "5 Mukhi Rudraksha";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true
});

async function checkFloatingAssistant(page) {
  await page.getByRole("button", { name: "Open Aura AI Shopping and Vedic Guide" }).click();
  const panel = page.locator("#aura-ai-floating-panel");
  await panel.getByRole("tab", { name: "Quick AI" }).waitFor();
  await panel.getByRole("textbox", { name: "अपना प्रश्न लिखें" }).waitFor();
  await panel.getByRole("tab", { name: "AI Panditji" }).click();
  await panel.getByRole("button", { name: "Kundli Form" }).click();
  await panel.locator(".aura-birth-form-drawer").waitFor();
  await panel.locator(".aura-birth-form-close").click();

  await panel.getByRole("button", { name: "Saved Kundalis" }).click();
  const saved = page.locator("#aura-ai-saved-kundali-modal");
  await saved.waitFor();
  await saved.getByRole("button", { name: "सेव कुंडली बंद करें" }).click();
  await saved.waitFor({ state: "hidden" });

  await panel.getByRole("group", { name: "Kundli Controls" }).getByRole("button", { name: "History" }).click();
  const history = page.locator("#aura-ai-chat-history-modal");
  await history.waitFor();
  await history.getByRole("button", { name: "चैट हिस्ट्री बंद करें" }).click();
  await history.waitFor({ state: "hidden" });

  const options = panel.locator(".aura-pandit-settings-toggle");
  await options.click();
  await panel.getByRole("button", { name: "टूल्स", exact: true }).click();
  const tools = page.getByRole("dialog", { name: "वैदिक टूल्स" });
  await tools.getByRole("button", { name: /अंक ज्योतिष/ }).waitFor();
  await tools.getByRole("button", { name: "Close Vedic Tools" }).click();
  await tools.waitFor({ state: "hidden" });

  await options.click();
  await panel.getByRole("button", { name: "नोटपैड", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "नोटपैड" });
  await notes.waitFor();
  await notes.getByRole("button", { name: "नोटपैड बंद करें" }).click();
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await panel.waitFor({ state: "hidden" });
}

async function checkStorefront(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
    serviceWorkers: "block"
  });
  try {
    await context.route("**/*", route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto(origin);
    await page.locator(".hero").first().waitFor({ state: "visible" });
    if (width < 600) {
      const menu = page.getByRole("button", { name: "Menu", exact: true });
      await menu.click();
      const drawer = page.getByRole("dialog", { name: "Store navigation" });
      await drawer.waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden" });
      assert.equal(await menu.evaluate(element => element === document.activeElement), true);
    }

    await checkFloatingAssistant(page);
    await page.goto(origin + "/shop");
    await page.getByRole("heading", { name: "Shop Catalog", exact: true }).waitFor();
    await page.getByRole("heading", { name: productName, exact: true }).first().waitFor();

    const visibleShopLink = page.locator('a[href="/product/performance-fixture"]').filter({ visible: true }).first();
    await visibleShopLink.click();
    await page.getByRole("heading", { level: 1, name: productName, exact: true }).waitFor();
    await page.getByRole("button", { name: "Add to Cart", exact: true }).filter({ visible: true }).first().click();

    await page.goto(origin + "/cart");
    await page.getByRole("heading", { name: /Shopping Bag/ }).waitFor();
    await page.getByRole("heading", { name: productName, exact: true }).first().waitFor();

    await page.reload();
    await page.getByRole("heading", { name: productName, exact: true }).first().waitFor();
    assert.deepEqual(pageErrors, [], `Unhandled browser errors at ${width}px`);
    console.log(`Storefront smoke checks passed at ${width}×${height}`);
  } finally {
    await context.close();
  }
}

try {
  await checkStorefront(390, 844);
  await checkStorefront(1440, 900);
} finally {
  await browser.close();
}
