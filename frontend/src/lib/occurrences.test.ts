import assert from "node:assert/strict"
import { test } from "node:test"

import { entries, nextAfter, occurrences, wallOf, zoneOf, type Row } from "./occurrences.ts"

const PARIS = "Europe/Paris"
const at = (text: string) => Date.parse(text)
/** An instant as the clock on a Paris wall reads it: "2026-10-25 02:30". */
const paris = (instant: number) => new Date(wallOf(instant, PARIS)).toISOString().slice(0, 16).replace("T", " ")
const walk = (rule: { cadence: string; at?: string; day?: string }, from: string, to: string, first: string | null = null) =>
  occurrences({ at: "", day: "", ...rule }, first ? at(first) : null, at(from), at(to), PARIS).map(paris)

test("a daily schedule lands once a day, at the same hour on both sides of the change to winter time", () => {
  // The clocks go back on Sunday 25 October 2026, at 03:00 → 02:00.
  const days = walk({ cadence: "Daily", at: "09:00" }, "2026-10-23T12:00:00Z", "2026-10-27T12:00:00Z")
  assert.deepEqual(days, ["2026-10-24 09:00", "2026-10-25 09:00", "2026-10-26 09:00", "2026-10-27 09:00"])
  // Nine in Paris is 07:00 UTC before the change and 08:00 UTC after it.
  assert.equal(new Date(nextAfter({ cadence: "Daily", at: "09:00", day: "" }, at("2026-10-24T08:00:00Z"), PARIS)!).toISOString(), "2026-10-25T08:00:00.000Z")
})

test("a daily schedule set on an hour that does not exist lands after the jump, as the runner does", () => {
  // 02:30 on 29 March 2026 never happens in Paris: 02:00 became 03:00.
  const [march] = walk({ cadence: "Daily", at: "02:30" }, "2026-03-28T12:00:00Z", "2026-03-29T12:00:00Z").slice(-1)
  assert.equal(march, "2026-03-29 03:30")
})

test("an hourly schedule falls on the minute of its hour, every hour, and drops the repeated one in autumn", () => {
  const day = walk({ cadence: "Hourly", at: "09:35" }, "2026-09-09T00:00:00Z", "2026-09-09T05:00:00Z")
  assert.deepEqual(day, ["2026-09-09 02:35", "2026-09-09 03:35", "2026-09-09 04:35", "2026-09-09 05:35", "2026-09-09 06:35"])
  // 25 October: 02:30 happens twice. The runner reads the wall clock, so the second is skipped, as `next_occurrence` does.
  const change = walk({ cadence: "Hourly", at: "00:30" }, "2026-10-24T22:00:00Z", "2026-10-25T04:00:00Z")
  assert.deepEqual(change, ["2026-10-25 00:30", "2026-10-25 01:30", "2026-10-25 02:30", "2026-10-25 03:30", "2026-10-25 04:30"])
})

test("a weekly schedule lands on its day, and on the weekday it was first read on when no day is named", () => {
  const mondays = walk({ cadence: "Weekly", at: "09:00", day: "Monday" }, "2026-10-14T00:00:00Z", "2026-11-03T00:00:00Z")
  assert.deepEqual(mondays, ["2026-10-19 09:00", "2026-10-26 09:00", "2026-11-02 09:00"])
  assert.deepEqual(walk({ cadence: "Weekly", at: "09:00", day: "Fri" }, "2026-10-14T00:00:00Z", "2026-10-24T00:00:00Z"), ["2026-10-16 09:00", "2026-10-23 09:00"])
  // 14 October 2026 is a Wednesday; the one the server called next is that very evening.
  const unnamed = walk({ cadence: "Weekly", at: "21:00" }, "2026-10-14T00:00:00Z", "2026-10-29T00:00:00Z", "2026-10-14T19:00:00Z")
  assert.deepEqual(unnamed, ["2026-10-14 21:00", "2026-10-21 21:00", "2026-10-28 21:00"])
})

test("a monthly schedule on the 31st lands on the last day each month has", () => {
  const months = walk({ cadence: "Monthly", at: "07:00", day: "31" }, "2027-01-01T00:00:00Z", "2027-05-01T00:00:00Z")
  assert.deepEqual(months, ["2027-01-31 07:00", "2027-02-28 07:00", "2027-03-31 07:00", "2027-04-30 07:00"])
})

