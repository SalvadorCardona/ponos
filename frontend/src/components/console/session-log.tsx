import * as React from "react"
import { ArrowDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSteps } from "@/hooks/use-console"
import { api } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { Step, Ticket } from "@/lib/types"
import { cn } from "@/lib/utils"

import { EmptyState } from "./empty-state"
import { Markdown } from "./markdown"

/* A ticket's session, read from the ticket.
 *
 * There used to be a page of its own for this, listing the sessions by the id
 * their log is named after — and nothing on it said which ticket `24f9704c`
 * was. The session is the ticket's: it is read where the ticket is, on its
 * page and on its card, from the same stream the page used to read.
 *
 * A session is two kinds of line, and they are not read the same way. What the
 * agent *said* is why somebody opens the journal: it is drawn whole, as the
 * prose it is. What it *did* — forty `Read`s, a `Bash` — is how it got there:
 * one folded line each, the tool and the start of what it was pointed at, open
 * for whoever wants the rest.
 */

/* The worktree a session runs in, as the session sees it: `.`.
 *
 * Every path a session touches starts with the same sixty characters —
 * `/home/…/ticket-runner/worktrees/<project>-<id>/` — and a line that spends
 * its width on them has none left for the file it is about. */
const WORKTREE = /(?:\/[^\s/"'`]+)*?\/worktrees\/[^\s/"'`]+(\/)?/g

export function shorten(text: string): string {
  return String(text ?? "").replace(WORKTREE, (_, slash?: string) => (slash ? "./" : "."))
}

/** What a card says a running ticket is doing: what the agent last said, or else the last tool. */
export function lastWord(steps: Step[]): Step | undefined {
  return steps.findLast((step) => step.said) ?? steps[steps.length - 1]
}

/** How close to the bottom still counts as following it. */
const NEAR = 24

/** One tool call, folded to a line; a click unfolds it. */
function ToolLine({ step }: { step: Step }) {
  const detail = shorten(step.detail)
  const failed = step.label === "Error"
  return (
    <details className="group">
      <summary
        className={cn(
          "hover:bg-muted/60 flex cursor-pointer list-none items-start gap-1.5 rounded px-1 py-0.5 font-mono text-xs [&::-webkit-details-marker]:hidden",
          !detail && "cursor-default"
        )}
      >
        <ChevronRight
          className={cn(
            "text-muted-foreground mt-0.5 size-3 shrink-0 transition-transform group-open:rotate-90",
            !detail && "invisible"
          )}
        />
        <span className={cn("shrink-0 font-medium", failed ? "text-destructive" : "text-tr-violet")}>
          {step.label}
        </span>
        {detail ? (
          <span className="text-muted-foreground min-w-0 truncate group-open:break-all group-open:whitespace-pre-wrap">
            {detail}
          </span>
        ) : null}
      </summary>
    </details>
  )
}

/** What the agent said, as prose, set apart from what it did. */
function Said({ step }: { step: Step }) {
  return (
    <div className="border-tr-violet/40 bg-card my-1.5 rounded-lg border-l-2 px-3 py-2">
      <Markdown text={shorten(step.label)} />
    </div>
  )
}

/* The journal, scrolled to its end while it grows — and left alone the moment
 * somebody scrolls up to read something: a page that pulls you back down every
 * second is a page you cannot read. A button brings the following back. */
export function SessionLog({
  steps,
  live,
  className,
}: {
  steps: Step[]
  live: boolean
  className?: string
}) {
  const t = useT()
  const box = React.useRef<HTMLDivElement>(null)
  const [following, setFollowing] = React.useState(true)

  const onScroll = () => {
    const element = box.current
    if (!element) return
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR
    setFollowing((was) => (was === bottom ? was : bottom))
  }

  const toEnd = React.useCallback(() => {
    const element = box.current
    if (element) element.scrollTop = element.scrollHeight
  }, [])

  React.useLayoutEffect(() => {
    if (following) toEnd()
  }, [steps, following, toEnd])

  return (
    <div className="relative">
      <div
        ref={box}
        onScroll={onScroll}
        role="log"
        aria-live={live ? "polite" : "off"}
        className={cn(
          "scroll-thin bg-muted/30 max-h-[65vh] overflow-y-auto rounded-xl border px-2 py-2",
          className
        )}
      >
        {steps.map((step, index) =>
          step.said ? <Said key={index} step={step} /> : <ToolLine key={index} step={step} />
        )}
      </div>
      {live && !following ? (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          onClick={() => {
            setFollowing(true)
            toEnd()
          }}
        >
          <ArrowDown />
          {t("Follow the session")}
        </Button>
      ) : null}
    </div>
  )
}

/* The journal of a ticket that is not running any more, read back from its
 * last log — asked again whenever the ticket moves, which is when a run ends. */
function useFinalLog(ticket: Ticket, wanted: boolean) {
  const [read, setRead] = React.useState<{ steps: Step[]; loading: boolean }>({
    steps: [],
    loading: wanted,
  })
  React.useEffect(() => {
    if (!wanted) return
    let alive = true
    setRead((was) => ({ ...was, loading: true }))
    api
      .logs(ticket.short)
      .then(({ logs }) => (logs[0] ? api.log(logs[0].name) : { steps: [] as Step[] }))
      .then((payload) => alive && setRead({ steps: payload.steps, loading: false }))
      .catch(() => alive && setRead({ steps: [], loading: false }))
    return () => {
      alive = false
    }
  }, [ticket.short, ticket.column, wanted])
  return read
}

/** A ticket's session: live while it runs, read-only once it has ended. */
export function TicketLive({ ticket }: { ticket: Ticket }) {
  const t = useT()
  const { sessions, ticketSteps } = useSteps()
  const session = sessions.find((candidate) => candidate.source === ticket.short)
  const live = Boolean(session) || ticket.column === "running"
  const final = useFinalLog(ticket, !live)

  const steps = session?.steps.length ? session.steps : live ? ticketSteps : final.steps

  if (!live && final.loading)
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )

  if (!steps.length)
    return (
      <EmptyState robot={live ? "working" : "sleep"}>
        {live
          ? t("The session has not written anything yet. Its first step appears here as it happens.")
          : t("No journal is left for this ticket: its session log is gone, or it never ran.")}
      </EmptyState>
    )

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground flex items-center gap-2 font-mono text-[0.7rem]">
        {live ? <Pulse /> : null}
        {live ? t("writing now") : t("the last session, read-only")}
        <span>·</span>
        {t("{{count}} step(s)", { count: String(session?.count || steps.length) })}
      </p>
      <SessionLog steps={steps} live={live} />
    </div>
  )
}

