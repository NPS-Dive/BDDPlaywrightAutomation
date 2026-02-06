import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Status as CucumberStatus,
  setDefaultTimeout,
} from "@cucumber/cucumber";

import fs from "node:fs";
import path from "node:path";
import { PWWorld } from "./world";

/**
 * Global default timeout for steps/hooks.
 * Your internet is slow and Booking UI/popup can take > 1 minute, so we must increase this.
 */
setDefaultTimeout(180_000);

/**
 * Scenario summary model (written to reports/summary.json and reports/summary.txt).
 */
type ScenarioRunStatus =
  | "PASSED"
  | "FAILED"
  | "SKIPPED"
  | "PENDING"
  | "UNDEFINED"
  | "AMBIGUOUS"
  | "UNKNOWN";

type ScenarioSummary = {
  scenarioName: string;
  status: ScenarioRunStatus;
  durationMs?: number;
  browserChannel?: string;
  startIso: string;
  endIso: string;
  failureMessage?: string;
  failureScreenshot?: string;
};

const runSummaries: ScenarioSummary[] = [];

/**
 * Convert Cucumber Duration to milliseconds.
 * Depending on Cucumber version, duration may expose:
 * - { seconds, nanos }
 */
function durationToMs(duration: any): number | undefined {
  if (!duration) return undefined;

  const seconds = typeof duration.seconds === "number" ? duration.seconds : 0;
  const nanos = typeof duration.nanos === "number" ? duration.nanos : 0;

  const ms = seconds * 1000 + Math.floor(nanos / 1_000_000);
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * Normalize status enum into stable strings.
 */
function normalizeStatus(s?: (typeof CucumberStatus)[keyof typeof CucumberStatus]): ScenarioRunStatus {
  switch (s) {
    case CucumberStatus.PASSED:
      return "PASSED";
    case CucumberStatus.FAILED:
      return "FAILED";
    case CucumberStatus.SKIPPED:
      return "SKIPPED";
    case CucumberStatus.PENDING:
      return "PENDING";
    case CucumberStatus.UNDEFINED:
      return "UNDEFINED";
    case CucumberStatus.AMBIGUOUS:
      return "AMBIGUOUS";
    default:
      return "UNKNOWN";
  }
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeFileName(s: string) {
  return s.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 180);
}

BeforeAll(async function () {
  // Nothing required here, but kept for expansion.
});

Before(async function (this: PWWorld, scenario) {
  const start = new Date();

  // Ensure reports dir exists
  ensureDir(this.reportsDir);

  // Launch browser (with Edge->Chrome fallback) and create context/page
  await this.launchBrowserWithFallback();
  await this.newContextAndPage();

  await this.attachText(`Browser launched with channel="${this.browserChannel ?? "default"}"`);

  // Attach a small JSON blob (helpful for debugging)
  await this.attachJson({
    browserChannel: this.browserChannel ?? "default",
    reportsDir: this.reportsDir,
    scenario: scenario.pickle.name,
    startIso: start.toISOString(),
  });
});

After(async function (this: PWWorld, scenario) {
  const end = new Date();
  const status = normalizeStatus(scenario.result?.status as any);

  // Try to capture a final screenshot if page is alive
  let failureShot: string | undefined;
  try {
    if (this.page && !this.page.isClosed()) {
      const file = path.join(
        this.reportsDir,
        `${status}_${Date.now()}_${safeFileName(scenario.pickle.name)}.png`
      );
      await this.page.screenshot({ path: file, fullPage: true });
      if (status === "FAILED") {
        failureShot = file;
        await this.attachText(`Failure screenshot: ${file}`);
      }
    }
  } catch (e) {
    await this.attachText(`Failed to capture final screenshot: ${String(e)}`);
  }

  // Push summary record
  runSummaries.push({
    scenarioName: scenario.pickle.name,
    status,
    durationMs: durationToMs(scenario.result?.duration as any),
    browserChannel: this.browserChannel ?? "default",
    startIso: new Date((scenario as any).startedAt ?? Date.now()).toISOString?.() ?? "",
    endIso: end.toISOString(),
    failureMessage: scenario.result?.message,
    failureScreenshot: failureShot,
  });

  // Close context/page for scenario
  await this.closeContext();

  // Decide whether to keep browser open
  const keepOpen = (process.env.KEEP_BROWSER_OPEN || "").trim() === "1";
  if (keepOpen) {
    await this.attachText(`KEEP_BROWSER_OPEN=1 -> Browser was left open for debugging.`);
    return;
  }

  await this.closeBrowser();
});

AfterAll(async function () {
  // Write summary files
  const reportsDir = process.env.REPORTS_DIR?.trim()
    ? process.env.REPORTS_DIR.trim()
    : path.resolve(process.cwd(), "reports");

  ensureDir(reportsDir);

  const jsonPath = path.join(reportsDir, "summary.json");
  fs.writeFileSync(jsonPath, JSON.stringify(runSummaries, null, 2), "utf-8");

  const lines = runSummaries.map((s) => {
    const dur = typeof s.durationMs === "number" ? `${s.durationMs}ms` : "n/a";
    return `${s.status} | ${dur} | ${s.browserChannel} | ${s.scenarioName}${s.failureMessage ? " | " + s.failureMessage : ""}`;
  });
  const txtPath = path.join(reportsDir, "summary.txt");
  fs.writeFileSync(txtPath, lines.join("\n"), "utf-8");
});
