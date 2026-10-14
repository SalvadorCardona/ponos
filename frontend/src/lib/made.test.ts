/* The tickets created, read as a project's health, held to what it says.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { byProject, bySubtype, regression, stacks, trend } from "./made.ts"
import type { Made } from "./types.ts"

const made: Made = {
  unit: "day",
  buckets: ["2026-09-07", "2026-09-08", "2026-09-09"],
  cells: [
    { bucket: "2026-09-07", kind: "code", subtype: "bug", project: "Opoil", count: 3 },
    { bucket: "2026-09-07", kind: "code", subtype: "feature", project: "Opoil", count: 1 },
    { bucket: "2026-09-09", kind: "code", subtype: "feature", project: "ponos", count: 2 },
    { bucket: "2026-09-09", kind: "code", subtype: "improvement", project: "ponos", count: 1 },
    { bucket: "2026-09-09", kind: "code", subtype: "", project: "ponos", count: 4 },
    { bucket: "2026-09-09", kind: "writing", subtype: "", project: "ponos", count: 2 },
    { bucket: "2026-09-09", kind: "code", subtype: "chore", project: "Adam", count: 2 },
  ],
  before: [
    { kind: "code", subtype: "bug", project: "Opoil", count: 1 },
    { kind: "code", subtype: "feature", project: "Opoil", count: 3 },
    { kind: "code", subtype: "bug", project: "ponos", count: 1 },
    { kind: "code", subtype: "feature", project: "ponos", count: 1 },
  ],
}

test("the regression rate is the bugs over the bugs, features and improvements", () => {
  assert.equal(regression({ bug: 1, feature: 2, improvement: 1 }), 0.25)
  assert.equal(regression({ bug: 2 }), 1)
  assert.equal(regression({ feature: 5 }), 0)
  // Chores, docs and the unclassified are neither: they do not water it down.
  assert.equal(regression({ bug: 1, feature: 1, chore: 8, docs: 3, "": 20 }), 0.5)
  // Nothing either way is no rate, not a zero.
  assert.equal(regression({ chore: 2, "": 4 }), null)
  assert.equal(regression({}), null)
})

test("the trend says where the rate went since the period before", () => {
  assert.equal(trend(0.5, 0.25), "up")
  assert.equal(trend(0.1, 0.4), "down")
  assert.equal(trend(0.333, 0.335), "same")
  assert.equal(trend(0.5, null), null)
  assert.equal(trend(null, 0.5), null)
})

test("the cells are counted within a type and a project, the unclassified kept", () => {
  assert.deepEqual(bySubtype(made.cells, { kind: "code", project: "ponos" }), {
    feature: 2,
    improvement: 1,
    "": 4,
  })
  assert.deepEqual(bySubtype(made.cells, { kind: null, project: "ponos" })[""], 6)
  assert.deepEqual(bySubtype(made.cells, { kind: "publication", project: null }), {})
})

test("every bucket has its stack, the empty ones too", () => {
  const drawn = stacks(made, { kind: "code", project: null })
  assert.deepEqual(
    drawn.map((stack) => [stack.bucket, stack.total]),
    [
      ["2026-09-07", 4],
      ["2026-09-08", 0],
      ["2026-09-09", 9],
    ]
  )
  assert.deepEqual(drawn[0].counts, { bug: 3, feature: 1 })
})

test("project by project, the one that breaks the most comes first", () => {
  const rows = byProject(made, "code")
  assert.deepEqual(
    rows.map((row) => [row.project, row.ahead, row.broken, row.rate, row.before]),
    [
      ["Opoil", 1, 3, 0.75, 0.25],
      ["ponos", 3, 0, 0, 0.5],
      // Only chores: no rate, last.
      ["Adam", 0, 0, null, null],
    ]
  )
})
