import { expect, test, type Page } from "@playwright/test"

/* Deleting a project asks for its name, and then it is gone at once.
 *
 * From the list and from the project's own page, through the same dialog. What
 * is tested is the way a person goes: the menu, the dialog that names the
 * project and counts its tickets, a button that stays off until the name is
 * typed, and — once it is — the card gone from the list and the ticket the
 * runner could have taken blocked, without waiting for any synchronisation.
 */

const LIST = "/?view=console/projects/list"

async function open(page: Page, path = LIST) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
  await expect(page.getByText("Website").first()).toBeVisible()
}

const card = (page: Page, name: string) => page.locator("[data-project-card]", { hasText: name })
const menu = (page: Page, name: string) => page.getByRole("button", { name: `More actions on “${name}”` })
const dialog = (page: Page) => page.locator("[data-delete-project]")
const confirm = (page: Page) => dialog(page).getByRole("button", { name: "Delete the project" })

async function statusOf(page: Page, title: string) {
  const board = await (await page.request.get("/api/board")).json()
  return board.tickets.find((ticket: { title: string }) => ticket.title === title)?.column
}

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("a project is deleted from the list, once its name is typed", async ({ page }) => {
    await open(page)
    await menu(page, "Old shop").click()
    await page.getByRole("menuitem", { name: "Delete" }).click()

    // It names the project, counts its tickets, and says what happens.
    await expect(dialog(page)).toBeVisible()
    await expect(dialog(page).getByRole("heading", { name: "Delete “Old shop”?" })).toBeVisible()
    await expect(dialog(page)).toContainText("2 tickets point at it")
    await expect(dialog(page)).toContainText("never deleted")
    await expect(confirm(page)).toBeDisabled()

    // Neither a wrong name nor Enter deletes anything.
    const typed = dialog(page).getByLabel(/Type the project's name/)
    await typed.fill("Old shopp")
    await expect(confirm(page)).toBeDisabled()
    await typed.press("Enter")
    await expect(dialog(page)).toBeVisible()
    expect(await statusOf(page, "Old shop work, ready")).toBe("ready")

    await typed.fill("Old shop")
    await expect(confirm(page)).toBeEnabled()
    await confirm(page).click()

    await expect(dialog(page)).toBeHidden()
    await expect(page.getByText("Project “Old shop” deleted")).toBeVisible()
    await expect(card(page, "Old shop")).toHaveCount(0)
    await expect(card(page, "Old blog")).toBeVisible()
    // Its ticket the runner could have taken is stopped; the finished one is not touched.
    await expect.poll(() => statusOf(page, "Old shop work, ready")).toBe("blocked")
    expect(await statusOf(page, "Old shop work, done")).toBe("done")
    const projects = await (await page.request.get("/api/projects")).json()
    expect(projects.projects.map((project: { name: string }) => project.name)).not.toContain("Old shop")
  })

  test("the page of a project has the same action, beside Edit", async ({ page }) => {
    await open(page)
    await card(page, "Old blog").click()
    await expect(page.getByRole("heading", { name: "Old blog" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()

    await menu(page, "Old blog").click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await dialog(page).getByLabel(/Type the project's name/).fill("Old blog")
    await dialog(page).getByRole("checkbox").check()
    await confirm(page).click()

    // Back on the list, where it is no longer.
    await expect(page).toHaveURL(/view=console\/projects\/list/)
    await expect(card(page, "Website")).toBeVisible()
    await expect(card(page, "Old blog")).toHaveCount(0)
    await expect(page.getByText("Project “Old blog” deleted")).toBeVisible()
    // And, as asked, its tickets are out of the board with it.
    await expect.poll(() => statusOf(page, "Old blog work, ready")).toBeUndefined()
    expect(await statusOf(page, "Old blog work, done")).toBeUndefined()
  })
})
