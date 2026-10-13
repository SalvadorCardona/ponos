/* Which ideas the filters of the Ideas list keep, without a DOM.
 *
 * Kept apart like `project-search.ts`, so `node --test` reads it as it stands.
 * The three filters are the ones the list always had — the status, who wrote
 * it, and whom it is for — and they now live in the address, so every value is
 * a word a URL can carry: "" is "all", for each of them, and the workspace is
 * `workspace` rather than an empty project, which would mean "every project".
 *
 * The counts beside the statuses are counted on what the two other filters
 * keep, and not on the status itself: "Kept 3" says how many a click on it
 * would show.
 */

export const STATUSES = ["proposed", "kept", "discarded", "ticket"] as const
export type Status = (typeof STATUSES)[number]

/** Who an idea is written by, as the filter says it. */
export const AUTHORS = ["ponos", "human"] as const

/** The project filter's value for the ideas of the workspace. */
export const WORKSPACE = "workspace"

/** What the list is asked for: one status, one author, one scope ("" for all of each). */
export interface IdeaFilter {
  status?: unknown
  author?: unknown
  project?: unknown
}

/** One idea, as the filters read it. */
export interface Filterable {
  status: string
  kind: string
  project: string
  author: { kind: string }
}

const said = (value: unknown) => String(value ?? "").trim()
export const bare = (id: string) => id.replace(/-/g, "")

/** Whom an idea is for: a project's bare id, or "" for the workspace — which an idea of a new project always is. */
export const scopeOf = (idea: Filterable) => (idea.kind === "project" ? "" : bare(idea.project))

/** Whether a filter other than the status is on: the status alone is not a search that found nothing. */
export function filtering(filter: IdeaFilter = {}): boolean {
  return Boolean(said(filter.status) || said(filter.author) || said(filter.project))
}

/** Whether an idea is kept by the author and the scope, whatever its status. */
export function around(idea: Filterable, filter: IdeaFilter = {}): boolean {
  const author = said(filter.author)
  if (author && idea.author.kind !== author) return false
  const project = said(filter.project)
  if (!project) return true
  return scopeOf(idea) === (project === WORKSPACE ? "" : bare(project))
}

/** Whether an idea is kept by all three filters. */
export function keeps(idea: Filterable, filter: IdeaFilter = {}): boolean {
  const status = said(filter.status)
  return around(idea, filter) && (!status || idea.status === status)
}

/** How many ideas each status button would show, and all of them. */
export function counts(ideas: Filterable[], filter: IdeaFilter = {}): Record<Status | "all", number> {
  const kept = ideas.filter((idea) => around(idea, filter))
  const counted = { all: kept.length } as Record<Status | "all", number>
  for (const status of STATUSES) counted[status] = kept.filter((idea) => idea.status === status).length
  return counted
}

/** The projects an idea is for, once each — the options of the project filter. */
export function scopes(ideas: Filterable[]): string[] {
  return [...new Set(ideas.map(scopeOf).filter(Boolean))]
}
