import { expect, test, type Page } from "@playwright/test"

/* The calendar of the schedules, as a month of launches and not a row's one date.
 *
 * "Weekly digest" is on and due, hourly: it fires every hour, from now on, and
 * a day holds twenty-four of them — one event, "24 lancements". "Test email" is
 * off but fired a minute ago: it is on the calendar once, in the past, and in
 * no month after this one. Which is what it used to get wrong — a single event,
 * on the day `Next` said.
 */

test.use({ locale: "fr-FR", timezoneId: "Europe/Paris" })

async function open(page: Page) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/?view=console/schedules/list&variant=calendar")
  await expect(page.getByRole("heading", { level: 3 })).toBeVisible()
}

const heading = (page: Page) => page.getByRole("heading", { level: 3 })
const folded = (page: Page) => page.getByRole("button", { name: /24 lancements · Weekly digest/ })

test("an hourly schedule is one event a day, for every day of the months to come", async ({ page }) => {
  await open(page)
  const month = (await heading(page).textContent()) ?? ""
  await page.getByRole("button", { name: "Suivant" }).click()
  await expect(heading(page)).not.toHaveText(month)
  // Every cell of the grid is a day of that month, or of its neighbours: all of them are full.
  expect(await folded(page).count()).toBeGreaterThanOrEqual(28)
  await page.getByRole("button", { name: "Suivant" }).click()
  expect(await folded(page).count()).toBeGreaterThanOrEqual(28)
  await page.getByRole("button", { name: "Aujourd'hui" }).click()
  await expect(heading(page)).toHaveText(month)
})

test("a schedule that is off is in the past only", async ({ page }) => {
  await open(page)
  const month = (await heading(page).textContent()) ?? ""
  const paused = page.getByRole("button", { name: /Test email/ })
  await expect(paused).toHaveCount(1)
  // Greyed: it is not drawn in the colour of what is to come.
  await expect(paused).not.toHaveClass(/bg-primary/)
  await expect(folded(page).first()).toHaveClass(/bg-primary/)
  await page.getByRole("button", { name: "Suivant" }).click()
  await expect(heading(page)).not.toHaveText(month)
  await expect(paused).toHaveCount(0)
})

test("an event says what it is and opens the schedule in the window of the list", async ({ page }) => {
  await open(page)
  await page.getByRole("button", { name: /Test email/ }).click()
  await expect(page.getByText("Dernier lancement")).toBeVisible()
  await page.getByRole("link", { name: "Ouvrir la récurrence" }).click()
  await expect(page.getByRole("dialog").locator('[data-slot="dialog-title"]')).toHaveText("Test email")
})

test("the week and the day show the launches of the night too", async ({ page }) => {
  await open(page)
  await page.getByRole("tab", { name: "Semaine" }).click()
  await expect(page.getByText("00:00", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("23:00", { exact: true }).first()).toBeAttached()
})
