import { IWorldOptions, setWorldConstructor, World } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * PWWorld
 * -------
 * A custom Cucumber World that owns:
 * - Playwright browser/context/page lifecycle for each scenario
 * - a reports directory
 * - helper attachment methods (text/json) that safely attach to the scenario report
 *
 * IMPORTANT:
 * We MUST register this world via setWorldConstructor(PWWorld),
 * otherwise Cucumber will use the default World and `this.page`, `this.attachText`, etc. will be undefined.
 */
export class PWWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  /**
   * Where we store screenshots / json summary outputs.
   * Default: <projectRoot>/reports
   */
  reportsDir: string;

  /**
   * Which browser channel we launched (msedge/chrome).
   * Useful for debugging and for your summary output.
   */
  browserChannel?: "msedge" | "chrome";

  constructor(options: IWorldOptions) {
    super(options);

    // Prefer env override, otherwise default to "reports" under project root
    const envDir = process.env.REPORTS_DIR?.trim();
    this.reportsDir = envDir && envDir.length > 0 ? envDir : path.resolve(process.cwd(), "reports");

    // Ensure directory exists early
    fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  /**
   * Attach a plain text blob to the current scenario output (Cucumber JSON/formatters).
   * Safe: does nothing if attach is not present.
   */
  async attachText(text: string, name = "log.txt") {
    if (typeof this.attach === "function") {
      await this.attach(text, "text/plain");
    }
    // Optional: also persist to disk if you want, but we keep it as attachment only.
    void name;
  }

  /**
   * Attach JSON to the current scenario output.
   */
  async attachJson(obj: unknown) {
    if (typeof this.attach === "function") {
      await this.attach(JSON.stringify(obj, null, 2), "application/json");
    }
  }

  /**
   * Launch a Playwright Chromium instance using "channel" so we can use
   * installed browsers (Edge/Chrome) even when Playwright browser download is blocked.
   *
   * Browser fallback:
   * 1) msedge
   * 2) chrome
   *
   * You can force by env:
   *   BROWSER_CHANNEL=msedge
   *   BROWSER_CHANNEL=chrome
   */
  async launchBrowserWithFallback() {
    const preferred = (process.env.BROWSER_CHANNEL || "").toLowerCase();
    const order: Array<"msedge" | "chrome"> =
      preferred === "chrome" ? ["chrome", "msedge"] :
      preferred === "msedge" ? ["msedge", "chrome"] :
      ["msedge", "chrome"];

    const headless = (process.env.HEADLESS || "").toLowerCase() === "1" ? true : false;

    let lastError: unknown;

    for (const ch of order) {
      try {
        this.browser = await chromium.launch({
          channel: ch,
          headless,
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
          ],
        });
        this.browserChannel = ch;
        return;
      } catch (e) {
        lastError = e;
      }
    }

    // If both channels failed, try default chromium (may require Playwright browsers installed)
    try {
      this.browser = await chromium.launch({ headless });
      this.browserChannel = undefined;
      return;
    } catch (e) {
      lastError = e;
    }

    throw new Error(
      `Failed to launch browser via channels (msedge/chrome) and default chromium.\nLast error: ${String(lastError)}`
    );
  }

  /**
   * Create a fresh context/page per scenario.
   */
  async newContextAndPage() {
    if (!this.browser) throw new Error("Browser is not launched yet.");

    this.context = await this.browser.newContext({
      viewport: { width: 1400, height: 900 },
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();

    // Useful defaults for slow networks
    this.page.setDefaultTimeout(120_000);
    this.page.setDefaultNavigationTimeout(180_000);
  }

  /**
   * Close scenario context/page. Browser close is handled in hooks based on KEEP_BROWSER_OPEN.
   */
  async closeContext() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close({ runBeforeUnload: true }).catch(() => {});
      }
    } finally {
      this.page = undefined;
    }

    try {
      if (this.context) {
        await this.context.close().catch(() => {});
      }
    } finally {
      this.context = undefined;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = undefined;
    }
  }
}

// Register the World so Cucumber uses it.
setWorldConstructor(PWWorld);
