/* The first connection's decisions, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 *
 * Node reads `setup.ts` as it is, which is why that module imports nothing.
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { accessProblem, nextStep, rows, stepFrom, stepsFor, type Summary } from "./setup.ts"

test("a console claimed from the environment starts after the account", () => {
  assert.deepEqual(stepsFor({ claimed: false })[0], "access")
  assert.ok(!stepsFor({ claimed: true }).includes("access"))
  assert.equal(stepFrom({ claimed: true }, null), "provider")
  assert.equal(stepFrom({ claimed: true }, "access"), "provider", "a step it no longer has")
  assert.equal(stepFrom({ claimed: false }, "github"), "github")
  assert.equal(nextStep({ claimed: true }, "channels"), "summary")
  assert.equal(nextStep({ claimed: true }, "summary"), "summary")
})

test("the account step refuses what the server would", () => {
  const good = { code: "k7q2-m9xd", email: "me@example.com", password: "one I remember", confirm: "one I remember" }
  assert.equal(accessProblem(good, true), "")
  assert.match(accessProblem({ ...good, code: "" }, true), /installation code/)
  assert.equal(accessProblem({ ...good, code: "" }, false), "", "no code asked at this machine")
  assert.match(accessProblem({ ...good, email: "me" }, false), /email/)
  assert.match(accessProblem({ ...good, password: "short", confirm: "short" }, false), /8 characters/)
  assert.match(accessProblem({ ...good, confirm: "another" }, false), /not the same/)
})

const summary: Summary = {
  provider: { state: "ok", provider: "openrouter", stated: "openrouter", account: "", key: "sk-or-…7890", route_sessions: true, said: "" },
  model: { state: "ok", model: "", auto: true, said: "" },
  board: { state: "ok", storage: "notion", workspace: "abc", path: "", tickets: 12, said: "" },
  github: { state: "missing", account: "", via: "gh", said: "not signed in", command: "gh auth login" },
  projects: { state: "ok", root: "/workspace", repositories: 3, configured: 0 },
  channels: { state: "ok", active: ["telegram"] },
  environment: { state: "ok", container: true, version: "0.1.0" },
}

test("every line of the summary says its state and where it is changed", () => {
  const lines = rows(summary)
  assert.deepEqual(
    lines.map((line) => line.key),
    ["provider", "model", "board", "github", "projects", "channels", "environment"]
  )
  const [provider, , board, github, , channels, environment] = lines
  assert.equal(provider.value, "{{name}} — {{key}}, sessions on OpenRouter")
  assert.equal(provider.params.key, "sk-or-…7890", "a key goes out masked, as the server sent it")
  assert.equal(provider.step, "provider")
  assert.equal(board.params.count, "12")
  assert.equal(github.state, "missing")
  assert.equal(channels.params.names, "Telegram")
  assert.match(environment.value, /^Container/)
  for (const line of lines) assert.ok(line.section, `${line.key} leads to a setting`)
})

test("a CLI nobody signed in is said as such", () => {
  const cli = rows({ ...summary, provider: { ...summary.provider, provider: "cli", state: "missing", key: "" } })[0]
  assert.equal(cli.value, "{{name}} — not signed in")
  assert.equal(cli.state, "missing")
})
