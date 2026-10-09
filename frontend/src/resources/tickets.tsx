import * as React from "react"
import { ChevronLeft, ChevronRight, LayoutGrid, MessageCircleQuestion } from "lucide-react"
import {
  ActionList,
  BooleanInputController,
  SelectInputController,
  useFormContext,
  type FormInterface,
  type InputControllerComponentInterface,
} from "react-data-form"
import {
  Link,
  RowWrapperColumnComponent,
  columnViewOptionFactory,
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
  tableViewOptionFactory,
  useCurrentViewResourceContext,
  useListViewContext,
  type ListComponentPropsInterface,
  type RowComponentPropsInterface,
  type RowInterface,
} from "react-resource-view"

import { ComboboxInputController } from "@/components/console/combobox"
import { MarkdownInputController } from "@/components/console/markdown-editor"
import {
  columnTitle,
  SEED,
  TicketActions,
  TicketFoot,
  TicketSync,
  TicketTags,
  ago,
  capital,
  lasted,
  when,
} from "@/components/console/ticket-bits"
import { IdeasButton } from "@/components/console/ideas-deck"
import { EmptyState } from "@/components/console/empty-state"
import { Pagination } from "@/components/console/pagination"
import { ProjectThumb } from "@/components/console/project-picture"
import { Robot, TicketRobot } from "@/components/console/robot"
import { RunnerStrip, every } from "@/components/console/runner-strip"
import { StatisticsBand } from "@/components/console/statistics-band"
import { CardLive } from "@/components/console/session-log"
import { TicketHead, TicketPage } from "@/components/console/ticket-page"
import { TicketWindow, opensInTheWindow } from "@/components/console/ticket-window"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConsole } from "@/hooks/use-console"
import { api, why } from "@/lib/api"
import {
  addTicket,
  boardOnce,
  currentBoard,
  moveTicket,
  subscribeBoard,
  titleOf,
  useBoard,
} from "@/lib/board-store"
import { counted, t } from "@/lib/i18n"
import { money } from "@/lib/numbers"
import { SCOPE, layoutOf, useLayoutInTheAddress } from "@/lib/resource-view"
import type { ColumnKey, Ticket, TicketDetail } from "@/lib/types"
import { cn } from "@/lib/utils"

/* The tickets, declared once for react-resource-view.
 *
 * One declaration says what the board is: where its rows come from (the
 * stream), what a card looks like (`TicketCard`), which columns it is laid out
 * in (the board's own), how a card is moved (a drop is a status change), what
 * a new ticket asks for (the create form), and what opening one shows (the
 * ticket page). The package does the rest — the list, its header, the panel a
 * form opens in, the URL.
 */

export const TICKETS = "tickets"

/** Why the last ticket asked for could not be read, as the server said it. */
let ticketProblem = ""
export const lastTicketProblem = () => ticketProblem

/* The page under a ticket, read once per opening.
 *
 * Reading it is the slow part of opening a ticket — the server asks Notion for
 * every block — and the package asks for the record again every time the
 * stream moves the board, so one opening sent the same request two or three
 * times. The read is kept, promise and all, for as long as the page is open:
 * asked again for the same ticket it is the same read, unless the board says
 * the ticket was edited since. Leaving the page lets go of it, so the next
 * opening reads a brief changed in Notion. */
let held: { id: string; edited: string; read: Promise<TicketDetail> } | null = null
let letGo: ReturnType<typeof setTimeout> | undefined

export function readTicket(id: string, edited = ""): Promise<TicketDetail> {
  if (!held || held.id !== id || (edited && held.edited && edited !== held.edited)) {
    const read = api.ticket(id)
    const reading = { id, edited, read }
    held = reading
    read.then(
      (detail) => {
        if (!reading.edited) reading.edited = detail.edited
      },
      () => {
        // A failed read is not kept: "Try again" has to try.
        if (held === reading) held = null
      }
    )
  }
  return held.read
}

/** The ticket page is on screen: what it read stays read. */
export function holdTicket() {
  clearTimeout(letGo)
}

/* The ticket page left the screen. A tick later rather than now: React's
 * strict mode takes a page off and puts it back at once, and that is not
 * somebody leaving. */
export function releaseTicket() {
  letGo = setTimeout(() => {
    held = null
  })
}

/** A ticket as the views hold it: the row, and an IRI so the package can address it. */
export type TicketItem = Ticket & {
  "@id": string
  "@type": string
  content?: string
  /** The cost as a table cell reads it — the number is for the badges. */
  spent: string
  /** How long the run took, in words. */
  took: string
  /** When it is due, written the way the console writes a date. */
  due: string
}

