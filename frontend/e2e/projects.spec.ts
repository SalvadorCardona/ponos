import { expect, test, type Page } from "@playwright/test"

/* A project in the list is a link to its page, the whole card of it.
 *
 * It was a name to click on a card most of which did nothing, and a button
 * under it to open the page. What is tested is the way a user goes: a click
 * anywhere on the card, a middle click for a tab, Tab then Enter — and, from
 * the page, the form in a drawer, a field changed, Save.
 */

const LIST = "/?view=console/projects/list"

async function open(page: Page, path = LIST) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
  await expect(page.getByText("Website").first()).toBeVisible()
}

const card = (page: Page, name: string) => page.locator("[data-project-card]", { hasText: name })
const drawer = (page: Page) => page.locator('[data-slot="drawer-popup"]')

/** The page of a project: its address, and its name in the header. */
async function onThePageOf(page: Page, name: string) {
  await expect(page).toHaveURL(/view=console\/projects\/read/)
  await expect(page.getByRole("heading", { name })).toBeVisible()
}

async function openWebsiteForm(page: Page) {
  await card(page, "Website").click()
  await onThePageOf(page, "Website")
  await page.getByRole("button", { name: "Edit" }).click()
  await expect(drawer(page)).toBeVisible()
  await expect(drawer(page).getByLabel("Project")).toHaveValue("Website")
}

test.describe("at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("a click anywhere on a card opens the project's page", async ({ page }) => {
    await open(page)
    const box = (await card(page, "Website").boundingBox())!
    // The bottom right corner: neither the name nor the picture.
    await page.mouse.click(box.x + box.width - 12, box.y + box.height - 12)
    await onThePageOf(page, "Website")
  })

  test("a card is a real link: a middle click opens the project in a tab", async ({ page }) => {
    await open(page)
    await expect(card(page, "Website")).toHaveAttribute("href", /projects\/read/)
    const [tab] = await Promise.all([
      page.context().waitForEvent("page"),
      card(page, "Website").click({ button: "middle" }),
    ])
    await tab.waitForLoadState()
    expect(tab.url()).toMatch(/projects\/read/)
    // And the list stays where it was.
    expect(new URL(page.url()).searchParams.get("view")).toBe("console/projects/list")
  })

  test("a card is reached from the keyboard, and Enter opens it", async ({ page }) => {
    await open(page)
    await card(page, "Journal").focus()
    await expect(card(page, "Journal")).toBeFocused()
    await page.keyboard.press("Enter")
    await onThePageOf(page, "Journal")
  })

  test("a card says its kind, its repository and its tickets, and has no button under it", async ({ page }) => {
    await open(page)
    const website = card(page, "Website")
    await expect(website.getByText("Code", { exact: true })).toBeVisible()
    await expect(website.getByText("example/website")).toBeVisible()
    // No path is set: nothing is said about where the clone is.
    await expect(website.getByText("wherever the clone is")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Open", exact: true })).toHaveCount(0)
    await expect(page.locator("[data-project-card] button, [data-project-card] a")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Open", exact: true })).toHaveCount(0)
    for (const name of ["Website", "Newsletter", "Journal"])
      await expect(card(page, name).getByText(/\d+ tickets?/)).toBeVisible()
  })

  test("a project without a repository says it in one line, behind its own icon", async ({ page }) => {
    await open(page)
    const journal = card(page, "Journal")
    await expect(journal.getByText("Writing", { exact: true })).toBeVisible()
    await expect(journal.getByText("Produces documents")).toBeVisible()
    await expect(journal.getByText("📝")).toBeVisible()
  })

  test("the cards of a row are as tall as each other", async ({ page }) => {
    await open(page)
    const heights = await page
      .locator("[data-project-card]")
      .evaluateAll((cards) => cards.map((one) => Math.round(one.getBoundingClientRect().height)))
    expect(heights.length).toBe(3)
    expect(new Set(heights).size).toBe(1)
  })

  test("a row of the table opens the project's page, wherever it is clicked", async ({ page }) => {
    await open(page, `${LIST}&variant=table`)
    const row = page.locator("[data-project-row]", { hasText: "Website" })
    await expect(row).toHaveAttribute("href", /projects\/read/)
    const box = (await row.boundingBox())!
    await page.mouse.click(box.x + box.width - 12, box.y + box.height / 2)
    await onThePageOf(page, "Website")
  })

  test("the form opens in a drawer from the project's page", async ({ page }) => {
    await open(page)
    await openWebsiteForm(page)
    // The brief is read too: the drawer asks for the project.
    await expect(drawer(page).getByText("The brief of Website.")).toBeVisible()
    // A link to the page it is opened from would be a link to where you are.
    await expect(drawer(page).getByRole("link", { name: "Open the project's page" })).toHaveCount(0)
    await expect.poll(async () => Math.round((await drawer(page).boundingBox())?.width ?? 0)).toBe(640)
  })

  test("Escape, the cross and a click beside it close the drawer", async ({ page }) => {
    await open(page)
    await openWebsiteForm(page)
    await page.keyboard.press("Escape")
    await expect(drawer(page)).toBeHidden()

    await page.getByRole("button", { name: "Edit" }).click()
    await expect(drawer(page)).toBeVisible()
    await drawer(page).locator('[data-slot="drawer-close"]').click()
    await expect(drawer(page)).toBeHidden()

    await page.getByRole("button", { name: "Edit" }).click()
    await expect(drawer(page)).toBeVisible()
    await page.mouse.click(20, 450)
    await expect(drawer(page)).toBeHidden()
  })

  test("a save closes the drawer, and the list says the new name", async ({ page }) => {
    await open(page)
    await card(page, "Newsletter").click()
    await onThePageOf(page, "Newsletter")
    await page.getByRole("button", { name: "Edit" }).click()
    const name = drawer(page).getByLabel("Project")
    await expect(name).toHaveValue("Newsletter")
    await name.fill("Weekly letter")
    await drawer(page).getByRole("button", { name: "Save" }).click()
    await expect(drawer(page)).toBeHidden()
    await page.goBack()
    await expect(card(page, "Weekly letter")).toBeVisible()
  })
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the drawer takes the whole screen", async ({ page }) => {
    await open(page)
    await openWebsiteForm(page)
    await expect
      .poll(async () => {
        const box = await drawer(page).boundingBox()
        return box && [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]
      })
      .toEqual([0, 0, 390, 844])
  })
})

