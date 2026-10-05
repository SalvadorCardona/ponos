import { expect, test, type Page } from "@playwright/test"

/* The dashboard: the statistics of a period over the board, in one page.
 *
 * The statistics were a page of their own, behind an entry of the menu; they
 * are now a band at the top of the board, on the last seven days until somebody
 * picks another period. What is checked is what somebody sees: the menu names
 * the page Dashboard and has no Statistics, the band opens on seven days above
 * the tickets, a period picked is a question asked again, and the old address
 * lands on the dashboard rather than on nothing.
 */

async function open(page: Page, path = "/") {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
}

/** The local day `back` days before today, as the band asks for it. */
function day(back: number): string {
  const date = new Date()
  date.setDate(date.getDate() - back)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const band = (page: Page) => page.locator('[data-slot="statistics-band"]')

test("the menu names the dashboard, and has no statistics of its own", async ({ page }) => {
  await open(page)
  const menu = page.locator('[data-slot="sidebar"]').first()
  await expect(menu.getByText("Dashboard", { exact: true })).toBeVisible()
  await expect(menu.getByText("Statistics", { exact: true })).toHaveCount(0)
})

test("the dashboard opens on the last seven days, over the tickets", async ({ page }) => {
  const asked = page.waitForRequest((request) => request.url().includes("/api/statistics"))
  await open(page)
  const url = new URL((await asked).url())
  expect(url.searchParams.get("from")).toBe(day(6))
  expect(url.searchParams.get("to")).toBe(day(0))

  await expect(band(page).getByRole("tab", { name: "7 days" })).toHaveAttribute("aria-selected", "true")
  await expect(band(page).getByText("Open", { exact: true }).first()).toBeVisible()
  const top = (await band(page).boundingBox())!.y
  const card = (await page.getByText("A long ticket").filter({ visible: true }).first().boundingBox())!.y
  expect(top, "the statistics come before the tickets").toBeLessThan(card)
})

test("a period picked is asked for again", async ({ page }) => {
  await open(page)
  for (const [name, back] of [
    ["30 days", 29],
    ["24 h", 1],
  ] as const) {
    const asked = page.waitForRequest((request) => request.url().includes("/api/statistics"))
    await band(page).getByRole("tab", { name }).click()
    expect(new URL((await asked).url()).searchParams.get("from")).toBe(day(back))
  }
})

test("the band folds into one line, and stays folded", async ({ page }) => {
  await open(page)
  await expect(band(page).getByText("Created and closed", { exact: true })).toBeVisible()
  await band(page).getByRole("button", { name: /Statistics/ }).click()
  await expect(band(page).getByText("Created and closed", { exact: true })).toBeHidden()
  await expect(band(page).getByText(/\d+ open · \d+ closed/)).toBeVisible()
  await page.reload()
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
  await expect(band(page).getByText("Created and closed", { exact: true })).toBeHidden()
})

test("the old address of the statistics leads to the dashboard", async ({ page }) => {
  await open(page, "/?view=console/statistics/list")
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toContain("console/tickets/list")
  await expect(band(page)).toBeVisible()
})
