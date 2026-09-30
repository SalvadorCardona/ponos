import { expect, test } from "@playwright/test"

/* The version at the top right, the day a newer one is waiting.
 *
 * `e2e/console.py` leaves a check behind that found a commit newer than this
 * checkout, so the badge offers it. What is tested stops at the dialog: the
 * update itself is `web/upgrade.py`'s, held by `tests/run.py` — and clicking
 * it here would point `git reset` at the checkout running the tests.
 */

test.use({ viewport: { width: 1440, height: 900 } })

test("a newer version turns the version into a button that asks before updating", async ({ page }) => {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: "http://127.0.0.1:8790" }])
  await page.goto("/")

  const badge = page.getByRole("button", { name: /→ ffffffff, click to update/ })
  await expect(badge).toBeVisible()
  await expect(badge).toContainText("Update")

  await badge.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Update Ponos" })).toBeVisible()
  await expect(dialog).toContainText("→ ffffffff")
  await expect(dialog.getByRole("button", { name: "Update now" })).toBeVisible()

  // Asking is all a click does: cancelled, nothing has started.
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(badge).toBeVisible()
})
