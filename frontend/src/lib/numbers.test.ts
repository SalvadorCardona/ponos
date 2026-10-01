/* Numbers, amounts and plurals, held to how each language writes them.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { count, money, number, setNumberLocale } from "./numbers.ts"

// French puts a narrow no-break space between thousands and before the sign:
// what the page shows as a space is not the one typed on a keyboard.
const spaced = (text: string) => text.replace(/[  ]/g, " ")

test("an amount is written where each language writes it", () => {
  setNumberLocale("fr-FR")
  assert.equal(spaced(money(2734.75)), "2 734,75 $")
  assert.equal(spaced(money(1.36)), "1,36 $")
  assert.equal(spaced(money(0)), "0,00 $")
  assert.equal(spaced(money(2627.4, 0)), "2 627 $")
  setNumberLocale("en-GB")
  assert.equal(money(2734.75), "$2,734.75")
  assert.equal(money(1.36), "$1.36")
  assert.equal(money(2627.4, 0), "$2,627")
  assert.equal(money(0.0123, 4), "$0.0123")
  assert.equal(money(0.5, 4), "$0.50")
})

test("a count has its thousands separated", () => {
  setNumberLocale("fr-FR")
  assert.equal(spaced(number(1178)), "1 178")
  assert.equal(number(12), "12")
  setNumberLocale("en-GB")
  assert.equal(number(1178), "1,178")
})

test("a plural is chosen, never written (s)", () => {
  const one = "{{count}} ticket"
  const other = "{{count}} tickets"
  setNumberLocale("fr-FR")
  assert.deepEqual(count(1, one, other), { key: one, params: { count: "1" } })
  assert.equal(count(6, one, other).key, other)
  // French has one ticket at 0, and the 0 is still written: react-mini-i18n
  // leaves an empty or falsy parameter as `{{count}}`.
  assert.deepEqual(count(0, one, other), { key: one, params: { count: "0" } })
  assert.equal(spaced(count(1178, one, other).params.count), "1 178")
  setNumberLocale("en-GB")
  assert.equal(count(1, one, other).key, one)
  assert.equal(count(0, one, other).key, other)
  assert.equal(count(6, one, other).key, other)
})
