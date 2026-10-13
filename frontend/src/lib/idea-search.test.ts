/* What the filters of the Ideas list keep, held to what the list always did.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { counts, filtering, keeps, scopeOf, scopes } from "./idea-search.ts"

const WEBSITE = "0000000000000000000000000000cafe"
const idea = (title: string, status: string, author: string, project = "", kind = "ticket", category = "") => ({
  title,
  status,
  kind,
  category,
  project,
  author: { kind: author },
})
const IDEAS = [
  idea("calendar", "proposed", "ponos", "", "ticket", "feature"),
  idea("invoice", "kept", "ponos", "", "project", "feature"),
  idea("hours", "proposed", "human", "", "ticket", "ux"),
  idea("sitemap", "discarded", "ponos", WEBSITE, "ticket", "technical"),
  idea("quotation", "ticket", "ponos", "00000000-0000-0000-0000-00000000cafe"),
]
const titles = (filter: object) => IDEAS.filter((one) => keeps(one, filter)).map((one) => one.title)

test("nothing chosen keeps every idea", () => {
  assert.equal(titles({}).length, IDEAS.length)
  assert.equal(titles({ status: "", author: "", project: "" }).length, IDEAS.length)
  assert.equal(filtering({ status: " ", author: "", project: "" }), false)
})

test("the status keeps the ideas in that status", () => {
  assert.deepEqual(titles({ status: "proposed" }), ["calendar", "hours"])
  assert.deepEqual(titles({ status: "ticket" }), ["quotation"])
  assert.equal(filtering({ status: "kept" }), true)
})

test("the category keeps the ideas sorted into it, and none of the unsorted ones", () => {
  assert.deepEqual(titles({ category: "feature" }), ["calendar", "invoice"])
  assert.deepEqual(titles({ category: "feature", status: "kept" }), ["invoice"])
  assert.deepEqual(titles({ category: "security" }), [])
  assert.equal(filtering({ category: "ux" }), true)
  assert.equal(counts(IDEAS, { category: "feature" }).proposed, 1)
})

test("the author keeps Ponos's ideas, or ours", () => {
  assert.deepEqual(titles({ author: "human" }), ["hours"])
  assert.deepEqual(titles({ author: "ponos", status: "proposed" }), ["calendar"])
})

test("the project keeps its ideas, with or without the dashes of its id", () => {
  assert.deepEqual(titles({ project: WEBSITE }), ["sitemap", "quotation"])
  assert.deepEqual(titles({ project: "00000000-0000-0000-0000-00000000cafe" }), ["sitemap", "quotation"])
})

test("the workspace keeps its ideas, the ideas of a new project among them", () => {
  assert.deepEqual(titles({ project: "workspace" }), ["calendar", "invoice", "hours"])
  assert.equal(scopeOf(idea("x", "proposed", "ponos", WEBSITE, "project")), "")
})

test("the counts follow the other filters, not the status", () => {
  assert.deepEqual(counts(IDEAS, { status: "kept", project: "workspace" }), {
    all: 3,
    proposed: 2,
    kept: 1,
    discarded: 0,
    ticket: 0,
  })
  assert.equal(counts(IDEAS, { author: "human" }).all, 1)
})

test("the projects offered are those an idea is for, once each", () => {
  assert.deepEqual(scopes(IDEAS), [WEBSITE])
})
