/* The swipe's decisions, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { TILT, exitOffset, lean, sideOfKey, stamp, verdict } from "./swipe.ts"

test("a drag past a third of the card is a verdict, in the direction it went", () => {
  assert.equal(verdict(120, 300), "keep")
  assert.equal(verdict(-120, 300), "discard")
})

test("a drag that is too short brings the card back", () => {
  assert.equal(verdict(40, 300), null)
  assert.equal(verdict(-40, 300), null)
  assert.equal(verdict(0, 300), null)
})

test("a fast flick counts even when short, but not against its own direction, nor a twitch", () => {
  assert.equal(verdict(40, 300, 0.9), "keep")
  assert.equal(verdict(-40, 300, -0.9), "discard")
  assert.equal(verdict(40, 300, -0.9), null)
  assert.equal(verdict(5, 300, 2), null)
})

test("a card with no width decides nothing", () => {
  assert.equal(verdict(500, 0), null)
  assert.equal(lean(500, 0), 0)
  assert.deepEqual(stamp(500, 0), { side: null, strength: 0 })
})

test("the card leans with the finger and stops at its limit", () => {
  assert.equal(lean(0, 300), 0)
  assert.ok(lean(50, 300) > 0 && lean(-50, 300) < 0)
  assert.equal(lean(10_000, 300), TILT)
  assert.equal(lean(-10_000, 300), -TILT)
})

test("the stamp is of the side the card leans to, and full at the verdict's distance", () => {
  assert.deepEqual(stamp(0, 300), { side: null, strength: 0 })
  assert.equal(stamp(30, 300).side, "keep")
  assert.equal(stamp(-30, 300).side, "discard")
  assert.equal(stamp(300 * 0.3, 300).strength, 1)
  assert.ok(stamp(15, 300).strength < 1)
})

test("the arrows are the two sides, and nothing else is", () => {
  assert.equal(sideOfKey("ArrowRight"), "keep")
  assert.equal(sideOfKey("ArrowLeft"), "discard")
  assert.equal(sideOfKey("ArrowUp"), null)
  assert.equal(sideOfKey("Enter"), null)
})

test("a card leaves past the edge of the screen, on its side", () => {
  assert.ok(exitOffset("keep", 300, 400) > 400)
  assert.ok(exitOffset("discard", 300, 400) < -400)
})
