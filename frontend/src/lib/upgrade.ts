/* What the version at the top right says about an update, without the DOM.
 *
 * Kept apart from the badge for the same reason `composer.ts` is: `node --test`
 * reads this file as it is, so it imports nothing — not even the type the
 * server's answer is declared under, which is repeated here as the little of it
 * these decisions need.
 */

export type UpgradePhase =
  | "idle"
  | "waiting"
  | "downloading"
  | "installing"
  | "restarting"
  | "done"
  | "failed"

export interface UpgradeLike {
  available: boolean
  automatic: boolean
  phase: UpgradePhase
}

/** What the badge is: the version alone, an offer, an update under way, or one that failed. */
export type BadgeMode = "version" | "offer" | "working" | "failed"

const UNDER_WAY: UpgradePhase[] = ["waiting", "downloading", "installing", "restarting"]

export function underWay(phase: UpgradePhase): boolean {
  return UNDER_WAY.includes(phase)
}

export function badgeMode(upgrade: UpgradeLike | undefined | null): BadgeMode {
  if (!upgrade) return "version"
  if (underWay(upgrade.phase)) return "working"
  // A failure is said until it is tried again or the update stops being
  // waited for: the runner is on its old version, and that is worth a glance.
  if (upgrade.phase === "failed") return "failed"
  return upgrade.available ? "offer" : "version"
}

/** The steps drawn in the dialog, in order — `waiting` only while it is one. */
export const STEPS = ["downloading", "installing", "restarting"] as const

export type StepState = "done" | "current" | "pending"

export function stepState(step: (typeof STEPS)[number], phase: UpgradePhase): StepState {
  if (phase === "done") return "done"
  const at = STEPS.indexOf(phase as (typeof STEPS)[number])
  const index = STEPS.indexOf(step)
  if (at < 0) return "pending"
  return index < at ? "done" : index === at ? "current" : "pending"
}

/** Whether the page just watched the console come back on a new version. */
export function justUpdated(before: UpgradePhase | undefined, now: UpgradePhase): boolean {
  return now === "done" && before !== undefined && underWay(before)
}
