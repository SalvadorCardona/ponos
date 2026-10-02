import * as React from "react"
import { FolderGit2 } from "lucide-react"
import {
  ActionList,
  useFormContext,
  type FormInterface,
  type InputControllerComponentInterface,
} from "react-data-form"
import {
  Link,
  ResourceViewButton,
  cardViewOptionFactory,
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
  tableViewOptionFactory,
  useCurrentViewResourceContext,
  type RowComponentPropsInterface,
} from "react-resource-view"

import { EmptyState } from "@/components/console/empty-state"
import { Eyebrow, Fact, Facts } from "@/components/console/frame"
import { MarkdownInputController } from "@/components/console/markdown-editor"
import { Pagination } from "@/components/console/pagination"
import { ProjectThumb } from "@/components/console/project-picture"
import { ProjectActions, ProjectPage, ProjectTitle } from "@/components/console/project-page"
import { Chip } from "@/components/console/ticket-bits"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useTicketCounts } from "@/lib/board-store"
import { counted, t } from "@/lib/i18n"
import { repositoryName, shortPath } from "@/lib/places"
import { SCOPE, layoutOf, useLayoutInTheAddress } from "@/lib/resource-view"
import { useRoute } from "@/lib/router"
import type { Project, Projects } from "@/lib/types"
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
  where: project.configured || project.path || "",
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

/* How many tickets point at a project, counted on the board the console holds
 * rather than asked of the server with the list. The list is drawn as soon as
 * it is read; until the first board arrives, the count is a skeleton in its
 * place. */