/** What the console writes about a ticket: a new one, or the column an old one moves to. */
export interface TicketWrite {
  id?: string
  column?: ColumnKey
  title?: string
  body?: string
  project?: string
  ready?: boolean
  priority?: string
  type?: string
  model?: string
}

const item = (ticket: Ticket | TicketDetail): TicketItem => ({
  ...ticket,
  "@id": `/api/tickets/${ticket.id}`,
  "@type": TICKETS,
  // The card, the table and the page's header all read the title from here.
  title: titleOf(ticket),
  spent: typeof ticket.cost === "number" && ticket.cost ? money(ticket.cost) : "",
  took: typeof ticket.duration === "number" && ticket.duration ? lasted(ticket.duration) : "",
  due: when(ticket.scheduled),
})

/** The column's name, as the board spells it. */
export function columnName(key: string): string {
  return capital(columnTitle(key, currentBoard()?.columns.find((column) => column.key === key)?.name))
}

/* -- the forms ------------------------------------------------------------ */

/* The title, as a field that knows when it is wrong.
 *
 * The package's own text field draws the sentence under a refused field but
 * never marks the field itself, so a screen reader heard "Title, required" and
 * nothing more. Same box, with `aria-invalid` while the form holds a violation
 * for it, and the sentence tied to it. */
const TitleInputController: InputControllerComponentInterface = ({ formInput, onChange }) => {
  const invalid = Boolean(formInput.violations?.length)
  const id = formInput.id ?? "field-title"
  const field = React.useRef<HTMLInputElement>(null)
  useSendOnControlEnter(field)
  return (
    <>
      <Input
        ref={field}
        id={id}
        name={formInput.name}
        defaultValue={String(formInput.value ?? "")}
        onChange={(event) => onChange({ ...formInput, value: event.target.value, violations: [] })}
        placeholder={t(formInput.placeholder ?? "")}
        required
        autoComplete="off"
        // The dialog opens before the form inside it is drawn, so the only
        // thing it can hand the cursor to is its cross. A new ticket starts
        // with its title: the field takes the cursor as it appears.
        autoFocus
        aria-invalid={invalid || undefined}
        aria-errormessage={invalid ? `${id}-problem` : undefined}
      />
      {invalid ? (
        <span id={`${id}-problem`} className="sr-only">
          {formInput.violations?.map((violation) => violation.message).join(" ")}
        </span>
      ) : null}
    </>
  )
}

/* Ctrl+Enter (⌘+Enter on a Mac) creates the ticket from any field of the form,
 * the brief included — Enter alone is a new line there. Listened to on the
 * form, before the field: the editor would otherwise take the key for itself.
 * From the brief it waits a moment, because the editor tells the form what it
 * holds a little after the last key, and the last words typed would be left
 * out of the ticket. */
function useSendOnControlEnter(field: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const form = field.current?.closest("form")
    if (!form) return
    const send = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      event.stopPropagation()
      const editing = (event.target as Element | null)?.closest?.('[data-slot="markdown-editor"]')
      window.setTimeout(() => form.requestSubmit(), editing ? 300 : 0)
    }
    form.addEventListener("keydown", send, true)
    return () => form.removeEventListener("keydown", send, true)
  }, [field])
}

/* What ticking "Ready to run" does, said under it: the ticket is a session at
 * the runner's next pass, and a session is paid for. The interval is the
 * runner's own, so the sentence says when that is — or only "the next pass"
 * when the timer that makes passes is not running. */
function ReadyNote() {
  const { runner } = useConsole()
  const seconds = runner?.timer === "enabled" ? (runner.interval_seconds ?? 0) : 0
  return (
    <>
      {seconds
        ? t("Ticked, a session starts at the next pass (within {{every}}).", { every: every(seconds) })
        : t("Ticked, a session starts at the next pass.")}{" "}
      {t("Off, and the ticket is a draft the runner leaves alone.")}
    </>
  )
}

/* The three selects a board may or may not have a column for: priority, type,
 * model. Drawn only where it has one — a value for a missing column would be
 * dropped on its way in — and always optional. The options are the board's
 * (see `Api._choices`): read from the board the console already holds, which
 * is there before a dialog over it can open. */
