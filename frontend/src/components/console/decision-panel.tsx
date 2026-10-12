import * as React from "react"
import { CircleCheck, CircleDashed, CircleX, ExternalLink, GitPullRequest, LifeBuoy, Scale } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { onPhone } from "@/components/console/shell"
import { api, why } from "@/lib/api"
import { titleOf, useBoard } from "@/lib/board-store"
import {
  CHECKS,
  PROMPTS,
  actionOf,
  away,
  categoryOf,
  immediate,
  labelOf,
  prefilled,
  sendable,
  titlesIn,
  tone,
} from "@/lib/decision"
import { useT } from "@/lib/i18n"
import type { Decision, Solution, Ticket } from "@/lib/types"
import { cn } from "@/lib/utils"

/* The panel a card waiting on you opens: why it waits, and what to do about it.
 *
 * A blocked card used to offer "make ready" and nothing else, and one in review
 * three gestures that said nothing of what they were deciding on: the reason was
 * in the last report, on the page. This reads that report for you — the server
 * does, see `decisions.py` — and lays out the few choices that fit, each a click,
 * or a click and a sentence.
 *
 * Held once, at the top of the console, like the ticket window and for the same
 * reason: a card is drawn again whenever the stream moves the board, and a
 * popover held by the card would close under the person reading it. A card only
 * says which ticket to open, and where its button is — the popover is anchored
 * to that button by looking it up again each time it is placed, so a card drawn
 * anew is followed rather than lost. On a phone it is a sheet from the bottom of
 * the screen, where a thumb reaches.
 */

let opened: string | null = null
let last: DOMRect | null = null
const listeners = new Set<() => void>()

function show(id: string | null) {
  if (opened === id) return
  opened = id
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const useOpened = () => React.useSyncExternalStore(subscribe, () => opened)

/* Where the button that opened the panel is now — or was, when it is gone. */
const anchor = {
  getBoundingClientRect: () => {
    const button = opened ? document.querySelector(`[data-decide="${opened}"]`) : null
    if (button) last = button.getBoundingClientRect()
    return last ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0)
  },
}

/** The call to action of a card waiting on you: Unblock, or Decide. Nothing on any other card. */
export function DecideButton({ ticket, className }: { ticket: Ticket; className?: string }) {
  const t = useT()
  const action = actionOf(ticket.column)
  if (!action) return null
  const Icon = ticket.column === "blocked" ? LifeBuoy : Scale
  return (
    <Button
      size="sm"
      data-decide={ticket.id}
      className={cn("bg-tr-pink hover:bg-tr-pink/90 text-white", className)}
      onClick={(event) => {
        last = event.currentTarget.getBoundingClientRect()
        show(opened === ticket.id ? null : ticket.id)
      }}
    >
      <Icon />
      {t(action)}
    </Button>
  )
}

/** The panel itself, drawn once by the console. */
export function DecisionPanel() {
  const id = useOpened()
  const board = useBoard()
  const t = useT()
  const ticket = id ? board.tickets.find((item) => item.id === id) : undefined
  const [phone, setPhone] = React.useState(onPhone)
  React.useEffect(() => {
    if (id) setPhone(onPhone())
  }, [id])
  const title = ticket ? titleOf(ticket) : ""
  const heading = ticket ? t(actionOf(ticket.column) ?? "Decide") : t("Decide")
  // Above the button or under it, whichever has more room: the panel scrolls
  // within what it is given rather than running off the screen.
  const room = id ? anchor.getBoundingClientRect() : null
  const side = room && room.top > window.innerHeight - room.bottom ? "top" : "bottom"
  const body = id ? <Panel key={id} id={id} ticket={ticket} onDone={() => show(null)} /> : null

  if (phone)
    return (
      <Sheet open={Boolean(id)} onOpenChange={(open) => (open ? undefined : show(null))}>
        <SheetContent
          side="bottom"
          data-slot="decision-panel"
          closeLabel={t("Close")}
          className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pr-10 pb-2">
            <SheetTitle className="text-base">{heading}</SheetTitle>
            <SheetDescription className="line-clamp-2 break-words">{title}</SheetDescription>
          </SheetHeader>
          <div className="px-4">{body}</div>
        </SheetContent>
      </Sheet>
    )

  return (
    <Popover open={Boolean(id)} onOpenChange={(open) => (open ? undefined : show(null))}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent
        data-slot="decision-panel"
        role="dialog"
        aria-label={`${heading} · ${title}`}
        side={side}
        align="start"
        collisionPadding={12}
        className="max-h-[min(80vh,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto p-4"
        // A click on another card's button opens that one: closing on the
        // way would be a flicker, and reopening the same one a toggle.
        onInteractOutside={(event) => {
          const target = event.target instanceof Element ? event.target.closest("[data-decide]") : null
          if (target) event.preventDefault()
        }}
      >
        <p className="text-muted-foreground mb-2 line-clamp-2 text-xs break-words">
          <span className="text-foreground font-semibold">{heading}</span>
          {title ? ` · ${title}` : ""}
        </p>
        {body}
      </PopoverContent>
    </Popover>
  )
}

