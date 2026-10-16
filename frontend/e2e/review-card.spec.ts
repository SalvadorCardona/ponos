import { expect, test, type Page } from "@playwright/test"

/* A card in review offers one thing to do, Decide, and keeps the rest behind "…".
 *
 * The menu holds the gestures the card used to draw as four buttons, in the
 * order they are reached for, giving the ticket up last and apart, in red. Each
 * one asks what it asked before: validating and running again open their
 * dialog, which is only cancelled here — the ticket is shared with other tests.
 * The state of its checks moves into the line along the bottom.
 */

const RED = "00000000000000000000000000de1c01"

async function open(page: Page, theme: "dark" | "light" = "dark") {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.addInitScript((chosen) => localStorage.setItem("ponos-theme", chosen), theme)
  await page.goto("/")
}

const card = (page: Page) => page.locator(`[data-ticket-card="${RED}"]`)
const dialog = (page: Page) => page.getByRole("alertdialog")

test.use({ viewport: { width: 1440, height: 900 } })

test("a card in review draws Decide and a menu, and nothing else", async ({ page }) => {
  await open(page)
  await expect(card(page).getByRole("button")).toHaveCount(2)
  const decide = card(page).locator(`[data-decide="${RED}"]`)
  await expect(decide).toHaveText("Decide")
  const more = card(page).getByRole("button", { name: "More actions" })
  for (const button of [decide, more]) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  }
  expect((await more.boundingBox())?.width).toBe(48)
  // The checks are said in the line along the bottom, beside the age.
  await expect(card(page).locator('.border-t [data-slot="ticket-ci"]')).toHaveText(/CI failed/)
  for (const theme of ["dark", "light"] as const) {
    await open(page, theme)
    await card(page).screenshot({ path: `test-results/review-card-${theme}.png` })
  }
})

test("the menu lists its four gestures in order, and answers the keyboard", async ({ page }) => {
  await open(page)
  const more = card(page).getByRole("button", { name: "More actions" })
  await more.focus()
  await page.keyboard.press("Enter")
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Validate and publish",
    "Run the agent again",
    "Mark done",
    "Cancel the ticket",
  ])
  await expect(menu.getByRole("separator")).toHaveCount(1)
  await expect(menu.getByRole("menuitem", { name: "Cancel the ticket" })).toHaveAttribute(
    "data-variant",
    "destructive"
  )
  await page.screenshot({ path: "test-results/review-card-menu.png" })
  await page.keyboard.press("ArrowDown")
  await expect(menu.getByRole("menuitem", { name: "Run the agent again" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(more).toBeFocused()
})

test("validating and running again ask first, as their buttons did", async ({ page }) => {
  await open(page)
  const more = card(page).getByRole("button", { name: "More actions" })
  await more.click()
  await page.getByRole("menuitem", { name: "Validate and publish" }).click()
  await expect(dialog(page)).toContainText("The runner merges its pull request on its next pass.")
  await dialog(page).getByRole("button", { name: "Cancel" }).click()
  await expect(dialog(page)).toBeHidden()
  await more.click()
  await page.getByRole("menuitem", { name: "Run the agent again" }).click()
  await expect(dialog(page)).toContainText("a session that is paid for")
  await dialog(page).getByRole("button", { name: "Cancel" }).click()
  await expect(dialog(page)).toBeHidden()
  const tickets = (await (await page.request.get("/api/board")).json()).tickets as { id: string; column: string }[]
  expect(tickets.find((ticket) => ticket.id === RED)?.column).toBe("review")
})