test("a rule nobody can read has no occurrence", () => {
  assert.deepEqual(walk({ cadence: "Fortnightly", at: "09:00" }, "2026-10-14T00:00:00Z", "2026-11-14T00:00:00Z"), [])
  assert.deepEqual(walk({ cadence: "Daily", at: "nine" }, "2026-10-14T00:00:00Z", "2026-11-14T00:00:00Z"), [])
  assert.deepEqual(walk({ cadence: "Weekly", at: "09:00", day: "Someday" }, "2026-10-14T00:00:00Z", "2026-11-14T00:00:00Z"), [])
})

test("the walk starts from the moment the list calls Next, and never before it", () => {
  const next = "2026-10-14T13:00:00Z"
  const [first] = occurrences({ cadence: "Daily", at: "15:00", day: "" }, at(next), at("2026-10-14T00:00:00Z"), at("2026-10-20T00:00:00Z"), PARIS)
  assert.equal(first, at(next))
})

test("an unknown zone is read in the browser's own", () => {
  assert.equal(zoneOf("Europe/Paris"), "Europe/Paris")
  assert.equal(zoneOf("Mars/Olympus"), Intl.DateTimeFormat().resolvedOptions().timeZone)
  assert.equal(zoneOf(""), Intl.DateTimeFormat().resolvedOptions().timeZone)
})

const row = (over: Partial<Row>): Row => ({
  id: "a",
  cadence: "Daily",
  at: "09:00",
  day: "",
  active: true,
  problem: "",
  next: "",
  last: "",
  ...over,
})
const NOW = at("2026-10-14T21:00:00Z")

test("two daily schedules appear every day at their own hour, from the Next the list shows", () => {
  const found = entries(
    [
      row({ id: "nine", at: "09:00", next: "2026-10-15T07:00:00Z" }),
      row({ id: "three", at: "15:00", next: "2026-10-15T13:00:00Z" }),
    ],
    NOW,
    PARIS,
    PARIS,
  )
  assert.equal(found.length, 2 * 366)
  assert.deepEqual(found.slice(0, 2).map((entry) => [entry.schedule, paris(entry.start), entry.kind]), [
    ["nine", "2026-10-15 09:00", "upcoming"],
    ["three", "2026-10-15 15:00", "upcoming"],
  ])
  // After the change to winter time, still nine and three on the wall.
  const after = found.filter((entry) => paris(entry.start).startsWith("2026-10-26"))
  assert.deepEqual(after.map((entry) => paris(entry.start).slice(11)), ["09:00", "15:00"])
})

test("a schedule that is off has no future, and what it last did stays on the calendar as the past", () => {
  const found = entries([row({ active: false, next: "2026-10-15T07:00:00Z", last: "2026-10-13T07:00:00Z" })], NOW, PARIS, PARIS)
  assert.deepEqual(found.map((entry) => entry.kind), ["past"])
  assert.equal(found[0].start, at("2026-10-13T07:00:00Z"))
  // One nobody can read is the same: nothing is born from it.
  assert.deepEqual(entries([row({ problem: "no cadence", next: "2026-10-15T07:00:00Z" })], NOW, PARIS, PARIS), [])
})

test("an hourly schedule folds into one entry a day, holding every one of its launches", () => {
  const found = entries([row({ cadence: "Hourly", at: "", next: "2026-10-14T22:00:00Z" })], NOW, PARIS, PARIS)
  const day = found.filter((entry) => paris(entry.start).startsWith("2026-10-16"))
  assert.equal(day.length, 1)
  assert.equal(day[0].times.length, 24)
  assert.equal(paris(day[0].start), "2026-10-16 00:00")
  // Under the fold, a launch is drawn on its own: 23:00 tonight is all that is left of today.
  const [tonight, tomorrow] = entries([row({ cadence: "Hourly", at: "", next: "2026-10-14T21:00:00Z" })], NOW, PARIS, PARIS)
  assert.equal(paris(tonight.start), "2026-10-14 23:00")
  assert.equal(tonight.times.length, 1)
  assert.equal(tomorrow.times.length, 24)
})

test("a schedule that is due appears now, not in the past", () => {
  const [first] = entries([row({ cadence: "Hourly", at: "", next: "2026-09-09T19:00:00Z" })], NOW, PARIS, PARIS)
  assert.ok(first.start >= NOW)
})