function Panel({ id, ticket, onDone }: { id: string; ticket?: Ticket; onDone: () => void }) {
  const t = useT()
  const [decision, setDecision] = React.useState<Decision | null>(null)
  const [problem, setProblem] = React.useState("")

  React.useEffect(() => {
    let current = true
    api
      .decision(id)
      .then((found) => current && setDecision(found))
      .catch((error) => current && setProblem(why(error)))
    return () => {
      current = false
    }
  }, [id])

  if (problem)
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("This ticket could not be read: {{why}}", { why: problem })}
      </p>
    )
  if (!decision)
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  return (
    <div className="space-y-4 text-sm">
      {decision.column === "review" ? <Delivered decision={decision} /> : <Stuck decision={decision} />}
      <Choices decision={decision} ticket={ticket} onDone={onDone} />
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-1 text-[0.7rem] font-semibold tracking-wide uppercase">
      {children}
    </h3>
  )
}

/* Why a blocked ticket stopped: its kind, its reason, what is done and what is missing. */
function Stuck({ decision }: { decision: Decision }) {
  const t = useT()
  const asked = decision.question
  const reason = decision.reason?.trim()
  const missing = asked?.ask && asked.ask !== reason ? asked.ask : ""
  return (
    <section data-slot="decision-reason" className="space-y-2">
      <Heading>{t("Why it is stuck")}</Heading>
      <Badge className="bg-tr-amber/15 text-tr-amber border-transparent">
        {t(categoryOf(decision.category))}
      </Badge>
      <p className="leading-snug font-medium break-words">
        {reason || (decision.reported ? t("The run did not say why.") : t("Set aside by hand: no run said why."))}
      </p>
      {decision.done || missing || decision.detail ? (
        <div className="text-muted-foreground space-y-1 text-xs leading-relaxed break-words" data-slot="decision-explanation">
          {decision.done ? <p>{t("Already done: {{done}}", { done: decision.done })}</p> : null}
          {missing ? <p>{t("What is missing: {{missing}}", { missing })}</p> : null}
          {decision.detail ? <p className="line-clamp-3">{decision.detail}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

/* What a ticket in review brought back: its sentence, its pull request, its checks, its caveats. */
function Delivered({ decision }: { decision: Decision }) {
  const t = useT()
  const checks = decision.checks
  const state = checks?.state ?? "none"
  const Mark = state === "passed" ? CircleCheck : state === "failed" ? CircleX : CircleDashed
  const caveats = decision.caveats ?? []
  return (
    <>
      <section data-slot="decision-delivered" className="space-y-2">
        <Heading>{t("What it delivered")}</Heading>
        <p className="leading-snug font-medium break-words">{decision.summary || t("The run said nothing more.")}</p>
        {decision.facts ? <p className="text-muted-foreground text-xs">{decision.facts}</p> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {decision.pull_request ? (
            <Button asChild variant="outline" size="sm">
              <a href={decision.pull_request} target="_blank" rel="noreferrer">
                <GitPullRequest />
                {t("Pull request")}
                <ExternalLink className="opacity-60" />
              </a>
            </Button>
          ) : null}
          {checks?.link ? (
            <Button asChild variant="outline" size="sm">
              <a href={checks.link} target="_blank" rel="noreferrer">
                {t("CI")}
                <ExternalLink className="opacity-60" />
              </a>
            </Button>
          ) : null}
          <Badge
            variant="outline"
            data-checks={state}
            className={cn(
              state === "passed" && "text-tr-green",
              state === "failed" && "text-destructive",
              state === "pending" && "text-tr-amber"
            )}
          >
            <Mark />
            {t(CHECKS[state] ?? CHECKS.unknown)}
          </Badge>
        </div>
      </section>
      <section data-slot="decision-caveats">
        <Heading>{t("Points to check")}</Heading>
        {caveats.length ? (
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed break-words">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">{t("The agent flagged nothing.")}</p>
        )}
      </section>
    </>
  )
}

/* The choices, one button each. One that needs words opens its field under it. */
function Choices({ decision, ticket, onDone }: { decision: Decision; ticket?: Ticket; onDone: () => void }) {
  const t = useT()
  const board = useBoard()
  const [chosen, setChosen] = React.useState<Solution | null>(null)
  const [text, setText] = React.useState("")
  const [model, setModel] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const models = (board.choices?.model ?? []).filter((one) => one.value && one.value !== decision.model)
  const named = (column: string) => board.columns.find((item) => item.key === column)?.name || column

  async function apply(solution: Solution, words: string, picked: string) {
    setBusy(true)
    try {
      await api.decide(decision.id, {
        key: solution.key,
        number: solution.number,
        text: solution.needs === "titles" ? "" : words,
        model: picked,
        titles: solution.needs === "titles" ? titlesIn(words) : undefined,
      })
      toast.success(
        t("“{{title}}” moved to {{column}}", {
          title: ticket ? titleOf(ticket) : t("Ticket"),
          column: named(solution.column),
        }),
        { description: t(labelOf(solution)) }
      )
      onDone()
    } catch (error) {
      toast.error(t("The decision was not sent"), { description: why(error) })
    } finally {
      setBusy(false)
    }
  }

  function pick(solution: Solution) {
    if (immediate(solution)) {
      void apply(solution, "", "")
      return
    }
    setChosen(solution)
    setText(prefilled(solution))
    setModel("")
  }

  const same = (one: Solution, other: Solution | null) =>
    other !== null && one.key === other.key && one.number === other.number

  return (
    <section data-slot="decision-choices">
      <Heading>{decision.column === "review" ? t("Your decision") : t("What would unblock it")}</Heading>
      <ul className="space-y-1.5">
        {decision.solutions.map((solution, index) => (
          <li key={`${solution.key}-${solution.number}`}>
            <Button
              variant={same(solution, chosen) ? "secondary" : tone(solution, index)}
              disabled={busy}
              data-solution={solution.key}
              aria-expanded={immediate(solution) ? undefined : same(solution, chosen)}
              className={cn(
                "h-auto min-h-10 w-full justify-start py-2 text-left whitespace-normal",
                away(solution) && "text-destructive hover:text-destructive"
              )}
              onClick={() => (same(solution, chosen) ? setChosen(null) : pick(solution))}
            >
              {solution.key === "option" ? (
                <span className="text-xs opacity-70">{solution.number}.</span>
              ) : null}
              <span className="min-w-0 break-words">
                {t(labelOf(solution))}
                {/* Which point, for the ones sent back on a point of their own. */}
                {solution.key === "caveat" && decision.caveats?.[solution.number - 1] ? (
                  <span className="text-muted-foreground block text-xs">
                    {decision.caveats[solution.number - 1]}
                  </span>
                ) : null}
              </span>
            </Button>
            {same(solution, chosen) ? (
              <form
                className="mt-1.5 space-y-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (sendable(solution, text, model)) void apply(solution, text, model)
                }}
              >
                {solution.needs === "model" ? (
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-full" aria-label={t(PROMPTS.model)}>
                      <SelectValue placeholder={t(PROMPTS.model)} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((one) => (
                        <SelectItem key={one.value} value={one.value}>
                          {one.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Textarea
                  autoFocus
                  value={text}
                  rows={solution.needs === "titles" ? 4 : 3}
                  aria-label={t(solution.needs === "model" ? PROMPTS.note : PROMPTS[solution.needs])}
                  placeholder={t(solution.needs === "model" ? PROMPTS.note : PROMPTS[solution.needs])}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  className="text-sm"
                />
                <div className="flex justify-end gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setChosen(null)}>
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant={away(solution) ? "destructive" : "default"}
                    disabled={busy || !sendable(solution, text, model)}
                  >
                    {solution.column === "ready" ? t("Send and run again") : t("Confirm")}
                  </Button>
                </div>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
