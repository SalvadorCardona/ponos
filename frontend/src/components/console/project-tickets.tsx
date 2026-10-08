import * as React from "react"
import { Plus } from "lucide-react"
import { Link } from "react-resource-view"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { why } from "@/lib/api"
import { currentBoard, useBoard } from "@/lib/board-store"
import { useT } from "@/lib/i18n"
import type { Ticket } from "@/lib/types"
import { createTicket, ticketHref } from "@/resources/tickets"
import type { ProjectItem } from "@/resources/projects"

import { EmptyState } from "./empty-state"
import { Chip, ago, capital, columnTitle } from "./ticket-bits"

/* The first tab of a project: its tickets, and the way to add one.
 *
 * The list is the board the console already holds, kept to the tickets that
 * name this project — a ticket carries its project's name, which is also how the
 * cards count them. A ticket made here is made *for* the project, so the form
 * has no project field: it is the one whose page this is. It goes through the
 * same `createTicket` as the board's own form, which puts the card on the held
 * board, and the list is drawn from that board — so the new ticket is in it as
 * soon as the server has answered.
 */

/** The three choices a board may or may not have a column for, in the order the board's form asks them. */
const CHOICES = ["type", "priority", "model"] as const

/** Radix cannot hold an empty value, and "none picked" is a value here. */
const NONE = "__none__"

export function ProjectTickets({ project }: { project: ProjectItem }) {
  const t = useT()
  const board = useBoard()
  const [writing, setWriting] = React.useState(false)
  const mine = board.tickets
    .filter((ticket) => ticket.project === project.name)
    .sort((a, b) => (Date.parse(b.edited) || 0) - (Date.parse(a.edited) || 0))
  // The id of a project the configuration alone names is a name, not a page: a
  // ticket cannot point at it.
  const canCreate = Boolean(project.id) && project.source !== "config"

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        writing ? (
          <NewTicketForm project={project} onDone={() => setWriting(false)} />
        ) : (
          <div>
            <Button size="sm" data-slot="project-new-ticket" onClick={() => setWriting(true)}>
              <Plus />
              {t("New ticket")}
            </Button>
          </div>
        )
      ) : null}

      {!currentBoard() ? (
        <Skeleton className="h-16 w-full" />
      ) : mine.length ? (
        <ul className="overflow-hidden rounded-xl border" data-slot="project-ticket-list">
          {mine.map((ticket) => (
            <li key={ticket.id} className="border-b last:border-b-0">
              <TicketLine ticket={ticket} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState robot="sleep">{t("No ticket points at this project yet.")}</EmptyState>
      )}
    </div>
  )
}

/** One ticket of the list: its title as the way in, and where it stands. */
function TicketLine({ ticket }: { ticket: Ticket }) {
  const name = currentBoard()?.columns.find((column) => column.key === ticket.column)?.name
  return (
    <Link
      to={ticketHref(ticket.id)}
      className="hover:bg-accent/40 flex min-w-0 items-center gap-3 px-3.5 py-2.5 text-sm"
    >
      <span className="text-muted-foreground shrink-0 font-mono text-[0.7rem]">#{ticket.short}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{ticket.title}</span>
      <Chip>{capital(columnTitle(ticket.column, name))}</Chip>
      <span className="text-muted-foreground hidden shrink-0 font-mono text-[0.7rem] sm:block">
        {ago(ticket.edited)}
      </span>
    </Link>
  )
}

/** The title and the brief, what the board's form also offers, and the project settled. */
function NewTicketForm({ project, onDone }: { project: ProjectItem; onDone: () => void }) {
  const t = useT()
  const choices = useBoard().choices
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [picked, setPicked] = React.useState<Record<string, string>>({})
  const [ready, setReady] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [missing, setMissing] = React.useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setMissing(true)
    setBusy(true)
    try {
      await createTicket({ title, body, project: project.id, ready, ...picked })
      toast.success(t("Ticket created."))
      onDone()
    } catch (error) {
      toast.error(why(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      data-slot="project-ticket-form"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-ticket-title">{t("Title")}</Label>
        <Input
          id="project-ticket-title"
          value={title}
          autoFocus
          autoComplete="off"
          required
          aria-invalid={missing && !title.trim() ? true : undefined}
          placeholder={t("What has to be done, in one line. It is what the board shows.")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-ticket-body">{t("The brief")}</Label>
        <Textarea
          id="project-ticket-body"
          value={body}
          rows={5}
          placeholder={t("What must change, where, and how you will know it is done.")}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {CHOICES.filter((key) => choices?.[key]?.length).map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`project-ticket-${key}`}>
              {key === "type" ? t("Type") : key === "priority" ? t("Priority") : t("Model")}
            </Label>
            <Select
              value={picked[key] || NONE}
              onValueChange={(value) => setPicked((was) => ({ ...was, [key]: value === NONE ? "" : value }))}
            >
              <SelectTrigger id={`project-ticket-${key}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {key === "type"
                    ? t("deduced by the runner")
                    : key === "priority"
                      ? t("no priority")
                      : t("the runner's model")}
                </SelectItem>
                {choices?.[key]?.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="project-ticket-ready"
          checked={ready}
          onCheckedChange={(value) => setReady(value === true)}
        />
        <Label htmlFor="project-ticket-ready">{t("Ready to run")}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {t("Create")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t("Cancel")}
        </Button>
      </div>
    </form>
  )
}