function choiceInput(key: "priority" | "type" | "model", empty: string, description: string) {
  return {
    label: key === "type" ? "Type" : key === "priority" ? "Priority" : "Model",
    get description() {
      return t(description)
    },
    controller: SelectInputController,
    hidden: () => !currentBoard()?.choices?.[key]?.length,
    getValueOptions: async () => [
      { value: "", label: empty },
      ...(currentBoard()?.choices?.[key] ?? []),
    ],
  }
}

/** A refusal about one field, in the shape the form draws under that field. */
class FieldProblem extends Error {
  readonly data: { error: string; violations: { propertyPath: string; message: string }[] }

  constructor(field: string, message: string) {
    super(message)
    this.data = { error: message, violations: [{ propertyPath: field, message }] }
  }
}
/* What a new ticket asks for. Drawn by react-data-form, submitted to
 * `createItem`.
 *
 * A label and the button are translated by the package as it draws them; the
 * sentence under a field and the greyed example in it are not — they are used
 * as they are given. Those two are read from the dictionary here, as the field
 * is drawn, which is what the getters are for: the declaration is built once,
 * and the language can change after it.
 */
const createForm: FormInterface = {
  // The dialog already says "New ticket" over it.
  label: { submit: "Create" },
  inputs: {
    title: {
      label: "Title",
      get description() {
        return t("What has to be done, in one line. It is what the board shows.")
      },
      required: true,
      // An example, and a key: the package reads the placeholder through the
      // dictionary as it draws the field. It used to be French in every
      // language.
      placeholder: "Remove the banner from the dashboard",
      controller: TitleInputController,
    },
    body: {
      label: "The brief",
      get description() {
        return t(
          "The whole of what the runner is told. Written on the ticket's page, and read from there."
        )
      },
      get placeholder() {
        return t("What must change, where, and how you will know it is done.")
      },
      controller: MarkdownInputController,
    },
    project: {
      label: "Project",
      get description() {
        return t("A project with a repository gets a pull request; none at all gets a document.")
      },
      // A board can hold many projects: typed into, not scrolled through.
      controller: ComboboxInputController,
      getValueOptions: async () => {
        const { projects } = await api.projects().catch(() => ({ projects: [] }))
        return [
          { value: "", label: "no project — a document" },
          // The kind said the way the rest of the console says it: the list of
          // projects says "code work", and this said "code".
          // Behind the project's mark, as the list draws it: the label is
          // drawn as it is given, an element as well as a sentence.
          ...projects.map((project) => ({
            value: project.id,
            label: (
              <span className="inline-flex min-w-0 items-center gap-2">
                <ProjectThumb project={project} className="size-5 rounded" />
                {`${project.name} — ${project.kind === "code" ? t("code work") : t("document work")}`}
              </span>
            ),
          })),
        ]
      },
    },
    priority: choiceInput(
      "priority",
      "no priority",
      "Which ready ticket goes first. Empty, it waits its turn."
    ),
    type: choiceInput(
      "type",
      "deduced by the runner",
      "The road the ticket takes. Empty, the runner deduces it before the ticket runs."
    ),
    model: choiceInput("model", "the runner's model", "Empty, the model the runner is set to."),
    ready: {
      label: "Ready to run",
      get description() {
        return <ReadyNote />
      },
      controller: BooleanInputController,
      defaultValue: true,
    },
  },
}

/* The status, in the table, with the robot the card wears beside it. The cell
 * holds the board's word for the column, not its key: the key is found again
 * by that word, and a status the board has no column for is a draft, as it is
 * on the board. */
const StatusCell: InputControllerComponentInterface = ({ formInput }) => {
  const status = String(formInput.value ?? "")
  const column =
    currentBoard()?.columns.find((candidate) => candidate.name === status)?.key ?? "draft"
  return (
    <span className="inline-flex items-center gap-2">
      <TicketRobot column={column} size={18} className="shrink-0" />
      {status}
    </span>
  )
}

/* The model, in the table, as `provider/model` like everywhere else: the
 * server says it, the column holds what was typed. */
const ModelCell: InputControllerComponentInterface = ({ formInput }) => {
  const original = useFormContext().form.originalData as TicketItem | undefined
  return <>{original?.model_label || String(formInput.value ?? "")}</>
}

/* The title, in the table, as the way into the ticket — the window over the
 * list, as a card's title is. */
const TitleCell: InputControllerComponentInterface = ({ formInput }) => {
  const id = String((useFormContext().form.originalData as TicketItem | undefined)?.id ?? "")
  const title = String(formInput.value ?? "")
  if (!id) return <>{title}</>
  return (
    <Link to={ticketHref(id)} onClick={opensInTheWindow(id)} className="font-medium hover:underline">
      {title}
    </Link>
  )
}

