import * as React from "react"

import type { RobotState } from "@/components/console/robot"
import { useConsole, useStatus } from "@/hooks/use-console"

/* What the runner is doing, as a face and a sentence.
 *
 * Read off what the console already holds — the stream's connection, the
 * sessions the server says are running, the board, the runner's state — and
 * nothing asked of the server for it. Most of it is a state: a session is
 * running or it is not. Two of it are events, and the board only says them
 * by changing: a ticket that has just come back (its pull request opened, or
 * it reached review or done) makes the robot jump for a few seconds, and one
 * that has just fallen into blocked leaves it sad for a few minutes — long
 * enough to be seen by somebody who looks up, short enough not to mourn a
 * ticket forever. The first board a page reads is remembered, not reacted to:
 * a ticket blocked yesterday is not news.
 *
 * Read once, for the whole console, and handed down: two faces show it — the
 * bar's and the menu's — and each reading its own would remember a different
 * first board, so one could be sad while the other slept.
 */

/** How long a ticket that came back keeps the robot jumping. */
const CHEER = 5_000
/** How long a ticket that has just been blocked keeps it sad. */
const GRIEF = 3 * 60_000

const DELIVERED = new Set(["review", "validated", "done"])
const STUCK = new Set(["blocked", "failed"])

export interface Mood {
  state: RobotState
  /** A key of the dictionary, and what fills it. */
  said: string
  params?: Record<string, string>
}

function useReadMood(): Mood {
  const { board, runner } = useConsole()
  const { connection, running } = useStatus()
  const seen = React.useRef<Map<string, { column: string; pr: string }> | null>(null)
  const [cheer, setCheer] = React.useState(0)
  const [grief, setGrief] = React.useState(0)
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const before = seen.current
    seen.current = new Map(
      board.tickets.map((ticket) => [ticket.id, { column: ticket.column, pr: ticket.pull_request }])
    )
    if (!before?.size) return
    let delivered = false
    let stuck = false
    for (const ticket of board.tickets) {
      const was = before.get(ticket.id)
      if (!was) continue
      if (was.column !== ticket.column && DELIVERED.has(ticket.column)) delivered = true
      if (!was.pr && ticket.pull_request) delivered = true
      if (was.column !== ticket.column && STUCK.has(ticket.column)) stuck = true
    }
    if (!delivered && !stuck) return
    const at = Date.now()
    setNow(at)
    if (delivered) setCheer(at + CHEER)
    if (stuck) setGrief(at + GRIEF)
  }, [board])

  // Back to what the runner is doing once the moment has passed.
  React.useEffect(() => {
    const pending = [cheer, grief].filter((until) => until > now)
    if (!pending.length) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(...pending) - now + 50)
    return () => clearTimeout(timer)
  }, [cheer, grief, now])

  if (connection === "reconnecting") return { state: "error", said: "reconnecting…" }
  if (connection === "connecting") return { state: "thinking", said: "connecting…" }
  if (cheer > now) return { state: "success", said: "a ticket is back" }
  if (runner && !runner.claude) return { state: "error", said: "claude is missing" }
  if (grief > now) return { state: "error", said: "a ticket is blocked" }
  if (running.length)
    return {
      state: "working",
      said: "{{count}} session(s) at work",
      params: { count: String(running.length) },
    }
  if (runner?.credits) return { state: "waiting", said: "out of credit" }
  if (runner?.running || board.tickets.some((ticket) => ticket.column === "running"))
    return { state: "thinking", said: "taking a ticket" }
  const ready = board.tickets.filter((ticket) => ticket.column === "ready").length
  if (ready)
    return { state: "idle", said: "{{count}} ticket(s) ready", params: { count: String(ready) } }
  return { state: "sleep", said: "nothing to do" }
}

const MoodContext = React.createContext<Mood | null>(null)

export function useRunnerMood(): Mood {
  const mood = React.useContext(MoodContext)
  if (!mood) throw new Error("useRunnerMood outside its provider")
  return mood
}

export function RunnerMoodProvider({ children }: { children: React.ReactNode }) {
  const mood = useReadMood()
  return <MoodContext.Provider value={mood}>{children}</MoodContext.Provider>
}
