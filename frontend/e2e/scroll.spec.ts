import { expect, test, type Page } from "@playwright/test"

/* Every page taller than the screen scrolls — by the wheel, by the keyboard —
 * and still does once a dialog has opened and closed over it.
 *
 * The body used to be told not to scroll, from the days the console was panes
 * that scrolled inside themselves. The admin layout scrolls the page instead,
 * so that one line left the page with no scroll at all: the ticket page, the
 * settings, anything longer than the screen stopped at its bottom edge. What a
 * user does is what is tested — a wheel, a key — because setting `scrollTop`
 * from a script moves a page the user cannot move.
 */

const LONG_TICKET = "/?view=console/tickets/read/000000000000000000000000000abcde"

async function open(page: Page, path: string) {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
}

async function openLongTicket(page: Page) {
  await open(page, LONG_TICKET)
  await expect(page.getByText("Part 40")).toBeAttached()
}

async function taller(page: Page) {
  const [height, screen] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight])
  expect(height, "the page is not taller than the screen: nothing to test").toBeGreaterThan(screen * 2)
}

async function wheel(page: Page) {
  await page.mouse.move(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2)
  await page.mouse.wheel(0, 1200)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
}

for (const [name, viewport] of [
  ["at 1440px", { width: 1440, height: 900 }],
  ["on a phone", { width: 390, height: 844 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport })

    test("a long ticket scrolls under the wheel", async ({ page }) => {
      await openLongTicket(page)
      await taller(page)
      await wheel(page)
    })

    test("a long ticket scrolls from the keyboard", async ({ page }) => {
      await openLongTicket(page)
      await taller(page)
      await page.locator("body").click({ position: { x: 1, y: page.viewportSize()!.height - 1 } })
      await page.keyboard.press("PageDown")
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      await page.keyboard.press("End")
      await expect
        .poll(() => page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2))
        .toBe(true)
    })
  })
}

test("a dialog locks the page while it is open, and lets it go when it closes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 400 })
  await open(page, "/")
  await taller(page)

  await page.getByRole("button", { name: /New ticket|Nouveau ticket/ }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden")

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden")
  await wheel(page)
})
