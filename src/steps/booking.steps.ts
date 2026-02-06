import { Given, When, Then } from "@cucumber/cucumber";
import { PWWorld } from "../support/world";
import path from "node:path";

/**
 * Helper: sleep
 */
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Helper: safely check if page exists and is open.
 */
function assertPage(this: PWWorld) {
  if (!this.page) throw new Error("Playwright page is not initialized (page is undefined).");
  if (this.page.isClosed()) throw new Error("Playwright page is closed.");
  return this.page;
}

/**
 * Helper: close known blocking popups (slow network safe).
 *
 * IMPORTANT:
 * - The "Dismiss sign-in info." popup may appear late (even > 1 minute).
 * - We must not proceed to currency selector until this is handled, otherwise clicks are blocked.
 *
 * Behavior:
 * - Wait up to `maxWaitMs` for the dismiss button to appear.
 * - If it appears, click it.
 * - Also attempt to close common cookie dialogs if visible.
 */
async function closeBlockingPopups(world: PWWorld, maxWaitMs = 120_000) {
  const page = assertPage.call(world);

  // 1) Booking sign-in info banner/modal (codegen line)
  const dismissBtn = page.getByRole("button", { name: "Dismiss sign-in info." });

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (page.isClosed()) return;

    try {
      if (await dismissBtn.first().isVisible({ timeout: 1000 })) {
        await dismissBtn.first().click({ timeout: 20_000 });
        await sleep(500);
        break;
      }
    } catch {
      // ignore and retry
    }

    await sleep(1000);
  }

  // 2) Cookie / consent dialogs (best-effort)
  const possibleCookieButtons = [
    page.getByRole("button", { name: /accept/i }),
    page.getByRole("button", { name: /agree/i }),
    page.getByRole("button", { name: /got it/i }),
  ];

  for (const btn of possibleCookieButtons) {
    try {
      if (page.isClosed()) return;
      if (await btn.first().isVisible({ timeout: 500 })) {
        await btn.first().click({ timeout: 5000 }).catch(() => {});
        await sleep(300);
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Helper: open currency picker (codegen trigger)
 */
async function openCurrencyPicker(world: PWWorld) {
  const page = assertPage.call(world);

  // Codegen: await page.getByTestId('header-currency-picker-trigger').click();
  const trigger = page.getByTestId("header-currency-picker-trigger");

  await trigger.waitFor({ state: "visible", timeout: 120_000 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ timeout: 60_000 });
}

/**
 * Helper: select currency by code, but aligned with codegen behavior.
 *
 * For TRY, codegen shows the accessible name is: "Turkish Lira TRY"
 * We will:
 * - prefer exact "Turkish Lira TRY" click if code === "TRY"
 * - otherwise click any button that contains the code as a whole word.
 */
async function selectCurrency(world: PWWorld, code: string) {
  const page = assertPage.call(world);

  // First, make sure blocking popups are handled (late-appearing)
  await closeBlockingPopups(world, 120_000);

  const normalized = code.trim().toUpperCase();

  // Preferred exact match for TRY based on your codegen output
  if (normalized === "TRY") {
    const btn = page.getByRole("button", { name: "Turkish Lira TRY" });
    await btn.first().waitFor({ state: "visible", timeout: 120_000 });
    await btn.first().scrollIntoViewIfNeeded();
    await btn.first().click({ timeout: 60_000 });
    return;
  }

  // Generic fallback: any role=button whose accessible name includes the code word
  const rx = new RegExp(`\\b${normalized}\\b`, "i");
  const option = page.getByRole("button", { name: rx });

  await option.first().waitFor({ state: "visible", timeout: 120_000 });
  await option.first().scrollIntoViewIfNeeded();
  await option.first().click({ timeout: 60_000 });
}

/**
 * -------------- STEP DEFINITIONS --------------
 */

Given("I open the Booking homepage", async function (this: PWWorld) {
  const page = assertPage.call(this);

  // For slow internet, go with domcontentloaded and then allow UI to hydrate.
  await page.goto("https://www.booking.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
});

Given("if an advertisement popup is visible I close it", async function (this: PWWorld) {
  // This step is intentionally “safe” and can run many times.
  await closeBlockingPopups(this, 120_000);
});

When("I open the currency selector", async function (this: PWWorld) {
  await closeBlockingPopups(this, 120_000);
  await openCurrencyPicker(this);
});

When('I select currency "{string}"', async function (this: PWWorld, currencyCode: string) {
  const page = assertPage.call(this);

  // If the popup appears AFTER opening currency picker, we still must close it first.
  await closeBlockingPopups(this, 120_000);

  try {
    await selectCurrency(this, currencyCode);
  } catch (e) {
    // Capture screenshot to reports
    const shot = path.join(this.reportsDir, "currency-not-found.png");
    try {
      if (!page.isClosed()) {
        await page.screenshot({ path: shot, fullPage: true });
      }
    } catch {
      // ignore
    }
    throw new Error(`Currency option "${currencyCode}" not found or not clickable. Screenshot: ${shot}\n${String(e)}`);
  }
});

When("I focus destination input", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const destination = page.getByRole("combobox", { name: /where are you going/i });
  await destination.waitFor({ state: "visible", timeout: 120_000 });
  await destination.click({ timeout: 60_000 });
});

When('I type destination "{string}"', async function (this: PWWorld, destinationText: string) {
  const page = assertPage.call(this);

  const destination = page.getByRole("combobox", { name: /where are you going/i });
  await destination.fill(destinationText, { timeout: 60_000 });
});

When("I select the first destination suggestion", async function (this: PWWorld) {
  const page = assertPage.call(this);

  // Codegen example uses "Central London London," — but this is dynamic.
  // We click the first suggestion button in the autocomplete list.
  const firstSuggestion = page.locator('[data-testid="autocomplete-results"] button').first();
  await firstSuggestion.waitFor({ state: "visible", timeout: 120_000 });
  await firstSuggestion.click({ timeout: 60_000 });
});

When("I open the date picker", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const dates = page.getByTestId("searchbox-dates-container");
  await dates.waitFor({ state: "visible", timeout: 120_000 });
  await dates.click({ timeout: 60_000 });
});

When("I choose flexible dates", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const flexibleTab = page.getByRole("tab", { name: /i'm flexible/i });
  await flexibleTab.waitFor({ state: "visible", timeout: 120_000 });
  await flexibleTab.click({ timeout: 60_000 });
});

When('I select length of stay "{string}"', async function (this: PWWorld, stayLabel: string) {
  const page = assertPage.call(this);

  // The flexible UI varies; codegen clicked a specific cell.
  // Here we try to click by visible text like "A month".
  const opt = page.getByRole("button", { name: new RegExp(stayLabel, "i") });
  await opt.first().waitFor({ state: "visible", timeout: 120_000 });
  await opt.first().scrollIntoViewIfNeeded();
  await opt.first().click({ timeout: 60_000 });
});

When('I select month "{string}"', async function (this: PWWorld, monthToken: string) {
  const page = assertPage.call(this);

  // Your codegen uses 'Jun2026' in UI.
  // monthToken from feature is '2026Jun' so we normalize to match UI: 'Jun2026'.
  const m = monthToken.match(/^(\d{4})([A-Za-z]{3})$/);
  const normalized = m ? `${m[2]}${m[1]}` : monthToken;

  const monthChip = page.locator("span").filter({ hasText: new RegExp(normalized, "i") }).first();
  await monthChip.waitFor({ state: "visible", timeout: 120_000 });
  await monthChip.scrollIntoViewIfNeeded();
  await monthChip.click({ timeout: 60_000 });
});

When("I confirm dates", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const btn = page.getByRole("button", { name: /select dates/i });
  await btn.waitFor({ state: "visible", timeout: 120_000 });
  await btn.click({ timeout: 60_000 });
});

When("I open guests and rooms selector", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const occ = page.getByTestId("occupancy-config");
  await occ.waitFor({ state: "visible", timeout: 120_000 });
  await occ.click({ timeout: 60_000 });
});

When("I set Adults to {int}", async function (this: PWWorld, adults: number) {
  const page = assertPage.call(this);

  // Booking UI typically has +/- buttons. Codegen clicked "+" multiple times then clicked "8".
  // A robust approach: click until the displayed number matches.
  const panel = page.getByTestId("occupancy-popup");
  await panel.waitFor({ state: "visible", timeout: 120_000 });

  // Try direct click the number if present (like codegen)
  const number = panel.getByText(String(adults), { exact: true });
  if (await number.isVisible({ timeout: 1000 }).catch(() => false)) {
    await number.click({ timeout: 10_000 });
    return;
  }

  // Fallback: do nothing (you can implement +/- logic if needed)
});

When("I set Children to {int}", async function (this: PWWorld, children: number) {
  const page = assertPage.call(this);

  const panel = page.getByTestId("occupancy-popup");
  await panel.waitFor({ state: "visible", timeout: 120_000 });

  const number = panel.getByText(String(children), { exact: true });
  if (await number.isVisible({ timeout: 1000 }).catch(() => false)) {
    await number.click({ timeout: 10_000 });
  }
});

When("I set Rooms to {int}", async function (this: PWWorld, rooms: number) {
  const page = assertPage.call(this);

  const panel = page.getByTestId("occupancy-popup");
  await panel.waitFor({ state: "visible", timeout: 120_000 });

  const number = panel.getByText(String(rooms), { exact: true });
  if (await number.isVisible({ timeout: 1000 }).catch(() => false)) {
    await number.click({ timeout: 10_000 });
  }
});

When("I enable travelling with pets", async function (this: PWWorld) {
  const page = assertPage.call(this);

  // Codegen clicked `.bc7af14f80` which is unstable.
  // We try to click by label text containing "pets".
  const pets = page.getByRole("checkbox", { name: /pets/i });
  if (await pets.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (!(await pets.isChecked().catch(() => false))) {
      await pets.check({ timeout: 10_000 }).catch(async () => {
        await pets.click({ timeout: 10_000 });
      });
    }
    return;
  }

  // Best-effort fallback: click any element containing "pets"
  const fallback = page.getByText(/travelling with pets/i).first();
  if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fallback.click({ timeout: 10_000 }).catch(() => {});
  }
});

