/* The tickets created, read as a project's health: is it moving on, or
 * mending what it broke?
 *
 * The server hands the tickets created over a period as cells — a bucket, a
 * type, a sub-type, a project, a count (`created_by_kind` in
 * `web/statistics.py`) — and the dashboard filters them by type and by project
 * as you click, without asking again. What is worked out of them lives here,
 * with nothing imported, so that `node --test` reads it as it is.
 *
 * The regression rate is the bugs over the bugs and the work that moves the
 * product: features and improvements — the board has no UX/UI sub-type, an
 * interface made better is an improvement. Chores, refactors, docs, perf and
 * security are neither and stay out of it; so do the tickets with no sub-type,
 * which say nothing either way. No bug and no progress is no rate at all, not
 * a zero nobody earned.
 */

import type { Made, MadeCell } from "./types.ts"

export const BROKEN = ["bug"]
export const AHEAD = ["feature", "improvement"]

/** A type and a project the cells are limited to; null for every one of them. */
export interface Scope {
  kind: string | null
  project: string | null
}

export const within = (cell: MadeCell, scope: Scope): boolean =>
  (scope.kind === null || cell.kind === scope.kind) &&
  (scope.project === null || cell.project === scope.project)

/** How many of each sub-type ("" for none) the cells hold within a scope. */
export function bySubtype(cells: MadeCell[], scope: Scope): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const cell of cells) {
    if (within(cell, scope)) counts[cell.subtype] = (counts[cell.subtype] ?? 0) + cell.count
  }
  return counts
}

/** One stack per bucket, every bucket of the period, empty ones included. */
export function stacks(
  made: Made,
  scope: Scope
): { bucket: string; counts: Record<string, number>; total: number }[] {
  const of = new Map(made.buckets.map((bucket) => [bucket, [] as MadeCell[]]))
  for (const cell of made.cells) of.get(cell.bucket)?.push(cell)
  return made.buckets.map((bucket) => {
    const counts = bySubtype(of.get(bucket) ?? [], scope)
    return { bucket, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) }
  })
}

const sum = (counts: Record<string, number>, keys: string[]) =>
  keys.reduce((total, key) => total + (counts[key] ?? 0), 0)

/** The bugs over the bugs, features and improvements, from 0 to 1; null when there are none. */
export function regression(counts: Record<string, number>): number | null {
  const broken = sum(counts, BROKEN)
  const whole = broken + sum(counts, AHEAD)
  return whole ? broken / whole : null
}

/* Where the rate went since the period before. Under a point of difference
 * is the same: two bugs in a hundred tickets is not a trend. */
export function trend(now: number | null, before: number | null): "up" | "down" | "same" | null {
  if (now === null || before === null) return null
  if (Math.abs(now - before) < 0.01) return "same"
  return now > before ? "up" : "down"
}

export interface ProjectHealth {
  project: string
  ahead: number
  broken: number
  rate: number | null
  before: number | null
}

/* Project by project, within a type: what moved it on, what it broke, and
 * the rate now and before — the one that breaks the most first, the projects
 * that have no rate after. */
export function byProject(made: Made, kind: string | null): ProjectHealth[] {
  const names = [...new Set(made.cells.map((cell) => cell.project))]
  return names
    .map((project) => {
      const now = bySubtype(made.cells, { kind, project })
      return {
        project,
        ahead: sum(now, AHEAD),
        broken: sum(now, BROKEN),
        rate: regression(now),
        before: regression(bySubtype(made.before, { kind, project })),
      }
    })
    .sort(
      (a, b) =>
        (b.rate ?? -1) - (a.rate ?? -1) || b.broken - a.broken || a.project.localeCompare(b.project)
    )
}
