/* The line Ponos says while the workspace answers, held to what it says.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { doing, shortName, tally } from "./thinking.ts"

const step = (label: string, detail = "", said = false) => ({ label, detail, said })

test("the line is about the last step, said as a person would", () => {
  assert.deepEqual(doing([step("Bash", "ls"), step("Read", "/home/me/app/src/api.py")]), {
    key: "reading {{name}}…",
    params: { name: "api.py" },
  })
  assert.equal(doing([step("Edit", "src/x.ts")]).params?.name, "x.ts")
  assert.equal(doing([step("Search", "def run")]).key, "searching the code…")
  assert.equal(doing([step("Bash", "rm -rf build")]).key, "running a command…")
  assert.equal(doing([step("Error", "Exit code 1 Traceback …")]).key, "fixing an error…")
})

test("a command says what kind of command it is, when that is plain", () => {
  assert.equal(doing([step("Bash", "ponos list")]).key, "looking at the board…")
  assert.equal(doing([step("Bash", "git log --oneline")]).key, "looking at the history…")
  assert.equal(doing([step("Bash", "python3 tests/run.py")]).key, "running the tests…")
  assert.equal(doing([step("Bash", "npm test")]).key, "running the tests…")
  assert.equal(doing([step("Bash", "npm install")]).key, "running a command…")
})

test("before any step, or after the agent spoke, Ponos is thinking", () => {
  assert.equal(doing([]).key, "thinking…")
  assert.equal(doing([step("Read", "a.py"), step("Let me look.", "", true)]).key, "thinking…")
  assert.equal(doing([step("navigate", "https://example.com")]).key, "working…")
})

test("a long file name is cut, a path is reduced to its name", () => {
  assert.equal(shortName("/a/b/"), "b")
  assert.equal(shortName("C:\\work\\file.txt"), "file.txt")
  const cut = shortName(`/x/${"n".repeat(60)}.py`)
  assert.equal(cut.length, 32)
  assert.ok(cut.endsWith("…"))
})

test("the folded steps count what was done, and what went wrong, not what was said", () => {
  assert.deepEqual(
    tally([step("Bash", "ls"), step("I will fix it.", "", true), step("Error", "boom"), step("Edit", "a")]),
    { steps: 3, errors: 1 }
  )
})
