/* The Unblock and Decide panels' decisions, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  CATEGORIES,
  LABELS,
  actionOf,
  away,
  categoryOf,
  immediate,
  labelOf,
  prefilled,
  sendable,
  titlesIn,
  tone,
  type Offer,
} from "./decision.ts"

const offer = (key: string, needs: Offer["needs"] = "", text = "", number = 0): Offer => ({
  key,
  column: "ready",
  needs,
  text,
  number,
})

test("a blocked card is unblocked, a card in review is decided, and nothing else asks", () => {
  assert.equal(actionOf("blocked"), "Unblock")
  assert.equal(actionOf("review"), "Decide")
  assert.equal(actionOf("ready"), null)
  assert.equal(actionOf("done"), null)
})

test("every category the runner names has a name, and an unknown one reads as stuck", () => {
  for (const key of ["question", "access", "manual", "credits", "ci", "conflict", "split", "other"])
    assert.ok(CATEGORIES[key], key)
  assert.equal(categoryOf("weather"), "Stuck")
  assert.equal(categoryOf(undefined), "Stuck")
})

test("every key the runner offers has a button, and an option is called by its words", () => {
  for (const key of [
    "yes", "answer", "done-retry", "retry", "model", "instruct", "split", "abandon", "other",
    "validate", "rework", "fix-ci", "add-tests", "screenshots", "rebase", "caveat", "reject",
  ])
    assert.ok(LABELS[key], key)
  assert.equal(labelOf(offer("option", "", "Use Dokploy", 1)), "Use Dokploy")
  assert.equal(labelOf(offer("retry")), "Run it again")
})

test("a click is enough only for what needs nothing typed", () => {
  assert.ok(immediate(offer("yes")))
  assert.ok(immediate(offer("validate")))
  assert.ok(!immediate(offer("abandon", "note")))
  assert.ok(!immediate(offer("other", "text")))
  assert.ok(!immediate(offer("model", "model")))
})

test("an instruction needs words, a note does not, a model needs a model", () => {
  assert.ok(!sendable(offer("other", "text"), "   "))
  assert.ok(sendable(offer("other", "text"), "Use the key in 1Password"))
  assert.ok(sendable(offer("abandon", "note"), ""))
  assert.ok(!sendable(offer("model", "model"), "", ""))
  assert.ok(sendable(offer("model", "model"), "", "opus"))
  assert.ok(!sendable(offer("split", "titles"), "\n  \n"))
  assert.ok(sendable(offer("split", "titles"), "The API\n\nThe page"))
})

test("a ready-made instruction and the proposed sub-tickets open the field, nothing else does", () => {
  assert.equal(prefilled(offer("fix-ci", "text", "Fix the checks.")), "Fix the checks.")
  assert.equal(prefilled(offer("split", "titles", "A\nB")), "A\nB")
  assert.equal(prefilled(offer("abandon", "note", "ignored")), "")
  assert.deepEqual(titlesIn(" A \n\nB\n"), ["A", "B"])
})

test("the way forward stands out and the way out reads as one", () => {
  assert.equal(tone(offer("option", "", "x", 1), 0), "default")
  assert.equal(tone(offer("option", "", "y", 2), 1), "outline")
  assert.equal(tone(offer("abandon", "note"), 3), "outline")
  assert.equal(tone(offer("reject", "note"), 0), "outline")
  assert.ok(away(offer("reject", "note")) && away(offer("abandon", "note")) && !away(offer("retry")))
  assert.equal(tone(offer("other", "text"), 0), "outline")
})
