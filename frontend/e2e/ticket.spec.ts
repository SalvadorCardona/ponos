import { expect, test, type Page } from "@playwright/test"

/* Opening a ticket from the board draws it at once, and reads its page once.
 *
 * The page used to stay empty until the server had read the whole ticket from
 * Notion — one to three seconds — while the board already held its title, its
 * column and its project; and the same read went out two or three times. The
 * read is slowed down here on purpose, so that "at once" means before it.
 */

const LONG = "000000000000000000000000000abcde"
const READ = new RegExp(`/api/tickets/${LONG}$`)

async function counted(page: Page) {
  const reads: string[] = []
  await page.route(READ, async (route) => {
    reads.push(route.request().url())
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  return reads
}

const header = (page: Page) => page.locator('[data-slot="admin-header"] h2')
const window_ = (page: Page) => page.getByRole("dialog")

test.use({ viewport: { width: 1440, height: 900 } })

test("a ticket opened from the board is drawn before its brief is read, and read once", async ({ page }) => {
  const reads = await counted(page)
  await page.goto("/?view=console/tickets/list/board")
  await page.getByRole("link", { name: "A long ticket" }).click()

  // What the card knew, while the brief is still on its way.
  await expect(window_(page).locator('[data-slot="dialog-title"]')).toHaveText("A long ticket", { timeout: 1000 })
  await expect(page.getByText("no project — a document")).toBeVisible({ timeout: 1000 })
  await expect(page.getByText("Part 40")).not.toBeAttached()

  await expect(page.getByText("Part 40")).toBeAttached()
  // The stream moves the board meanwhile; the page does not read it again.
  await page.waitForTimeout(1500)
  expect(reads).toHaveLength(1)

  // Back to the board and in again: a new opening, a new read.
  await page.keyboard.press("Escape")
  await expect(window_(page)).not.toBeAttached()
  await page.getByRole("link", { name: "A long ticket" }).click()
  await expect(page.getByText("Part 40")).toBeAttached()
  expect(reads).toHaveLength(2)
})

test("a ticket opened by its address, before the board is there, is read once too", async ({ page }) => {
  const reads = await counted(page)
  await page.goto(`/?view=console/tickets/read/${LONG}`)
  await expect(header(page)).toHaveText("A long ticket")
  await expect(page.getByText("Part 40")).toBeAttached()
  await page.waitForTimeout(1500)
  expect(reads).toHaveLength(1)
})

test("a ticket's page says its type, model and cost, shows its brief, and folds the rest", async ({ page }) => {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(`/?view=console/tickets/read/${LONG}`)
  await expect(page.getByText("Part 40")).toBeAttached()

  // Always there, even before anything ran: what it is, on what, for how much.
  for (const label of ["type", "model", "spent", "priority", "created"])
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  await expect(page.getByText("default", { exact: false }).first()).toBeVisible()

  // A ticket that is not running opens with its session and its discussion folded.
  const live = page.locator('[data-slot="ticket-live-toggle"]')
  const talk = page.locator('[data-slot="ticket-talk-toggle"]')
  await expect(live).toHaveAttribute("data-state", "closed")
  await expect(talk).toHaveAttribute("data-state", "closed")
  await live.click()
  await expect(live).toHaveAttribute("data-state", "open")
  await expect(page.getByText("No journal is left for this ticket", { exact: false })).toBeVisible()
})
