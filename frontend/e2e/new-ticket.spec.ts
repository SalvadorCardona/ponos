import { expect, test, type Page } from "@playwright/test"

/* A new ticket says how urgent it is, which road it takes and on which model,
 * from the dialog — and says what ticking "Ready to run" costs.
 *
 * The three used to be set in Notion afterwards, by hand. The board here is
 * Markdown, which has every column: all three are offered. What is sent is
 * caught on its way out rather than written, so the board the other tests read
 * keeps the tickets it was made with.
 */

async function open(page: Page) {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
  await page.getByRole("button", { name: /New ticket|Nouveau ticket/ }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  return dialog
}

/* The package's select is a combobox of its own, not a <select>: opened, then
 * an option picked from the list it draws. */
async function choose(page: Page, dialog: ReturnType<Page["getByRole"]>, field: string, option: string) {
  await dialog.getByRole("group").filter({ hasText: field }).getByRole("combobox").click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

test("a new ticket carries its priority, type and model, and Ctrl+Enter creates it", async ({ page }) => {
  const sent: Record<string, unknown>[] = []
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    sent.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: "0000000000000000000000000000f00d", title: "Announce it" } })
  })
  const dialog = await open(page)

  await expect(dialog.getByText("Ticked, a session starts at the next pass")).toBeVisible()
  await choose(page, dialog, "Priority", "High")
  await choose(page, dialog, "Type", "Writing")
  await choose(page, dialog, "Model", "haiku")
  await dialog.getByLabel("Title").fill("Announce it")
  await dialog.getByLabel("Title").press("Control+Enter")

  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toMatchObject({
    title: "Announce it",
    priority: "High",
    type: "writing",
    model: "haiku",
    ready: true,
  })
  await expect(dialog).toBeHidden()
})

test("left alone, the three say nothing and the type is the runner's to deduce", async ({ page }) => {
  const sent: Record<string, unknown>[] = []
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    sent.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: "0000000000000000000000000000f00e", title: "Plain" } })
  })
  const dialog = await open(page)
  await dialog.getByLabel("Title").fill("Plain")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toMatchObject({ priority: "", type: "", model: "" })
})

test("Ctrl+Enter from the brief creates the ticket with the last words typed", async ({ page }) => {
  const sent: Record<string, unknown>[] = []
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    sent.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: "0000000000000000000000000000f00f", title: "Briefed" } })
  })
  const dialog = await open(page)
  await dialog.getByLabel("Title").fill("Briefed")
  await dialog.locator(".ProseMirror").click()
  await page.keyboard.type("The last words")
  await page.keyboard.press("Control+Enter")
  await expect.poll(() => sent.length).toBe(1)
  expect(String(sent[0].body)).toContain("The last words")
})
