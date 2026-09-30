/* The version badge's decisions, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { badgeMode, justUpdated, stepState } from "./upgrade.ts"

test("up to date, the badge is the version and nothing else", () => {
  assert.equal(badgeMode({ available: false, automatic: true, phase: "idle" }), "version")
  assert.equal(badgeMode(undefined), "version")
  assert.equal(badgeMode({ available: false, automatic: true, phase: "done" }), "version")
})

test("a newer version waiting is an offer, whether or not it can be installed from here", () => {
  assert.equal(badgeMode({ available: true, automatic: true, phase: "idle" }), "offer")
  assert.equal(badgeMode({ available: true, automatic: false, phase: "idle" }), "offer")
})

test("an update under way or failed says so over the offer", () => {
  for (const phase of ["waiting", "downloading", "installing", "restarting"] as const)
    assert.equal(badgeMode({ available: true, automatic: true, phase }), "working")
  assert.equal(badgeMode({ available: true, automatic: true, phase: "failed" }), "failed")
})

test("the steps are done up to the phase, and all done once it is back", () => {
  assert.equal(stepState("downloading", "installing"), "done")
  assert.equal(stepState("installing", "installing"), "current")
  assert.equal(stepState("restarting", "installing"), "pending")
  assert.equal(stepState("downloading", "waiting"), "pending")
  assert.equal(stepState("restarting", "done"), "done")
})

test("a page that watched the restart is told it landed; a page opened after is not", () => {
  assert.equal(justUpdated("restarting", "done"), true)
  assert.equal(justUpdated(undefined, "done"), false)
  assert.equal(justUpdated("done", "done"), false)
})