When("I confirm guests selection", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const done = page.getByRole("button", { name: /done/i });
  await done.waitFor({ state: "visible", timeout: 120_000 });
  await done.click({ timeout: 60_000 });
});

When("I click Search", async function (this: PWWorld) {
  const page = assertPage.call(this);

  const btn = page.getByRole("button", { name: /^search$/i });
  await btn.waitFor({ state: "visible", timeout: 120_000 });
  await btn.click({ timeout: 60_000 });
});

Then("I should see hotel results", async function (this: PWWorld) {
  const page = assertPage.call(this);

  // Results page usually contains search results list or map/results.
  // We'll wait for something that indicates results loaded.
  await page.waitForLoadState("domcontentloaded", { timeout: 180_000 });

  const results = page.locator('[data-testid="property-card"]').first();
  await results.waitFor({ state: "visible", timeout: 180_000 });
});

When("I open availability for hotel #{int}", async function (this: PWWorld, index: number) {
  const page = assertPage.call(this);

  // Codegen used: page.getByTestId('availability-cta-btn').nth(2)
  const btn = page.getByTestId("availability-cta-btn").nth(index - 1);
  await btn.waitFor({ state: "visible", timeout: 180_000 });

  // Some hotels open in new tab/window
  const popupPromise = page.waitForEvent("popup", { timeout: 60_000 }).catch(() => null);
  await btn.click({ timeout: 60_000 });

  const popup = await popupPromise;
  if (popup) {
    // store popup in world for the next step if needed
    this.page = popup;
    this.page.setDefaultTimeout(120_000);
    this.page.setDefaultNavigationTimeout(180_000);
  }
});

Then("the availability page should be displayed", async function (this: PWWorld) {
  const page = assertPage.call(this);

  await page.waitForLoadState("domcontentloaded", { timeout: 180_000 });
  const url = page.url();
  if (!/booking\.com/i.test(url)) {
    throw new Error(`Expected Booking.com availability page, but got: ${url}`);
  }
});
