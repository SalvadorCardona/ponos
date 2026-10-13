import { expect, test, type Locator, type Page } from "@playwright/test"

/* The Ideas page: every idea in one place, with the project it is for.
 *
 * The ideas come from the same fake `claude` as the swipe's spec (see
 * `console.py`). What is checked is what somebody does with the page: reaching
 * it from the menu, finding the ideas Ponos asked for in it, the project's name
 * on its ideas, the three filters and the address that keeps them, the gestures
 * of a card — the one in sight and the ones in its menu —, reading one and
 * writing one, and turning an idea into a ticket of the right project — and, at
 * the width of a phone, a single column inside the screen.
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
const drawer = (page: Page) => page.locator('[data-slot="drawer-popup"]')
/** What the address says the list is filtered on. */
const filterOf = (page: Page) => {
  // Written by the package encoded once more than a search parameter is.
  let said = new URL(page.url()).searchParams.get("filter") || "{}"
  while (!said.startsWith("{")) said = decodeURIComponent(said)
  return JSON.parse(said)
}

/** One of the gestures a card keeps in its menu. Opened again when it closes
 * under the click: a menu opened while the last one is still leaving is closed
 * by the focus that one gives back to its button. */
async function choose(page: Page, card: Locator, name: string) {
  const item = page.getByRole("menuitem", { name, exact: true })
  await expect(async () => {
    if (!(await item.isVisible())) await card.locator('[data-slot="ideas-menu"]').click()
    await item.click({ timeout: 1000 })
  }).toPass()
}

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

  test("the swipe's button looks like the dashboard's, and New idea is at the top of the list", async ({ page }) => {
    const look = (selector: string) =>
      page.locator(selector).first().evaluate((el) => {
        const css = getComputedStyle(el)
        return [css.backgroundColor, css.borderTopColor, css.color, css.height].join("|")
      })
    await open(page, "/")
    const dashboard = await look('[data-slot="ideas-button"]')
    await open(page)
    expect(await look('[data-slot="ideas-button"]')).toBe(dashboard)
    const header = page.locator('[data-slot="list-header"]')
    await expect(header.getByRole("button", { name: "New idea", exact: true })).toBeVisible()
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

    // One gesture in sight, the others in the menu.
    await expect(mine().getByRole("button", { name: "Turn into a ticket" })).toBeVisible()
    await expect(mine().getByRole("button", { name: "Keep", exact: true })).toHaveCount(0)

    await choose(page, mine(), "Keep")
    await status(page, "kept").click()
    await expect(mine()).toHaveAttribute("data-status", "kept")
    await choose(page, mine(), "Back to new")
    await expect(mine()).toHaveCount(0)

    await status(page, "proposed").click()
    await choose(page, mine(), "Throw away")
    await status(page, "discarded").click()
    await expect(mine()).toHaveAttribute("data-status", "discarded")
    await choose(page, mine(), "Back to new")
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
  test("the filters are in the address, and a reload or a shared link opens the same list", async ({ page }) => {
    await open(page)
    await expect(cards(page).first()).toBeVisible()
    await status(page, "proposed").click()
    const filter = page.locator('[data-slot="ideas-project-filter"]')
    await filter.click()
    await page.getByRole("option", { name: "Website" }).click()
    await page.locator('[data-slot="ideas-author-filter"]').click()
    await page.getByRole("option", { name: "Written by Ponos" }).click()
    await expect.poll(() => filterOf(page)).toMatchObject({ status: "proposed", author: "ponos" })
    expect(filterOf(page).project).toBeTruthy()
    const shown = await cards(page).count()
    expect(shown).toBeGreaterThan(0)
    const address = page.url()

    await page.reload()
    await expect(cards(page)).toHaveCount(shown)
    await expect(status(page, "proposed")).toHaveAttribute("aria-pressed", "true")
    await expect(filter).toContainText("Website")
    await expect(page.locator('[data-slot="ideas-author-filter"]')).toContainText("Written by Ponos")
    for (const card of await cards(page).all()) {
      await expect(card).toHaveAttribute("data-status", "proposed")
      await expect(card).toHaveAttribute("data-author", "ponos")
    }

    await open(page, address)
    await expect(cards(page)).toHaveCount(shown)
    // Back to "all": nothing left in the address.
    await page.getByRole("button", { name: "Clear the search" }).first().click()
    await expect(status(page, "all")).toHaveAttribute("aria-pressed", "true")
    await expect.poll(() => Object.keys(filterOf(page)).length).toBe(0)
  })

  test("a list the filters empty says so, and its button brings the ideas back", async ({ page }) => {
    await open(page)
    await page.locator('[data-slot="ideas-author-filter"]').click()
    await page.getByRole("option", { name: "Written by us" }).click()
    await status(page, "ticket").click()
    await expect(page.getByText("No idea matches these filters.")).toBeVisible()
    await page.getByRole("button", { name: "Clear the filters" }).click()
    await expect(cards(page).first()).toBeVisible()
  })

  test("an idea's title opens it whole, and New idea writes one", async ({ page }) => {
    await open(page)
    await status(page, "proposed").click()
    const first = cards(page).first()
    const title = (await first.locator('[data-slot="ideas-title"]').textContent())!
    await first.locator('[data-slot="ideas-title"]').click()
    const whole = drawer(page).locator('[data-slot="ideas-page"]')
    await expect(whole.getByRole("heading", { name: title })).toBeVisible()
    await expect(whole.getByRole("button", { name: "Turn into a ticket" })).toBeVisible()
    await expect(whole.getByRole("button", { name: "Keep", exact: true })).toBeVisible()
    await page.keyboard.press("Escape")

    await page.locator('[data-slot="list-header"]').getByRole("button", { name: "New idea", exact: true }).click()
    await drawer(page).getByLabel("Title").fill("A shop for the mugs")
    await drawer(page).getByRole("button", { name: "Create" }).click()
    await expect(page.getByText("Idea saved: A shop for the mugs")).toBeVisible()
    const mine = cards(page).filter({ hasText: "A shop for the mugs" })
    await expect(mine).toHaveAttribute("data-author", "human")
    await expect(mine.locator('[data-slot="idea-origin"]')).toHaveText("Workspace")
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
