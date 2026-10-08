import * as React from "react"
import { ExternalLink, MoreHorizontal } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConsole } from "@/hooks/use-console"
import { titleOf } from "@/lib/board-store"
import { currentLanguage, t, useT } from "@/lib/i18n"
import { money } from "@/lib/numbers"
import type { Ticket } from "@/lib/types"
import { cn } from "@/lib/utils"

/* What a ticket wears wherever it is drawn — on its card, at the top of its
 * page: the column it is in, the tags, the links out, and the gestures it
 * offers where it stands. */

/* What a column is called where the board has not named it itself. English
 * here, and translated where it is drawn: the board's own words come from
 * Notion and are repeated as they are. */
export const LABEL: Record<string, string> = {
  draft: "Drafts",
  ready: "Ready",
  running: "In progress",
  review: "In review",
  validated: "Validated",
  blocked: "Blocked",
  failed: "Failed",
  done: "Done",
  other: "No status",
}

/** A column's name as the board heads it: the board's word, with a capital — Notion's may have none. */
export const capital = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1)

/* The heading over a column: the board's own word for it, except over the
 * drafts. There the word is the option a draft is written with — often a bare
 * "draft" — rather than a name anybody gave a column, and the column says
 * "Drafts" in whichever language the console is in. */
export function columnTitle(key: string, name?: string): string {
  if (key === "draft") return t(LABEL.draft)
  return name || t(LABEL[key] ?? "") || key
}

/** The colour of a column, on the left edge of a card. */
export const EDGE: Record<string, string> = {
  ready: "border-l-tr-green",
  running: "border-l-tr-blue",
  review: "border-l-tr-violet",
  validated: "border-l-tr-pink",
  blocked: "border-l-tr-amber",
  failed: "border-l-tr-red",
}

/** The same colour, as text. */
export const TONE: Record<string, string> = {
  ready: "text-tr-green",
  running: "text-tr-blue",
  review: "text-tr-violet",
  validated: "text-tr-pink",
  blocked: "text-tr-amber",
  failed: "text-tr-red",
}

/** The same colour again, as a dot — over a column, beside a status. */
export const SEED: Record<string, string> = {
  ready: "bg-tr-green",
  running: "bg-tr-blue",
  review: "bg-tr-violet",
  validated: "bg-tr-pink",
  blocked: "bg-tr-amber",
  failed: "bg-tr-red",
}

/* How long ago, in the two words a card has room for. Cards are read in a
 * glance and a glance does not parse a timestamp: "12 min ago" says the one
 * thing you wanted from it, and the exact instant is on the ticket's page. */
export function ago(at: string): string {
  const then = new Date(at).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 90) return t("just now")
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t("{{count}} min ago", { count: String(minutes) })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t("{{count}}h ago", { count: String(hours) })
  const days = Math.round(hours / 24)
  return days < 30
    ? t("{{count}}d ago", { count: String(days) })
    : t("{{count}}mo ago", { count: String(Math.round(days / 30)) })
}

/* The moment a ticket is due, in the words the console is set to.
 *
 * `/api/board` writes it as the board holds it — `2026-09-19T00:00+02:00` — and
 * an ISO string beside "il y a 7 h" reads like something leaked out of a
 * database. A start gate written as a day is a day: Notion's date column has no
 * time in it, and the midnight the API adds is not something anybody chose. */
export function when(at: string): string {
  if (!at) return ""
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return at
  const midnight = date.getHours() === 0 && date.getMinutes() === 0
  return date.toLocaleString(currentLanguage(), {
    dateStyle: "medium",
    ...(midnight ? {} : { timeStyle: "short" }),
  })
}

/** How long a run took, from the minutes the board counts them in. */
export function lasted(minutes: number): string {
  if (minutes < 60) return t("{{count}} min", { count: String(Math.round(minutes)) })
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes - hours * 60)
  const said = t("{{count}} h", { count: String(hours) })
  return rest ? `${said} ${String(rest).padStart(2, "0")}` : said
}

/* Whether a page's address is one a browser may be sent to.
 *
 * A Markdown board's page is a file on this disk, and a `file://` link offered
 * by a page served over HTTP is one Chrome declines to follow without saying
 * anything — a link that does nothing reads as a broken console. */
export const reachable = (address: string): boolean => /^https?:\/\//.test(address)

/** A tag: one word about a ticket, drawn small enough that five of them still read as one row. */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem] whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  )
}

export function Away({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  )
}

/** Notion, the pull request, the session — whichever the ticket has. */
export function TicketLinks({ ticket }: { ticket: Ticket }) {
  const t = useT()
  return (
    <>
      {reachable(ticket.url) ? <Away label="Notion" href={ticket.url} /> : null}
      {ticket.pull_request ? <Away label={t("pull request")} href={ticket.pull_request} /> : null}
      {ticket.session_link ? <Away label={t("session")} href={ticket.session_link} /> : null}
    </>
  )
}

/* A move made from the console that is not in Notion yet — or will not be, and
 * why. On the card itself, because that is where the column it claims to be
 * in is drawn: a card standing in Review that Notion has in Done has to say so
 * right there. */
export function TicketSync({ ticket }: { ticket: Ticket }) {
  const t = useT()
  if (!ticket.sync) return null
  const said =
    ticket.sync === "pending"
      ? t("waiting to be sent to Notion")
      : ticket.sync === "failed"
        ? t("not sent to Notion")
        : t("changed in Notion meanwhile — not overwritten")
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip
        className={cn(
          ticket.sync === "pending" && "animate-pulse",
          ticket.sync === "failed" && "border-tr-red text-tr-red",
          ticket.sync === "conflict" && "border-tr-amber text-tr-amber"
        )}
      >
        <span title={ticket.sync_error || undefined}>{said}</span>
      </Chip>
    </div>
  )
}

