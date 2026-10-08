import * as React from "react"
import { useLocation, useRouter } from "@tanstack/react-router"
import { ArrowLeft, CopyIcon, MessageCircleQuestion, RotateCw } from "lucide-react"
import { ActionList } from "react-data-form"
import { Link, useCurrentViewResourceContext } from "react-resource-view"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useConsole, useSteps } from "@/hooks/use-console"
import { why } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { money } from "@/lib/numbers"
import type { TicketDetail } from "@/lib/types"
import { useRoute } from "@/lib/router"
import { cn } from "@/lib/utils"
import {
  boardHref,
  holdTicket,
  lastTicketProblem,
  readTicket,
  releaseTicket,
} from "@/resources/tickets"

import { EmptyState } from "./empty-state"
import { Eyebrow, Fact, Facts } from "./frame"
import { Markdown } from "./markdown"
import { MOOD, Robot } from "./robot"
import { Pulse, TicketLive } from "./session-log"
import { TicketTalk } from "./ticket-talk"
import {
  SEED,
  columnTitle,
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
 * `readTicket`). Opening this page is also what loads the ticket's discussion.
 *
 * It opens the way the board's cards do and then says more: the column as a
 * banner, and the metadata as a ruled grid — because six facts in a row of pills is six pills, where six
 * facts in a grid is a thing you can read down.
 *
 * Under them, three tabs: the brief, with the facts that describe the ticket;
 * the discussion; and the session. They were sections folded one under the
 * other for a while, all three on one page — and a running session, open at the
 * bottom of a long brief, was a page you scrolled to the end of every time it
 * moved. A tab is one thing at a time, the whole height for it, and the tab
 * list says which of the other two has something new — see `TicketTabs`.
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
    ? capital(columnTitle(ticket.column, board.columns.find((item) => item.key === ticket.column)?.name))
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

          {/* Chosen once per ticket, not every time the column moves: a
              tab that switched itself under the reader would lose them. */}
          <TicketTabs
            key={ticket.id}
            ticket={ticket}
            brief={brief}
            talking={open?.id === ticket.id}
          />
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
  const [brief, setBrief] = React.useState<{
    id: string
    content?: string
    model?: TicketDetail["model_in_use"]
    problem?: string
  }>()
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
      (detail) => live && setBrief({ id, content: detail.content, model: detail.model_in_use }),
      (error) => live && setBrief({ id, problem: why(error) })
    )
    return () => {
      live = false
    }
  }, [id, edited, attempt])

  const mine = brief && brief.id === id ? brief : undefined
  return {
    content: mine?.content,
    model: mine?.model,
    problem: mine?.problem,
    again: () => {
      setBrief(undefined)
      setAttempt((count) => count + 1)
    },
  }
}

/* What the page says about the ticket, as a ruled grid.
 *
 * Six of them always: what kind of work it is, on what, at what price, are
 * the first three questions about any ticket, and a cell that came and went
 * with the run hid them exactly while one was going on. What the ticket does
 * not have yet says "—". The rest — how long it took, where it went, which
 * machine has it — is drawn when the ticket has it: a board made by hand has
 * no duration and no agent column, and a row of "—" said so on every ticket.
 */
function TicketFacts({ ticket }: { ticket: TicketDetail }) {
  const t = useT()
  // Until the page's own read has said, a model written on the ticket is the one it has.
  const used =
    ticket.model_in_use ??
    (ticket.model ? { label: ticket.model_label ?? ticket.model, full: ticket.model, default: false } : undefined)
  const none = <span className="text-muted-foreground">—</span>
  const created = ago(ticket.created)
  const pull = ticket.pull_request.match(/\/pull\/(\d+)/)?.[1]
  return (
    <Facts className="mt-4">
      <Fact label={t("project")}>{ticket.project || t("no project — a document")}</Fact>
      {/* As the board spells it: Code, Writing, External action, Publication. */}
      <Fact label={t("type")}>{ticket.type || none}</Fact>
      <Fact label={t("priority")}>{ticket.priority || none}</Fact>
      {/* The column empty is not "no model": it is the one the session
          announced, or the runner's, or Claude Code's own. The server says
          which, as provider/model; the full identifier is the tooltip. */}
      <Fact label={t("model")}>
        {used?.label ? (
          <span title={used.full}>
            {used.label}
            {used.default ? (
              <span className="text-muted-foreground font-normal"> · {t("default")}</span>
            ) : null}
          </span>
        ) : (
          <span>
            {t("Claude Code's default, unknown before the first session")}
          </span>
        )}
      </Fact>
      {/* Written on the ticket when its session ends: the stream a session
          writes says what it cost only in its last line. */}
      <Fact label={t("spent")}>
        {typeof ticket.cost === "number" && ticket.cost ? money(ticket.cost) : none}
      </Fact>
      <Fact label={t("created")}>{created || none}</Fact>
      {/* What the run cost in time, next to what it cost in money — from
          the board's column, or from the session's log where the board
          has none (see `Api.ticket`). */}
      {typeof ticket.duration === "number" && ticket.duration ? (
        <Fact label={t("took")}>{lasted(ticket.duration)}</Fact>
      ) : null}
      {ticket.pull_request ? (
        <Fact label={t("pull request")}>
          <a
            href={ticket.pull_request}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {pull ? `#${pull}` : ticket.pull_request}
          </a>
        </Fact>
      ) : null}
      {ticket.session ? (
        <Fact label={t("session")}>
          {ticket.session_link ? (
            <a
              href={ticket.session_link}
              className="font-mono text-xs underline-offset-2 hover:underline"
              title={ticket.session}
            >
              {ticket.session.slice(0, 8)}
            </a>
          ) : (
            <span className="font-mono text-xs" title={ticket.session}>
              {ticket.session.slice(0, 8)}
            </span>
          )}
        </Fact>
      ) : null}
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
  )
}

