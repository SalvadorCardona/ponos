import * as React from "react"
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSteps } from "@/hooks/use-console"
import { api } from "@/lib/api"
import { counted, useT } from "@/lib/i18n"
import { money } from "@/lib/numbers"
import type { Run, Step, Ticket } from "@/lib/types"
import { cn } from "@/lib/utils"

import { EmptyState } from "./empty-state"
import { Markdown } from "./markdown"
import { when } from "./ticket-bits"

/* A ticket's session, read from the ticket.
 *
 * Its steps come from the local journal (`journal.py`): every run of the
 * ticket, each read a page at a time from its end, the newest followed while
 * it goes on. A ticket that last ran before there was a journal is read from
 * its last log, as it used to be.
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
 * `/home/…/ponos/worktrees/<project>-<id>/` — and a line that spends
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

/* The journal of a ticket whose runs predate the local journal, read back
 * from its last log — asked again whenever the ticket moves, which is when a
 * run ends. */
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

/* Every run of a ticket the local journal holds, newest first — asked again
 * when the ticket moves or a session starts or ends, which is when one is
 * added or closed. `null` until the first answer. */
function useRuns(ticket: Ticket, live: boolean) {
  const [runs, setRuns] = React.useState<Run[] | null>(null)
  React.useEffect(() => {
    let alive = true
    api
      .runs(ticket.id)
      .then((payload) => alive && setRuns(payload.runs))
      .catch(() => alive && setRuns([]))
    return () => {
      alive = false
    }
  }, [ticket.id, ticket.column, live])
  return runs
}

interface Read {
  steps: Step[]
  count: number
  more: boolean
  loading: boolean
}

/* One run's steps, read from the journal a page at a time: its end first,
 * then — on request — what came before. While the run goes on, every step the
 * stream announces (`signal`, the count it has seen) is a reason to ask the
 * journal for what follows the last step held: the stream says *that* the run
 * moved, the journal says *what* it did, numbered, so nothing is shown twice. */
