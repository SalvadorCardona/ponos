import * as React from "react"
import { Check, Clock, Copy, FileText, Folder, FolderGit2 } from "lucide-react"
import { ActionList, type FormInterface } from "react-data-form"
import {
  Link,
  ListPagination,
  cardViewOptionFactory,
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
  tableViewOptionFactory,
  useCurrentViewResourceContext,
  type ListComponentPropsInterface,
} from "react-resource-view"

import { EmptyState } from "@/components/console/empty-state"
import { Eyebrow } from "@/components/console/frame"
import { MarkdownInputController } from "@/components/console/markdown-editor"
import { Pagination } from "@/components/console/pagination"
import { ProjectThumb } from "@/components/console/project-picture"
import { ProjectActions, ProjectPage, ProjectTitle } from "@/components/console/project-page"
import { Chip, LABEL, SEED, ago } from "@/components/console/ticket-bits"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useTicketTallies, type Tally } from "@/lib/board-store"
import { counted, t } from "@/lib/i18n"
import { repositoryName, shortPath } from "@/lib/places"
import { SCOPE, layoutOf, useLayoutInTheAddress } from "@/lib/resource-view"
import { useRoute } from "@/lib/router"
import type { Project, Projects } from "@/lib/types"
import { cn } from "@/lib/utils"
import { settingsHref } from "@/resources/settings"

/* The projects, declared once for react-resource-view.
 *
 * They were a pane that only read: a list of what this installation knows of,
 * and a link out to Notion for anything you wanted to change. But a project is
 * where every ticket of that project starts from — its repository, and the
 * brief that gives an answer your voice rather than nobody's — so it is worth
 * opening, and worth changing without leaving the console.
 *
 * Which makes it a resource like the board: a list, a page per record, a form
 * that writes it back. It is drawn in two layouts, and the pair is the point —
 * **cards** to look at a workspace you half remember, since a project is
 * recognised by its name and its shape rather than read; **a table** to compare
 * them, because "which of these eleven has no repository" is a question a grid
 * of cards will not answer. The package holds both and the address carries
 * which one you are on, so the layout you work in is the one that comes back.
 *
 * Three sources still, as the pane had them: the board's own database, the
 * `[projects]` table of the configuration, and where the repository turned out
 * to be. A project the file names and the board has never heard of has no page
 * to open — it is a line in `config.toml` — so it is addressed here by its name
 * under a `config:` prefix, and its page says where it is really edited. Every
 * project is clickable; only the ones that are a page are written from here.
 */

export const PROJECTS = "projects"

/** A project as the views hold it: the row, an IRI, and the two cells a table reads. */
export type ProjectItem = Project & {
  "@id": string
  "@type": string
  /** The brief, on the page of the ones that have a page. */
  content?: string
  /** `kind`, in the words the console says it in. */
  work: string
  /** The path this machine finds it at, whoever declared it. */
  where: string
}

/** What the console writes about a project: the page's three columns, and the brief. */
export interface ProjectWrite {
  id?: string
  name?: string
  repository?: string
  path?: string
  content?: string
}

/** A project the configuration names and the board has never heard of. */
const FILE = "config:"

/** How a row is addressed: its page, or its name where there is no page. */
export const idOf = (project: Project): string => project.id || `${FILE}${project.name}`

/** Whether that address is a page — the only kind this console writes to. */
export const isAPage = (id: string): boolean => Boolean(id) && !id.startsWith(FILE)

const item = (project: Project & { content?: string }): ProjectItem => ({
  ...project,
  id: idOf(project),
  "@id": `/api/projects/${idOf(project)}`,
  "@type": PROJECTS,
  work: project.kind === "code" ? t("code work") : t("document work"),
  where: project.located ?? (project.configured || project.path || ""),
})

/* -- what the list last read ---------------------------------------------- */

/* The payload says two things a row does not: where repositories are looked
 * for, and what a project the file alone names is. Both are read outside the
 * row that carries them — the foot of the list, and the page of a project with
 * no page — so what the server last said is kept here, the way the settings
 * keep their description. */

let drawn: Projects | null = null
const listeners = new Set<() => void>()

