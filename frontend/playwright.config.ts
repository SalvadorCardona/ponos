import { createServer } from "node:net"
import { defineConfig } from "@playwright/test"

/* The console in a browser, against a real `ponos serve`.
 *
 * `e2e/console.py` starts it on a board of Markdown files it writes itself, so
 * the tests need python3 and nothing of yours. The browser is the Chrome
 * already on the machine — GitHub's runners have one too — rather than one
 * Playwright downloads: `npm ci` stays an install of packages, not of browsers.
 *
 * Two servers, not one. A console holds a single conversation with the
 * workspace, so a turn `chat.spec.ts` leaves running is a turn every other test
 * that opens the console walks into: Escape there stops it instead of closing
 * the drawer, and the chat test then reads "stopped by you" where its answer
 * should be. The chat gets a server of its own, its tests one after another;
 * the rest share the other one and run in parallel.
 *
 * The ports are free ones unless `PONOS_E2E_PORT` names the first (the
 * chat takes the next): two worktrees running these tests at once must not both
 * ask for 8790. They are kept in the environment because Playwright reads this
 * file again in every worker, and a worker that drew its own would knock on a
 * port nobody serves.
 */
async function free(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

if (!process.env.PONOS_E2E_CHAT_PORT) {
  const given = Number(process.env.PONOS_E2E_PORT) || 0
  process.env.PONOS_E2E_PORT = String(given || (await free()))
  process.env.PONOS_E2E_CHAT_PORT = String(given ? given + 1 : await free())
}
const PORT = Number(process.env.PONOS_E2E_PORT)
const CHAT_PORT = Number(process.env.PONOS_E2E_CHAT_PORT)

const serve = (port: number) => ({
  command: `python3 e2e/console.py ${port}`,
  url: `http://127.0.0.1:${port}/?token=e2e`,
  reuseExistingServer: false,
})

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // One second chance on GitHub's runners, none here. Two cores share the
  // browsers, both servers and their outbox threads there, and a gesture that
  // waits on the stream (gestures.spec.ts, set aside then made ready again)
  // has missed its five seconds on a main that passed as a pull request the
  // minute before — never on a machine that could be watched doing it. A test
  // that fails twice still fails the job, and the list says which one needed
  // its second run.
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    channel: "chrome",
  },
  projects: [
    {
      name: "console",
      testIgnore: "chat.spec.ts",
      use: { baseURL: `http://127.0.0.1:${PORT}` },
    },
    {
      name: "chat",
      testMatch: "chat.spec.ts",
      use: { baseURL: `http://127.0.0.1:${CHAT_PORT}` },
    },
  ],
  webServer: [serve(PORT), serve(CHAT_PORT)],
})
