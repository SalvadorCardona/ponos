import * as React from "react"

import { counted, useT } from "@/lib/i18n"
import { money } from "@/lib/numbers"
import { clock } from "@/lib/composer"
import { doing, named, tally } from "@/lib/thinking"
import type { Step } from "@/lib/types"

import { Robot } from "./robot"
import { Steps } from "./steps"

/* How the workspace's turn reads in the conversation: Ponos, then the answer.
 *
 * While a turn runs, Ponos thinking and a few words about what it is on; under
 * them, the steps as a timeline of cards, drawn as they come and kept after the
 * turn — a log is for whoever goes looking, but a reader who cannot read one
 * still sees that work is going on, so the titles are sentences and the log is
 * one click down on each card. The robot is the mascot's own component, so under
 * prefers-reduced-motion it holds its pose by itself and the words carry the
 * whole of it.
 *
 * Once the turn ends the robot goes and the timeline stays, headed by how many
 * steps, how long and how much — and how many of them failed, with a dot, so
 * that a turn that fought its way to the answer can be told from one that did
 * not without opening it.
 */
export function Thinking({
  steps,
  done,
  started,
  seconds,
  cost,
  stopping = false,
}: {
  steps: Step[]
  done: boolean
  started: number
  seconds?: number
  cost?: number
  stopping?: boolean
}) {
  const t = useT()
  const now = useClock(!done)
  const count = tally(steps)

  if (done && !count.steps && seconds === undefined) return null

  const summary = [
    count.steps ? counted(count.steps, "{{count}} step", "{{count}} steps") : "",
    // While it runs, the clock is beside Ponos already.
    done && seconds !== undefined ? clock(seconds) : "",
    cost ? money(cost, 4) : "",
  ].filter(Boolean)

  // What it is on, by name: the last step, unless that is the agent talking or
  // a failure, which have their own words.
  const last = steps[steps.length - 1]
  const line = stopping
    ? { key: "stopping…" }
    : last && !last.said && last.label !== "Error"
      ? named(last)
      : doing(steps)

  return (
    <div data-slot="thinking" data-done={done || undefined} className="flex flex-col gap-1.5">
      {done ? null : (
        <div className="flex items-center gap-3" role="status">
          <Robot state="thinking" size={52} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
              Ponos
            </p>
            {/* Keyed by the sentence, so a new one fades in rather than
                replacing the old one under the reader's eyes. */}
            <p
              key={line.key + JSON.stringify(line.params ?? {})}
              title={t(line.key, line.params)}
              className="motion-safe:animate-in motion-safe:fade-in truncate text-sm duration-300"
            >
              {t(line.key, line.params)}
              <span className="text-muted-foreground ml-2 font-mono text-xs tabular-nums">
                {clock((now - started) / 1000)}
              </span>
            </p>
          </div>
        </div>
      )}
      {count.steps ? (
        <Steps steps={steps} done={done} summary={summary.join(" · ")} errors={count.errors} />
      ) : done ? (
        <p className="text-muted-foreground font-mono text-[0.7rem]">{summary.join(" · ")}</p>
      ) : null}
    </div>
  )
}

/** The time, once a second, for as long as `running` — a turn's own clock. */
function useClock(running: boolean): number {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running])
  return now
}