/* The three tabs of a ticket: its brief, its discussion, its session.
 *
 * Which one a ticket opens on says what it is waiting for. A running ticket
 * opens on its session, because that is what somebody opening it then has
 * come to watch; a ticket waiting on you, on its discussion, because the
 * question in it is the one thing on the page you can do something about; any
 * other, on its brief. The discussion arrives after the page — it is a second
 * question to the board — so a ticket whose question is still unanswered is
 * known to be waiting only once it has: the tab follows it then, from the
 * brief, unless the reader has already picked one. It never moves by itself
 * after that: a tab that switched under the reader would lose them, and the
 * end of a run, or an answer sent from the discussion, is exactly when it
 * would.
 *
 * The tab picked is written in the address (`&tab=live`), so a reload, the
 * way back, or a link pasted elsewhere comes back to it — on the ticket's own
 * page only: the window over the board has the board's address, and keeps its
 * tab to itself.
 *
 * The status, the actions and the session's whereabouts stay above the tabs,
 * on every one of them; the facts that describe the ticket are the brief's.
 * `talking` says the discussion held is this ticket's, and not still the last
 * one's.
 */
const TABS = ["brief", "discussion", "live"] as const
type Tab = (typeof TABS)[number]

const isTab = (value: string | null | undefined): value is Tab => TABS.includes(value as Tab)

/** The query string with its `tab` said again — the rest of it left exactly as written. */
function withTab(searchStr: string, tab: Tab): string {
  const rest = searchStr
    .replace(/^\?/, "")
    .split("&")
    .filter((part) => part && !part.startsWith("tab="))
  return `?${[...rest, `tab=${tab}`].join("&")}`
}

/** The tab named in the address, and how to name another — when the address is this ticket's page. */
function useAddressedTab(id: string): [Tab | undefined, (tab: Tab) => void] {
  const { pathname, searchStr } = useLocation()
  const router = useRouter()
  const { params } = useRoute()
  const mine = params.resourceAction === ActionList.read && String(params.id ?? "") === id
  const named = new URLSearchParams(searchStr).get("tab")
  const write = React.useCallback(
    (tab: Tab) => {
      if (mine) router.history.replace(pathname + withTab(searchStr, tab))
    },
    [mine, router, pathname, searchStr]
  )
  return [mine && isTab(named) ? named : undefined, write]
}

function TicketTabs({
  ticket,
  brief,
  talking,
}: {
  ticket: TicketDetail
  brief: ReturnType<typeof useBrief>
  talking: boolean
}) {
  const { talk, talkWaiting } = useConsole()
  const { sessions } = useSteps()
  const t = useT()
  const session = sessions.find((candidate) => candidate.source === ticket.short)
  const running = ticket.column === "running" || Boolean(session)
  const waiting = ticket.column === "blocked" || (talking && talkWaiting)
  const [addressed, address] = useAddressedTab(ticket.id)
  const [tab, setTab] = React.useState<Tab>(
    () => addressed ?? (running ? "live" : waiting ? "discussion" : "brief")
  )
  const picked = React.useRef(Boolean(addressed))
  React.useEffect(() => {
    if (waiting && !picked.current) setTab((was) => (was === "brief" ? "discussion" : was))
  }, [waiting])
  // The way back, or forward, to the same ticket on another tab.
  React.useEffect(() => {
    if (addressed) setTab(addressed)
  }, [addressed])
  // What was said, not a line saying the discussion could not be read.
  const count = talking ? talk.filter((message) => message.role !== "error").length : 0

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (!isTab(value)) return
        picked.current = true
        setTab(value)
        address(value)
      }}
      className="mt-6 gap-4"
    >
      {/* The whole width on a phone, three equal thirds: a tab list sized to
          its words leaves the third one to be scrolled to. */}
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="brief" data-slot="ticket-brief-tab">
          {t("Brief")}
        </TabsTrigger>
        <TabsTrigger value="discussion" data-slot="ticket-talk-tab">
          {t("Discussion")}
          {waiting ? (
            <MessageCircleQuestion
              data-slot="ticket-waiting-badge"
              className="text-tr-amber size-4"
              aria-label={t("a question is waiting for you")}
            />
          ) : null}
          {count ? (
            <span className="bg-muted-foreground/15 text-muted-foreground rounded-full px-1.5 text-[0.7rem] tabular-nums">
              {count}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="live" data-slot="ticket-live-tab">
          {t("Live")}
          {running ? (
            <>
              <Pulse />
              <span className="sr-only">{t("writing now")}</span>
            </>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="brief">
        <TicketFacts ticket={{ ...ticket, model_in_use: brief.model }} />
        <section className="mt-6">
          <Eyebrow>{t("the brief")}</Eyebrow>
          <div className="mt-2">
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
          </div>
        </section>
      </TabsContent>
      <TabsContent value="discussion">
        <TicketTalk />
      </TabsContent>
      <TabsContent value="live">
        <TicketLive ticket={ticket} />
      </TabsContent>
    </Tabs>
  )
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
            {t("Dashboard")}
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
