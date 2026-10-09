import { expect, test, type Page } from "@playwright/test"

/* The Ideas page: every idea in one place, with the project it is for.
 *
 * The ideas come from the same fake `claude` as the swipe's spec (see
 * `console.py`). What is checked is what somebody does with the page: reaching
 * it from the menu, finding the ideas Ponos asked for in it, the project's name
 * on its ideas, the two filters, and turning an idea into a ticket of the right
 * project — and, at the width of a phone, a single column inside the screen.
 *
 * One server and one file, one test after another: the ideas are the console's.
 */

test.describe.configure({ mode: "serial" })

const PROJECT = "/?view=console/projects/read/0000000000000000000000000000cafe"
const PAGE = "/?view=console/ideas/list"

async function open(page: Page, path = PAGE) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

const cards = (page: Page) => page.locator('[data-slot="ideas-item"]')
const origin = (page: Page, name: string) => page.locator('[data-slot="idea-origin"]', { hasText: name })
const status = (page: Page, key: string) => page.locator(`[data-slot="ideas-filter"][data-status="${key}"]`)

/** Ask for a batch from the page's button, sort nothing, and close the swipe. */
async function ask(page: Page) {
  await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
  await expect(page.locator('[data-slot="ideas-card"]').first()).toBeVisible({ timeout: 20_000 })
  await page.keyboard.press("Escape")
  await expect(cards(page).first()).toBeVisible()
}

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the menu has an Ideas entry that opens the page, and what is asked for appears in it", async ({ page }) => {
    await open(page, "/")
    await page.getByRole("link", { name: "Ideas", exact: true }).click()
    await expect(page).toHaveURL(/view=console\/ideas\/list/)
    await expect(page.getByRole("heading", { name: "Ideas", exact: true })).toBeVisible()
    await ask(page)
    await expect(cards(page).first().locator('[data-slot="ideas-status"]')).toHaveText("New")
    await expect(page.locator('[data-slot="ideas-kind"]', { hasText: "Ticket" }).first()).toBeVisible()
    await expect(origin(page, "Workspace").first()).toBeVisible()
  })

  test("a project's ideas carry its name, and the filters narrow the list", async ({ page }) => {
    await open(page, PROJECT)
    await page.getByRole("button", { name: "Find me ideas for this project" }).click()
    await expect(page.locator('[data-slot="ideas-card"]').first()).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press("Escape")

    await open(page)
    await expect(cards(page).first()).toBeVisible()
    const all = await cards(page).count()
    const website = cards(page).filter({ has: origin(page, "Website") })
    await expect(website.first()).toBeVisible()
    const mine = await website.count()
    expect(mine).toBeLessThan(all)

    const filter = page.locator('[data-slot="ideas-project-filter"]')
    await filter.click()
    await page.getByRole("option", { name: "Website" }).click()
    await expect(cards(page)).toHaveCount(mine)
    await filter.click()
    await page.getByRole("option", { name: "Workspace" }).click()
    await expect(cards(page).first()).toBeVisible()
    await expect(origin(page, "Website")).toHaveCount(0)

    await filter.click()
    await page.getByRole("option", { name: "All projects" }).click()
    await status(page, "kept").click()
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText("No idea matches these filters.")).toBeVisible()
  })

  test("keep, throw away and back to new move an idea between states", async ({ page }) => {
    await open(page)
    await status(page, "proposed").click()
    const title = (await cards(page).first().locator('[data-slot="ideas-title"]').textContent())!
    const mine = () => cards(page).filter({ hasText: title })

    await mine().getByRole("button", { name: "Keep", exact: true }).click()
    await status(page, "kept").click()
    await expect(mine()).toHaveAttribute("data-status", "kept")
    await mine().getByRole("button", { name: "Back to new" }).click()
    await expect(mine()).toHaveCount(0)

    await status(page, "proposed").click()
    await mine().getByRole("button", { name: "Throw away" }).click()
    await status(page, "discarded").click()
    await expect(mine()).toHaveAttribute("data-status", "discarded")
    await mine().getByRole("button", { name: "Back to new" }).click()
    await expect(mine()).toHaveCount(0)
  })

  test("an idea of a project becomes a draft ticket of that project", async ({ page }) => {
    await open(page)
    const filter = page.locator('[data-slot="ideas-project-filter"]')
    await filter.click()
    await page.getByRole("option", { name: "Website" }).click()
    await status(page, "proposed").click()
    const title = (await cards(page).first().locator('[data-slot="ideas-title"]').textContent())!
    await cards(page).first().getByRole("button", { name: "Turn into a ticket" }).click()
    await expect(page.getByText(`Ticket created: ${title}`)).toBeVisible()
    await status(page, "ticket").click()
    await expect(cards(page).filter({ hasText: title }).getByRole("link", { name: "Open the ticket" })).toBeVisible()
    const board = (await (await page.request.get("/api/board")).json()).tickets as {
      title: string
      column: string
      project: string
    }[]
    const made = board.find((ticket) => ticket.title === title)
    expect(made?.column).toBe("draft")
    expect(made?.project).toBeTruthy()
  })
})

test.describe("at the width of a phone", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test("the cards stack in one column and stay inside the screen", async ({ page }) => {
    await open(page)
    await expect(cards(page).first()).toBeVisible()
    const box = (await cards(page).first().boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(360)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
})