function publish(fresh: Projects) {
  drawn = fresh
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** What the list last read, redrawn with it. */
export function useProjects(): Projects | null {
  return React.useSyncExternalStore(subscribe, () => drawn)
}

let asked: Promise<Projects> | null = null

/** The list, for a page that only wants the names: what was last read, or one
 * request shared by whoever asks while it is out. */
export function projectsOnce(): Promise<Projects> {
  return drawn ? Promise.resolve(drawn) : readAgain()
}

/* The list, read again — but once for everybody who asks while it is out.
 *
 * A save is followed by one reread per card: each card's way into the form is
 * the package's button, and each of those refreshes the list when the resource
 * changes. Eleven projects would be eleven reads of the same board in the same
 * instant; shared, they are one. */
function readAgain(): Promise<Projects> {
  asked ??= api
    .projects()
    .then((fresh) => {
      publish(fresh)
      return fresh
    })
    .finally(() => {
      asked = null
    })
  return asked
}

/* What the tickets of a project come to, counted on the board the console
 * holds rather than asked of the server with the list. The list is drawn as
 * soon as it is read; until the first board arrives, the count is a skeleton
 * in its place. */
const NONE: Tally = { count: 0, ready: 0, running: 0, review: 0, edited: "" }

export function useTally(name: string): Tally | null {
  const tallies = useTicketTallies()
  return tallies ? (tallies.get(name) ?? NONE) : null
}

/** How many tickets point at a project. */
export function useTicketCount(name: string): number | null {
  return useTally(name)?.count ?? null
}

/* Why the last project read failed, for the page to say rather than swallow.
 *
 * What a view component is handed is `error: true` and nothing else, so the
 * page could only say that something went wrong. On 18 September 2026 that
 * sentence was the whole of what a browser showed while the server was
 * answering `no such route: /api/projects/<id>` — a console left running the
 * code of the day before, serving the page built that morning. The server's own
 * words are what tell those apart from a project that is simply gone.
 */
let refusal = ""

/** What the server said the last time a project could not be read. */
export const whyNotRead = (): string => refusal

/** One project, from wherever it is held: its page, or the line that names it. */
async function one(id: string): Promise<ProjectItem> {
  if (isAPage(id)) return item(await api.project(id))
  // No page to read: the row is a line in the file, and the list is where it
  // was read from. Read again rather than taken from what is held, so a link
  // opened cold — a tab that has never listed anything — answers too.
  const read = await api.projects()
  publish(read)
  const found = read.projects.find((project) => idOf(project) === id)
  if (!found) throw new Error(t("No project called “{{name}}”.", { name: id.slice(FILE.length) }))
  return item(found)
}

/* -- the forms ------------------------------------------------------------ */

/* What a project page holds, as a form.
 *
 * A label and the button are translated by the package as it draws them; the
 * sentence under a field and the greyed example in it are not — they are used
 * as they are given. Those are read from the dictionary as the field is drawn,
 * which is what the getters are for: the declaration is built once, and the
 * language can change after it.
 */
const editForm: FormInterface = {
  label: { submit: "Save" },
  inputs: {
    name: {
      label: "Project",
      get description() {
        return t("What the board calls it. A ticket points at this page, not at this name.")
      },
      required: true,
    },
    repository: {
      label: "Repository",
      get description() {
        return t("owner/repo, or the clone URL. Empty, and its tickets come back as a document.")
      },
      placeholder: "SalvadorCardona/ponos",
    },
    path: {
      label: "Where it is",
      get description() {
        return t(
          "Only needed where the repository cannot be found on its own. Worktrees are made beside it, never in it."
        )
      },
      get placeholder() {
        return t("~/workspace/that-repository")
      },
    },
    content: {
      label: "The brief",
      get description() {
        return t(
          "The audience, the voice, the conventions, the things never to do. Every ticket of this project is told it before it is told the ticket."
        )
      },
      // Shown in the empty editor: a page of standing instructions, which is
      // not the same thing as a message.
      get placeholder() {
        return t("Write it as you would brief somebody joining the project.")
      },
      controller: MarkdownInputController,
    },
  },
}

/* Over the form opened anywhere but on its page — at its own address, say — the
 * way to that page: the pictures, the brief as it reads and the way to Notion
 * are there and nowhere else. Not over the form opened from that page, which
 * would be a link to where you are.
 *
 * The attribute is how the stylesheet knows the drawer holds a project's
 * form, to give it the whole screen on a phone: see `index.css`. */
function ToThePage() {
  const context = useCurrentViewResourceContext()
  const { params } = useRoute()
  const id = String(context.id ?? "")
  const here = params.resourceAction === ActionList.read && String(params.id ?? "") === id
  return (
    <div data-project-form>
      {id && !here ? (
        // Clear of the drawer's close button, drawn over the top right corner.
        <p className="text-muted-foreground mb-4 pr-10 text-xs">
          <Link
            to={generateLinkByResource({ resource: context.resource, resourceAction: ActionList.read, id })}
            className="underline underline-offset-2"
          >
            {t("Open the project's page")}
          </Link>{" "}
          — {t("its pictures, the brief as it reads, and the way to Notion.")}
        </p>
      ) : null}
    </div>
  )
}

/* -- one card, one row --------------------------------------------------- */

/* A project in the list is one link, to its page.
 *
 * It was a card with a name to click and a button under it to open, then a
 * name that opened the form in a drawer — and between the two, a card most of
 * which did nothing. The whole card is now an `<a>` to the project's page, so
 * a click anywhere goes there, a middle click or Ctrl+click opens it in a
 * tab, and Tab then Enter reaches it from the keyboard. The form is the page's
 * edit button away.
 *
 * Which leaves no room for a link inside it: the repository is said, not
 * linked — the page links it. The cards are drawn here rather than in the
 * package's frame, which adds a row of buttons under each and lets a card
 * stop at its own height; these fill the row they are in, and keep what
 * varies (a path, a status) to a line that is there or not. */

/** The two kinds of work, said as a badge: code in the accent, writing quieter. */
function KindBadge({ project }: { project: ProjectItem }) {
  const code = project.kind === "code"
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-1.5 py-0 text-[0.65rem] font-medium",
        code ? "border-primary/40 text-primary" : "text-muted-foreground"
      )}
    >
      {code ? t("Code") : t("Writing")}
    </Badge>
  )
}

