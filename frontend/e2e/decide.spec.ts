import { expect, test, type Page } from "@playwright/test"

/* The Unblock and Decide tabs of a ticket, from its card and on itself.
 *
 * `e2e/console.py` writes tickets blocked on a report that names its kind of
 * stop — missing access, with two options — and one in review whose report
 * says what to check. A blocked card offers Unblock, which opens the ticket's
 * window — one window, nothing beside it — on the tab that says why, what is
 * done and what would get it moving; a card in review offers Decide. A choice
 * that needs words opens its field, and sending it moves the ticket and leaves
 * the instruction on it, where the next session reads it; the tab goes then,
 * and the ticket shows its discussion.
 */

const READ = "00000000000000000000000000b10c01"
const ACT = "00000000000000000000000000b10c02"
const DONE = "00000000000000000000000000b10c03"
const GIVE_UP = "00000000000000000000000000b10c04"
const PLAIN = "00000000000000000000000000b10c05"
const REVIEW = "00000000000000000000000000de1c01"
const LONG = "000000000000000000000000000abcde"

async function open(page: Page, path = "/") {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

const ticketWindow = (page: Page) => page.locator("[data-ticket-window]")
const tab = (page: Page) => page.locator('[data-slot="ticket-decide-tab"]')
const panel = (page: Page) => page.locator('[data-slot="ticket-decision"]')

/** The card's button, clicked: the window opens on the tab, and nothing else opens. */
async function unblock(page: Page, id: string) {
  const button = page.locator(`[data-decide="${id}"]`)
  await button.scrollIntoViewIfNeeded()
  await button.click()
  await expect(ticketWindow(page)).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(1)
  await expect(tab(page)).toHaveAttribute("aria-selected", "true")
  await expect(panel(page)).toBeVisible()
}

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("a blocked card offers Unblock and nothing else", async ({ page }) => {
    await open(page)
    const button = page.locator(`[data-decide="${READ}"]`)
    await expect(button).toHaveText("Unblock")
    const card = page.locator("div.rounded-2xl.p-3", { has: button }).last()
    await expect(card.getByRole("button")).toHaveText(["Unblock"])
    await expect(card.locator('[data-slot="block-action"]')).toHaveCount(0)
    // The cause is no badge of its own any more: the button is the only mark.
    await expect(card.locator('[data-slot="ticket-waiting"]')).toHaveCount(0)
  })

  test("Unblock opens one window, on the tab that says why it is stuck and what would unblock it", async ({ page }) => {
    await open(page)
    await unblock(page, READ)
    await expect(tab(page)).toHaveText("Unblock")
    await expect(tab(page).locator('[data-slot="ticket-decide-badge"]')).toBeVisible()
    await expect(page.locator('[data-slot="decision-panel"]')).toHaveCount(0)
    await expect(panel(page)).toContainText("Missing access")
    await expect(panel(page)).toContainText("I have no SSH access to the server")
    await expect(panel(page).locator('[data-slot="decision-done"]')).toContainText("branch `ticket/tailscale` ready")
    await expect(panel(page).locator('[data-slot="decision-question"]')).toContainText("Which way do you prefer?")
    // Already on the tab: the button above it would only point at where you are.
    await expect(ticketWindow(page).locator(`[data-decide="${READ}"]`)).toHaveCount(0)
    const choices = panel(page).locator("[data-solution]")
    await expect(choices.first()).toHaveText(/Give me an SSH key/)
    await expect(panel(page).getByRole("button", { name: "It's done, run it again" })).toBeVisible()
    // This board has a column to give a ticket up in: it is filed there, not as done.
    await expect(choices.last()).toHaveText("Abandon — move to cancelled")
    // An instruction of your own is not a choice among them: its field is always there.
    await expect(panel(page).getByRole("button", { name: "Other: write an instruction" })).toHaveCount(0)
    const instruction = panel(page).locator('[data-slot="decision-instruction"]')
    await expect(instruction.getByRole("textbox")).toBeVisible()
    await expect(instruction.getByRole("button", { name: "Send and run again" })).toBeDisabled()
    // Nothing above runs it again as it is, so the quiet way does.
    await expect(panel(page).getByRole("button", { name: "Run it again without changes" })).toBeVisible()
    // A choice that needs words opens its field; one that does not, does not.
    await panel(page).getByRole("button", { name: "It's done, run it again" }).click()
    await expect(panel(page).getByRole("textbox")).toHaveCount(2)
    // The other tabs are a click away, and the button in the window's header comes back to it.
    await ticketWindow(page).locator('[data-slot="ticket-brief-tab"]').click()
    await expect(panel(page)).toBeHidden()
    await ticketWindow(page).locator(`[data-decide="${READ}"]`).click()
    await expect(tab(page)).toHaveAttribute("aria-selected", "true")
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(ticketWindow(page)).toBeHidden()
  })

  test("a ticket that waits on nobody has no Unblock tab", async ({ page }) => {
    await open(page)
    await page.getByRole("link", { name: "A long ticket" }).click()
    await expect(ticketWindow(page).locator('[data-slot="ticket-brief-tab"]')).toBeVisible()
    await expect(tab(page)).toHaveCount(0)
    await open(page, `/?view=console/tickets/read/${LONG}&tab=unblock`)
    await expect(page.locator('[data-slot="ticket-brief-tab"]')).toBeVisible()
    await expect(tab(page)).toHaveCount(0)
    await expect(page.locator('[data-slot="ticket-talk-tab"]')).toHaveAttribute("aria-selected", "true")
  })

  test("on its page, the tab is in the address, and Unblock switches to it", async ({ page }) => {
    await open(page, `/?view=console/tickets/read/${READ}&tab=unblock`)
    await expect(tab(page)).toHaveAttribute("aria-selected", "true")
    await expect(panel(page)).toContainText("Missing access")
    await page.locator('[data-slot="ticket-brief-tab"]').click()
    await expect(page).toHaveURL(/[?&]tab=brief$/)
    await page.locator(`[data-decide="${READ}"]`).click()
    await expect(tab(page)).toHaveAttribute("aria-selected", "true")
    await expect(page).toHaveURL(/[?&]tab=unblock$/)
  })

  test("an instruction of your own moves the ticket to Ready and is left on it", async ({ page }) => {
    await open(page)
    await unblock(page, ACT)
    const instruction = panel(page).locator('[data-slot="decision-instruction"]')
    await instruction.getByRole("textbox").fill("Use the key in 1Password.")
    await instruction.getByRole("button", { name: "Send and run again" }).click()
    await expect(page.getByText("“Choose the host” moved to Ready")).toBeVisible()
    // Nothing left to unblock: the tab goes, and the window shows the discussion.
    await expect(tab(page)).toHaveCount(0)
    await expect(ticketWindow(page).locator('[data-slot="ticket-talk-tab"]')).toHaveAttribute("aria-selected", "true")
    const said = (await (await page.request.get(`/api/tickets/${ACT}/talk`)).json()) as {
      messages: { text: string }[]
    }
    const last = said.messages[said.messages.length - 1].text
    expect(last).toContain("Decision: run it again with an instruction.")
    expect(last).toContain("Use the key in 1Password.")
  })

  test("it's done, run it again: the ticket goes back to Ready", async ({ page }) => {
    await open(page)
    await unblock(page, DONE)
    await panel(page).getByRole("button", { name: "It's done, run it again" }).click()
    await panel(page).locator("li form").getByRole("button", { name: "Send and run again" }).click()
    await expect(page.getByText("“Open the firewall” moved to Ready")).toBeVisible()
    await expect(tab(page)).toHaveCount(0)
  })

  test("abandon files the ticket as cancelled", async ({ page }) => {
    await open(page)
    await unblock(page, GIVE_UP)
    await panel(page).getByRole("button", { name: "Abandon — move to cancelled" }).click()
    await panel(page).locator("li form").getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText("“Move the old backups” moved to Cancelled")).toBeVisible()
    await expect(tab(page)).toHaveCount(0)
    await expect(ticketWindow(page).locator('[data-slot="ticket-talk-tab"]')).toHaveAttribute("aria-selected", "true")
  })

  test("run it again without changes puts it back in Ready", async ({ page }) => {
    await open(page)
    await unblock(page, PLAIN)
    await panel(page).getByRole("button", { name: "Run it again without changes" }).click()
    await expect(page.getByText("“Renew the certificate” moved to Ready")).toBeVisible()
    await expect(tab(page)).toHaveCount(0)
  })

  test("a card in review says what it delivered, what to check, and how to decide", async ({ page }) => {
    await open(page)
    await unblock(page, REVIEW)
    await expect(tab(page)).toHaveText("Decide")
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

  test("Unblock opens the ticket's window on its tab, the choices a thumb wide", async ({ page }) => {
    await open(page)
    // Brought to the middle of the screen first: left at its edge, the button
    // sits under the bottom bar, or on a card not yet drawn (content-visibility).
    const unblock = page.locator(`[data-decide="${READ}"]`)
    await unblock.evaluate((button) => button.scrollIntoView({ block: "center" }))
    await unblock.tap()
    await expect(page.getByRole("dialog")).toHaveCount(1)
    await expect(tab(page)).toHaveAttribute("aria-selected", "true")
    await expect(panel(page)).toContainText("Missing access")
    // Once the window has grown in: it opens from slightly smaller.
    const choice = panel(page).locator("[data-solution]").first()
    await expect.poll(async () => (await choice.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40)
    await expect.poll(async () => (await choice.boundingBox())?.width ?? 0).toBeGreaterThan(300)
  })
})
