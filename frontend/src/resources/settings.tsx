import * as React from "react"
import {
  Bell,
  Cpu,
  FolderGit2,
  Inbox,
  ListChecks,
  Plug,
  Play,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { ActionList } from "react-data-form"
import {
  ViewResourceContextProvider,
  createViewResource,
  generateLink,
  type IconType,
  type TabDefinition,
} from "react-resource-view"

import { LanguagePicker } from "@/components/console/language-picker"
import type { SaveNote } from "@/components/console/settings-bits"
import { Rich } from "@/components/console/text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useConsole } from "@/hooks/use-console"
import { api } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"
import {
  cardId,
  currentSettings,
  inputName,
  publishSettings,
  sectionsIn,
  takeAsked,
  useAsked,
  useSettingsRevision,
} from "@/lib/settings-store"
import type { Disk, SettingGroup, SettingSection, Settings } from "@/lib/types"

import { pairResources, type PairTable } from "./pairs"

/* The configuration, declared once for react-resource-view.
 *
 * `config.toml` is one thing, so it is one record: the page is the `read` view
 * of a resource with a single item, and each of its six groups, and the MCP page, is a sub-page
 * of it — the tab you are on carried in the address, so a link to the
 * notification settings is a link you can send somebody.
 *
 * Six rather than one per table of the file: the file is organised the way the
 * loader reads it, the page the way somebody looks for a setting. A tab draws
 * the group you are looking at and nothing else; what you type on a page you
 * leave is kept in the store and given back when you come to it again.
 *
 * The tabs are built from what the server says the file holds — a group the
 * runner gains is a sub-page the day it is described — which is why the list
 * is read from the store rather than written down here. See `settings-store`.
 */

export const SETTINGS = "settings"

/** The file is the record, and there is only ever the one. */
const THE_FILE = "config"

/** The configuration as the views hold it: the description, and an identity. */
export interface SettingsItem extends Settings {
  "@id": string
  "@type": string
  id: string
  /** What the bar's breadcrumb calls it, which would otherwise be "#config". */
  name: string
}

/* What each page is, at a glance. Decoration rather than a second list of
 * groups: a key nobody has drawn an icon for gets the page's own. */
const ICONS: Record<string, IconType> = {
  general: SlidersHorizontal,
  source: Inbox,
  execution: Play,
  models: Cpu,
  code: FolderGit2,
  communication: Bell,
  mcp: Plug,
}

/* The one page the file does not describe: the MCP tab is about the console
 * and Claude Code, not about a key of `config.toml`, so it is added here after
 * the server's groups rather than described by them. */
const MCP_TAB = "mcp"

/* -- the general page's state ------------------------------------------------ */

/** A size the way the runner's `doctor` says it: 25 GB, 764 MB, 12 kB. */
function bytes(size: number): string {
  const units = ["B", "kB", "MB", "GB"]
  let unit = 0
  while (size >= 1000 && unit < units.length - 1) {
    size /= 1000
    unit += 1
  }
  return `${unit === 0 || size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`
}

/* The room the runner takes, and the button that applies its retention now.
 * A run tidies once a day on its own — the button is for the day you would
 * rather not wait. */
function DiskLine() {
  const t = useT()
  const [disk, setDisk] = React.useState<Disk | null>(null)
  const [cleaning, setCleaning] = React.useState(false)
  const [said, setSaid] = React.useState<{ text: string; bad: boolean } | null>(null)

  React.useEffect(() => {
    let live = true
    api.disk().then(
      (read) => live && setDisk(read),
      () => undefined
    )
    return () => {
      live = false
    }
  }, [])

  if (!disk) return <span className="text-muted-foreground">…</span>

  const clean = async () => {
    setCleaning(true)
    setSaid(null)
    try {
      const done = await api.clean()
      setDisk(done)
      setSaid({
        text: t("{{removed}} folder(s) and {{logs}} log(s) removed, {{freed}} freed.", {
          removed: String(done.removed),
          logs: String(done.logs),
          freed: bytes(done.freed),
        }),
        bad: false,
      })
    } catch (error) {
      setSaid({ text: error instanceof Error ? error.message : String(error), bad: true })
    } finally {
      setCleaning(false)
    }
  }

  const rule =
    disk.retention_days <= 0
      ? t("Nothing is tidied on its own: logs are kept forever.")
      : disk.clean_done_worktrees
        ? t("Tidied once a day: logs, and done tickets’ folders, older than {{days}} day(s).", {
            days: String(disk.retention_days),
          })
        : t("Logs older than {{days}} day(s) are dropped once a day.", {
            days: String(disk.retention_days),
          })

  return (
    <div className="flex flex-col gap-1.5" data-testid="disk">
      <span>
        <span className="font-medium">{bytes(disk.total)}</span>
        <span className="text-muted-foreground">
          {" — "}
          {t("worktrees {{worktrees}} · logs {{logs}} · scratch {{scratch}}", {
            worktrees: bytes(disk.sizes.worktrees),
            logs: bytes(disk.sizes.logs),
            scratch: bytes(disk.sizes.scratch),
          })}
        </span>
      </span>
      <span className="text-muted-foreground text-xs">{rule}</span>
      <span className="flex flex-wrap items-center gap-2">
        <Button size="xs" variant="outline" onClick={() => void clean()} disabled={cleaning}>
          <Trash2 />
          {cleaning ? t("Cleaning up…") : t("Clean up")}
        </Button>
        {said ? (
          <span className={said.bad ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
            {said.text}
          </span>
        ) : null}
      </span>
    </div>
  )
}

/* What the first connection ended on, kept: the provider, the board, GitHub,
 * the projects, the channels and where this runs, each with its state and a
 * link to the card that changes it. Folded by default — it asks the CLI and
 * GitHub who they are, which is a second or two nobody needs on every visit. */
function Overview() {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  return (
    <div data-testid="settings-overview">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ListChecks />
          {open ? t("Hide the summary") : t("What this console runs on")}
        </Button>
        <a href="/setup" className="text-muted-foreground text-xs underline underline-offset-2">
          {t("Go through the first connection again")}
        </a>
      </div>
      {open ? (
        <div className="mt-3">
          <React.Suspense fallback={null}>
            <LazySetupSummary change={(row) => <a href={settingsHref(row.section)}>{t("Change")}</a>} />
          </React.Suspense>
        </div>
      ) : null}
    </div>
  )
}

/* The top of the general page: which version runs, which file this page
 * writes, the room the runner takes — what used to crowd the head of every
 * page, said once, where somebody looking at the runner itself looks. */
function StateCard() {
  const t = useT()
  const { runner } = useConsole()
  const drawn = currentSettings()
  const line = (label: string, value: React.ReactNode) => (
    <div className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  )
  return (
    <Card data-card="state" className="gap-0 py-0">
      <CardHeader className="gap-1 px-5 pt-5 pb-3 sm:px-6">
        <CardTitle className="text-base">{t("State")}</CardTitle>
        <CardDescription className="text-[13px]">
          {t("The runner as it stands on this machine.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 text-sm sm:px-6">
        <dl className="divide-y">
          {line(t("Version"), runner ? <span className="font-mono">v{runner.version}</span> : "…")}
          {line(
            t("Configuration file"),
            <span className="font-mono text-[13px] break-all" data-testid="settings-path">
              {drawn?.path}
            </span>
          )}
          {line(t("Disk space"), <DiskLine />)}
          {line(t("First connection"), <Overview />)}
        </dl>
      </CardContent>
    </Card>
  )
}

/* -- one page ------------------------------------------------------------- */

/** Whether a field or a card the search asked for is on this page. */
function onPage(group: string, target: string): boolean {
  return sectionsIn(group).some(
    (section) => section.key === target || section.fields.some((field) => field.name === target)
  )
}

/* The page's own extras to its cards: the browser's language on the languages
 * card — it is the browser's rather than the file's, so it is not a field of
 * the form, but it is a setting, and this is where somebody looks for one —
 * and the two cards that are lists of rows, each a resource of its own, drawn
 * as a resource is drawn: the package's table, its own dialogs. */
const extra = (section: SettingSection) =>
  section.key === "languages" ? <LanguagePicker /> : section.key === "validation" ? <OwnValidation /> : null

/* Above the four switches of the validation card: that they are not the whole
 * story, since a project may decide for itself — and which ones do, each a
 * link to the tab where it does. */
function OwnValidation() {
  const t = useT()
  useSettingsRevision()
  const owning = currentSettings()?.own_validation ?? []
  return (
    <p className="text-muted-foreground pt-1 pb-2 text-[13px] leading-relaxed" data-slot="own-validation">
      {t("A project can have its own automatic validation, in the Settings tab of its page.")}{" "}
      {owning.length ? (
        <>
          {t("Projects with their own, whatever these switches say:")}{" "}
          {owning.map((project, index) => (
            <React.Fragment key={project.id}>
              {index ? ", " : null}
              <a href={projectSettingsHref(project.id)} className="text-foreground underline underline-offset-2">
                {project.name || project.id}
              </a>
            </React.Fragment>
          ))}
          .
        </>
      ) : (
        t("None does today.")
      )}
    </p>
  )
}

/** A project's settings tab, written out rather than imported: projects.tsx imports this file. */
const projectSettingsHref = (id: string) =>
  `${generateLink({ scope: SCOPE, resourceId: "projects", resourceAction: ActionList.read, id })}&tab=settings`

function pairs(section: SettingSection) {
  if (!(section.pairs in pairResources)) return null
  return (
    <ViewResourceContextProvider
      resource={pairResources[section.pairs as PairTable]}
      resourceAction={ActionList.list}
    />
  )
}

function GroupPage({ group }: { group: string }) {
  const revision = useSettingsRevision()
  const target = useAsked()
  const [note, setNote] = React.useState<SaveNote | null>(null)

  React.useEffect(() => {
    // A problem stays until it is read; a confirmation has been read by then.
    if (!note || note.bad) return
    const timer = window.setTimeout(() => setNote(null), 8000)
    return () => window.clearTimeout(timer)
  }, [note])

  React.useEffect(() => {
    // What a search or an old link asked for, once its block has unfolded —
    // which the blocks do in their own effects, before this one runs.
    if (!target || !onPage(group, target)) return
    const timer = window.setTimeout(() => {
      takeAsked()
      const found =
        document.querySelector<HTMLElement>(`[data-field="${inputName(target)}"]`) ??
        document.getElementById(cardId(target))
      if (!found) return
      found.scrollIntoView({ block: "center", behavior: "smooth" })
      found.querySelector<HTMLElement>("input, button[role=switch], button[role=combobox]")?.focus({
        preventScroll: true,
      })
      found.setAttribute("data-found", "")
      window.setTimeout(() => found.removeAttribute("data-found"), 1800)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [group, target])

  return (
    <div className="flex max-w-[720px] min-w-0 flex-col gap-5">
      {group === "general" ? <StateCard /> : null}
      {note ? (
        <Alert variant={note.bad ? "destructive" : "success"}>
          <AlertDescription>
            <Rich text={note.text} />
          </AlertDescription>
        </Alert>
      ) : null}
      {/* Keyed by the revision: a save reads the file again, and the fields of
          every page are redrawn from what it now says. */}
      <React.Suspense fallback={null}>
        <GroupForm
          key={revision}
          group={group}
          extra={extra}
          pairs={pairs}
          note={note}
          onSaved={setNote}
        />
      </React.Suspense>
    </div>
  )
}

/* The fields of the settings, what the console runs on and the MCP tab: pages
 * opened now and then, kept out of the first load, which has a budget. */
const GroupForm = React.lazy(() =>
  import("@/components/console/settings-bits").then((module) => ({ default: module.GroupForm }))
)
const LazySetupSummary = React.lazy(() =>
  import("@/components/console/setup").then((module) => ({ default: module.SetupSummary }))
)
const LazyMcpPage = React.lazy(() =>
  import("@/components/console/mcp-page").then((module) => ({ default: module.McpPage }))
)

const McpPage = () => (
  <React.Suspense fallback={null}>
    <LazyMcpPage />
  </React.Suspense>
)

/* One component per page rather than one built as the tabs are drawn: a
 * component born in a render is a component React remounts on the next one. */
const PAGES = new Map<string, React.FC>()

function pageFor(group: SettingGroup): React.FC {
  const known = PAGES.get(group.key)
  if (known) return known
  const page = () => <GroupPage group={group.key} />
  PAGES.set(group.key, page)
  return page
}

/* The tabs, as the description last read says them.
 *
 * Built from what the server says the file holds — never from a list kept
 * here — so they are only known once the configuration is read. And
 * react-resource-view 1.0 reads a declaration's tabs once, as the resource is
 * declared, keeping the array it is handed: so it is handed this one, filled
 * again each time the configuration is read, before the page that draws the
 * tabs is drawn.
 */
const TABS: TabDefinition<SettingsItem>[] = []

function tellTheTabs() {
  const pages: TabDefinition<SettingsItem>[] = (currentSettings()?.groups ?? []).map((group) => ({
    id: group.key,
    // Drawn by the package, which translates both as it draws.
    label: group.title,
    description: group.blurb,
    icon: ICONS[group.key] ?? Settings2,
    component: pageFor(group),
  }))
  if (pages.length)
    pages.push({
      id: MCP_TAB,
      label: "MCP",
      description: "What an MCP is, how to plug Ponos into Claude, and the ones the sessions use.",
      icon: ICONS[MCP_TAB],
      component: McpPage,
    })
  TABS.splice(0, TABS.length, ...pages)
}

/* -- the head of the page ---------------------------------------------------- */

/* Where you are, how to find a setting, and whatever `doctor` would refuse to
 * start over: drawn with the page, and fetched with it rather than with the
 * console, whose first load has a budget. */
const Head = React.lazy(() =>
  import("@/components/console/settings-head").then((module) => ({ default: module.SettingsHead }))
)

const SettingsHead = () => (
  <React.Suspense fallback={null}>
    <Head />
  </React.Suspense>
)

/* The layout's header, in place of the package's: nothing. The page says what it
 * is in `SettingsHead`, and the bar above it already says where you are. */
const NoHeader = () => null

export const settings = createViewResource<SettingsItem>(SETTINGS, {
  name: "Settings",
  path: "/api/settings",
  icon: Settings2,
  // The one page, and nothing to write or delete through the package. Its list
  // is allowed only to be linked to — the breadcrumb does — and leads to the
  // page (see `App`).
  permissions: ["list", "read"],
  repository: {
    getCollection: async () => {
      throw new Error("there is one configuration; it is not listed")
    },
    getItem: async () => {
      const drawn = await api.settings()
      // Published before it is returned: the tabs are built from the store, and
      // they are drawn the moment this resolves.
      publishSettings(drawn)
      tellTheTabs()
      return {
        data: { ...drawn, id: THE_FILE, name: "config.toml", "@id": "/api/settings", "@type": SETTINGS },
      }
    },
    createItem: async () => {
      throw new Error("the configuration is not created from the console")
    },
    updateItem: async () => {
      throw new Error("a page saves itself; see settings-bits")
    },
    removeItem: async () => {
      throw new Error("the configuration is not deleted from the console")
    },
  },
  views: {
    read: {
      components: {
        view: SettingsHead,
        // No header from the layout: it said the page twice over `SettingsHead`
        // — a way back, "Settings", "#config" — and its way back led to a list
        // the one file does not have.
        navigation: NoHeader,
      },
      // The page's whole width rather than the layout's column: the column of
      // tabs and the column of fields side by side.
      fullWidth: true,
      tabs: {
        // Six pages read as a short column beside the fields; on a phone the
        // package lays them out as a row that scrolls.
        orientation: "vertical",
        items: TABS,
      },
    },
  },
})

/** Where the settings are — one page of them, or the page a card is on. */
export const settingsHref = (page?: string) =>
  generateLink({
    scope: SCOPE,
    resourceId: SETTINGS,
    resourceAction: ActionList.read,
    id: THE_FILE,
    subResource: page,
  })