/* GitHub's mark, which lucide no longer draws: a repository on GitHub is
 * recognised by it before its name is read. */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

/** Where the work happens, in one line each: the repository, and the path only where one is set. */
function Whereabouts({ project }: { project: ProjectItem }) {
  const repository = repositoryName(project.repository ?? "")
  return (
    <div className="text-muted-foreground flex min-w-0 flex-col gap-1 text-xs">
      {repository ? (
        <span className="flex min-w-0 items-center gap-1.5" title={project.repository}>
          {repository.href.startsWith("https://github.com/") ? (
            <GitHubMark className="size-3.5 shrink-0" />
          ) : (
            <FolderGit2 className="size-3.5 shrink-0" />
          )}
          <span className="truncate font-mono">{repository.name}</span>
        </span>
      ) : project.kind !== "code" ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{t("Produces documents")}</span>
        </span>
      ) : null}
      {project.where ? (
        <span className="flex min-w-0 items-center gap-1.5" title={project.where}>
          <Folder className="size-3.5 shrink-0" />
          <span className="truncate font-mono">{shortPath(project.where)}</span>
        </span>
      ) : null}
    </div>
  )
}

/** The three columns a card counts, in the few words it has room for. */
const STATUS = {
  ready: "{{count}} ready",
  running: "{{count}} running",
  review: "{{count}} in review",
} as const

/** How many tickets, always; and, where there are any, how many wait, run and wait for a review. */
function TicketTally({ project, withStatuses = true }: { project: ProjectItem; withStatuses?: boolean }) {
  const tally = useTally(project.name)
  if (!tally) return <Skeleton className="h-3 w-16" />
  return (
    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-3 text-xs tabular-nums">
      <span className="text-foreground/80 whitespace-nowrap">
        {counted(tally.count, "{{count}} ticket", "{{count}} tickets")}
      </span>
      {withStatuses
        ? (["ready", "running", "review"] as const).map((key) =>
            tally[key] ? (
              <span key={key} className="inline-flex items-center gap-1 whitespace-nowrap" title={t(LABEL[key])}>
                <span className={cn("size-1.5 rounded-full", SEED[key])} />
                {t(STATUS[key], { count: String(tally[key]) })}
              </span>
            ) : null
          )
        : null}
    </span>
  )
}

/** When the last of its tickets moved, said the way a card says it. */
function LastActivity({ project }: { project: ProjectItem }) {
  const edited = useTally(project.name)?.edited ?? ""
  const said = edited ? ago(edited) : ""
  if (!said) return null
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs whitespace-nowrap" title={edited}>
      <Clock className="size-3" />
      {said}
    </span>
  )
}

/** What the hover and the keyboard's focus look like on a link that is a whole card or row. */
const REACHABLE =
  "outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring"

function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <Link
      to={projectHref(project.id)}
      data-project-card
      className={cn(
        "group bg-card flex h-full min-w-0 flex-col gap-3 rounded-2xl border p-4",
        "hover:border-primary/50 hover:bg-accent/40",
        REACHABLE
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProjectThumb project={project} className="size-10" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="w-full truncate text-[0.95rem] leading-snug font-semibold" title={project.name}>
            {project.name}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            <KindBadge project={project} />
            {project.source === "config" ? (
              <Chip className="rounded-full px-1.5 py-0 text-[0.65rem]">{t("from the configuration")}</Chip>
            ) : null}
          </span>
        </div>
      </div>

      <Whereabouts project={project} />

      <div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-t pt-3">
        <TicketTally project={project} />
        <LastActivity project={project} />
      </div>
    </Link>
  )
}