/* The columns of the table layout. Read only: a ticket is moved on the board,
 * not typed into here. The headings go through the dictionary on their way to
 * the page, and the two cells that are a number on the card — what it cost and
 * how long it took — are read from the words `item` writes them in. */
const rowForm: FormInterface = {
  inputs: {
    title: { label: "Ticket", readonly: true, controller: TitleCell },
    project: { label: "Project", readonly: true },
    status: { label: "Status", readonly: true, controller: StatusCell },
    priority: { label: "Priority", readonly: true },
    model: { label: "Model", readonly: true, controller: ModelCell },
    spent: { label: "Cost", readonly: true },
    took: { label: "Took", readonly: true },
    due: { label: "Scheduled", readonly: true },
  },
}

/* -- one card ------------------------------------------------------------- */

/* How a ticket is drawn on the board. The card is the way into the ticket —
 * its title is the link, and so is the id over it; a click opens it in a
 * window over the board (see `TicketWindow`).
 *
 * Read top to bottom it answers, in order: which one is this, how long has it
 * been sitting there, what is it, what is said about it, what is it doing,
 * where does the work go and what has it cost. "What is it doing" is live on a
 * running card: what its session last said, as it says it. The `-m-4` is the frame
 * react-resource-view draws around every record being pushed back out of the
 * way: the coloured edge has to be the card's own edge, not a stripe inside a
 * second border.
 *
 * The id and the age never wrap: "#3f2acf09" cut in two is a different id to
 * read, and "il y a 1 j" over two lines was a line of the card spent on it.
 * The title and the summary do, anywhere if they must: a path, a URL or a
 * branch name has no space to break at, and unbroken it set the width of the
 * whole column, which then ran under the ones beside it.
 */
function TicketCard({ row }: RowComponentPropsInterface) {
  const ticket = row?.data as TicketItem | undefined
  const { resource } = useCurrentViewResourceContext()
  if (!ticket) return null
  const href = generateLinkByResource({ resource, resourceAction: ActionList.read, id: ticket.id })
  const open = opensInTheWindow(ticket.id)

  return (
    <div className="-m-4 flex min-w-0 flex-col gap-2 rounded-2xl p-3">
      <div className="flex items-center gap-2 font-mono text-[0.7rem] whitespace-nowrap">
        <TicketRobot column={ticket.column} size={20} className="-my-1 shrink-0" />
        <Link to={href} onClick={open} className="shrink-0 font-medium tracking-wide hover:underline">
          #{ticket.short}
        </Link>
        {/* Waiting on you: a run that asks a question lands in the blocked
            column, and so does a ticket held by hand — both wait for a word
            from you. The board reads no discussion, so the column is what it
            goes by; the page it opens is on the discussion. */}
        {ticket.column === "blocked" ? (
          <Link
            to={href}
            onClick={open}
            data-slot="ticket-waiting"
            className="bg-tr-amber/15 text-tr-amber inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-sans font-semibold hover:underline"
          >
            <MessageCircleQuestion className="size-3" />
            {t("waiting for you")}
          </Link>
        ) : null}
        <span className="flex-1" />
        <span className="text-muted-foreground min-w-0 truncate">{ago(ticket.created)}</span>
      </div>

      <Link
        to={href}
        onClick={open}
        className="text-[0.93rem] leading-snug font-semibold break-words hover:underline"
      >
        {ticket.title}
      </Link>

      <TicketTags ticket={ticket} />
      <TicketSync ticket={ticket} />

      {ticket.column === "running" ? (
        <CardLive ticket={ticket} />
      ) : ticket.progress ? (
        <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed break-words">
          {ticket.progress}
        </p>
      ) : null}

      <TicketActions ticket={ticket} className="-mx-1" />
      <TicketFoot ticket={ticket} />
    </div>
  )
}

/* -- the board ------------------------------------------------------------ */

/* What sits above whatever react-resource-view is drawing.
 *
 * It asks the list to reread the store whenever the stream moves the board,
 * and once the board is there it draws the runner's figures over it, then the
 * statistics of the period — which is what makes the list a dashboard. The heading is the
 * package's own since 0.7.0 — the resource's icon, the view's name and the
 * line under it — so the board no longer opens with a `PageHead` of its own,
 * which would say it all twice.
 *
 * Until the first board arrives, it is the page: the package covers the screen
 * with three bouncing dots while the list loads, and the first thing a console
 * shows is that wait — as long as Notion takes to answer. The robot, thinking,
 * over the dots, says the same thing with the runner's own face.
 */
