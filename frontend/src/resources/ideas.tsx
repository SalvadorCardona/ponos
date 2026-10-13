import * as React from "react"
import { Lightbulb } from "lucide-react"
import {
  ActionList,
  SelectInputController,
  TextAreaInputController,
  type FormInterface,
  type InputControllerComponentInterface,
} from "react-data-form"
import {
  cardViewOptionFactory,
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
  tableViewOptionFactory,
  useCurrentViewResourceContext,
  type ResourceOptionInterface,
} from "react-resource-view"
import { toast } from "sonner"

import { IdeaCards, IdeaPage, IdeaRows, NoIdea, useStatusWords } from "@/components/console/idea-cards"
import { IdeasButton } from "@/components/console/ideas-deck"
import { Pagination } from "@/components/console/pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, why } from "@/lib/api"
import { t } from "@/lib/i18n"
import { AUTHORS, STATUSES, WORKSPACE, bare, counts, keeps, scopes } from "@/lib/idea-search"
import { SCOPE, layoutOf, useLayoutInTheAddress } from "@/lib/resource-view"
import type { Idea } from "@/lib/types"
import { isAPage, projectsOnce, useProjects } from "@/resources/projects"

/* The ideas, declared once for react-resource-view.
 *
 * They were a pane of their own — a list drawn by hand, its filters held in the
 * component's state, a form written beside it — while every other list of the
 * console is the package's. So an idea is a resource like a project: a list in
 * two layouts, a page that reads one, and the package's forms to write one or
 * reword it. The filters are the ones the pane had, now the package's own
 * filter bar, which writes them in the address: a list filtered on Website's
 * kept ideas is a link that opens on Website's kept ideas.
 *
 * Two layouts, as the projects have. **Cards** to go through them, each with
 * the one gesture it is waiting for — turning it into a ticket, or opening the
 * ticket it became — and the others in a menu; **a table** to compare a long
 * list of them in one screen.
 *
 * Two declarations, as the tickets have. `ideas` is the page of the menu, every
 * scope at once with a project filter; `scopedIdeas` is the same list under a
 * project's page and in the swipe's second tab, where the scope is given by
 * whoever draws it (see `ScopedIdeas`) and the bar has no project to choose.
 *
 * The rows are every idea the server holds, read once for whoever asks while
 * the request is out, and filtered here: the counts beside the statuses need
 * the ideas the status filter leaves out, and a page of ideas is a few dozen
 * rows of the local database.
 */

export const IDEAS = "ideas"
export const SCOPED_IDEAS = "scoped-ideas"

/** An idea as the views hold it: the row, its id as the address writes it, and an IRI. */
export type IdeaItem = Omit<Idea, "id"> & { id: string; "@id": string; "@type": string }

/** What the forms write: a new idea, or the words of one. */
export interface IdeaWrite {
  id?: number | string
  title?: string
  description?: string
  project?: string
  kind?: Idea["kind"]
}

const item = (idea: Idea): IdeaItem => ({
  ...idea,
  id: String(idea.id),
  "@id": `/api/ideas/${idea.id}`,
  "@type": IDEAS,
})

/** The row the views hold, as the API reads it again. */
export const ideaOf = (row: IdeaItem): Idea => ({ ...row, id: Number(row.id) })

/* -- what the list last read ---------------------------------------------- */

/* Kept outside the rows the package holds, because the filter bar reads it
 * too: the counts beside the statuses, and the projects the project filter
 * offers, are about every idea, not the ones the filters left. The refusal is
 * kept with it, for the page to say why nothing was read. */
interface LastRead {
  ideas: Idea[] | null
  problem: string
}

let read: LastRead = { ideas: null, problem: "" }
const listeners = new Set<() => void>()

