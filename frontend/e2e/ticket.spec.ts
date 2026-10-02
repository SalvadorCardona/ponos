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

test.use({ viewport: { width: 1440, height: 900 } })

test("a ticket opened from the board is drawn before its brief is read, and read once", async ({ page }) => {
  const reads = await counted(page)
  await page.goto("/?view=console/tickets/list/board")
  await page.getByRole("link", { name: "A long ticket" }).click()

  // What the card knew, while the brief is still on its way.
  await expect(header(page)).toHaveText("A long ticket", { timeout: 1000 })
  await expect(page.getByText("no project — a document")).toBeVisible({ timeout: 1000 })
  await expect(page.getByText("Part 40")).not.toBeAttached()

  await expect(page.getByText("Part 40")).toBeAttached()
  // The stream moves the board meanwhile; the page does not read it again.
  await page.waitForTimeout(1500)
  expect(reads).toHaveLength(1)

  // Back to the board and in again: a new opening, a new read.
  await page.goBack()
  await page.getByRole("link", { name: "A long ticket" }).click()
  await expect(page.getByText("Part 40")).toBeAttached()
  expect(reads).toHaveLength(2)
})

test("a ticket opened by its address, before the board is there, is read once too", async ({ page }) => {
  const reads = await counted(page)
  await page.goto(`/?view=console/tickets/read/${LONG}`)
  await expect(page.getByText("Part 40")).toBeAttached()
  await page.waitForTimeout(1500)
  expect(reads).toHaveLength(1)
})
