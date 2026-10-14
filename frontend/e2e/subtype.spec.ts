import { expect, test, type Page } from "@playwright/test"

/* A code ticket's sub-type, on its card and in the search.
 *
 * `e2e/console.py` writes two code tickets in review with a sub-type — a
 * Security and a Bug — and two without: the badge says the one, and none on the
 * others. The sub-type is the developers' word in every language: in French
 * the card says « Security », never « Sécurité », which is only how the board
 * stores it.
 */

const SECURITY = "00000000000000000000000000c1c102"
const BUG = "00000000000000000000000000c1c103"
const NONE = "00000000000000000000000000c1c104"

async function open(page: Page, path = "/") {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

const badge = (page: Page, id: string) =>
  page.locator(`[data-ticket-card="${id}"] [data-slot="ticket-subtype"]`)

test("a code ticket wears its sub-type, and a ticket without one wears none", async ({ page }) => {
  await open(page)
  await expect(badge(page, SECURITY)).toHaveAttribute("data-subtype", "security")
  await expect(badge(page, SECURITY)).toContainText("🔒")
  await expect(badge(page, BUG)).toHaveAttribute("data-subtype", "bug")
  await expect(badge(page, BUG)).toContainText("Bug")
  await expect(page.locator(`[data-ticket-card="${NONE}"]`)).toBeVisible()
  await expect(badge(page, NONE)).toHaveCount(0)
  await page.locator(`[data-ticket-card="${BUG}"]`).screenshot({ path: "test-results/subtype-bug.png" })
})

test("the board is filtered by sub-type, and the address keeps it", async ({ page }) => {
  await open(page, "/?subtype=bug")
  await expect(page.locator(`[data-ticket-card="${BUG}"]`)).toBeVisible()
  await expect(page.locator(`[data-ticket-card="${SECURITY}"]`)).toHaveCount(0)
  await expect(page.locator(`[data-ticket-card="${NONE}"]`)).toHaveCount(0)
})

test.describe("in French", () => {
  test.use({ locale: "fr-FR" })

  test("the sub-type keeps the developers' word, on the card and in the filter", async ({ page }) => {
    await open(page)
    await expect(badge(page, SECURITY)).toHaveText("🔒Security")
    await expect(page.locator(`[data-ticket-card="${SECURITY}"]`)).not.toContainText("Sécurité")
    await page.locator(`[data-ticket-card="${SECURITY}"]`).screenshot({ path: "test-results/subtype-security-fr.png" })
    await open(page, "/?subtype=security")
    await expect(page.locator(`[data-ticket-card="${SECURITY}"]`)).toBeVisible()
    await expect(page.locator(`[data-ticket-card="${BUG}"]`)).toHaveCount(0)
  })
})
