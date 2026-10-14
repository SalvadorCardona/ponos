import { expect, test } from "@playwright/test"

/* The bell in the header.
 *
 * `e2e/console.py` leaves three notifications in the console's state: a question
 * the blocked ticket asked, and a failure and a pull request to read on the long
 * one. One test goes through all of it, in order — reading is kept by the
 * server, so splitting it would make each part depend on what ran before.
 */

test.use({ viewport: { width: 1440, height: 900 } })

test("the bell counts what is unread, opens the ticket, and keeps what was read", async ({ page }) => {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")

  const bell = page.getByRole("button", { name: /^Notifications, 3 unread$/ })
  await expect(bell).toBeVisible()
  await expect(page.getByTestId("bell-badge")).toHaveText("3")

  // Opened from the keyboard, newest first, each saying what it is and for which ticket.
  await bell.focus()
  await page.keyboard.press("Enter")
  const panel = page.getByRole("dialog", { name: "Notifications" })
  await expect(panel.getByRole("button", { name: "Mark all as read" })).toBeEnabled()
  const items = panel.getByRole("listitem")
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText("A ticket with a question")
  await expect(items.nth(0)).toContainText("A session is waiting for your answer")
  await expect(items.nth(1)).toContainText("A pull request is ready to read")
  await expect(items.nth(2)).toContainText("A session failed")

  // A click opens the ticket's card and reads that one.
  await items.nth(0).getByRole("button").click()
  await expect(page).toHaveURL(/a5c/)
  await expect(page.getByRole("button", { name: /^Notifications, 2 unread$/ })).toBeVisible()

  // Escape closes the panel; "Mark all as read" empties the badge.
  await page.getByRole("button", { name: /^Notifications, 2 unread$/ }).click()
  await page.getByRole("dialog", { name: "Notifications" }).getByRole("button", { name: "Mark all as read" }).click()
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible()
  await expect(page.getByTestId("bell-badge")).toHaveCount(0)
  await page.keyboard.press("Escape")

  // Kept by the server: a reload finds them read.
  await page.reload()
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible()
  await expect(page.getByTestId("bell-badge")).toHaveCount(0)
})
