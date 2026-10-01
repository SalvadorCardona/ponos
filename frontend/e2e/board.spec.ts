import { expect, test, type Page } from "@playwright/test"

/* The board comes whole once, then as what moved on it.
 *
 * A board of five hundred tickets weighs a third of a megabyte, and a ticket in
 * flight used to send it all again every few seconds, for one card. What is
 * tested is what a user sees — a ticket written elsewhere appears on the board
 * without a reload, and is still there after one — and, beside it, what the
 * stream carried to say it: the changes, not the board.
 */

type Frame = { kind: string; bytes: number; data: string }

async function open(page: Page) {
  await page.context().addCookies([{ name: "ticket_runner_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")
  await expect(page.getByText("A long ticket").filter({ visible: true }).first()).toBeVisible()
}

/** A second stream, opened beside the page's, that writes down what it is sent. */
async function listen(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((ready) => {
        const frames: Frame[] = []
        ;(window as unknown as { frames_: Frame[] }).frames_ = frames
        const stream = new EventSource("/api/events", { withCredentials: true })
        for (const kind of ["board", "changes"])
          stream.addEventListener(kind, (event) => {
            const data = (event as MessageEvent<string>).data
            frames.push({ kind, bytes: new Blob([data]).size, data })
            if (kind === "board") ready()
          })
      })
  )
}

const frames = (page: Page) =>
  page.evaluate(() => (window as unknown as { frames_: Frame[] }).frames_)

test("a ticket written elsewhere reaches the board as a change, and stays after a reload", async ({ page }) => {
  const title = `Arrived as a change ${Date.now()}`
  await open(page)
  await listen(page)

  // Written as the phone or another tab would: the page itself draws nothing.
  const response = await page.request.post("/api/tickets", {
    headers: { "X-Ticket-Runner": "1" },
    data: { title, body: "", project: "", ready: true },
  })
  expect(response.ok()).toBeTruthy()

  await expect(page.getByText(title).filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await frames(page)).filter((frame) => frame.kind === "changes").length).toBeGreaterThan(0)

  const said = await frames(page)
  expect(said[0].kind, "a stream opens on the whole board").toBe("board")
  const change = said.find((frame) => frame.kind === "changes" && frame.data.includes(title))!
  expect(change, "the new ticket travelled as a change").toBeTruthy()
  expect(change.bytes).toBeLessThan(10_000)
  expect(change.bytes).toBeLessThan(said[0].bytes)

  // A tab opened again is given the board as it is now, with the ticket on it.
  await page.reload()
  await expect(page.getByText(title).filter({ visible: true }).first()).toBeVisible()
})
