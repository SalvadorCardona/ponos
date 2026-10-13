/* The Unblock and Decide tabs' decisions, held to what they say.
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
  decisionTabOf,
  buttonsOf,
  categoryOf,
  immediate,
  instructionOf,
  itemsOf,
  labelOf,
  openedWith,
  plainRetry,
  promptOf,
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

test("the tab that unblocks or decides is a blocked or reviewed ticket's, and no other's", () => {
  assert.equal(decisionTabOf("blocked"), "unblock")
  assert.equal(decisionTabOf("review"), "decide")
  for (const column of ["draft", "ready", "running", "validated", "failed", "done", "cancelled"])
    assert.equal(decisionTabOf(column), null, column)
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

test("giving a ticket up says the column it is filed in", () => {
  assert.equal(labelOf({ ...offer("abandon", "note"), column: "done" }), "Abandon — move to done")
  assert.equal(labelOf({ ...offer("abandon", "note"), column: "cancelled" }), "Abandon — move to cancelled")
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

test("a blocked panel writes its instruction in a field of its own, and opens on the answer", () => {
  const asked = [offer("answer", "text"), offer("instruct", "text"), offer("abandon", "note"), offer("other", "text")]
  assert.deepEqual(buttonsOf("blocked", asked).map((one) => one.key), ["answer", "abandon"])
  assert.equal(instructionOf("blocked", asked)?.key, "instruct")
  assert.equal(openedWith("blocked", asked)?.key, "answer")
  // Out of credit offers no instruction of its kind: the field sends "other".
  const credits = [offer("retry"), offer("abandon", "note"), offer("other", "text")]
  assert.equal(instructionOf("blocked", credits)?.key, "other")
  assert.equal(openedWith("blocked", credits), null)
  // In review, nothing changes: every offer is a button, none opens by itself.
  const review = [offer("validate"), offer("rework", "text"), offer("reject", "note")]
  assert.deepEqual(buttonsOf("review", review), review)
  assert.equal(instructionOf("review", review), null)
})

test("running it again without changes is offered quietly, where no button already does it", () => {
  assert.ok(plainRetry("blocked", [offer("done-retry", "note"), offer("other", "text")]))
  assert.ok(!plainRetry("blocked", [offer("retry"), offer("other", "text")]))
  assert.ok(!plainRetry("review", [offer("validate")]))
})

test("an answer's field asks for an answer, the others for what they need", () => {
  assert.equal(promptOf(offer("answer", "text")), "Your answer")
  assert.equal(promptOf(offer("instruct", "text")), "The instruction the next session reads")
  assert.equal(promptOf(offer("model", "model")), "A note, if you want one")
})

test("what was done is split into its lines, without their bullets", () => {
  assert.deepEqual(itemsOf(undefined), [])
  assert.deepEqual(itemsOf("branch ready"), ["branch ready"])
  assert.deepEqual(itemsOf("- one\n* two\n\n  three"), ["one", "two", "three"])
  assert.deepEqual(itemsOf("PR opened; CI green"), ["PR opened", "CI green"])
})
