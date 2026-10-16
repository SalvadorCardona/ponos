import { expect, test, type Page } from "@playwright/test"

/* The Projects page in two columns: the list on the left, the global context and
 * the project picked on the right.
 *
 * What is tested is the way a person goes: a project picked fills the panel with
 * its repository, its folder and its brief while the context stays folded above
 * it; the page of the project is a link from there; and on a phone the panel is
 * a sheet over the list.
 */

const LIST = "/?view=console/projects/list"

async function open(page: Page) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(LIST)
  await expect(page.locator("[data-project-item]", { hasText: "Website" })).toBeVisible()
}

const item = (page: Page, name: string) => page.locator("[data-project-item]", { hasText: name })
const panel = (page: Page) => page.locator("[data-project-panel]")

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the list is on the left, the context and the project picked on the right", async ({ page }) => {
    await open(page)
    const context = (await page.locator('[data-slot="context-block"]').boundingBox())!
    const first = (await item(page, "Website").boundingBox())!
    expect(first.x + first.width).toBeLessThanOrEqual(context.x)
    await expect(panel(page)).toHaveCount(0)

    await item(page, "Website").click()
    await expect(item(page, "Website")).toHaveAttribute("aria-pressed", "true")
    await expect(panel(page)).toContainText("Website")
    await expect(panel(page)).toContainText("example/website")
    await expect(panel(page).getByRole("link", { name: /Ticket/ })).toBeVisible()
    // The context is still there, over the project.
    await expect(page.locator('[data-slot="context-block"]')).toBeVisible()

    await item(page, "Journal").click()
    await expect(panel(page)).toContainText("Journal")
    await expect(panel(page)).not.toContainText("example/website")
  })

  test("the panel leads to the page of the project", async ({ page }) => {
    await open(page)
    await item(page, "Website").click()
    await panel(page).getByRole("link", { name: "Open the project's page" }).click()
    await expect(page).toHaveURL(/view=console\/projects\/read/)
    await expect(page.getByRole("heading", { name: "Website" })).toBeVisible()
  })
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("a project picked opens full screen over the list, and the cross brings the list back", async ({ page }) => {
    await open(page)
    await expect(panel(page)).toHaveCount(0)
    await item(page, "Website").click()
    const sheet = page.locator('[data-slot="sheet-content"]')
    await expect(sheet).toBeVisible()
    await expect(sheet.locator("[data-project-panel]")).toContainText("Website")
    const box = (await sheet.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(389)
    await sheet.getByRole("button", { name: "Close" }).click()
    await expect(sheet).toBeHidden()
    await expect(item(page, "Website")).toBeVisible()
  })
})
