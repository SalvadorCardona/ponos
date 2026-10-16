/* The line Ponos says while the workspace answers, held to what it says.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { doing, named, outline, shortName, tally } from "./thinking.ts"

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

test("a step is titled in plain words, never by its command or its tool", () => {
  assert.equal(named(step("Read", "src/ui/hud.ts")).key, "I read the project’s code")
  assert.equal(named(step("Search", "objectives")).key, "I search the project’s code")
  assert.equal(named(step("Read", "  ")).key, "I read the project’s code")
  assert.equal(named(step("create-pages", "Objectifs")).key, "I work on the project")
  for (const label of ["Read", "Edit", "Write", "Search", "Web", "Sub-agent", "Plan", "Error", "Bash", "other"]) {
    const line = named(step(label, "rm -rf /tmp/x && ponos schedules"))
    assert.equal(line.params, undefined)
  }
})

test("a command is titled by its kind", () => {
  const key = (detail: string) => named(step("Bash", detail)).key
  assert.equal(
    key('timeout 60 ponos schedules 2>&1 | head -12; cd ~/.local/share/ponos/app/src && timeout 120 python3 -c "from ponos import config as C"'),
    "I look at the scheduled tasks"
  )
  assert.equal(key("ponos list"), "I look at the board")
  assert.equal(key('git add -A && git commit -m "x"'), "I save and send the changes")
  assert.equal(key("git push origin main"), "I save and send the changes")
  assert.equal(key("git log --oneline"), "I look at the project’s history")
  assert.equal(key("cd app && python3 tests/run.py"), "I check that everything works")
  assert.equal(key("npm test"), "I check that everything works")
  assert.equal(key("npm ci"), "I install what the project needs")
  assert.equal(key("grep -rn foo src"), "I look through the project’s files")
  assert.equal(key("cat ~/.local/share/ponos/app/x.py"), "I look through the project’s files")
  assert.equal(key("python3 -c 'print(1)'"), "I work on the project")
  assert.equal(named(step("Bash", "")).key, "I work on the project")
})

test("an outline lists the tool calls, and how each went", () => {
  const steps = [step("Read", "a.ts"), step("Let me look.", "", true), step("Bash", "npm run x"), step("Error", "Exit code 1"), step("Read", "b.ts")]
  const items = outline(steps, false)
  assert.deepEqual(items.map((item) => [item.index, item.state]), [[0, "ok"], [2, "error"], [4, "running"]])
  assert.equal(items[1].error, "Exit code 1")
  assert.equal(outline(steps, true)[2].state, "ok")
})

test("an error with no call before it is a step of its own", () => {
  const items = outline([step("Error", "boom")], true)
  assert.deepEqual(items.map((item) => item.state), ["error"])
  assert.equal(items[0].error, undefined)
})
