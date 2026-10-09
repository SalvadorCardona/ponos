import * as React from "react"
import { Pencil, Plus } from "lucide-react"
import { Link } from "react-resource-view"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api, why } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { Idea, IdeaAuthor, IdeaList as Listed, IdeaStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { isAPage, projectHref, projectsOnce } from "@/resources/projects"
import { ticketHref } from "@/resources/tickets"

import { EmptyState } from "./empty-state"
import { IdeasButton } from "./ideas-deck"
import { Robot } from "./robot"
import { Chip, ago } from "./ticket-bits"

/* Every idea of one scope, whatever became of it.
 *
 * The deck shows what is still waiting, one card at a time; this is the rest of
 * the story — the ideas kept for later, those thrown away, those that became
 * tickets — because none of them is ever deleted, and an idea thrown away last
 * month may be the right one today. Filtered by status, each with its count, and
 * by who wrote it: Ponos, or one of us.
 *
 * The same list is a project's "Ideas" tab and the deck's second tab, which is
 * the workspace's when the deck was opened from the dashboard. An idea written
 * here goes through the same table as Ponos's, so the next batch is told about
 * it and never proposes it again.
 */

const STATUSES: IdeaStatus[] = ["proposed", "kept", "discarded", "ticket"]
type Who = "all" | "ponos" | "human"

/** What a status is called on a card, and on its filter. */
function useStatusWords() {
  const t = useT()
  return {
    one: {
      proposed: t("New"),
      kept: t("Kept"),
      discarded: t("Thrown"),
      ticket: t("Turned into a ticket"),
    } satisfies Record<IdeaStatus, string>,
    many: {
      proposed: t("New ideas"),
      kept: t("Kept ideas"),
      discarded: t("Thrown ideas"),
      ticket: t("Became tickets"),
    } satisfies Record<IdeaStatus, string>,
  }
}

export function IdeaList({
  project = "",
  name = "",
  find = false,
  className,
}: {
  /** The project's page; none for the workspace. */
  project?: string
  name?: string
  /** Offer Ponos's deck as well, for a list that is not already inside it. */
  find?: boolean
  className?: string
}) {
  const t = useT()
  const words = useStatusWords()
  const [listed, setListed] = React.useState<Listed | null>(null)
  const [problem, setProblem] = React.useState("")
  const [status, setStatus] = React.useState<IdeaStatus | "all">("all")
  const [who, setWho] = React.useState<Who>("all")
  const [writing, setWriting] = React.useState(false)
  const [editing, setEditing] = React.useState<number | null>(null)
  const [busy, setBusy] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    try {
      setListed(await api.allIdeas(project))
      setProblem("")
    } catch (error) {
      setProblem(why(error))
    }
  }, [project])

  React.useEffect(() => {
    void load()
  }, [load])

  /** One gesture on one idea, then the list read again: a status changes two counts. */
  const act = async (idea: Idea, run: (id: number) => Promise<Idea>, said?: (done: Idea) => void) => {
    setBusy(idea.id)
    try {
      const done = await run(idea.id)
      said?.(done)
      await load()
    } catch (error) {
      toast.error(t("The decision could not be saved"), { description: why(error) })
    } finally {
      setBusy(null)
    }
  }

  const theirs = (listed?.ideas ?? []).filter((idea) => who === "all" || idea.author.kind === who)
  const counts = Object.fromEntries(
    STATUSES.map((key) => [key, theirs.filter((idea) => idea.status === key).length])
  ) as Record<IdeaStatus, number>
  const shown = theirs.filter((idea) => status === "all" || idea.status === status)

  return (
    <div className={cn("flex flex-col gap-4", className)} data-slot="ideas-list">
      <div className="flex flex-wrap items-center gap-2">
        {!writing ? (
          <Button size="sm" data-slot="ideas-new" onClick={() => setWriting(true)}>
            <Plus />
            {t("New idea")}
          </Button>
        ) : null}
        {find && project ? <IdeasButton project={project} name={name} onClose={() => void load()} /> : null}
      </div>

      {writing ? (
        <IdeaForm
          project={project}
          name={name}
          onDone={(written) => {
            setWriting(false)
            if (written) {
              toast.success(t("Idea saved: {{title}}", { title: written.title }))
              void load()
            }
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Status")}>
          {(["all", ...STATUSES] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? "secondary" : "ghost"}
              aria-pressed={status === key}
              data-slot="ideas-filter"
              data-status={key}
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setStatus(key)}
            >
              {key === "all" ? t("All") : words.many[key]}
              <span className="text-muted-foreground tabular-nums" data-slot="ideas-count">
                {key === "all" ? theirs.length : counts[key]}
              </span>
            </Button>
          ))}
        </div>
        <Select value={who} onValueChange={(value) => setWho(value as Who)}>
          <SelectTrigger size="sm" className="h-7 w-auto text-xs" data-slot="ideas-author-filter" aria-label={t("Written by")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Written by anyone")}</SelectItem>
            <SelectItem value="ponos">{t("Written by Ponos")}</SelectItem>
            <SelectItem value="human">{t("Written by us")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {problem && !listed ? (
        <EmptyState robot="error">{problem}</EmptyState>
      ) : !listed ? (
        <Skeleton className="h-24 w-full" />
      ) : shown.length ? (
        <ul className="flex flex-col gap-2" data-slot="ideas-items">
          {shown.map((idea) =>
            editing === idea.id ? (
              <li key={idea.id}>
                <IdeaForm
                  project={project}
                  name={name}
                  idea={idea}
                  onDone={(edited) => {
                    setEditing(null)
                    if (edited) void load()
                  }}
                />
              </li>
            ) : (
              <IdeaCard
                key={idea.id}
                idea={idea}
                status={words.one[idea.status]}
                busy={busy === idea.id}
                onKeep={() => void act(idea, api.keepIdea)}
                onDiscard={() => void act(idea, api.discardIdea)}
                onReopen={() => void act(idea, api.reopenIdea)}
                onTicket={() =>
                  void act(idea, api.ticketIdea, () =>
                    toast.success(
                      idea.kind === "project"
                        ? t("Project created: {{title}}", { title: idea.title })
                        : t("Ticket created: {{title}}", { title: idea.title })
                    )
                  )
                }
                onEdit={() => setEditing(idea.id)}
              />
            )
          )}
        </ul>
      ) : (
        <EmptyState robot="sleep">
          {listed.ideas.length ? t("No idea matches these filters.") : t("No idea yet.")}
        </EmptyState>
      )}
    </div>
  )
}

/* -- one idea ------------------------------------------------------------------ */

function IdeaCard({
  idea,
  status,
  busy,
  onKeep,
  onDiscard,
  onReopen,
  onTicket,
  onEdit,
}: {
  idea: Idea
  status: string
  busy: boolean
  onKeep: () => void
  onDiscard: () => void
  onReopen: () => void
  onTicket: () => void
  onEdit: () => void
}) {
  const t = useT()
  const made = idea.status === "ticket"
  // A ticket is on the board: it is made new again before anything else is decided.
  const gestures: { label: string; slot: string; run: () => void; shown: boolean }[] = [
    { label: t("Keep"), slot: "keep", run: onKeep, shown: idea.status === "proposed" || idea.status === "discarded" },
    { label: t("Throw away"), slot: "discard", run: onDiscard, shown: idea.status === "proposed" || idea.status === "kept" },
    { label: t("Back to new"), slot: "reopen", run: onReopen, shown: idea.status !== "proposed" },
    { label: t("Turn into a ticket"), slot: "ticket", run: onTicket, shown: !made },
  ]
  return (
    <li
      data-slot="ideas-item"
      data-idea={idea.id}
      data-status={idea.status}
      data-author={idea.author.kind}
      className="flex flex-col gap-2 rounded-xl border p-3.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Byline author={idea.author} when={idea.created_at} />
        <span className="flex-1" />
        {idea.kind === "project" ? <Badge variant="default">{t("New project")}</Badge> : null}
        <Chip
          className={cn(
            idea.status === "discarded" && "text-red-600 dark:text-red-400",
            (idea.status === "kept" || made) && "text-green-600 dark:text-green-400"
          )}
        >
          <span data-slot="ideas-status">{status}</span>
        </Chip>
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm leading-snug font-medium", idea.status === "discarded" && "text-muted-foreground")}>
          {idea.title}
        </p>
        {idea.description ? (
          <p className="text-muted-foreground mt-1 line-clamp-4 text-xs leading-relaxed whitespace-pre-line">
            {idea.description}
          </p>
        ) : null}
      </div>
      {idea.edited ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem]" data-slot="ideas-edited">
          <Pencil className="size-3" />
          {t("Edited by {{name}}", { name: idea.edited.name || t("you") })}
          {ago(idea.edited.at) ? ` · ${ago(idea.edited.at)}` : ""}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {gestures
          .filter((gesture) => gesture.shown)
          .map((gesture) => (
            <Button
              key={gesture.slot}
              size="sm"
              variant={gesture.slot === "ticket" ? "outline" : "ghost"}
              className="h-7 px-2.5 text-xs"
              data-slot={`ideas-${gesture.slot}`}
              disabled={busy}
              onClick={gesture.run}
            >
              {gesture.label}
            </Button>
          ))}
        {!made ? (
          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" data-slot="ideas-edit" disabled={busy} onClick={onEdit}>
            {t("Edit")}
          </Button>
        ) : null}
        {made && idea.ticket ? (
          <Link
            to={idea.kind === "project" && idea.created ? projectHref(idea.created) : ticketHref(idea.ticket)}
            className="text-xs underline underline-offset-2"
          >
            {idea.kind === "project" ? t("Open the project") : t("Open the ticket")}
          </Link>
        ) : null}
      </div>
    </li>
  )
}

/** Who wrote it: the mascot for Ponos, the picture or the initials of a person. */
export function Byline({ author, when }: { author: IdeaAuthor; when: string }) {
  const t = useT()
  const name = author.kind === "ponos" ? "Ponos" : author.name || t("you")
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs" data-slot="ideas-author">
      <Avatar author={author} />
      <span className="truncate font-medium">{name}</span>
      {ago(when) ? <span className="text-muted-foreground shrink-0">· {ago(when)}</span> : null}
    </span>
  )
}

function Avatar({ author }: { author: IdeaAuthor }) {
  const [broken, setBroken] = React.useState(false)
  const frame = "bg-muted flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
  if (author.kind === "ponos")
    return (
      <span className={frame} data-slot="ideas-avatar-ponos">
        <Robot state="idle" size={18} still />
      </span>
    )
  if (author.avatar && !broken)
    return (
      <img
        src={author.avatar}
        alt=""
        className={cn(frame, "object-cover")}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")
  return (
    <span className={cn(frame, "text-[0.6rem] font-semibold")} aria-hidden="true">
      {initials || "?"}
    </span>
  )
}

/* -- writing one --------------------------------------------------------------- */

/** Radix cannot hold an empty value, and "the workspace" is a value here. */
const WORKSPACE = "__workspace__"

/** A title, a few lines, and the project — the one whose page this is, unless changed. */
function IdeaForm({
  project,
  name,
  idea,
  onDone,
}: {
  project: string
  name: string
  /** The idea being reworded; none for a new one. */
  idea?: Idea
  onDone: (saved: Idea | null) => void
}) {
  const t = useT()
  const [title, setTitle] = React.useState(idea?.title ?? "")
  const [description, setDescription] = React.useState(idea?.description ?? "")
  const [where, setWhere] = React.useState(project || WORKSPACE)
  const [kind, setKind] = React.useState<Idea["kind"]>("ticket")
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = React.useState(false)
  const slot = idea ? `idea-${idea.id}` : "idea-new"

  React.useEffect(() => {
    if (idea) return
    projectsOnce()
      .then((read) =>
        setProjects(
          read.projects
            .filter((row) => isAPage(row.id))
            .map((row) => ({ id: row.id.replace(/-/g, ""), name: row.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => undefined)
  }, [idea])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const saved = idea
        ? await api.editIdea(idea.id, { title, description })
        : await api.writeIdea({
            title,
            description,
            project: where === WORKSPACE ? "" : where,
            kind: where === WORKSPACE ? kind : "ticket",
          })
      onDone(saved)
    } catch (error) {
      toast.error(why(error))
    } finally {
      setBusy(false)
    }
  }

  // The page's own project is in the list even before the list has been read.
  const choices = projects.some((row) => row.id === project) || !project
    ? projects
    : [{ id: project, name: name || project }, ...projects]

  return (
    <form onSubmit={submit} data-slot="ideas-form" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${slot}-title`}>{t("Title")}</Label>
        <Input
          id={`${slot}-title`}
          value={title}
          autoFocus
          autoComplete="off"
          required
          maxLength={90}
          placeholder={t("The idea, in one line.")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${slot}-description`}>{t("Description")}</Label>
        <Textarea
          id={`${slot}-description`}
          value={description}
          rows={3}
          placeholder={t("Why it is worth doing.")}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {idea ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${slot}-project`}>{t("Project")}</Label>
            <Select value={where} onValueChange={setWhere}>
              <SelectTrigger id={`${slot}-project`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WORKSPACE}>{t("Workspace")}</SelectItem>
                {choices.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {where === WORKSPACE ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${slot}-kind`}>{t("Type")}</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as Idea["kind"])}>
                <SelectTrigger id={`${slot}-kind`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticket">{t("Ticket")}</SelectItem>
                  <SelectItem value="project">{t("New project")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          {idea ? t("Save") : t("Create")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone(null)}>
          {t("Cancel")}
        </Button>
      </div>
    </form>
  )
}
