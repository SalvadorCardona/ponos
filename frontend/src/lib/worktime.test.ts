/* How a duration is said, and how the clock goes on from a reading.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { brief, clock, worked, type WorkTime } from "./worktime.ts"

const said = (value: { key: string; params: Record<string, string> }) =>
  value.key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => value.params[name])

test("a span is said in seconds, then minutes and seconds, then hours and minutes", () => {
  assert.equal(said(clock(0)), "0 s")
  assert.equal(said(clock(45)), "45 s")
  assert.equal(said(clock(750)), "12 min 30 s")
  assert.equal(said(clock(900)), "15 min")
  assert.equal(said(clock(3900)), "1 h 05")
  assert.equal(said(clock(7200)), "2 h")
})

test("a card says whole minutes and never a stopwatch", () => {
  assert.equal(said(brief(20)), "<1 min")
  assert.equal(said(brief(750)), "13 min")
  assert.equal(said(brief(3900)), "1 h 05")
})

test("the clock goes on from its reading only while a session works", () => {
  const going: WorkTime = { work: 600, paused: 0, sessions: 1, running: true, pause: "" }
  assert.equal(worked(going, 1_000, 31_000), 630)
  assert.equal(worked(going, 5_000, 1_000), 600)
  assert.equal(worked({ ...going, running: false, pause: "question" }, 1_000, 31_000), 600)
})
