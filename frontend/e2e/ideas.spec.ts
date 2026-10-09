import { expect, test, type Page } from "@playwright/test"

/* The ideas, swiped one card at a time.
 *
 * Ten ideas come from a `claude` that proposes them (see `console.py`), and what
 * is checked is what a person does with them: asking from the dashboard and from
 * a project's page, throwing a card with a mouse drag, a button and an arrow,
 * keeping one and finding the draft on the board, taking a decision back,
 * changing one's mind from the history, and — at the width of a phone — a pile
 * that fills the screen and still answers a drag.
 *
 * One server and one file, one test after another: the ideas are the console's,
 * and the pile a test leaves is the pile the next one opens.
 */

test.describe.configure({ mode: "serial" })

const PROJECT = "/?view=console/projects/read/0000000000000000000000000000cafe"

async function open(page: Page, path = "/") {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

const dialog = (page: Page) => page.locator('[data-slot="ideas-dialog"]')
const cards = (page: Page) => dialog(page).locator('[data-slot="ideas-card"]')
const top = (page: Page) => dialog(page).locator('[data-slot="ideas-card"][data-depth="0"]')

/** A card taken by the mouse and let go of `dx` pixels to the side. */
async function drag(page: Page, dx: number) {
  const box = (await top(page).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + 4, { steps: 6 })
  await page.mouse.move(x + dx, y + 8, { steps: 6 })
  return () => page.mouse.up()
}

async function board(page: Page): Promise<{ title: string; column: string }[]> {
  const response = await page.request.get("/api/board")
  return (await response.json()).tickets
}

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the dashboard's button asks for the workspace's ideas, and → keeps one as a draft", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(dialog(page).getByText("Ponos is looking for ideas…")).toBeVisible()
    await expect(top(page)).toBeVisible({ timeout: 20_000 })
    await expect(cards(page)).toHaveCount(3)
    await expect(top(page)).toContainText("Build the calendar module")
    await expect(top(page).locator('[data-slot="ideas-kind"]')).toHaveText("Ticket")

    await page.keyboard.press("ArrowRight")
    await expect(page.getByText("Ticket created: Build the calendar module for sales")).toBeVisible()
    await expect(top(page)).not.toContainText("calendar")
    await expect(top(page).locator('[data-slot="ideas-kind"]')).toHaveText("New project")
    await expect
      .poll(async () => (await board(page)).find((ticket) => ticket.title === "Build the calendar module for sales")?.column)
      .toBe("draft")
  })

  test("← throws one away, Undo brings it back, and the ✕ and ♥ buttons do the same", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(top(page)).toBeVisible()
    const title = (await top(page).locator("h3").textContent())!

    await page.keyboard.press("ArrowLeft")
    await expect(top(page).locator("h3")).not.toHaveText(title)
    await dialog(page).getByRole("button", { name: "Undo" }).click()
    await expect(top(page).locator("h3")).toHaveText(title)

    await dialog(page).getByRole("button", { name: "Throw away" }).click()
    await expect(top(page).locator("h3")).not.toHaveText(title)
    await expect(dialog(page).getByRole("button", { name: "Undo" })).toBeEnabled()
  })

  test("dragging a card leans it and stamps it, and a short drag brings it back", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(top(page)).toBeVisible()
    const title = (await top(page).locator("h3").textContent())!

    const letGo = await drag(page, -60)
    await expect(top(page).locator('[data-slot="ideas-stamp-discard"]')).not.toHaveCSS("opacity", "0")
    await expect(top(page)).toHaveCSS("transform", /matrix\(0\.9\d+, -0\.\d+/)
    await letGo()
    await expect(top(page)).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)")
    await expect(top(page).locator("h3")).toHaveText(title)

    const keep = await drag(page, 220)
    await expect(top(page).locator('[data-slot="ideas-stamp-keep"]')).toHaveCSS("opacity", "1")
    await keep()
    await expect(top(page).locator("h3")).not.toHaveText(title)
  })

  test("the history holds what was decided, and a thrown idea can still be kept", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(top(page)).toBeVisible()
    await dialog(page).getByRole("tab", { name: "Kept / Thrown" }).click()
    const history = dialog(page).locator('[data-slot="ideas-history"] li')
    await expect(history.first()).toBeVisible()
    await expect(dialog(page).locator('li[data-status="kept"]', { hasText: "Build the calendar module" })).toBeVisible()
    const thrown = dialog(page).locator('li[data-status="discarded"]').first()
    const title = (await thrown.locator("p").first().textContent())!
    await thrown.getByRole("button", { name: "Keep it after all" }).click()
    await expect(dialog(page).locator('li[data-status="kept"]', { hasText: title })).toBeVisible()
  })

  test("the end of the pile says so, and ‘Ten more’ asks for another batch", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(top(page)).toBeVisible()
    // Left alone, the page's focus is on the pile: the arrows work as they are.
    for (let left = await cards(page).count(); left > 0; left = await cards(page).count()) {
      const shown = (await top(page).locator("h3").textContent())!
      await page.keyboard.press("ArrowLeft")
      await expect(top(page).locator("h3")).not.toHaveText(shown)
        .catch(() => undefined)
      if ((await dialog(page).locator('[data-slot="ideas-finished"]').count()) > 0) break
    }
    await expect(dialog(page).getByText("No more ideas")).toBeVisible({ timeout: 20_000 })
    await dialog(page).getByRole("button", { name: "Ten more" }).click()
    await expect(top(page)).toBeVisible({ timeout: 20_000 })
    await expect(top(page)).toContainText("module for support")
  })

  test("a project's page asks for that project's ideas, which are all tickets", async ({ page }) => {
    await open(page, PROJECT)
    await page.getByRole("button", { name: "Find me ideas for this project" }).click()
    await expect(dialog(page).getByRole("heading", { name: "Ideas for Website" })).toBeVisible()
    await expect(top(page)).toBeVisible({ timeout: 20_000 })
    await expect(top(page).locator('[data-slot="ideas-kind"]')).toHaveText("Ticket")
    await expect(top(page)).toContainText("Website")
    await page.keyboard.press("ArrowRight")
    await expect(page.getByText(/Ticket created: Build the/)).toBeVisible()
    await expect
      .poll(async () => (await board(page)).filter((ticket) => ticket.title.startsWith("Build the") && ticket.column === "draft").length)
      .toBeGreaterThan(1)
  })
})

