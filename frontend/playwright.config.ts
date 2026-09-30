import { defineConfig } from "@playwright/test"

/* The console in a browser, against a real `ticket-runner serve`.
 *
 * `e2e/console.py` starts it on a board of Markdown files it writes itself, so
 * the tests need python3 and nothing of yours. The browser is the Chrome
 * already on the machine — GitHub's runners have one too — rather than one
 * Playwright downloads: `npm ci` stays an install of packages, not of browsers.
 */
const PORT = 8790

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
  },
  webServer: {
    command: `python3 e2e/console.py ${PORT}`,
    url: `http://127.0.0.1:${PORT}/?token=e2e`,
    reuseExistingServer: false,
  },
})
