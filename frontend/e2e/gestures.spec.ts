import { expect, test, type Page } from "@playwright/test"

/* The way back to Ready, which starts a paid session, is never one click.
 *
 * On a Done card it waits behind "…", on the others behind a dialog that says
 * a session is paid for — and, on a Validated card, that the validation goes.
 * A Ready card is set aside, not "held": the toast says where it went, and
 * bringing it back asks first too.
 */

const page_of = (id: string) => `/?view=console/tickets/read/${id}`

async function open(page: Page, id: string, title: string) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(page_of(id))
  await expect(page.getByRole("heading", { name: title }).first()).toBeVisible()
}

const dialog = (page: Page) => page.getByRole("alertdialog")

test.use({ viewport: { width: 1440, height: 900 } })

test("a Done ticket runs again from its menu, and only once confirmed", async ({ page }) => {
  await open(page, "0000000000000000000000000000d0e0", "A finished ticket")
  await expect(page.getByRole("button", { name: /make ready|run again/ })).toHaveCount(0)
  await page.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "run again" }).click()
  await expect(dialog(page)).toContainText("a session that is paid for")
  await dialog(page).getByRole("button", { name: "Cancel" }).click()
  await expect(dialog(page)).toBeHidden()
  await page.reload()
  await expect(page.getByRole("button", { name: "More actions" })).toBeVisible()
})

test("making a Validated ticket ready says the validation goes", async ({ page }) => {
  await open(page, "0000000000000000000000000000fa11", "A validated ticket")
  await page.getByRole("button", { name: "make ready" }).click()
  await expect(dialog(page)).toContainText("Its validation is withdrawn")
  await expect(dialog(page)).toContainText("a session that is paid for")
  await dialog(page).getByRole("button", { name: "Cancel" }).click()
  await expect(dialog(page)).toBeHidden()
})

test("a Ready ticket is set aside in one click, and made ready again once confirmed", async ({ page }) => {
  await open(page, "0000000000000000000000000000a51d", "A ticket to set aside")
  const aside = page.getByRole("button", { name: "set aside" })
  await expect(aside).toHaveAttribute("title", "The runner no longer touches it, until it is made ready again.")
  await aside.click()
  await expect(page.getByText("“A ticket to set aside” moved to Blocked")).toBeVisible()
  // The card sends the status it showed with the move back: until the board
  // has Notion's word for the first one it still says Ready, and the second
  // move reads as a ticket changed in Notion meanwhile. Let the first land and
  // read the board again.
  await expect
    .poll(async () => {
      const tickets = (await (await page.request.get("/api/board")).json()).tickets as {
        id: string
        status: string
        sync?: string
      }[]
      const ticket = tickets.find((item) => item.id === "0000000000000000000000000000a51d")
      return `${ticket?.status} ${ticket?.sync ?? ""}`.trim()
    })
    .toBe("Blocked")
  await page.reload()
  await page.getByRole("button", { name: "make ready" }).click()
  await dialog(page).getByRole("button", { name: "Make it ready" }).click()
  await expect(page.getByText("“A ticket to set aside” moved to Ready")).toBeVisible()
  await expect(page.getByRole("button", { name: "set aside" })).toBeVisible()
})
