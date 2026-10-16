/* How long Ponos has worked on a ticket, written the way a clock is read.
 *
 * The server counts (`worktime.py`) and sends seconds as of the moment it
 * answered; what is left to the page is to keep the clock going while a
 * session works, and to say it. A duration is a sentence in French and in
 * English alike (« 12 min 30 s », « 1 h 05 »), so this returns the English
 * sentence and its parameters, translated where it is drawn — and imports
 * nothing, so that `node --test` reads it as it stands, like `thinking.ts`.
 */

/** What the server sends: `worktime` on a ticket, null when no run was ever made for it. */
export interface WorkTime {
  /** Seconds of work, as of the moment the ticket was read. */
  work: number
  /** Seconds waited on a question, a block or credit. */
  paused: number
  sessions: number
  /** Whether a session is working on it now: the clock goes. */
  running: boolean
  /** Why the clock is stopped, if it is: `question`, `blocked` or `credit`. */
  pause: "" | "question" | "blocked" | "credit"
}

export interface Said {
  /** The sentence, in English: it is also the key it is translated by. */
  key: string
  params: Record<string, string>
}

/** A span of seconds: `45 s`, `12 min 30 s`, `1 h 05` — seconds are dropped past the hour. */
export function clock(seconds: number): Said {
  const whole = Math.max(0, Math.floor(seconds))
  if (whole < 60) return { key: "{{count}} s", params: { count: String(whole) } }
  const minutes = Math.floor(whole / 60)
  if (whole < 3600) {
    const rest = whole % 60
    return rest
      ? { key: "{{minutes}} min {{seconds}} s", params: { minutes: String(minutes), seconds: String(rest) } }
      : { key: "{{count}} min", params: { count: String(minutes) } }
  }
  const hours = Math.floor(whole / 3600)
  const left = Math.floor((whole % 3600) / 60)
  return left
    ? { key: "{{hours}} h {{minutes}}", params: { hours: String(hours), minutes: String(left).padStart(2, "0") } }
    : { key: "{{count}} h", params: { count: String(hours) } }
}

/** The span a card wears: whole minutes, `<1 min` under one — a card is not a stopwatch. */
export function brief(seconds: number): Said {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return { key: "<1 min", params: {} }
  return clock(minutes * 60)
}

/** The seconds of work at `now`, given the reading taken at `read` (both in ms). */
export function worked(time: WorkTime, read: number, now: number): number {
  return time.work + (time.running ? Math.max(0, now - read) / 1000 : 0)
}