/** The card layout: every card of a row as tall as the tallest, and nothing under them. */
function ProjectCards({ rows = [] }: ListComponentPropsInterface) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const project = row.data as ProjectItem | undefined
          return project ? <ProjectCard key={project.id} project={project} /> : null
        })}
      </div>
      <div className="mt-5">
        <ListPagination />
      </div>
    </div>
  )
}

/** The columns of a row, shared by the heading and every row so they line up. */
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 md:grid-cols-[minmax(0,2fr)_6rem_minmax(0,1.5fr)_minmax(0,1.5fr)_7rem]"

/* The table layout: to compare projects rather than to look at them. Each row
 * is a link too, for the same reasons as a card — which a `<table>` cannot
 * have, so the rows are a list laid out as one. */
function ProjectRows({ rows = [] }: ListComponentPropsInterface) {
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-md border">
        <div className={cn(COLUMNS, "text-muted-foreground border-b py-2 text-xs font-medium")} aria-hidden>
          <span>{t("Project")}</span>
          <span className="hidden md:block">{t("Kind")}</span>
          <span className="hidden md:block">{t("Repository")}</span>
          <span className="hidden md:block">{t("On this machine")}</span>
          <span className="text-right">{t("Tickets")}</span>
        </div>
        <ul>
          {rows.map((row) => {
            const project = row.data as ProjectItem | undefined
            if (!project) return null
            const repository = repositoryName(project.repository ?? "")
            return (
              <li key={project.id} className="border-b last:border-b-0">
                <Link
                  to={projectHref(project.id)}
                  data-project-row
                  className={cn(COLUMNS, "hover:bg-accent/40 py-2.5 text-sm", REACHABLE)}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ProjectThumb project={project} className="size-8 rounded-md" />
                    <span className="truncate font-medium">{project.name}</span>
                  </span>
                  <span className="hidden md:block">
                    <KindBadge project={project} />
                  </span>
                  <span className="text-muted-foreground hidden truncate font-mono text-xs md:block">
                    {repository ? repository.name : "—"}
                  </span>
                  <span
                    className="text-muted-foreground hidden truncate font-mono text-xs md:block"
                    title={project.where || undefined}
                  >
                    {project.where ? shortPath(project.where) : "—"}
                  </span>
                  <span className="text-right">
                    <TicketTally project={project} withStatuses={false} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-5">
        <ListPagination />
      </div>
    </div>
  )
}

/** A project's repository, by its owner and name, and a link to it where it has an address. */
export function Repository({ declared }: { declared?: string }) {
  const repository = repositoryName(declared ?? "")
  if (!repository) return <span className="font-mono text-xs">—</span>
  const name = (
    <span className="font-mono text-xs" title={declared}>
      {repository.name}
    </span>
  )
  if (!repository.href) return name
  return (
    <a href={repository.href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
      {name}
    </a>
  )
}

/** Where this machine finds a project: whole, or cut from the left with the whole in its title.
 * Nowhere is said in words, and which words depends on whether it was ever to be cloned. */
export function Where({ path, kind }: { path?: string; kind?: string }) {
  if (!path)
    return (
      <span className="text-muted-foreground text-sm">
        {kind === "document" ? t("No repository: this project is a document") : t("Not cloned on this machine yet")}
      </span>
    )
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 font-mono text-xs break-all" title={path}>
        {path}
      </span>
      <CopyPath path={path} />
    </span>
  )
}

/** The path, on the clipboard. */
function CopyPath({ path }: { path: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="shrink-0"
      aria-label={t("Copy the path")}
      onClick={() => {
        void navigator.clipboard?.writeText(path).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}

/* -- what sits around the list -------------------------------------------- */

/** How many of them are worked on in git, said where the list opens. */
function ProjectsTop() {
  const read = useProjects()
  useLayoutInTheAddress(PROJECTS)
  if (!read) return null
  const code = read.projects.filter((project) => project.kind === "code").length
  const counted = { count: String(code), total: String(read.projects.length) }
  return (
    <p className="text-muted-foreground mb-2 inline-flex items-center gap-1.5 font-mono text-[0.7rem]">
      <FolderGit2 className="size-3.5" />
      {read.projects.length
        ? code > 1
          ? t("{{count}} of {{total}} projects have a repository", counted)
          : t("{{count}} of {{total}} projects has a repository", counted)
        : t("nothing yet")}
    </p>
  )
}

/** Where a repository is looked for, which is the answer to half of "why was it not found". */
function ProjectsFoot() {
  const read = useProjects()
  if (!read) return null
  return (
    <p className="text-muted-foreground mt-4 text-xs">
      <Eyebrow>runner.workspace_root</Eyebrow> —{" "}
      <span className="font-mono">{read.workspace_root}</span>{" "}
      {t("is where a repository is looked for, and cloned into when it is nowhere.")}
    </p>
  )
}

/** The list's own empty line: a board with no projects is not a broken board.
 *
 * With the one gesture this console has for it: a project is a page on the
 * board, or a name mapped to a path in the settings — and the second is here. */
function NoProject() {
  return (
    <EmptyState
      robot="sleep"
      action={
        <Link to={settingsHref("projects")} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("Map a project to a folder")}
        </Link>
      }
    >
      {t("No project yet — a ticket without one comes back as a document.")}
    </EmptyState>
  )
}

/* -- the declaration ------------------------------------------------------ */

export const projects = createViewResource<ProjectItem, ProjectItem, ProjectWrite>(PROJECTS, {
  name: "Projects",
  scope: SCOPE,
  path: "/api/projects",
  icon: FolderGit2,
  canList: true,
  canRead: true,
  canCreate: false,
  // A project page is made in Notion, or by a line in `config.toml`; what is
  // written from here is what an existing one says.
  canUpdate: true,
  canDelete: false,

  getCollection: async () => {
    const read = await readAgain()
    return {
      data: createResourceCollection({
        id: "/api/projects",
        items: read.projects.map((project) => item(project)),
      }),
    } as never
  },
  getItem: async ({ id }) => {
    const wanted = String(id)
    try {
      const data = await one(wanted)
      refusal = ""
      return { data }
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error)
      throw error
    }
  },
  updateItem: async (patch) => {
    const id = String(patch.id ?? "")
    if (!isAPage(id))
      throw new Error(
        t("This project is a line in config.toml; it is changed in the settings.")
      )
    const written = await api.saveProject(id, {
      name: patch.name ?? "",
      repository: patch.repository ?? "",
      path: patch.path ?? "",
      content: patch.content ?? "",
    })
    // The list is drawn from what was last read, and a rename that only showed
    // on the page you renamed it on would be a rename made twice.
    await api.projects().then(publish)
    return { data: item(written) }
  },
  createItem: async () => {
    throw new Error("a project page is made on the board, not from the console")
  },
  removeItem: async () => {
    throw new Error("a project is not deleted from the console; its tickets point at it")
  },

  view: {
    /* The two layouts. A variant's name is drawn as it is given and its id is
     * slugged from it where none is said, so the id is said here and the name
     * read from the dictionary as the tab is drawn: the address stays `cards`
     * in every language. */
    viewVariants: [
      {
        ...cardViewOptionFactory({ id: "cards", listComponent: ProjectCards }),
        get name() {
          return t("cards")
        },
      },
      {
        ...tableViewOptionFactory({ id: "table", listComponent: ProjectRows }),
        get name() {
          return t("table")
        },
      },
    ],
  },
  views: {
    [ActionList.list]: {
      name: "Projects",
      description:
        "What the tickets are about: where the work happens, and what conventions hold there. One with no repository is not a mistake — its tickets come back as a document.",
      // A card, or a row, is a link to the project's page: no button under it.
      behavior: { rowActions: [] },
      components: {
        top: ProjectsTop,
        bottom: ProjectsFoot,
        noResult: NoProject,
        pagination: Pagination,
      },
    },
    [ActionList.read]: {
      name: "Project",
      viewComponent: ProjectPage,
      // The layout's header, with what only a project has in it: the page has
      // no header of its own.
      components: { title: ProjectTitle, actions: ProjectActions },
    },
    [ActionList.update]: {
      name: "Project",
      // What the button that opens this form says. Left to the package it is
      // the action's own name, which reads as a lower-case "update".
      label: { update: "Edit" },
      form: editForm,
      // Against the edge and at full height: the brief is the field that is
      // actually written here, and it is a page of text.
      behavior: { openIn: "drawer" },
      components: { top: ToThePage },
    },
  },
})

/** Where the projects are, in the layout they were last worked in. */
export const projectsHref = () =>
  generateLinkByResource({
    resource: projects,
    resourceAction: ActionList.list,
    viewVariantId: layoutOf(PROJECTS),
  })

/** Where one project is. */
export const projectHref = (id: string) =>
  generateLinkByResource({ resource: projects, resourceAction: ActionList.read, id })
