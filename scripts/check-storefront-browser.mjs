import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4173";
const productName = "5 Mukhi Rudraksha";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true
});

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
