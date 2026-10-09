import { expect, test, type Page } from "@playwright/test"

/* The standing context is the first block of the Projects page.
 *
 * It was a page of its own, in the menu. What is tested is the way a person
 * goes: the page opens on a folded preview of it with the projects right under
 * it, "See all" reads the rest, "Edit" writes it in place with the editor the
 * brief uses, a save reaches the board, leaving with something typed asks first,
 * and the old address leads here rather than to the board.
 */

const LIST = "/?view=console/projects/list"
const LONG = Array.from({ length: 12 }, (_, line) => `Rule number ${line + 1} of the house.`).join("\n\n")

/** Write the context straight to the board, the way the console's own request does. */
const write = (page: Page, text: string) =>
  page.request.post("/api/context", { data: { text }, headers: { "X-Ponos": "1" } })

async function open(page: Page, path = LIST) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await write(page, LONG)
  await page.goto(path)
  await expect(page.getByText("Website").first()).toBeVisible()
}

// One context for the whole board: the tests that write it do not run side by side.
test.describe.configure({ mode: "serial" })

const block = (page: Page) => page.locator('[data-slot="context-block"]')

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the context is folded over the projects, read in full and edited in place", async ({ page }) => {
    await open(page)
    await expect(block(page).getByText("Sent to Ponos in every ticket, for all the projects")).toBeVisible()
    await expect(block(page).getByText("Rule number 1 of the house.")).toBeVisible()

    // Folded: a few lines, and the projects are under it.
    const folded = (await block(page).boundingBox())!
    expect(folded.height).toBeLessThan(260)
    const card = (await page.locator("[data-project-card]").first().boundingBox())!
    expect(card.y).toBeGreaterThan(folded.y + folded.height - 1)

    await block(page).getByRole("button", { name: "See all" }).click()
    await expect(block(page).getByText("Rule number 12 of the house.")).toBeInViewport()
    await block(page).getByRole("button", { name: "Fold" }).click()

    await block(page).getByRole("button", { name: "Edit" }).click()
    const save = block(page).getByRole("button", { name: "Save", exact: true })
    await expect(save).toBeDisabled()
    await block(page).locator(".ProseMirror").click()
    await page.keyboard.press("Control+End")
    await page.keyboard.type(" Always in French.")
    await expect(block(page).getByText("Unsaved changes")).toBeVisible()

    // Leaving with something typed asks first, and staying keeps it.
    await page.getByRole("link", { name: "Schedules" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await page.getByRole("button", { name: "Keep editing" }).click()
    await expect(block(page).locator(".ProseMirror")).toBeVisible()

    await save.click()
    await expect(page.getByText("The context is saved")).toBeVisible()
    await expect(block(page).locator(".ProseMirror")).toBeHidden()

    // Written to the board, not just drawn.
    const saved = await (await page.request.get("/api/context")).json()
    expect(saved.text).toContain("Always in French.")
    await page.reload()
    await block(page).getByRole("button", { name: "See all" }).click()
    await expect(block(page).getByText("Always in French.")).toBeVisible()
  })

  test("an empty context says so, with a button to write it", async ({ page }) => {
    await open(page)
    await write(page, "")
    await page.reload()
    await expect(block(page).getByText(/Nothing is written yet/)).toBeVisible()
    await block(page).getByRole("button", { name: "Write the context" }).click()
    await expect(block(page).locator(".ProseMirror")).toBeVisible()
  })

  test("the menu has no Context, and its old address leads to the Projects page", async ({ page }) => {
    await open(page)
    await expect(page.getByRole("link", { name: "Projects" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Context", exact: true })).toHaveCount(0)
    await page.goto("/?view=console/context/list")
    await expect(page).toHaveURL(/view=console\/projects\/list/)
    await expect(block(page)).toBeVisible()
    await page.goto("/?page=context")
    await expect(page).toHaveURL(/view=console\/projects\/list/)
  })

  test("a project's brief links back to the context", async ({ page }) => {
    await open(page, "/?view=console/projects/read/0000000000000000000000000000cafe&tab=brief")
    await page.getByRole("link", { name: "Inherits the global context ↑" }).click()
    await expect(page).toHaveURL(/view=console\/projects\/list/)
    await expect(block(page)).toBeInViewport()
  })
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 780 } })

  test("folded, the context leaves the first project on the screen", async ({ page }) => {
    await open(page)
    await expect(block(page)).toBeVisible()
    const card = (await page.locator("[data-project-card]").first().boundingBox())!
    expect(card.y).toBeLessThan(780)
  })
})
