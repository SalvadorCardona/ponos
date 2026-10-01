import * as React from "react"
import { ArrowLeft, CopyIcon, RotateCw } from "lucide-react"
import { Link, useCurrentViewResourceContext } from "react-resource-view"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useConsole } from "@/hooks/use-console"
import { why } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { TicketDetail } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  boardHref,
  holdTicket,
  lastTicketProblem,
  readTicket,
  releaseTicket,
} from "@/resources/tickets"

import { EmptyState } from "./empty-state"
import { Fact, Facts } from "./frame"
import { Markdown } from "./markdown"
import { MOOD, Robot } from "./robot"
import { Pulse, TicketLive } from "./session-log"
import {
  LABEL,
  SEED,
  TicketActions,
  TicketLinks,
  ago,
  capital,
  lasted,
  when,
} from "./ticket-bits"

/* One ticket, as a page.
 *
 * The `read` view of the tickets resource: what react-resource-view holds by
 * the time this draws is the card, as the board has it — so the page is drawn
 * at once — and the page under it, the brief, the report a run appended, the
 * notes between, is read here from `/api/tickets/<id>`, once per opening (see
 * `readTicket`). The ticket's discussion is a bubble away, in the drawer:
 * opening this page is what loads it.
 *
 * It opens the way the board's cards do and then says more: the column as a
 * banner, and the metadata as a ruled grid — because six facts in a row of pills is six pills, where six
 * facts in a grid is a thing you can read down.
 *
 * Under them, two tabs: the brief, and the session — live while the ticket is
 * in progress, which is when somebody opens it to see what it is doing, so it
 * is the tab a running ticket opens on.
 *
 * The way back to the board and the title are the header's, as on every page
 * of the console; the page drew its own under it, and said both twice. The
 * header is this file's too — see `TicketHead`.
 */