function publish(fresh: LastRead) {
  read = fresh
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** What the list last read, redrawn with it. */
export function useIdeas(): LastRead {
  return React.useSyncExternalStore(subscribe, () => read)
}

let asked: Promise<Idea[]> | null = null

/* Every idea, read again — once for everybody who asks while it is out: a
 * gesture is followed by one reread per card, each card's way into a form being
 * the package's button, which refreshes the list when the resource changes. */
function readAgain(): Promise<Idea[]> {
  asked ??= api
    .allIdeas("", true)
    .then((fresh) => {
      publish({ ideas: fresh.ideas, problem: "" })
      return fresh.ideas
    })
    .catch((error) => {
      publish({ ideas: read.ideas, problem: why(error) })
      throw error
    })
    .finally(() => {
      asked = null
    })
  return asked
}

/* Something changed an idea outside the package's forms — a gesture on a card,
 * a decision in the swipe. Said on both declarations, the way the package says
 * it after a form: a window opened on an idea closes over what it changed. */
export function ideasChanged(idea?: Idea) {
  for (const resource of [ideas, scopedIdeas])
    resource.onChange.publish({ data: (idea ? item(idea) : {}) as IdeaItem, action: ActionList.update })
}

/* Every list drawn, read again after a change — with the filters it shows now.
 *
 * The package's buttons read their list again too, but with the list as it was
 * when the button was drawn: a card drawn under "New" and kept under "Kept"
 * would bring the new ones back under the "Kept" button. So each list drawn
 * says how to read it as it stands, and is asked to once the package's own
 * rereads are on their way — the last one asked for is the one kept. To go once
 * the package reads its list as it stands: see the react-resource-view ticket
 * https://app.notion.com/p/3f8451680af48107b98edafb2f8256e5 */
const drawn = new Set<{ current: () => void }>()

function readEveryList() {
  queueMicrotask(() => drawn.forEach((list) => list.current()))
}

/** Keep this list in step with every change to an idea, whoever made it. */
export function useReadAgainOnChange() {
  const { fetchData } = useCurrentViewResourceContext()
  const latest = React.useRef(() => void fetchData?.())
  latest.current = () => void fetchData?.()
  React.useEffect(() => {
    drawn.add(latest)
    return () => {
      drawn.delete(latest)
    }
  }, [])
}

/* -- the filter bar ------------------------------------------------------- */

/* The status: a row of buttons, each with how many ideas it would show, as the
 * pane had them. A select would hide the counts, which are what the row is
 * read for. The counts follow the two other filters (see `idea-search.ts`). */
const StatusFilter: InputControllerComponentInterface = ({ formInput, onChange }) => {
  const { filter } = useCurrentViewResourceContext()
  const known = useIdeas().ideas ?? []
  const words = useStatusWords()
  const counted = counts(known, filter ?? {})
  const value = String(formInput.value ?? "")
  return (
    <div className="flex flex-nowrap gap-1" role="group" aria-label={t("Status")}>
      {(["", ...STATUSES] as const).map((key) => (
        <Button
          key={key || "all"}
          type="button"
          size="sm"
          variant={value === key ? "secondary" : "ghost"}
          aria-pressed={value === key}
          data-slot="ideas-filter"
          data-status={key || "all"}
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => onChange({ ...formInput, value: key })}
        >
          {key ? words.many[key] : t("All")}
          <span className="text-muted-foreground tabular-nums" data-slot="ideas-count">
            {counted[key || "all"]}
          </span>
        </Button>
      ))}
    </div>
  )
}

/* A select of the bar, positioned: Radix draws a native select beside it,
 * absolutely, and one placed against the page rather than against the bar
 * escapes the bar's scrolling and widens a phone's screen. */
const Choice = ({ children }: { children: React.ReactNode }) => <div className="relative">{children}</div>

/* Whom an idea is for: every project an idea is for, by its name, and the
 * workspace. Drawn here rather than by the package's select, whose options are
 * asked for once: these are the ones the last read found. */
const ANY = "__any__"

