import { expect, test, type Page } from "@playwright/test"

/* The Unblock and Decide panels, from the card.
 *
 * `e2e/console.py` writes two tickets blocked on a report that names its kind
 * of stop — missing access, with two options — and one in review whose report
 * says what to check. A blocked card offers Unblock, which says why, what is
 * done and what would get it moving; a card in review offers Decide. A choice
 * that needs words opens its field, and sending it moves the ticket and leaves
 * the instruction on it, where the next session reads it.
 */

const READ = "00000000000000000000000000b10c01"
const ACT = "00000000000000000000000000b10c02"
const REVIEW = "00000000000000000000000000de1c01"

async function board(page: Page) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")
}

const panel = (page: Page) => page.locator('[data-slot="decision-panel"]')

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("a blocked card says why it is stuck and what would unblock it", async ({ page }) => {
    await board(page)
    await page.locator(`[data-decide="${READ}"]`).click()
    await expect(panel(page)).toBeVisible()
    await expect(panel(page)).toContainText("Missing access")
    await expect(panel(page)).toContainText("I have no SSH access to the server")
    await expect(panel(page)).toContainText("Already done: branch `ticket/tailscale` ready")
    await expect(panel(page)).toContainText("What is missing: Which way do you prefer?")
    const choices = panel(page).locator("[data-solution]")
    await expect(choices.first()).toHaveText(/Give me an SSH key/)
    await expect(panel(page).getByRole("button", { name: "It's done, run it again" })).toBeVisible()
    await expect(choices.last()).toHaveText("Other: write an instruction")
    // A choice that needs words opens its field; one that does not, does not.
    await choices.last().click()
    const send = panel(page).getByRole("button", { name: "Send and run again" })
    await expect(send).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(panel(page)).toBeHidden()
  })

  test("an instruction of your own moves the ticket to Ready and is left on it", async ({ page }) => {
    await board(page)
    await page.locator(`[data-decide="${ACT}"]`).click()
    await panel(page).getByRole("button", { name: "Other: write an instruction" }).click()
    await panel(page).getByRole("textbox").fill("Use the key in 1Password.")
    await panel(page).getByRole("button", { name: "Send and run again" }).click()
    await expect(page.getByText("“Choose the host” moved to Ready")).toBeVisible()
    await expect(panel(page)).toBeHidden()
    const said = (await (await page.request.get(`/api/tickets/${ACT}/talk`)).json()) as {
      messages: { text: string }[]
    }
    const last = said.messages[said.messages.length - 1].text
    expect(last).toContain("Decision: an instruction.")
    expect(last).toContain("Use the key in 1Password.")
  })

  test("a card in review says what it delivered, what to check, and how to decide", async ({ page }) => {
    await board(page)
    await page.locator(`[data-decide="${REVIEW}"]`).click()
    await expect(panel(page)).toContainText("Adds a share button under each article.")
    await expect(panel(page).getByRole("link", { name: /Pull request/ })).toHaveAttribute(
      "href",
      "https://github.com/example/website/pull/12"
    )
    await expect(panel(page).locator('[data-slot="decision-caveats"] li')).toHaveText([
      "not tried on Safari",
      "the screenshots on mobile are missing",
    ])
    for (const name of ["Validate", "Send back with an instruction", "Take the screenshots", "Reject"])
      await expect(panel(page).getByRole("button", { name, exact: true })).toBeVisible()
    // A ready-made instruction opens written out, for you to send or to change.
    await panel(page).getByRole("button", { name: "Take the screenshots", exact: true }).click()
    await expect(panel(page).getByRole("textbox")).toHaveValue(/Take the screenshots that were asked for/)
  })
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test("the panel is a sheet from the bottom, its choices a thumb wide", async ({ page }) => {
    await board(page)
    await page.locator(`[data-decide="${READ}"]`).tap()
    const sheet = panel(page)
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText("Missing access")
    // Once it has slid in: its foot on the bottom of the screen.
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox()
        return box && Math.round(box.y + box.height)
      })
      .toBe(844)
    const choice = await sheet.locator("[data-solution]").first().boundingBox()
    expect(choice && choice.height).toBeGreaterThanOrEqual(40)
    expect(choice && choice.width).toBeGreaterThan(300)
  })
})