test.describe("at the width of a phone", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test("the pile fills the screen, and a drag with a thumb keeps a card", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "Ponos, find me ideas", exact: true }).click()
    await expect(top(page)).toBeVisible({ timeout: 20_000 })
    // Once the dialog has finished opening (it zooms in).
    await expect.poll(async () => (await dialog(page).boundingBox())?.width).toBeGreaterThanOrEqual(359)
    await expect.poll(async () => (await dialog(page).boundingBox())?.height).toBeGreaterThanOrEqual(739)
    const card = (await top(page).boundingBox())!
    expect(card.x).toBeGreaterThanOrEqual(0)
    expect(card.x + card.width).toBeLessThanOrEqual(360)
    // The buttons are under the pile, in reach, and inside the screen.
    for (const name of ["Throw away", "Keep"]) {
      const button = (await dialog(page).getByRole("button", { name }).boundingBox())!
      expect(button.y + button.height).toBeLessThanOrEqual(740)
      expect(button.width).toBeGreaterThanOrEqual(44)
    }
    const title = (await top(page).locator("h3").textContent())!
    const letGo = await drag(page, 150)
    await expect(top(page).locator('[data-slot="ideas-stamp-keep"]')).not.toHaveCSS("opacity", "0")
    await letGo()
    await expect(top(page).locator("h3")).not.toHaveText(title)
    await expect(page.getByText(/(Ticket|Project) created/)).toBeVisible()
  })
})
