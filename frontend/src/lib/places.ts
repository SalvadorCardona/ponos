/* Where a project is, said in the part of it that tells two projects apart.
 *
 * A repository is declared as a clone URL as often as `owner/repo`, and a path
 * starts with the same `/home/<you>/` on every line. Cut at the end, as a
 * line too long for its cell is, both lose exactly what was worth reading:
 * "https://github.c…" says nothing about which repository. So the repository
 * is said by its owner and name, and a path by its last two folders.
 *
 * Kept apart from the cards for the same reason `composer.ts` is: `node --test`
 * reads this file as it is, so it imports nothing.
 */

/** A repository as the console says it: `owner/repo`, and where a browser finds it. */
export interface RepositoryName {
  name: string
  /** Empty when the declaration is not something a browser can open. */
  href: string
}

const GITHUB = /^(?:https?:\/\/|ssh:\/\/git@|git@)?(?:www\.)?github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/*$/i
const SHORT = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/
const ELSEWHERE = /^https?:\/\/[^/]+\/(?:.*\/)?([^/\s]+)\/([^/\s]+?)(?:\.git)?\/*$/i

/** What a project's `repository` says, reduced to `owner/repo` wherever that can be read. */
export function repositoryName(declared: string): RepositoryName | null {
  const value = declared.trim()
  if (!value) return null
  const github = GITHUB.exec(value) ?? SHORT.exec(value)
  if (github) {
    const name = `${github[1]}/${github[2]}`
    return { name, href: `https://github.com/${name}` }
  }
  // Another host: still the last two parts of the address, and the address
  // itself to follow.
  const elsewhere = ELSEWHERE.exec(value)
  if (elsewhere) return { name: `${elsewhere[1]}/${elsewhere[2]}`, href: value }
  return { name: value, href: "" }
}

/** A path cut from the left: its last two folders, what tells one project from the next. */
export function shortPath(path: string): string {
  const parts = path.trim().split("/").filter(Boolean)
  if (parts.length <= 2) return path.trim()
  return `…/${parts.slice(-2).join("/")}`
}
