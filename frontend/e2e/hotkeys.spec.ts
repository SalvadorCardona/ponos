import { expect, test, type Page } from "@playwright/test"

/* The two shortcuts, pressed the way a user presses them.
 *
 * Ctrl+K opens the palette from any page, and Escape closes it; an entry is
 * reached with the arrows and Enter. Ctrl+J opens the conversation with the
 * cursor already in its field — a sentence typed straight away lands there —
 * and closes it again, handing the focus back to where it was.
 */

async function open(page: Page, path = "/") {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: "http://127.0.0.1:8790" }])
  await page.goto(path)
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
}

const palette = (page: Page) => page.getByRole("dialog", { name: "Command palette" })
const drawer = (page: Page) => page.locator('[data-slot="sheet-content"]')

test.use({ viewport: { width: 1440, height: 900 } })

test("Ctrl+K opens the palette, Escape closes it", async ({ page }) => {
  await open(page)
  await page.keyboard.press("Control+k")
  await expect(palette(page)).toBeVisible()
  await expect(palette(page).getByRole("combobox")).toBeFocused()
  await expect(palette(page).getByRole("option", { name: "Projects" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(palette(page)).toBeHidden()
})

test("the palette takes you to a page, with the keyboard alone", async ({ page }) => {
  await open(page)
  await page.keyboard.press("Control+k")
  await page.keyboard.type("statistics")
  await expect(palette(page).getByRole("option").first()).toHaveText(/Statistics/)
  await page.keyboard.press("Enter")
  await expect(palette(page)).toBeHidden()
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toContain("statistics")
})

test("the palette finds a ticket on the board", async ({ page }) => {
  await open(page)
  await page.keyboard.press("Control+k")
  await page.keyboard.type("A long ticket")
  await page.keyboard.press("Enter")
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toContain(
    "tickets/read/000000000000000000000000000abcde"
  )
})

test("Ctrl+J opens the console with the cursor in its field, and closes it", async ({ page }) => {
  await open(page)
  await page.keyboard.press("Control+j")
  await expect(drawer(page)).toBeVisible()
  const field = drawer(page).locator("textarea")
  await expect(field).toBeFocused()
  await page.keyboard.type("hello")
  await expect(field).toHaveValue("hello")
  // From inside the field, the same key closes it.
  await page.keyboard.press("Control+j")
  await expect(drawer(page)).toBeHidden()
})

test("Escape closes the console and the focus goes back where it was", async ({ page }) => {
  await open(page)
  const search = page.getByRole("button", { name: "Search" })
  await search.focus()
  await page.keyboard.press("Control+j")
  await expect(drawer(page).locator("textarea")).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(drawer(page)).toBeHidden()
  await expect(search).toBeFocused()
})

test("the palette opens the console, and its field takes the focus", async ({ page }) => {
  await open(page)
  await page.keyboard.press("Control+k")
  await page.keyboard.type("open or close the console")
  await page.keyboard.press("Enter")
  await expect(drawer(page)).toBeVisible()
  await expect(drawer(page).locator("textarea")).toBeFocused()
})

test("the bubble's tooltip says the shortcut", async ({ page }) => {
  await open(page)
  const bubble = page.getByRole("button", { name: "open the console" })
  await expect(bubble).toHaveAttribute("aria-keyshortcuts", "Control+J")
  await bubble.hover()
  await expect(page.getByRole("tooltip")).toContainText("Ctrl+J")
})