export function TicketPage() {
  const context = useCurrentViewResourceContext()
  const page = context.data as TicketDetail | undefined
  const { ticket: open, openTicket, board } = useConsole()
  const t = useT()
  const brief = useBrief(page)

  // The page is the ticket's terminal too: opening it loads the discussion.
  React.useEffect(() => {
    if (page) openTicket(page)
  }, [page, openTicket])

  // The stream keeps the open ticket fresher than the page read once: the
  // column and the progress line are read from it where it is the same ticket.
  const ticket = page ? (open && open.id === page.id ? { ...page, ...open } : page) : null
  // The board, in the layout it was left in: coming back onto the cards, when
  // the table is what you were reading the board in, is losing your place.
  const back = boardHref()
  const column = ticket
    ? capital(
        board.columns.find((item) => item.key === ticket.column)?.name ||
          t(LABEL[ticket.column] ?? "") ||
          ticket.column
      )
    : ""

  return (
    <div>
      {ticket ? (
        <>
          {/* The column, across the top: the one fact that decides what the
              runner will do with this ticket next — and the robot in the
              mood of it, moving here, where it is the only one on the
              page, whatever the column. */}
          <div className="bg-card mb-4 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Robot state={MOOD[ticket.column] ?? "sleep"} size={32} className="-my-1.5 shrink-0" />
            {/* The column as the board heads it — its dot, its name with a
                capital — rather than in its colour: a coloured word on its own
                read as a link, and a lower-case one as a value leaked out of
                Notion. */}
            <span className={cn("size-1.5 shrink-0 rounded-full", SEED[ticket.column] ?? "bg-muted-foreground")} />
            <span className="text-sm font-medium">{column}</span>
            {ticket.progress ? (
              <span className="text-muted-foreground min-w-0 truncate text-xs">
                · {ticket.progress}
              </span>
            ) : null}
          </div>

          {/* Priority, model and date are the grid's: the tags the card wears
              would say them a second time, one line above. */}
          <TicketActions ticket={ticket} className="-mx-1" />

          {/* A fact is drawn when the ticket has it. A board made by hand has
              no duration, no due date, no agent column, and a row of "—" said
              so on every ticket, as though something had gone missing. */}
          <Facts className="mt-4">
            <Fact label={t("project")}>
              {ticket.project || t("no project — a document")}
            </Fact>
            {ticket.priority ? <Fact label={t("priority")}>{ticket.priority}</Fact> : null}
            {ticket.model ? <Fact label={t("model")}>{ticket.model}</Fact> : null}
            {typeof ticket.cost === "number" && ticket.cost ? (
              <Fact label={t("spent")}>${ticket.cost.toFixed(2)}</Fact>
            ) : null}
            {/* What the run cost in time, next to what it cost in money — from
                the board's column, or from the session's log where the board
                has none (see `Api.ticket`). */}
            {typeof ticket.duration === "number" && ticket.duration ? (
              <Fact label={t("took")}>{lasted(ticket.duration)}</Fact>
            ) : null}
            {ago(ticket.created) ? <Fact label={t("created")}>{ago(ticket.created)}</Fact> : null}
            {ticket.scheduled ? <Fact label={t("scheduled")}>{when(ticket.scheduled)}</Fact> : null}
            {/* Which machine has it, for the days two of them share a board
                — and the other half of the answer to "why has nothing
                happened": nobody claimed it. */}
            {ticket.runner ? (
              <Fact label={t("taken by")}>
                <span className="font-mono text-xs" title={ticket.runner}>
                  {ticket.runner}
                </span>
              </Fact>
            ) : null}
          </Facts>

          <Tabs
            // Chosen once per ticket, not every time the column moves: a
            // tab that switched itself under the reader would lose them.
            key={ticket.id}
            defaultValue={ticket.column === "running" ? "live" : "brief"}
            className="mt-6"
          >
            <TabsList>
              <TabsTrigger value="brief">{t("the brief")}</TabsTrigger>
              <TabsTrigger value="live" className="gap-1.5">
                {ticket.column === "running" ? <Pulse /> : null}
                {t("live")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="brief" className="mt-2">
              {brief.content === undefined ? (
                brief.problem !== undefined ? (
                  <EmptyState
                    robot="error"
                    title={t("This ticket could not be read.")}
                    action={
                      <Button variant="outline" size="sm" onClick={brief.again}>
                        <RotateCw />
                        {t("Try again")}
                      </Button>
                    }
                  >
                    {brief.problem || t("The server gave no reason.")}
                  </EmptyState>
                ) : (
                  <div className="flex flex-col gap-2" aria-busy="true">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                )
              ) : brief.content ? (
                <Markdown text={brief.content} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("The page is empty: the title is the whole brief.")}
                </p>
              )}
            </TabsContent>
            <TabsContent value="live" className="mt-2">
              <TicketLive ticket={ticket} />
            </TabsContent>
          </Tabs>
        </>
      ) : context.error ? (
        // Why, as the server said it, and the two ways on from here: a
        // board that did not answer often answers the second time.
        <EmptyState
          robot="error"
          title={t("This ticket could not be read.")}
          action={
            <>
              <Button variant="outline" size="sm" onClick={() => context.fetchData()}>
                <RotateCw />
                {t("Try again")}
              </Button>
              <Link to={back} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <ArrowLeft />
                {t("Back to the board")}
              </Link>
            </>
          }
        >
          {lastTicketProblem() || t("The server gave no reason.")}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          <Robot state="thinking" size={56} className="mb-2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-2 h-20 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      )}
    </div>
  )
}

/* The brief of the ticket on screen, read once per opening.
 *
 * Read again when the board says the ticket was edited while the page is
 * open, and let go of when the page is left. `content` stays undefined until
 * it is read; `problem` is why it could not be. */
function useBrief(page: TicketDetail | undefined) {
  const [brief, setBrief] = React.useState<{ id: string; content?: string; problem?: string }>()
  const [attempt, setAttempt] = React.useState(0)
  const id = page?.id
  const edited = page?.edited ?? ""

  React.useEffect(() => {
    holdTicket()
    return releaseTicket
  }, [])

  React.useEffect(() => {
    if (!id) return
    let live = true
    readTicket(id, edited).then(
      (detail) => live && setBrief({ id, content: detail.content }),
      (error) => live && setBrief({ id, problem: why(error) })
    )
    return () => {
      live = false
    }
  }, [id, edited, attempt])

  const mine = brief && brief.id === id ? brief : undefined
  return {
    content: mine?.content,
    problem: mine?.problem,
    again: () => {
      setBrief(undefined)
      setAttempt((count) => count + 1)
    },
  }
}

/* The layout's header, written here rather than told to it.
 *
 * The package's own says the record's identity under the title — for a ticket,
 * the whole Notion id, `#3eb451680af481ab9ab5dca1a49e1a7b`, where the board, the
 * palette and the tab all call it `#a49e1a7b` — and cuts the title with "…"
 * and nothing to read the rest in. It lets a view replace the title and the
 * actions, but the line under them only with the whole header: so this is the
 * whole header, the same shapes, the short id with a button that copies the
 * long one, and a title that takes a second line before it gives up.
 */
export function TicketHead() {
  const page = useCurrentViewResourceContext().data as TicketDetail | undefined
  const { ticket: open } = useConsole()
  const t = useT()
  // The pull request is opened while the page is on screen: the stream has it first.
  const ticket = page ? (open && open.id === page.id ? { ...page, ...open } : page) : null
  const copy = () => {
    if (!ticket) return
    void navigator.clipboard
      ?.writeText(ticket.id)
      .then(() => toast.success(t("Copied"), { description: ticket.id }))
      .catch(() => {})
  }
  return (
    <header data-slot="admin-header" className="w-full">
      <div className="border-border flex flex-wrap items-end gap-x-6 gap-y-4 border-b pb-5">
        <div className="min-w-0 flex-1">
          <Link
            to={boardHref()}
            className="text-muted-foreground hover:text-foreground mb-1.5 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            {t("Board")}
          </Link>
          <h2
            className="line-clamp-2 text-2xl font-semibold tracking-tight break-words"
            title={ticket?.title}
          >
            {ticket ? ticket.title : t("Ticket")}
          </h2>
          {ticket ? (
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
              {t("Ticket")} · <span className="font-mono">#{ticket.short}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={copy}
                title={t("Copy the full id")}
                aria-label={t("Copy the full id")}
              >
                <CopyIcon />
              </Button>
            </p>
          ) : null}
        </div>
        {/* Notion, the pull request, the session: where else the ticket is. */}
        {ticket ? (
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 md:w-auto">
            <TicketLinks ticket={ticket} />
          </div>
        ) : null}
      </div>
    </header>
  )
}