test.describe("the statistics of a project", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the page asks for its own project, folds, and keeps to the phone's width", async ({ page }) => {
    await open(page)
    await card(page, "Website").click()
    await onThePageOf(page, "Website")
    const band = page.locator('[data-slot="statistics-band"]')
    await expect(band.getByRole("tab", { name: "7 days" })).toHaveAttribute("aria-selected", "true")

    const asked = page.waitForRequest(
      (request) => request.url().includes("/api/statistics") && request.url().includes("project=Website")
    )
    await band.getByRole("tab", { name: "30 days" }).click()
    expect(new URL((await asked).url()).searchParams.get("project")).toBe("Website")

    // The e2e board has no ticket of this project in the period: the empty state, not zeroed charts.
    await expect(band.getByText("No ticket of this project over this period.")).toBeVisible()
    await expect(band.getByText("Created, by project", { exact: true })).toHaveCount(0)
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width, "no sideways scroll").toBeLessThanOrEqual(390)

    await band.getByRole("button", { name: /Statistics/ }).click()
    await expect(band.getByText("No ticket of this project over this period.")).toBeHidden()
  })
})

test.describe("the page of a project", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true })

  test("opens on the tickets, and the tab picked survives a reload", async ({ page }) => {
    await open(page)
    await card(page, "Website").click()
    await onThePageOf(page, "Website")
    await expect(tab(page, "Tickets")).toHaveAttribute("aria-selected", "true")

    await tab(page, "Brief").click()
    await expect(page.getByText("The brief of Website.")).toBeVisible()
    await expect(page).toHaveURL(/tab=brief/)

    await page.reload()
    await expect(tab(page, "Brief")).toHaveAttribute("aria-selected", "true")
    await expect(page.getByText("The brief of Website.")).toBeVisible()

    await tab(page, "Tickets").click()
    await expect(page).toHaveURL(/tab=tickets/)
  })

  test("a ticket made from the tickets tab is in its list, for this project", async ({ page }) => {
    await open(page)
    await card(page, "Website").click()
    await onThePageOf(page, "Website")
    await page.getByRole("button", { name: "New ticket" }).click()
    const form = page.locator('[data-slot="project-ticket-form"]')
    await form.getByLabel("Title").fill("Fix the footer of the site")
    await form.getByRole("button", { name: "Create" }).click()
    await expect(form).toBeHidden()
    const list = page.locator('[data-slot="project-ticket-list"]')
    await expect(list.getByText("Fix the footer of the site")).toBeVisible()
  })

  test("a project with no clone says so, rather than saying where a clone would be", async ({ page }) => {
    await open(page)
    await card(page, "Website").click()
    await onThePageOf(page, "Website")
    await expect(page.getByText("Not cloned on this machine yet")).toBeVisible()
    await expect(page.getByText("wherever the clone is")).toHaveCount(0)
  })
})
