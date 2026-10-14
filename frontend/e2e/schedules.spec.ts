import { expect, test, type Page } from "@playwright/test"

/* The list of schedules, read in French on a phone.
 *
 * Both rows were last read by a pass three weeks ago. The one turned off since
 * will never fire, and used to show that stale date as its next one; the one
 * still on fires on the next pass, which is not three weeks ago either. The
 * cadence is the board's English word, said in the console's language. And at
 * 390px the switch, the next date and the name are on the screen, not
 * past an edge the table scrolls to.
 */

const LIST = "/?view=console/schedules/list"

test.use({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })

async function open(page: Page) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(LIST)
  await expect(page.getByText("Test email")).toBeVisible()
}

const row = (page: Page, name: string) => page.locator('[data-slot="table-row"]', { hasText: name })

test("a paused schedule has no next date, and the cadence is said in French", async ({ page }) => {
  await open(page)
  const paused = row(page, "Test email")
  await expect(paused).toContainText("Toutes les heures")
  await expect(paused).not.toContainText("Hourly")
  await expect(paused).toContainText("en pause")
  await expect(paused).not.toContainText("09/09/2026")
  // The one still on is due: it fires on the next pass, not three weeks ago.
  await expect(row(page, "Weekly digest")).not.toContainText("09/09/2026")
  await expect(page.getByText("1 active sur 2")).toBeVisible()
})

test("at 390px the switch, the next date and the name fit on the screen", async ({ page }) => {
  await open(page)
  const table = page.locator('[data-slot="table-container"]').first()
  const overflow = await table.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow, "the table scrolls sideways").toBeLessThanOrEqual(0)
  const paused = row(page, "Test email")
  for (const part of [paused.getByRole("switch"), paused.getByText("en pause"), paused.getByRole("link", { name: "Test email" })]) {
    const box = await part.boundingBox()
    expect(box, "drawn").not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  }
})

test("a schedule's name opens it in the window of the board, full screen on a phone", async ({ page }) => {
  await open(page)
  await row(page, "Test email").getByRole("link", { name: "Test email" }).click()
  const window_ = page.getByRole("dialog")
  await expect(window_.locator('[data-slot="dialog-title"]')).toHaveText("Test email")
  await expect(window_.getByText("Contexte").first()).toBeVisible()
  await expect
    .poll(async () => {
      const box = await window_.boundingBox()
      return box && [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]
    })
    .toEqual([0, 0, 390, 844])
  await page.keyboard.press("Escape")
  await expect(window_).not.toBeAttached()
  await expect(page).toHaveURL(/schedules\/list/)
})

test("the window's button leads to the schedule's page", async ({ page }) => {
  await open(page)
  await row(page, "Test email").getByRole("link", { name: "Test email" }).click()
  await page.getByRole("dialog").getByRole("link", { name: "Ouvrir en page complète" }).click()
  await expect(page).toHaveURL(/schedules\/update\/[0-9a-f]+/)
  await expect(page.getByRole("dialog")).not.toBeAttached()
})
