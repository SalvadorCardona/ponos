import { expect, test, type Page } from "@playwright/test"

/* The conversation with the workspace: Ponos while it works, the steps folded,
 * and Stop.
 *
 * The session is `e2e/console.py`'s own `claude`, which reads a file, runs a
 * command that fails and answers — or, asked to go slowly, starts a command
 * that would run for ten minutes. One conversation for the whole server, so the
 * tests here take their turns one after another — on a server of their own
 * (the "chat" project of `playwright.config.ts`), so that no other test opens a
 * console with one of these turns still running in it.
 */

test.describe.configure({ mode: "serial" })

const FIELD = "Ask the workspace, or type >status"

async function openConsole(page: Page) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")
  await page.getByRole("button", { name: "open the console" }).click()
  await expect(page.getByRole("textbox", { name: FIELD })).toBeVisible()
}

async function ask(page: Page, text: string) {
  const field = page.getByRole("textbox", { name: FIELD })
  await field.fill(text)
  await field.press("Enter")
}

test("a turn shows Ponos at work, then the answer, with its steps folded", async ({ page }) => {
  await openConsole(page)
  await ask(page, "what is on the board?")

  const thinking = page.locator("[data-slot=thinking]:not([data-done])")
  await expect(thinking.locator("ponos-robot")).toBeVisible()
  await expect(thinking.getByText("reading api.py…")).toBeVisible()
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  // The log is not the conversation: nothing of it shows while it is written.
  await expect(page.getByText("python3 -m app.check")).toBeHidden()

  await expect(page.getByText("Done. The board has 13 tickets.")).toBeVisible()
  await expect(thinking).toHaveCount(0)
  const fold = page.getByRole("button", { name: /Show the steps · 3 steps/ }).last()
  await expect(fold).toBeVisible()
  await expect(fold).toContainText("$0.0123")
  await expect(fold.getByText("1", { exact: true })).toBeVisible()
  await expect(page.getByText("python3 -m app.check")).toBeHidden()

  await fold.click()
  await expect(page.getByText("python3 -m app.check")).toBeVisible()
  await expect(page.getByRole("button", { name: /Hide the steps/ }).last()).toBeVisible()
})

test("Stop ends the turn, says so, and the conversation carries on", async ({ page }) => {
  await openConsole(page)
  const resume = page.getByText(/claude --resume /)
  await expect(resume).toBeVisible()
  const session = (await resume.textContent())!.replace(/^.*claude --resume /, "")

  await ask(page, "take it slowly")
  await expect(page.getByText("fixing an error…")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("running a command…")).toBeVisible()
  const stop = page.getByRole("button", { name: "Stop" })
  await stop.click()
  // The double click: the second lands on a button already stopping, or gone.
  await stop.click({ timeout: 1_000 }).catch(() => {})

  await expect(page.getByText("stopped by you")).toBeVisible()
  await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0)
  await expect(page.getByRole("textbox", { name: FIELD })).toBeFocused()
  await expect(page.getByRole("button", { name: /Show the steps · 4 steps/ }).last()).toBeVisible()

  await ask(page, "just the count, then")
  await expect(page.getByText("Resumed, and done. The board has 13 tickets.")).toBeVisible()
  await expect(page.getByText(/claude --resume /)).toContainText(session)
})

test("Escape from the empty field stops the turn, and leaves the drawer open", async ({ page }) => {
  await openConsole(page)
  const stopped = await page.getByText("stopped by you").count()
  await ask(page, "slowly, please")
  await expect(page.getByText("fixing an error…")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("running a command…")).toBeVisible()
  const field = page.getByRole("textbox", { name: FIELD })
  await field.focus()
  await field.press("Escape")
  await expect(page.getByText("stopped by you")).toHaveCount(stopped + 1)
  await expect(field).toBeVisible()
})