function BoardTop() {
  const { fetchData, isLoading, resourceAction } = useCurrentViewResourceContext()
  useLayoutInTheAddress(TICKETS)
  const latest = React.useRef(fetchData)
  latest.current = fetchData
  React.useEffect(() => subscribeBoard(() => latest.current()), [])
  // The figures are the board's: a ticket's page is drawn under the same
  // `top`, and has its own column to say what it is doing. So is the window a
  // ticket opens in over the list — once, for every card and row of it.
  if (!isLoading || currentBoard())
    return resourceAction === ActionList.list ? (
      <>
        <div className="mb-3 flex justify-end">
          <IdeasButton />
        </div>
        <RunnerStrip />
        <StatisticsBand />
        <TicketWindow />
      </>
    ) : null
  return (
    <div className="bg-background fixed inset-0 z-[51] flex flex-col items-center justify-center gap-3">
      <Robot state="thinking" size={96} />
      <p className="text-muted-foreground font-mono text-xs">{t("Reading the board…")}</p>
    </div>
  )
}

/* The board's own empty line.
 *
 * Left to the package, a board with nothing on it said "No results yet —
 * nothing matched your search", in English, on a console set to French and on a
 * page where nobody has searched for anything. An empty board is not a failed
 * search: it is a board waiting for its first ticket, and the button that makes
 * one is already at the top of the page. */
function NoTicket() {
  return (
    <EmptyState robot="sleep">
      {t("Nothing on the board yet — a ticket moved to the ready column is a session that starts.")}
    </EmptyState>
  )
}

/** A column's name as a heading: the board's own word, with a capital, under its colour.
 *
 * With the number of its cards when there is one to say. The package counts
 * the cards it is handed, and a column that is handed its thirty latest is not
 * a column of thirty: the count is the column's own, drawn here, and the
 * package's is hidden (see `BoardColumn`). */
function heading(key: string, name: string, count?: number) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-1.5 shrink-0 rounded-full", SEED[key] ?? "bg-muted-foreground")} />
      <span className="truncate">{capital(name)}</span>
      {count === undefined ? null : (
        <span className="bg-background text-muted-foreground ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-normal tabular-nums">
          {count}
        </span>
      )}
    </span>
  )
}

/* The columns where cards only ever pile up, and how many of their latest are
 * drawn at a time.
 *
 * Done grows by every ticket the runner has ever finished: 344 cards on the
 * board of September 2026, each with its robot, all drawn every time somebody
 * went to the board — the browser held for a third of a second on a slow
 * machine (`scripts/measure-console.mjs`). Nobody reads the three hundredth card of
 * Done; the most recent are the ones worth a look. So a terminal column draws
 * its `TERMINAL_PAGE` latest — by when the ticket was last touched, which is
 * when it got there — and a button under it draws that many more. Every other
 * column is work in flight, and is drawn whole.
 *
 * What a filter keeps is what is counted: the rows are the ones the list was
 * handed, so a search that finds an old ticket finds it among thirty, not
 * behind three hundred. */
const TERMINAL = new Set<string>(["done"])
export const TERMINAL_PAGE = 30

/* How far each terminal column was opened, for as long as the tab lives: going
 * to a ticket and back to the board is not starting again from thirty. */
const opened = new Map<string, number>()

const touched = (row: RowInterface) => Date.parse(String(row.data?.edited ?? "")) || 0

