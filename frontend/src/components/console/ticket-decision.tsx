import * as React from "react"
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  ExternalLink,
  GitPullRequest,
  MessageCircleQuestion,
  Scale,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { openInTheWindow } from "@/components/console/ticket-window"
import { useConsole } from "@/hooks/use-console"
import { api, why } from "@/lib/api"
import { titleOf, useBoard } from "@/lib/board-store"
import {
  CHECKS,
  PROMPTS,
  type DecisionTab,
  actionOf,
  actionsOf,
  away,
  buttonsOf,
  categoryOf,
  decisionTabOf,
  immediate,
  instructionOf,
  labelOf,
  openedWith,
  plainRetry,
  prefilled,
  promptOf,
  sendable,
  titlesIn,
  tone,
} from "@/lib/decision"
import { useT } from "@/lib/i18n"
import type { Decision, Solution, Ticket } from "@/lib/types"
import { cn } from "@/lib/utils"

/* What a card waiting on you is for: why it waits, and what to do about it.
 *
 * A blocked card used to offer "make ready" and nothing else, and one in review
 * three gestures that said nothing of what they were deciding on: the reason was
 * in the last report, on the page. This reads that report for you — the server
 * does, see `decisions.py` — and lays out the few choices that fit, each a click,
 * or a click and a sentence.
 *
 * It is a tab of the ticket — Unblock, or Decide — beside its brief, its
 * discussion and its session. It was a panel of its own for a while, held over
 * the console, and the ticket's window opened under it: two windows over the
 * board, saying the ticket's title and why it stopped twice. The button on a
 * card opens the window on this tab; the same button on the ticket itself, in
 * its window or on its page, only switches to it.
 *
 * On a blocked ticket it is drawn the way "answer" was — an outline in the
 * colour of a ticket waiting on you — and the tab does the choosing the card
 * used to leave to you: a question opens on its answer, a missing access on
 * what is missing and "it's done", any other stop on its reason and running it
 * again. Under every one of them, a field for an instruction of your own, and —
 * quietly, where nothing above already does it — running it again as it is,
 * which was "make ready".
 */

/** How a ticket shown on screen goes to one of its tabs: none around a card, which opens the window instead. */
export const TicketTabContext = React.createContext<((tab: DecisionTab) => void) | null>(null)

/** The call to action of a card waiting on you: Unblock, or Decide. Nothing on any other card. */
export function DecideButton({ ticket, className }: { ticket: Ticket; className?: string }) {
  const t = useT()
  const goTo = React.useContext(TicketTabContext)
  const action = actionOf(ticket.column)
  const tab = decisionTabOf(ticket.column)
  if (!action || !tab) return null
  const blocked = ticket.column === "blocked"
  const Icon = blocked ? MessageCircleQuestion : Scale
  return (
    <Button
      size="sm"
      variant={blocked ? "outline" : "default"}
      data-decide={ticket.id}
      className={cn(
        blocked ? "text-tr-amber hover:text-tr-amber" : "bg-tr-pink hover:bg-tr-pink/90 text-white",
        className
      )}
      onClick={() => (goTo ? goTo(tab) : openInTheWindow(ticket.id, tab))}
    >
      <Icon />
      {t(action)}
    </Button>
  )
}

/** The tab itself: why the ticket waits, and the choices. `onDone` is told once one is sent. */
export function TicketDecision({ ticket, onDone }: { ticket: Ticket; onDone: () => void }) {
  return <Panel key={ticket.id} id={ticket.id} ticket={ticket} onDone={onDone} />
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
    <div data-slot="ticket-decision" className="space-y-4 text-sm">
      {decision.column === "review" ? <Delivered decision={decision} /> : <Stuck decision={decision} ticket={ticket} />}
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

/* Why a blocked ticket stopped: its kind, its reason, what is done and what is
 * missing — and, for a stop on a pull request or on its base's CI, the way to
 * them the card used to carry. */
function Stuck({ decision, ticket }: { decision: Decision; ticket?: Ticket }) {
  const t = useT()
  const pullRequest = ticket?.pull_request ?? ""
  const ci = ticket?.block?.action === "base-ci" ? actionsOf(pullRequest) : ""
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
      {pullRequest || ci ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {pullRequest ? (
            <Button asChild variant="outline" size="sm">
              <a href={pullRequest} target="_blank" rel="noreferrer">
                <GitPullRequest />
                {t("Pull request")}
                <ExternalLink className="opacity-60" />
              </a>
            </Button>
          ) : null}
          {ci ? (
            <Button asChild variant="outline" size="sm">
              <a href={ci} target="_blank" rel="noreferrer">
                {t("CI")}
                <ExternalLink className="opacity-60" />
              </a>
            </Button>
          ) : null}
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
  const { move } = useConsole()
  const opening = openedWith(decision.column, decision.solutions)
  const [chosen, setChosen] = React.useState<Solution | null>(opening)
  const [text, setText] = React.useState("")
  const [instruction, setInstruction] = React.useState("")
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
  const buttons = buttonsOf(decision.column, decision.solutions)
  const written = instructionOf(decision.column, decision.solutions)
  const plain = ticket && plainRetry(decision.column, decision.solutions)

  return (
    <section data-slot="decision-choices">
      <Heading>{decision.column === "review" ? t("Your decision") : t("What would unblock it")}</Heading>
      <ul className="space-y-1.5">
        {buttons.map((solution, index) => (
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
                  // The answer a question opens on is under its reason, read
                  // first: the field waits for a click rather than taking it.
                  autoFocus={!same(solution, opening)}
                  value={text}
                  rows={solution.needs === "titles" ? 4 : 3}
                  aria-label={t(promptOf(solution))}
                  placeholder={t(promptOf(solution))}
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
      {written ? (
        <form
          data-slot="decision-instruction"
          className="mt-3 space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            if (sendable(written, instruction)) void apply(written, instruction, "")
          }}
        >
          <Heading>{t("Or an instruction of your own")}</Heading>
          <Textarea
            value={instruction}
            rows={2}
            aria-label={t(PROMPTS.text)}
            placeholder={t("Drop that part, only do…")}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-1.5">
            {/* "Make ready", kept for when nothing needs saying: the same
                move the card made, quieter, under the choices that say why. */}
            {plain ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={busy}
                data-slot="decision-plain-retry"
                className="text-muted-foreground hover:text-foreground h-auto px-0"
                onClick={() => {
                  onDone()
                  void move(ticket, "ready")
                }}
              >
                {t("Run it again without changes")}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={busy || !sendable(written, instruction)}>
              {t("Send and run again")}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
