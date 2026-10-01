import { expect, test, type Page } from "@playwright/test"

/* A click on a project opens its form, in a drawer over the list.
 *
 * It used to open the project's page, and the form was an "Edit" button away
 * from there. What is tested is the way a user goes: a click on the card, a
 * field changed, Save — and the list behind it saying the new name without the
 * page having been loaded again.
 */

const LIST = "/?view=console/projects/list"

async function open(page: Page, path = LIST) {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: "http://127.0.0.1:8790" }])
  await page.goto(path)
  await expect(page.getByText("Website").first()).toBeVisible()
}

const drawer = (page: Page) => page.locator('[data-slot="drawer-popup"]')

async function openWebsite(page: Page) {
  await page.getByText("Website").first().click()
  await expect(drawer(page)).toBeVisible()
  await expect(drawer(page).getByLabel("Project")).toHaveValue("Website")
}

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("a click on a card opens its form in a drawer, over the list", async ({ page }) => {
    await open(page)
    await openWebsite(page)
    // The list is still there, and the address has not moved to a page.
    await expect(page.getByText("Newsletter").first()).toBeAttached()
    expect(new URL(page.url()).searchParams.get("view")).toBe("console/projects/list")
    // The brief is read too: the row has none, the drawer asks for the project.
    await expect(drawer(page).getByText("The brief of Website.")).toBeVisible()
    // And the page it no longer goes through is one link away.
    await expect(drawer(page).getByRole("link", { name: "Open the project's page" })).toBeVisible()
  })

  test("Escape, the cross and a click beside it close the drawer", async ({ page }) => {
    await open(page)
    await openWebsite(page)
    await page.keyboard.press("Escape")
    await expect(drawer(page)).toBeHidden()

    await openWebsite(page)
    await drawer(page).locator('[data-slot="drawer-close"]').click()
    await expect(drawer(page)).toBeHidden()

    await openWebsite(page)
    await page.mouse.click(20, 450)
    await expect(drawer(page)).toBeHidden()
  })

  test("a save closes the drawer and the list says the new name, without a reload", async ({ page }) => {
    await open(page)
    await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true))
    await page.getByText("Newsletter").first().click()
    const name = drawer(page).getByLabel("Project")
    await expect(name).toHaveValue("Newsletter")
    await name.fill("Weekly letter")
    await drawer(page).getByRole("button", { name: "Save" }).click()
    await expect(drawer(page)).toBeHidden()
    await expect(page.getByText("Weekly letter").first()).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true)
  })

  test("the drawer is wide enough to write a brief in, and its first line clears the cross", async ({ page }) => {
    await open(page)
    await openWebsite(page)
    await expect.poll(async () => Math.round((await drawer(page).boundingBox())?.width ?? 0)).toBe(640)
    // Where the words of the line can reach, padding left out: they wrap before
    // the cross however long the line is.
    const reach = await drawer(page)
      .getByRole("link", { name: "Open the project's page" })
      .locator("..")
      .evaluate((line) => line.getBoundingClientRect().right - parseFloat(getComputedStyle(line).paddingRight))
    const cross = await drawer(page).locator('[data-slot="drawer-close"]').boundingBox()
    expect(cross && reach <= cross.x).toBe(true)
  })

  test("a card says its repository by owner and name, as a link of its own", async ({ page }) => {
    await open(page)
    const repository = page.getByRole("link", { name: "example/website" })
    await expect(repository).toBeVisible()
    await expect(repository).toHaveAttribute("href", "https://github.com/example/website")
    await expect(repository).toHaveAttribute("target", "_blank")
  })

  test("the table opens the same drawer from a project's name", async ({ page }) => {
    await open(page, `${LIST}&variant=table`)
    await openWebsite(page)
  })
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the drawer takes the whole screen", async ({ page }) => {
    await open(page)
    await openWebsite(page)
    await expect
      .poll(async () => {
        const box = await drawer(page).boundingBox()
        return box && [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]
      })
      .toEqual([0, 0, 390, 844])
  })
})
