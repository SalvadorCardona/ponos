/* The runner's timezone, by name, as the schedules last said it: the zone a
 * schedule's hours are read in. Kept apart from `resources/schedules`, which
 * writes it, so the form that reads it is not one more way into that module —
 * and what the first load downloads stays what it was. */
let zone: string | undefined

export const runnerZone = () => zone

export function setRunnerZone(named: string | undefined) {
  zone = named
}