/** The dot that says a session is writing. */
export function Pulse({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden>
      <span className="bg-tr-green absolute inset-0 animate-ping rounded-full opacity-60" />
      <span className="bg-tr-green relative inline-flex size-2 rounded-full" />
    </span>
  )
}

/* What a running card says, redrawn with every step: the dot, what the agent
 * is on, and how many steps it has taken. A card whose session this console
 * has not heard from yet says what the board last said, as it always did. */
export function CardLive({ ticket }: { ticket: Ticket }) {
  const t = useT()
  const { sessions } = useSteps()
  const session = sessions.find((candidate) => candidate.source === ticket.short)
  const last = session ? lastWord(session.steps) : undefined
  const line = last
    ? last.said
      ? shorten(last.label).replace(/[*_`#>]+/g, "").replace(/\s+/g, " ")
      : `${last.label}${last.detail ? ` · ${shorten(last.detail)}` : ""}`
    : ticket.progress

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-[0.7rem] whitespace-nowrap">
        <Pulse />
        <span className="sr-only">{t("writing now")}</span>
        {session?.count ? (
          <span className="tabular-nums">
            {t("{{count}} step(s)", { count: String(session.count) })}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground truncate" title={line || undefined}>
        {line || t("starting…")}
      </p>
    </div>
  )
}