/** One column of the board, as the package draws it — terminal ones cut short, with the way to the rest. */
function BoardColumn({
  column,
  label,
  rows,
  dragging,
  onDragging,
}: {
  column: string
  label: string
  rows: RowInterface[]
  dragging: boolean
  onDragging: (dragging: boolean) => void
}) {
  const [shown, setShown] = React.useState(() => opened.get(column) ?? TERMINAL_PAGE)
  const mine = React.useMemo(() => {
    const own = rows.filter((row) => row.data?.column === column)
    return TERMINAL.has(column) ? own.sort((a, b) => touched(b) - touched(a)) : own
  }, [rows, column])
  const drawn = TERMINAL.has(column) ? mine.slice(0, shown) : mine
  const left = mine.length - drawn.length

  const more = () => {
    const next = shown + TERMINAL_PAGE
    opened.set(column, next)
    setShown(next)
  }

  // The package draws its column 18rem wide and rigid; the wrapper is what
  // shares the width, and the column fills it — no wider: left at
  // `min-width: auto`, its widest card would widen it. Its own count is
  // hidden: it counts what it was handed, and the heading says the column's.
  return (
    <div
      className={cn(
        "flex flex-1 basis-0 snap-start flex-col gap-2 *:w-auto *:min-w-0 [&_header>p]:flex-1 [&_header>span]:hidden",
        COLUMN_MIN
      )}
    >
      <RowWrapperColumnComponent
        identifierKey="column"
        valueIdentifier={{ value: column, label: heading(column, label, mine.length) }}
        isDragging={dragging}
        handleDragging={onDragging}
        rows={drawn}
      />
      {left > 0 ? (
        <Button variant="outline" size="sm" onClick={more}>
          {t("Show more ({{count}} left)", { count: String(left) })}
        </Button>
      ) : null}
    </div>
  )
}

/* The narrowest a column is drawn. Below it a card's title wraps a word to a
 * line; above it the columns share the width, with no upper bound, and past
 * what the screen holds the board scrolls sideways — the board, not the page. */
const COLUMN_MIN = "min-w-[17.5rem]"

/* Whether the empty columns are drawn anyway, as the last person at this
 * browser left it. Hidden by default: on a board with three columns at "rien",
 * those three took as much room as the ones with work in them. */
const EMPTY_KEY = "ponos-board-empty-columns"

function useEmptyColumnsShown() {
  const [shown, setShown] = React.useState(() => {
    try {
      return localStorage.getItem(EMPTY_KEY) === "shown"
    } catch {
      return false
    }
  })
  const change = React.useCallback((next: boolean) => {
    setShown(next)
    try {
      localStorage.setItem(EMPTY_KEY, next ? "shown" : "hidden")
    } catch {
      // Storage off: the choice lasts as long as the tab, which is still one.
    }
  }, [])
  return [shown, change] as const
}

/* A hidden column, while a card is being dragged: a thin strip under its name
 * that takes a drop the way a column does. Without it, hiding an empty column
 * would have taken away the only way to move a card to Review or Blocked by
 * hand. The drop is the one the package's column makes — the same
 * `updateData`, so the same write — and the column is drawn again as soon as
 * the card is in it, because it is no longer empty. */
function DropZone({
  column,
  label,
  onDropped,
}: {
  column: string
  label: React.ReactNode
  onDropped: () => void
}) {
  const list = useListViewContext()
  const [over, setOver] = React.useState(false)
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const id = event.dataTransfer.getData("text")
        if (id) list.updateData?.({ id, column }, true)
        onDropped()
      }}
      className={cn(
        "border-border bg-muted/30 flex min-h-40 w-10 shrink-0 snap-start justify-center self-stretch rounded-2xl border border-dashed py-3 text-xs font-medium transition-colors",
        over && "border-primary bg-primary/5 w-24"
      )}
    >
      <span className="[writing-mode:vertical-rl]">{label}</span>
    </div>
  )
}

/** The board's columns, in the board's order and words, each a drop target.
 *
 * Seven columns do not fit a laptop, and the board used to show four of them
 * with nothing to say there were three more. The columns share the width of
 * the page now, none narrower than `COLUMN_MIN`, the strip snaps to a
 * column's edge, and each end that has more beyond it says so — a fade, and a
 * button that scrolls one screen further.
 *
 * A column with no card is not drawn, unless you asked for it: a line over the
 * board says how many are hidden and brings them back. While a card is being
 * dragged, each hidden column is a thin drop zone in its place. */
