/* The confirmation windows' keys, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { enterConfirms, enterLabel, takesLines } from "./confirm.ts"

const press = (key: string, held: Record<string, boolean> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...held,
})

test("Enter confirms from the window, or from a one-line field", () => {
  assert.equal(enterConfirms(press("Enter"), { tagName: "DIV" }), true)
  assert.equal(enterConfirms(press("Enter"), { tagName: "INPUT" }), true)
  assert.equal(enterConfirms(press("Enter"), null), true)
})

test("another key never confirms", () => {
  assert.equal(enterConfirms(press("Escape"), { tagName: "DIV" }), false)
  assert.equal(enterConfirms(press(" "), { tagName: "DIV" }), false)
})

test("a held Enter, or one that ends an input method's composition, confirms nothing", () => {
  assert.equal(enterConfirms({ ...press("Enter"), repeat: true }, { tagName: "DIV" }), false)
  assert.equal(enterConfirms({ ...press("Enter"), isComposing: true }, { tagName: "INPUT" }), false)
})

test("on a button, Enter presses that button and nothing else", () => {
  assert.equal(enterConfirms(press("Enter"), { tagName: "BUTTON" }), false)
})

test("on a checkbox drawn as a button, Enter confirms: it toggles nothing", () => {
  assert.equal(enterConfirms(press("Enter"), { tagName: "BUTTON", role: "checkbox" }), true)
})

test("in a field of several lines Enter is a new line, and Ctrl+Enter or ⌘+Enter confirms", () => {
  assert.equal(takesLines({ tagName: "TEXTAREA" }), true)
  assert.equal(takesLines({ tagName: "DIV", isContentEditable: true }), true)
  assert.equal(takesLines({ tagName: "INPUT" }), false)
  assert.equal(enterConfirms(press("Enter"), { tagName: "TEXTAREA" }), false)
  assert.equal(enterConfirms(press("Enter", { shiftKey: true }), { tagName: "TEXTAREA" }), false)
  assert.equal(enterConfirms(press("Enter", { ctrlKey: true }), { tagName: "TEXTAREA" }), true)
  assert.equal(enterConfirms(press("Enter", { metaKey: true }), { tagName: "TEXTAREA" }), true)
})

test("the badge says Enter, or the chord a field of several lines asks for", () => {
  assert.equal(enterLabel(false, false), "↵")
  assert.equal(enterLabel(true, false), "Ctrl+↵")
  assert.equal(enterLabel(true, true), "⌘↵")
})
