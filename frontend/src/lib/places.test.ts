/* How a project's repository and path are shortened, held to what they say.
 *
 *     npm test          (node --test, nothing to install)
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { repositoryName, shortPath } from "./places.ts"

const MOBILE = { name: "SalvadorCardona/mobile-factory", href: "https://github.com/SalvadorCardona/mobile-factory" }

test("a GitHub repository is its owner and name, however it is declared", () => {
  assert.deepEqual(repositoryName("SalvadorCardona/mobile-factory"), MOBILE)
  assert.deepEqual(repositoryName("https://github.com/SalvadorCardona/mobile-factory"), MOBILE)
  assert.deepEqual(repositoryName("https://github.com/SalvadorCardona/mobile-factory.git"), MOBILE)
  assert.deepEqual(repositoryName("https://github.com/SalvadorCardona/mobile-factory/"), MOBILE)
  assert.deepEqual(repositoryName("git@github.com:SalvadorCardona/mobile-factory.git"), MOBILE)
  assert.deepEqual(repositoryName("  SalvadorCardona/mobile-factory.git "), MOBILE)
})

test("another host keeps its address, and is still said by its last two parts", () => {
  assert.deepEqual(repositoryName("https://gitlab.com/group/sub/project.git"), {
    name: "sub/project",
    href: "https://gitlab.com/group/sub/project.git",
  })
})

test("nothing declared is nothing, and what cannot be read is said as it is", () => {
  assert.equal(repositoryName(""), null)
  assert.equal(repositoryName("   "), null)
  assert.deepEqual(repositoryName("/srv/git/opoil.git"), { name: "/srv/git/opoil.git", href: "" })
})

test("a path is cut from the left, to its last two folders", () => {
  assert.equal(shortPath("/home/salva/workspace/opoil"), "…/workspace/opoil")
  assert.equal(shortPath("/home/salva/workspace/opoil/"), "…/workspace/opoil")
  assert.equal(shortPath("~/workspace/opoil"), "…/workspace/opoil")
  assert.equal(shortPath("~/opoil"), "~/opoil")
  assert.equal(shortPath("/srv"), "/srv")
})
