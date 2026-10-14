import assert from "node:assert/strict"
import { test } from "node:test"

import { badgeLabel } from "./notifications.ts"

test("the badge is empty when nothing is unread", () => {
  assert.equal(badgeLabel(0), "")
  assert.equal(badgeLabel(-1), "")
  assert.equal(badgeLabel(Number.NaN), "")
})

test("the badge counts, and stops at 9+", () => {
  assert.equal(badgeLabel(1), "1")
  assert.equal(badgeLabel(9), "9")
  assert.equal(badgeLabel(10), "9+")
  assert.equal(badgeLabel(120), "9+")
})