const ProjectFilter: InputControllerComponentInterface = ({ formInput, onChange }) => {
  const known = useIdeas().ideas ?? []
  const projects = useProjects()
  React.useEffect(() => {
    void projectsOnce().catch(() => undefined)
  }, [])
  const named = scopes(known)
    .map((id) => ({
      id,
      name: projects?.projects.find((one) => bare(one.id) === id)?.name ?? t("Project"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Choice>
      <Select
        value={String(formInput.value ?? "") || ANY}
        onValueChange={(value) => onChange({ ...formInput, value: value === ANY ? "" : value })}
      >
        <SelectTrigger size="sm" className="h-8 w-auto text-xs" data-slot="ideas-project-filter" aria-label={t("Project")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t("All projects")}</SelectItem>
          <SelectItem value={WORKSPACE}>{t("Workspace")}</SelectItem>
          {named.map((one) => (
            <SelectItem key={one.id} value={one.id}>
              {one.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Choice>
  )
}

/* Who wrote it, in the same shape as the project: two selects side by side
 * that do not look like two different things. */
const AuthorFilter: InputControllerComponentInterface = ({ formInput, onChange }) => (
  <Choice>
    <Select
      value={String(formInput.value ?? "") || ANY}
      onValueChange={(value) => onChange({ ...formInput, value: value === ANY ? "" : value })}
    >
      <SelectTrigger size="sm" className="h-8 w-auto text-xs" data-slot="ideas-author-filter" aria-label={t("Written by")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{t("Written by anyone")}</SelectItem>
        {AUTHORS.map((author) => (
          <SelectItem key={author} value={author}>
            {author === "ponos" ? t("Written by Ponos") : t("Written by us")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Choice>
)

/* The three filters, in the address as `status`, `project` and `author`; ""
 * is "all" for each, which is where the list rests. The labels are read from
 * the dictionary as the bar is drawn. */
const statusFilter = { label: "Status", controller: StatusFilter }
const authorFilter = { label: "Written by", controller: AuthorFilter }

const formFilter: FormInterface = {
  inputs: {
    status: statusFilter,
    project: { label: "Project", controller: ProjectFilter },
    author: authorFilter,
  },
}

/* Under a project, or in the swipe: the scope is the filter whoever draws the
 * list injects, and the package keeps an injected filter through a reset. */
const scopedFormFilter: FormInterface = {
  inputs: { status: statusFilter, author: authorFilter },
}

/* -- the forms ------------------------------------------------------------- */

const title = {
  label: "Title",
  required: true,
  get placeholder() {
    return t("The idea, in one line.")
  },
  validator: (value: unknown) => {
    const said = String(value ?? "").trim()
    if (!said) throw new Error(t("An idea needs a title"))
    if (said.length > 90) throw new Error(t("A title fits in 90 characters"))
    return value
  },
}

const description = {
  label: "Description",
  controller: TextAreaInputController,
  get placeholder() {
    return t("Why it is worth doing.")
  },
}

/* A new idea: its words, whom it is for — the project whose list it was
 * written from, unless changed — and, for the workspace, whether it is a
 * ticket or a whole new project. An idea of a project is a ticket of it, so
 * the type says so rather than hiding: the form has no way to follow a field. */
const createForm: FormInterface = {
  label: { submit: "Create" },
  inputs: {
    title,
    description,
    project: {
      label: "Project",
      controller: SelectInputController,
      getValueOptions: async () => {
        const known = await projectsOnce().catch(() => null)
        return [
          { value: "", label: t("Workspace") },
          ...(known?.projects ?? [])
            .filter((row) => isAPage(row.id))
            .map((row) => ({ value: bare(row.id), label: row.name }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        ]
      },
    },
    kind: {
      label: "Type",
      controller: SelectInputController,
      get description() {
        return t("A new project is for the workspace only: the idea of a project is a ticket of it.")
      },
      valueOptions: [
        { value: "ticket", label: "Ticket" },
        { value: "project", label: "New project" },
      ],
    },
  },
}

/* Rewording one: the title and the lines under it, nothing else. Whom it is for
 * is what it was proposed for, and the next batch is told about it as it is. */
const editForm: FormInterface = {
  label: { submit: "Save" },
  inputs: { title, description },
}

/* -- what sits around the list -------------------------------------------- */

/** The swipe, for the project the filter is on — or the workspace's — and why nothing was read, where nothing was. */
function IdeasTop() {
  const { filter, fetchData } = useCurrentViewResourceContext()
  const { problem } = useIdeas()
  const projects = useProjects()
  useLayoutInTheAddress(IDEAS)
  const chosen = String(filter?.project ?? "")
  const project = chosen === WORKSPACE ? "" : chosen
  const name = projects?.projects.find((one) => bare(one.id) === project)?.name
  return (
    <div className="mb-2 flex flex-col gap-2">
      <div>
        <IdeasButton project={project} name={name} onClose={() => void fetchData?.()} />
      </div>
      {problem ? (
        <Alert variant="destructive">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

/* -- the declaration ------------------------------------------------------ */

const options: ResourceOptionInterface<IdeaItem, IdeaItem, IdeaWrite> = {
  name: "Ideas",
  scope: SCOPE,
  path: "/api/ideas",
  icon: Lightbulb,
  canList: true,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  // Nothing is ever deleted: an idea thrown away last month may be the right
  // one today, and the next batch is told about it so it is never proposed
  // twice. Throwing it away is the gesture, in the menu of its card.
  canDelete: false,

  getCollection: async (filter) => {
    const every = await readAgain()
    return {
      data: createResourceCollection({
        id: "/api/ideas",
        items: every.filter((idea) => keeps(idea, filter)).map(item),
      }),
    } as never
  },
  getItem: async ({ id }) => {
    const every = await readAgain()
    const found = every.find((idea) => String(idea.id) === String(id))
    if (!found) throw new Error(t("This idea is no longer there."))
    return { data: item(found) }
  },
  updateItem: async (patch) => {
    // Field by field: a patch carries the whole row the form was built from.
    const written = await api.editIdea(Number(patch.id), {
      title: String(patch.title ?? ""),
      description: String(patch.description ?? ""),
    })
    await readAgain()
    return { data: item(written) }
  },
  createItem: async (fresh) => {
    const project = String(fresh.project ?? "")
    const written = await api.writeIdea({
      title: String(fresh.title ?? ""),
      description: String(fresh.description ?? ""),
      project,
      kind: project ? "ticket" : (fresh.kind ?? "ticket"),
    })
    toast.success(t("Idea saved: {{title}}", { title: written.title }))
    await readAgain()
    return { data: item(written) }
  },
  removeItem: async () => {
    throw new Error("an idea is not deleted; throwing it away is what keeps it out of the next batch")
  },

  view: {
    titleKey: "title",
    /* The two layouts. The id is said and the name read from the dictionary as
     * the tab is drawn: the address stays `cards` in every language. */
    viewVariants: [
      {
        ...cardViewOptionFactory({ id: "cards", listComponent: IdeaCards }),
        get name() {
          return t("cards")
        },
      },
      {
        ...tableViewOptionFactory({ id: "table", listComponent: IdeaRows }),
        get name() {
          return t("table")
        },
      },
    ],
  },
  views: {
    [ActionList.list]: {
      name: "Ideas",
      description: "What Ponos proposed, kept or thrown away, for the workspace and for each project.",
      // Every card carries its own gestures (see `idea-cards.tsx`).
      behavior: { rowActions: [] },
      // The filters are the package's: they live in the address (`status`,
      // `project`, `author`), and the rows are kept by `keeps`, as the list is read.
      formFilter,
      components: { top: IdeasTop, noResult: NoIdea, pagination: Pagination },
    },
    [ActionList.read]: {
      name: "Idea",
      viewComponent: IdeaPage,
      // Over the list, which stays where it was: an idea is read to decide on it.
      behavior: { openIn: "drawer" },
    },
    [ActionList.create]: {
      name: "New idea",
      label: { create: "New idea" },
      form: createForm,
      behavior: { openIn: "drawer" },
    },
    [ActionList.update]: {
      name: "Idea",
      label: { update: "Edit" },
      form: editForm,
      behavior: { openIn: "drawer" },
    },
  },
}

export const ideas = createViewResource<IdeaItem, IdeaItem, IdeaWrite>(IDEAS, options)

export const scopedIdeas = createViewResource<IdeaItem, IdeaItem, IdeaWrite>(SCOPED_IDEAS, {
  ...options,
  views: {
    ...options.views,
    [ActionList.list]: {
      ...options.views?.[ActionList.list],
      formFilter: scopedFormFilter,
      // No swipe over a list the swipe itself may be drawing, and nothing to
      // write in the address of a page that is somebody else's.
      components: { noResult: NoIdea, pagination: Pagination },
    },
  },
})

for (const resource of [ideas, scopedIdeas]) resource.onChange.subscribe(readEveryList)

/** Where the ideas are listed, in the layout they were last worked in. */
export const ideasHref = () =>
  generateLinkByResource({ resource: ideas, resourceAction: ActionList.list, viewVariantId: layoutOf(IDEAS) })
