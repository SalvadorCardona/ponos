import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useT } from "@/lib/i18n"
import { clock } from "@/lib/composer"
import { doing, tally } from "@/lib/thinking"
import type { Step } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Robot } from "./robot"
import { Steps } from "./steps"

/* How the workspace's turn reads in the conversation: Ponos, then the answer.
 *
 * The steps — every Bash, every Traceback — used to be the conversation while a
 * turn ran, and stayed in it after. They are a log, and a log is for whoever
 * goes looking: here they are folded under one line, closed until opened, and
 * what is shown instead is Ponos thinking and a few words about what it is on.
 * The robot is the mascot's own component, so under prefers-reduced-motion it
 * holds its pose by itself and the words carry the whole of it.
 *
 * Once the turn ends the robot goes and the fold stays, its line saying how
 * many steps, how long and how much — and how many of them failed, with a dot,
 * so that a turn that fought its way to the answer can be told from one that
 * did not without opening it.
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
    count.steps ? t("{{count}} step(s)", { count: String(count.steps) }) : "",
    // While it runs, the clock is beside Ponos already.
    done && seconds !== undefined ? clock(seconds) : "",
    cost ? `$${cost}` : "",
  ].filter(Boolean)

  const line = stopping ? { key: "stopping…" } : doing(steps)

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
      {count.steps || done ? <Fold steps={steps} summary={summary} errors={count.errors} /> : null}
    </div>
  )
}

function Fold({ steps, summary, errors }: { steps: Step[]; summary: string[]; errors: number }) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const any = steps.some((step) => !step.said)
  if (!any)
    return <p className="text-muted-foreground font-mono text-[0.7rem]">{summary.join(" · ")}</p>
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex max-w-full items-center gap-1.5 rounded-md font-mono text-[0.7rem] outline-none focus-visible:ring-2"
      >
        <ChevronRightIcon
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span className="truncate">
          {[open ? t("Hide the steps") : t("Show the steps"), ...summary].join(" · ")}
        </span>
        {errors ? (
          <span
            className="text-tr-red ml-0.5 inline-flex shrink-0 items-center gap-1"
            title={t("{{count}} step(s) went wrong", { count: String(errors) })}
          >
            <span aria-hidden="true" className="bg-tr-red size-1.5 rounded-full" />
            <span className="sr-only">{t("{{count}} step(s) went wrong", { count: String(errors) })}</span>
            <span aria-hidden="true">{errors}</span>
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5">
        <Steps steps={steps} />
      </CollapsibleContent>
    </Collapsible>
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