/** What is said *about* a ticket rather than in it: how urgent, on which model, when. */
export function TicketTags({ ticket }: { ticket: Ticket }) {
  if (!ticket.priority && !ticket.model && !ticket.scheduled) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ticket.priority ? <Chip>{ticket.priority}</Chip> : null}
      {ticket.model ? <Chip>{ticket.model_label || ticket.model}</Chip> : null}
      {ticket.scheduled ? <Chip>⏱ {when(ticket.scheduled)}</Chip> : null}
    </div>
  )
}

/* The line along the bottom of a card: where the work goes, what it has cost,
 * and the way out to the page it is written on. All three are facts rather than
 * prose, so all three are set in the mono face and read as a single ruled row. */
export function TicketFoot({ ticket }: { ticket: Ticket }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 border-t pt-2.5 font-mono text-[0.7rem]">
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {ticket.project || t("no project")}
      </span>
      {typeof ticket.cost === "number" && ticket.cost ? (
        <span className="tabular-nums">{money(ticket.cost)}</span>
      ) : null}
      {reachable(ticket.url) ? (
        <a
          href={ticket.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={t("open in Notion")}
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  )
}

/* A gesture that costs something once it is made — a pull request merged, a
 * paid session started — asked for twice: once on the card, once in a dialog
 * that says what is about to happen. The others are one click, because moving
 * a card back is one click too. Without a label, it draws no button of its
 * own: something else — an entry in a menu — opens it. */
function Confirmed({
  label,
  title,
  body,
  confirm,
  onConfirm,
  className,
  open,
  onOpenChange,
}: {
  label?: string
  title: string
  body: string
  confirm: string
  onConfirm: () => void
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const t = useT()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {label ? (
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            {label}
          </Button>
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** The gestures a ticket offers where it stands, or nothing at all where it offers none.
 *
 * Drawn as buttons — an outline, 32 pixels high — rather than as grey words:
 * a card's gestures are the one thing on it you act on, and they read as text
 * you could not click. Where a gesture moves the ticket, the toast that
 * follows names the column it lands in, in the board's own word.
 *
 * Every way back to Ready is confirmed, because Ready is where the next pass
 * starts a paid session: "make ready" on a Done card used to be one stray click
 * away from one. On Done — the column that holds almost every card — the
 * gesture is rare, so it waits behind a "…" rather than sitting on each card.
 */
export function TicketActions({ ticket, className }: { ticket: Ticket; className?: string }) {
  const { move, board } = useConsole()
  const t = useT()
  const [asked, setAsked] = React.useState(false)
  // A ticket the runner has in hand is not one you move: drawing an empty row
  // for it would leave a gap on the card where the gestures would have been.
  if (ticket.column === "running") return null
  const named = (key: string) =>
    columnTitle(key, board.columns.find((column) => column.key === key)?.name)
  const again = ticket.column === "review" || ticket.column === "done" || ticket.column === "failed"
  const ready = {
    title: again
      ? t("Run “{{title}}” again?", { title: titleOf(ticket) })
      : t("Make “{{title}}” ready?", { title: titleOf(ticket) }),
    body: [
      ticket.column === "validated"
        ? t("Its validation is withdrawn: the runner will not merge or publish it.")
        : "",
      again
        ? t(
            "The ticket goes back to {{column}} and the next pass starts a new session on it — a session that is paid for, like the first one.",
            { column: named("ready") }
          )
        : t(
            "The ticket goes to {{column}} and the next pass starts a session on it — a session that is paid for.",
            { column: named("ready") }
          ),
    ]
      .filter(Boolean)
      .join(" "),
    confirm: again ? t("Run it again") : t("Make it ready"),
    onConfirm: () => void move(ticket, "ready"),
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {ticket.column === "review" ? (
        <Confirmed label={t("run again")} {...ready} />
      ) : ticket.column === "done" ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label={t("More actions")} title={t("More actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setAsked(true)}>{t("run again")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Confirmed open={asked} onOpenChange={setAsked} {...ready} />
        </>
      ) : ticket.column !== "ready" ? (
        <Confirmed label={again ? t("run again") : t("make ready")} {...ready} />
      ) : null}
      {/* Validating is the gesture the runner acts on — it merges the pull
          request, or publishes what the ticket holds — where "done" only files
          the ticket away yourself. Offered only on a board that has the column. */}
      {ticket.column === "review" && board.validate ? (
        <Confirmed
          label={t("validate")}
          className="text-tr-pink hover:text-tr-pink"
          title={t("Validate “{{title}}”?", { title: titleOf(ticket) })}
          body={
            ticket.pull_request
              ? t("The runner merges its pull request on its next pass. A merge is not taken back from here.")
              : t("The runner publishes what the ticket holds on its next pass.")
          }
          confirm={t("Validate")}
          onConfirm={() => void move(ticket, "validated")}
        />
      ) : null}
      {ticket.column === "review" ? (
        <Button variant="outline" size="sm" onClick={() => void move(ticket, "done")}>
          {t("done")}
        </Button>
      ) : null}
      {ticket.column === "ready" ? (
        <Button
          variant="outline"
          size="sm"
          title={t("The runner no longer touches it, until it is made ready again.")}
          onClick={() => void move(ticket, "blocked")}
        >
          {t("set aside")}
        </Button>
      ) : null}
    </div>
  )
}
