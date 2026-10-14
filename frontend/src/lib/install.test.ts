/* When the console offers to be installed, held to what it says.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { installOffer, isIos } from "./install.ts"

test("an app already running as an app offers nothing", () => {
  assert.equal(installOffer({ standalone: true, promptReady: true, ios: false }), "none")
  assert.equal(installOffer({ standalone: true, promptReady: false, ios: true }), "none")
})

test("a browser that can install on request is asked to", () => {
  assert.equal(installOffer({ standalone: false, promptReady: true, ios: false }), "prompt")
})

test("iOS has no prompt to wait for: the Share menu is the only road", () => {
  assert.equal(installOffer({ standalone: false, promptReady: false, ios: true }), "share")
})

test("a browser that has not offered, and is not iOS, says nothing", () => {
  assert.equal(installOffer({ standalone: false, promptReady: false, ios: false }), "none")
})

test("an iPad asking for the desktop site is still an iPad", () => {
  assert.equal(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5), true)
  assert.equal(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5), true)
  assert.equal(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0), false)
  assert.equal(isIos("Mozilla/5.0 (X11; Linux x86_64)", "Linux x86_64", 0), false)
})