export function useTicketCount(name: string): number | null {
  const counts = useTicketCounts()
  return counts ? (counts.get(name) ?? 0) : null
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

/** The count in the table: the row's name is what it is counted by. */
const TicketsCell: InputControllerComponentInterface = () => {
  const { form } = useFormContext()
  const count = useTicketCount(String((form?.data as { name?: string } | undefined)?.name ?? ""))
  if (count === null) return <Skeleton className="h-3 w-6" />
  return <span className="tabular-nums">{count}</span>
}

/* -- the way in ----------------------------------------------------------- */

/* What a click on a project opens: its form, straight away, in a drawer over
 * the list.
 *
 * It used to open the project's page, and the form was one more click from
 * there — the edit button in the page's header. The page is still there, for
 * what only it shows (the pictures, the brief as it reads, the way to Notion),
 * but it is no longer on the way to changing a project: the list is where a
 * project is chosen, so it is where it is changed.
 *
 * The drawer is the package's, the one `views.update` already opens in: its
 * button, handed what to draw instead of a button, opens it in place rather
 * than following the link — and, closed by a save, has the list read again.
 * The link it wraps is the full-page form, which is what a middle click or a
 * copied address gets.
 *
 * A project the configuration alone names has no page to write to, so there
 * is no form to open: it goes where it always went, the page that says where
 * it is changed.
 */
function OpenProject({ project, children }: { project: ProjectItem; children: React.ReactNode }) {
  const { resource } = useCurrentViewResourceContext()
  if (!isAPage(project.id))
    return (
      <Link to={generateLinkByResource({ resource, resourceAction: ActionList.read, id: project.id })}>
        {children}
      </Link>
    )
  // The id alone, not the row: a row has no brief, and the form would open
  // with that field empty. Given nothing but the id, the drawer reads it.
  return (
    <ResourceViewButton action={ActionList.update} resource={resource} id={project.id}>
      {children}
    </ResourceViewButton>
  )
}

/** The repository in the table, said and linked as on a card. */
const RepositoryCell: InputControllerComponentInterface = () => {
  const { form } = useFormContext()
  return <Repository declared={(form?.data as ProjectItem | undefined)?.repository} />
}

/** The name in the table, behind the project's thumbnail — and the way into its form. */
const NameCell: InputControllerComponentInterface = () => {
  const { form } = useFormContext()
  const project = form?.data as ProjectItem | undefined
  // Not every form this is drawn in holds a row: nothing to open without one.
  if (!project?.id) return null
  return (
    <OpenProject project={project}>
      <span className="inline-flex min-w-0 items-center gap-2.5 hover:underline">
        <ProjectThumb project={project} className="size-8 rounded-md" />
        <span className="truncate">{project.name}</span>
      </span>
    </OpenProject>
  )
}

/* Over the form, the page it no longer goes through: the pictures, the brief
 * as it reads and the way to Notion are there and nowhere else. Not over the
 * form opened from that page, which would be a link to where you are.
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

/** The columns of the table layout. The headings go through the dictionary on their way to the page. */
const rowForm: FormInterface = {
  inputs: {
    name: { label: "Project", readonly: true, controller: NameCell },
    work: { label: "Kind", readonly: true },
    repository: { label: "Repository", readonly: true, controller: RepositoryCell },
    where: { label: "On this machine", readonly: true },
    tickets: { label: "Tickets", readonly: true, controller: TicketsCell },
  },
}

/* -- one card ------------------------------------------------------------- */

/* How a project is drawn in the card layout. The whole card is the way into
 * the project's form — see `OpenProject` — and it says the same three things
 * the pane's rows said: what kind of work it is, what it declares, and where
 * that declaration comes from.
 *
 * The frame, the padding and the row of actions under it are the package's:
 * `cardViewOptionFactory` draws a record in a card and hands the inside of it
 * to this.
 */
function ProjectCard({ row }: RowComponentPropsInterface) {
  const project = row?.data as ProjectItem | undefined
  const count = useTicketCount(project?.name ?? "")
  if (!project) return null

  return (
    // The card is the way into the form, but its repository is a link of its
    // own, and a link is not drawn inside another: the name's link is stretched
    // over the whole card instead, and the repository sits above it.
    <div className="group relative flex min-w-0 flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <Eyebrow>{project.work}</Eyebrow>
        <span className="flex-1" />
        {count === null ? (
          <Skeleton className="h-3 w-14" />
        ) : count ? (
          <span className="text-muted-foreground font-mono text-[0.7rem] tabular-nums">
            {counted(count, "{{count}} ticket", "{{count}} tickets")}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <ProjectThumb project={project} />
        <OpenProject project={project}>
          <span className="min-w-0 text-[0.95rem] leading-snug font-semibold [overflow-wrap:anywhere] group-hover:underline after:absolute after:inset-0">
            {project.name}
          </span>
        </OpenProject>
      </div>

      {project.repository || project.where ? (
        // One fact under the other: side by side, a third of a screen each,
        // "on this machine" took two lines where "repository" took one and the
        // two values no longer lined up.
        <Facts className="grid-cols-1 [&>*:nth-child(even)]:border-l-0 [&>*:nth-child(n+2)]:border-t">
          <Fact label={t("repository")}>
            <Repository declared={project.repository} />
          </Fact>
          <Fact label={t("on this machine")}>
            <Where path={project.where} short />
          </Fact>
        </Facts>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t(
            "Nothing declares a repository, so its tickets produce a document rather than a pull request."
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {project.source === "config" ? <Chip>{t("from the configuration")}</Chip> : null}
        {project.configured && project.source === "board" ? (
          <Chip>{t("path set in the configuration")}</Chip>
        ) : null}
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
    <a
      href={repository.href}
      target="_blank"
      rel="noreferrer"
      // Above the card's own link, which is stretched over everything else.
      className="relative z-10 underline-offset-2 hover:underline"
    >
      {name}
    </a>
  )
}

/** Where this machine finds a project: whole, or cut from the left with the whole in its title. */
export function Where({ path, short = false }: { path?: string; short?: boolean }) {
  if (!path) return <span className="font-mono text-xs">{t("wherever the clone is")}</span>
  return (
    <span className="font-mono text-xs" title={path}>
      {short ? shortPath(path) : path}
    </span>
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
    form: rowForm,
    /* The two layouts. A variant's name is drawn as it is given and its id is
     * slugged from it where none is said, so the id is said here and the name
     * read from the dictionary as the tab is drawn: the address stays `cards`
     * in every language. */
    viewVariants: [
      {
        ...cardViewOptionFactory({ id: "cards", rowComponent: ProjectCard, grid: 3 }),
        get name() {
          return t("cards")
        },
      },
      {
        ...tableViewOptionFactory({ id: "table", behavior: { rowActions: [ActionList.read] } }),
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
      // A click on a project opens its form; the button under a card, and
      // beside a row, is the way to its page.
      behavior: { rowActions: [ActionList.read] },
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
