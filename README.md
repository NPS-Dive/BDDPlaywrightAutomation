# Booking.com BDD Automation (Cucumber + Playwright + TypeScript)

A showcase automation project that demonstrates **BDD-style E2E testing** using **Cucumber (Gherkin)** with **Playwright** in **TypeScript**.

The suite automates a realistic user flow on Booking.com:
- Open Booking.com
- Close blocking sign-in/modal popups (late-appearing)
- Open currency selector and choose a currency (e.g., TRY)
- Search a destination (e.g., London)
- Choose flexible dates
- Configure guests (adults/rooms) and enable traveling with pets
- Run the search and validate results
- Open availability for a selected hotel (new tab/popup handling)

> Notes: Public sites like Booking.com can be dynamic and region-dependent. This project focuses on robust automation patterns: pop-up handling, resilient locators, retries, timeouts, and reporting.

---

## Tech Stack

- **TypeScript**
- **Cucumber.js** (BDD / Gherkin)
- **Playwright** (browser automation)
- **Node.js**

---

## Project Structure
# Booking.com BDD Automation (Cucumber + Playwright + TypeScript)

A showcase automation project that demonstrates **BDD-style E2E testing** using **Cucumber (Gherkin)** with **Playwright** in **TypeScript**.

The suite automates a realistic user flow on Booking.com:
- Open Booking.com
- Close blocking sign-in/modal popups (late-appearing)
- Open currency selector and choose a currency (e.g., TRY)
- Search a destination (e.g., London)
- Choose flexible dates
- Configure guests (adults/rooms) and enable traveling with pets
- Run the search and validate results
- Open availability for a selected hotel (new tab/popup handling)

> Notes: Public sites like Booking.com can be dynamic and region-dependent. This project focuses on robust automation patterns: pop-up handling, resilient locators, retries, timeouts, and reporting.

---

## Tech Stack

- **TypeScript**
- **Cucumber.js** (BDD / Gherkin)
- **Playwright** (browser automation)
- **Node.js**

---

## Project Structure

features/
booking.feature # Gherkin scenario(s)

src/
steps/
booking.steps.ts # Step definitions (Playwright actions + assertions)
support/
world.ts # Custom Cucumber World (Playwright lifecycle + attachments)
hooks.ts # Before/After hooks + summary reporting
reports/
cucumber-report.json # Cucumber JSON output (generated)
summary.json # Scenario summary (generated)
summary.txt # Scenario summary text (generated)


---

## Setup

### Prerequisites
- Node.js (LTS recommended)
- Installed **Microsoft Edge** or **Google Chrome** (recommended)
  - This project can run using installed browsers via Playwright `channel` to avoid downloading Playwright browsers in restricted networks.

### Install Dependencies

```bash
npm install
```

## Running the BDD Tests
### Default run

```bash
npm run bdd
```

## Useful Environment Variables

### Keep the browser open after scenario (debugging)
 
```bash
# Windows (PowerShell)
set KEEP_BROWSER_OPEN=1
npm run bdd
```

### Run with a specific browser channel

```bash
# Prefer Edge
set BROWSER_CHANNEL=msedge
npm run bdd

# Prefer Chrome
set BROWSER_CHANNEL=chrome
npm run bdd

```

### Run headless
```bash
set HEADLESS=1
npm run bdd
```

### Change output folder

```bash
set REPORTS_DIR=reports
npm run bdd
```


## Reporting Output

After a run, the project generates:

reports/cucumber-report.json (Cucumber JSON)

reports/summary.json (high-level scenario summary)

reports/summary.txt (readable summary)

Failure screenshots (on failed scenarios)


## Design Highlights (What this project demonstrates)

Custom Cucumber World to manage browser/context/page lifecycle

Edge ⇄ Chrome fallback strategy using Playwright Chromium channels

Resilient locator strategy (prefers getByTestId and accessible roles over brittle CSS selectors)

Late-appearing modal handling (waits up to a configurable time before proceeding)

Slow-network friendly defaults (increased navigation/step timeouts)

Popup/new tab handling for hotel availability flows

Action reliability using scrollIntoViewIfNeeded(), explicit waits, and safe retries.


## Disclaimer
This repository is intended for educational/showcase purposes. Booking.com UI and behavior can change. For production systems, tests should ideally target controlled environments (staging, test tenants) rather than public websites.