function useRunSteps(run: Run | undefined, signal: number) {
  const [read, setRead] = React.useState<Read>({ steps: [], count: 0, more: false, loading: true })
  const held = React.useRef<{ run?: number; last: number; loaded: boolean }>({ last: 0, loaded: false })

  React.useEffect(() => {
    if (!run) return
    let alive = true
    held.current = { run: run.id, last: 0, loaded: false }
    setRead({ steps: [], count: 0, more: false, loading: true })
    api
      .runSteps(run.id)
      .then((page) => {
        if (!alive) return
        held.current.last = page.steps[page.steps.length - 1]?.position ?? 0
        held.current.loaded = true
        setRead({ steps: page.steps, count: page.count, more: page.more, loading: false })
      })
      .catch(() => alive && setRead({ steps: [], count: 0, more: false, loading: false }))
    return () => {
      alive = false
    }
  }, [run?.id])

  const ended = run?.ended_at
  React.useEffect(() => {
    if (!run || held.current.run !== run.id || !held.current.loaded) return
    const timer = window.setTimeout(() => {
      const asked = run.id
      api
        .runSteps(asked, { after: held.current.last })
        .then((page) => {
          if (held.current.run !== asked || !page.steps.length) return
          const fresh = page.steps.filter((step) => (step.position ?? 0) > held.current.last)
          if (!fresh.length) return
          held.current.last = fresh[fresh.length - 1].position ?? held.current.last
          setRead((was) => ({ ...was, steps: [...was.steps, ...fresh], count: page.count }))
        })
        .catch(() => undefined)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [run, signal, ended])

  const earlier = React.useCallback(() => {
    const first = read.steps[0]?.position
    if (!run || !first) return
    const asked = run.id
    api
      .runSteps(asked, { before: first })
      .then((page) => {
        if (held.current.run !== asked) return
        setRead((was) => ({ ...was, steps: [...page.steps, ...was.steps], more: page.more }))
      })
      .catch(() => undefined)
  }, [run, read.steps])

  return { ...read, earlier }
}

/** How a run ended, in a word: the column a ticket goes to, or "still going". */
function outcomeOf(run: Run, t: (text: string) => string): string {
  if (!run.ended_at) return t("going on")
  return (
    {
      done: t("done"),
      blocked: t("blocked"),
      failed: t("failed"),
      waiting: t("waiting for credit"),
      validated: t("validated"),
    }[run.status ?? ""] ??
    run.status ??
    ""
  )
}

/** One run in the list of a ticket's runs: when, how it ended, what it cost. */
function runLabel(run: Run, number: number, t: (text: string) => string): string {
  const parts = [`#${number}`, when(run.started_at), outcomeOf(run, t)]
  if (typeof run.cost_usd === "number" && run.cost_usd) parts.push(money(run.cost_usd))
  return parts.filter(Boolean).join(" · ")
}

/** A ticket's session: live while it runs, read-only once it has ended. */
export function TicketLive({ ticket }: { ticket: Ticket }) {
  const { sessions } = useSteps()
  const session = sessions.find((candidate) => candidate.source === ticket.short)
  const live = Boolean(session) || ticket.column === "running"
  const runs = useRuns(ticket, live)

  if (runs === null)
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  // A ticket whose runs all came before the journal: its last log, as it
  // always was read.
  if (!runs.length) return <LogLive ticket={ticket} live={live} />
  return <JournalLive runs={runs} live={live} signal={session?.count ?? 0} />
}

/* The runs of a ticket, from the journal: the newest open, the others a
 * choice away. Only the newest can be live, and only while it has no end. */
function JournalLive({ runs, live, signal }: { runs: Run[]; live: boolean; signal: number }) {
  const t = useT()
  const [chosen, setChosen] = React.useState<number | null>(null)
  const run = runs.find((candidate) => candidate.id === chosen) ?? runs[0]
  const writing = live && run.id === runs[0].id && !run.ended_at
  const read = useRunSteps(run, writing ? signal : 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 font-mono text-[0.7rem]">
        {writing ? <Pulse /> : null}
        {writing
          ? t("writing now")
          : run.id === runs[0].id
            ? t("the last session, read-only")
            : t("an earlier session, read-only")}
        <span>·</span>
        {counted(read.count, "{{count}} step", "{{count}} steps")}
        {runs.length > 1 ? (
          <Select value={String(run.id)} onValueChange={(value) => setChosen(Number(value))}>
            <SelectTrigger size="sm" className="ml-auto h-7 font-sans text-xs" aria-label={t("Run")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runs.map((candidate, index) => (
                <SelectItem key={candidate.id} value={String(candidate.id)}>
                  {runLabel(candidate, runs.length - index, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {run.ended_at && run.reason ? (
        <p className="text-muted-foreground truncate text-xs" title={run.reason}>
          {outcomeOf(run, t)} · {run.reason}
        </p>
      ) : null}
      {read.loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : !read.steps.length ? (
        <EmptyState robot={writing ? "working" : "sleep"}>
          {writing
            ? t("The session has not written anything yet. Its first step appears here as it happens.")
            : t("This run wrote no step.")}
        </EmptyState>
      ) : (
        <>
          {read.more ? (
            <Button size="sm" variant="ghost" className="self-center" onClick={read.earlier}>
              <ArrowUp />
              {t("Earlier steps")}
            </Button>
          ) : null}
          <SessionLog steps={read.steps} live={writing} />
        </>
      )}
    </div>
  )
}

/* The journal as it was read before there was one: the stream while a run
 * goes on, the last log once it is over. */
function LogLive({ ticket, live }: { ticket: Ticket; live: boolean }) {
  const t = useT()
  const { sessions, ticketSteps } = useSteps()
  const session = sessions.find((candidate) => candidate.source === ticket.short)
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
        {counted(session?.count || steps.length, "{{count}} step", "{{count}} steps")}
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
            {counted(session.count, "{{count}} step", "{{count}} steps")}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground truncate" title={line || undefined}>
        {line || t("starting…")}
      </p>
    </div>
  )
}