function BoardColumns({ rows = [] }: ListComponentPropsInterface) {
  const board = useBoard()
  const [dragging, setDragging] = React.useState(false)
  const [emptyShown, setEmptyShown] = useEmptyColumnsShown()
  const strip = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState({ left: false, right: false })

  const measure = React.useCallback(() => {
    const element = strip.current
    if (!element) return
    const left = element.scrollLeft > 4
    const right = element.scrollLeft + element.clientWidth < element.scrollWidth - 4
    setMore((was) => (was.left === left && was.right === right ? was : { left, right }))
  }, [])

  const columns = board.columns.filter(
    // Offered only where the runner would honour a card dropped there.
    (column) => column.key !== "validated" || board.validate
  )
  // Counted on the rows the list was handed, so on what the filters left: a
  // column emptied by a search is as empty as one with nothing in it.
  const empty = new Set(
    columns
      .filter((column) => !rows.some((row) => row.data?.column === column.key))
      .map((column) => column.key)
  )
  const hidden = emptyShown ? 0 : empty.size

  React.useEffect(() => {
    const element = strip.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of Array.from(element.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [measure, board.columns.length, rows.length, hidden, dragging])

  const scroll = (direction: 1 | -1) =>
    strip.current?.scrollBy({ left: direction * strip.current.clientWidth * 0.8, behavior: "smooth" })

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {empty.size ? (
        <p className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
          {emptyShown
            ? null
            : counted(empty.size, "{{count}} empty column hidden", "{{count}} empty columns hidden")}
          <Button variant="ghost" size="xs" onClick={() => setEmptyShown(!emptyShown)}>
            {emptyShown ? t("Hide empty columns") : t("Show them")}
          </Button>
        </p>
      ) : null}
      <div className="relative">
        <div
          ref={strip}
          onScroll={measure}
          className="scroll-thin flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-smooth pb-2"
        >
          {columns.map((column) => {
            const name = columnTitle(column.key, column.name)
            if (!emptyShown && empty.has(column.key)) {
              return dragging ? (
                <DropZone
                  key={column.key}
                  column={column.key}
                  label={heading(column.key, name)}
                  onDropped={() => setDragging(false)}
                />
              ) : null
            }
            return (
              <BoardColumn
                key={column.key}
                column={column.key}
                label={name}
                rows={rows}
                dragging={dragging}
                onDragging={setDragging}
              />
            )
          })}
        </div>
        {more.left ? (
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 flex w-12 items-start bg-gradient-to-r to-transparent pt-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="pointer-events-auto rounded-full shadow-sm"
              aria-label={t("Earlier columns")}
              onClick={() => scroll(-1)}
            >
              <ChevronLeft />
            </Button>
          </div>
        ) : null}
        {more.right ? (
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 flex w-12 items-start justify-end bg-gradient-to-l to-transparent pt-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="pointer-events-auto rounded-full shadow-sm"
              aria-label={t("More columns")}
              onClick={() => scroll(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** A new ticket, written to the board and put on the one the console holds, so it is drawn at once. */
export async function createTicket(fresh: TicketWrite): Promise<TicketItem> {
  const title = String(fresh.title ?? "").trim()
  // Said under the field it is about, not only in a toast in the corner.
  if (!title) throw new FieldProblem("title", t("A ticket needs a title."))
  const made = await api.createTicket({
    title,
    body: String(fresh.body ?? ""),
    project: String(fresh.project ?? ""),
    ready: fresh.ready !== false,
    priority: String(fresh.priority ?? ""),
    type: String(fresh.type ?? ""),
    model: String(fresh.model ?? ""),
  })
  const projects = await api.projects().catch(() => ({ projects: [] }))
  const project = projects.projects.find((candidate) => candidate.id === fresh.project)
  // A draft lands among the drafts, with the status the board keeps them
  // under, or none on a board that names no such option.
  const drafts = currentBoard()?.columns.find((candidate) => candidate.key === "draft")
  const column = fresh.ready === false ? "draft" : "ready"
  const card: Ticket = {
    id: made.id.replace(/-/g, ""),
    short: made.id.replace(/-/g, "").slice(-8),
    title: made.title,
    url: "",
    status: column === "draft" ? drafts?.name ?? "" : "",
    column,
    project: project?.name ?? "",
    kind: project?.kind ?? "",
    // The key was sent; the card says it as the board spells it.
    type: currentBoard()?.choices?.type?.find((choice) => choice.value === fresh.type)?.label ?? "",
    priority: String(fresh.priority ?? ""),
    model: String(fresh.model ?? ""),
    progress: "",
    runner: "",
    pull_request: "",
    session: "",
    session_link: "",
    cost: null,
    duration: null,
    scheduled: "",
    created: new Date().toISOString(),
    edited: new Date().toISOString(),
  }
  addTicket(card)
  return item(card)
}

/* -- the declaration ------------------------------------------------------ */

export const tickets = createViewResource<TicketItem, TicketItem, TicketWrite>(TICKETS, {
  name: "Dashboard",
  scope: SCOPE,
  path: "/api/board",
  icon: LayoutGrid,
  canList: true,
  canRead: true,
  canCreate: true,
  canUpdate: false,
  canDelete: false,

  // The rows are the stream's; asking Notion again here would be asking it
  // for what every open tab already holds.
  getCollection: async () => {
    const board = await boardOnce()
    return {
      data: createResourceCollection({ id: "/api/board", items: board.tickets.map(item) }),
    } as never
  },
  // What the board already knows, at once: the title, the column, the
  // project and the cost are on the card, and the page draws them without
  // waiting for Notion. The brief is the page's to read (see `readTicket`).
  // A ticket the board does not hold — an address typed before the board
  // arrived — is read whole, and that read is the one the page uses.
  getItem: async ({ id }) => {
    // Kept for the page to say: the package only says *that* a read failed.
    ticketProblem = ""
    const wanted = String(id).replace(/-/g, "")
    const row = currentBoard()?.tickets.find((ticket) => ticket.id === wanted)
    if (row) return { data: item(row) }
    try {
      return { data: item(await readTicket(wanted)) }
    } catch (error) {
      ticketProblem = why(error)
      throw error
    }
  },
  // A card dropped in a column is a status change, and nothing else about a
  // ticket is written from the board. The same move the buttons on a card
  // make, put back where it was if the write fails.
  updateItem: async (patch) => {
    const id = String(patch.id)
    const column = patch.column as ColumnKey | undefined
    const before = currentBoard()?.tickets.find((ticket) => ticket.id === id)
    if (column) await moveTicket(id, column)
    const after = currentBoard()?.tickets.find((ticket) => ticket.id === id) ?? before
    return { data: after ? item(after) : (patch as unknown as TicketItem) }
  },
  createItem: async (fresh) => ({ data: await createTicket(fresh) }),
  removeItem: async () => {
    throw new Error("a ticket is not deleted from the console; Notion keeps it")
  },

  view: {
    name: "Dashboard",
    form: rowForm,
    /* The two tabs over the list. A variant's name is drawn as it is given and
     * its id is slugged from it where none is said, so the id is said here and
     * the name read from the dictionary as the tab is drawn: the address stays
     * `board` in every language. */
    viewVariants: [
      {
        ...columnViewOptionFactory({
          id: "board",
          // The page's whole width, for the board and the table alike: switching
          // between them must not move the page. The forms keep the column every
          // other page is drawn in.
          fullWidth: true,
          listComponent: BoardColumns,
          rowComponent: TicketCard,
          identifierKey: "column",
        }),
        get name() {
          return t("board")
        },
      },
      {
        ...tableViewOptionFactory({
          id: "table",
          fullWidth: true,
          behavior: { rowActions: [] },
        }),
        get name() {
          return t("table")
        },
      },
    ],
    components: { top: BoardTop },
  },
  views: {
    // The name and the line under it are what the list's own header says, next
    // to the resource's icon: the board opens on its own words.
    [ActionList.list]: {
      name: "Dashboard",
      // What the board is, without naming where it is kept: the same console
      // draws a Notion workspace and a directory of Markdown files, and a
      // sentence that names one of them is wrong half the time.
      description:
        "Your board, live. Drop a card in another column and the runner is told.",
      // A row of the table opens the ticket by its title, as a card does, in
      // the window over the list (see `TitleCell`). The package's own read
      // button left the list for the page, and would have been a second way
      // in that does something else.
      behavior: { rowActions: [] },
      // `top` said again: the package merges a view over the resource's one
      // key by key, so a `components` here replaces the whole of it — and
      // without `BoardTop` the list never rereads the board the stream moves.
      components: { top: BoardTop, noResult: NoTicket, pagination: Pagination },
    },
    [ActionList.create]: {
      name: "New ticket",
      form: createForm,
      // Over the board rather than instead of it, and in the middle of it: a
      // handful of fields are a question asked, not a page to settle into. The dialog is
      // already as wide as a brief wants and scrolls inside when one runs long.
      behavior: { openIn: "popup" },
    },
    [ActionList.read]: {
      name: "Ticket",
      viewComponent: TicketPage,
      // The layout's header, in the same shapes but written for a ticket: its
      // short id, its whole title. `top` said again, as on the list: without
      // it the page no longer rereads the ticket the stream moves.
      components: { top: BoardTop, navigation: TicketHead },
    },
  },
})

/** Where the board is, in the layout it was last worked in. */
export const boardHref = () =>
  generateLinkByResource({
    resource: tickets,
    resourceAction: ActionList.list,
    viewVariantId: layoutOf(TICKETS),
  })

/** Where a ticket is. */
export const ticketHref = (id: string) =>
  generateLinkByResource({ resource: tickets, resourceAction: ActionList.read, id })
