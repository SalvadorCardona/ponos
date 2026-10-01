import { expect, test, type Page } from "@playwright/test"

/* A ticket's discussion, on its page.
 *
 * `e2e/console.py` writes one ticket blocked on a question a run asked. Its
 * card says it is waiting; its page opens on the discussion, counted, with the
 * question in it; and the answer is typed in the console's own bar and appears
 * under it — without the bubble, which opens the workspace on every page.
 */

const ASKING = "/?view=console/tickets/read/00000000000000000000000000000a5c"
const FIELD = "Answer the ticket, or ask it something"

async function open(page: Page, path: string) {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

test.use({ viewport: { width: 1440, height: 900 } })

test("a ticket waiting on you is marked on the board", async ({ page }) => {
  await open(page, "/")
  // Its own card, and not "the one card that waits": gestures.spec.ts sets a
  // Ready ticket aside, which is Blocked too for as long as that test runs.
  const card = page.locator(`[data-slot="ticket-waiting"][href$="${ASKING.split("/").pop()}"]`)
  await expect(card).toHaveCount(1)
  await expect(card).toHaveText("waiting for you")
})

test("its page opens on the discussion, and the answer goes through the console's bar", async ({ page }) => {
  await open(page, ASKING)
  const tab = page.locator('[data-slot="ticket-talk-tab"]')
  await expect(tab).toHaveAttribute("data-state", "active")
  await expect(tab).toContainText("1")
  await expect(page.getByText("Which header, the dashboard's or the site's?")).toBeVisible()

  const field = page.getByRole("textbox", { name: FIELD })
  await expect(page.locator('[data-slot="composer"]').filter({ has: field })).toBeVisible()
  await field.fill("The dashboard's.")
  await field.press("Enter")
  await expect(page.getByRole("log").getByText("The dashboard's.")).toBeVisible()
  await expect(tab).toContainText("2")
  await expect(field).toHaveValue("")

  // The bubble is the workspace's, here as anywhere.
  await expect(page.getByRole("button", { name: "open the console" })).toBeVisible()
})
