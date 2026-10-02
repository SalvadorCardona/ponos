import { expect, test, type Page } from "@playwright/test"

/* The settings are one file, and the way back to them is that file.
 *
 * The package links every record to its resource's list — "← Settings" over
 * the title, "Settings" in the bar's breadcrumb — and the settings have none:
 * both led to a page that said "Something went wrong" and nothing else. What is
 * tested is the way back from a section, an address typed by hand, and the top
 * of the page saying what it is once.
 */

const SECTION = "/?view=console/settings/read/config/notify"

async function open(page: Page, path: string) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

const settingsPage = async (page: Page) => {
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toMatch(/^console\/settings\/read\/config/)
  await expect(page.getByRole("heading", { name: "Configure the runner." })).toBeVisible()
  await expect(page.getByText("Something went wrong")).toHaveCount(0)
}

test.use({ viewport: { width: 1440, height: 900 } })

test("the breadcrumb leads from a section back to the settings", async ({ page }) => {
  await open(page, SECTION)
  await settingsPage(page)
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Settings" }).click()
  await settingsPage(page)
})

for (const typed of ["/?view=console/settings", "/?view=console/settings/list"]) {
  test(`${typed} opens the settings`, async ({ page }) => {
    await open(page, typed)
    await settingsPage(page)
  })
}

test("the page has one title, and no way back to a list", async ({ page }) => {
  await open(page, SECTION)
  await settingsPage(page)
  // The layout's header is where "← Settings", the second title and "#config" were.
  await expect(page.locator('[data-slot="admin-header"]')).toHaveCount(0)
  await expect(page.getByText("#config")).toHaveCount(0)
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("config.toml")
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1)
})
