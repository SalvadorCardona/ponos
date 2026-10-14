/* What the bell shows of its count, without a DOM to show it in.
 *
 * Imports nothing, so that `node --test` reads it as it is.
 */

/** The most the badge writes as a number: past it, "9+" says it as well as 37 would. */
export const BADGE_MAX = 9

/** The badge over the bell — nothing at all when there is nothing unread. */
export function badgeLabel(unread: number): string {
  if (!(unread > 0)) return ""
  return unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread)
}
