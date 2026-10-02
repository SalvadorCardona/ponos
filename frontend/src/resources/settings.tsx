import * as React from "react"
import {
  Activity,
  BadgeCheck,
  Bell,
  Bot,
  CalendarClock,
  Coins,
  Columns3,
  FileStack,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Globe,
  HardDrive,
  MessageSquareReply,
  MessageSquareText,
  NotebookText,
  RefreshCw,
  Trash2,
  Settings2,
  Shapes,
  TableProperties,
  Timer,
} from "lucide-react"
import { ActionList } from "react-data-form"
import {
  ViewResourceContextProvider,
  createViewResource,
  generateLink,
  useCurrentViewResourceContext,
  type IconType,
  type SubViewResourceInterface,
} from "react-resource-view"

import { PageHead } from "@/components/console/frame"
import { LanguagePicker } from "@/components/console/language-picker"
import {
  FoldContext,
  SectionForm,
  written,
  type SaveNote,
} from "@/components/console/settings-bits"
import { Rich } from "@/components/console/text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"
import {
  currentSettings,
  draftOf,
  publishSettings,
  sectionOf,
  somethingIsEdited,
  useSettingsRevision,
} from "@/lib/settings-store"
import type { Disk, SettingSection, Settings } from "@/lib/types"

import { pairResources, type PairTable } from "./pairs"

/* The configuration, declared once for react-resource-view.
 *
 * `config.toml` is one thing, so it is one record: the page is the `read` view
 * of a resource with a single item, and each of the file's sections is a
 * sub-page of it. That is what the package's `subViewResource` is — one page,
 * its sub-pages, and the tab you are on carried in the address, so a link to
 * the notification settings is a link you can send somebody.
 *
 * It replaces a column of collapsibles that drew all seventy fields at once,
 * open or folded, and redrew every one of them on every keystroke. A tab draws
 * the section you are looking at and nothing else, which is most of what made
 * the page slow; what you type in a section you leave is kept in the store and
 * given back when you come to it again.
 *
 * The tabs are built from what the server says the file holds — a section the
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

/* What each section is, at a glance. Decoration rather than a second list of
 * sections: a key nobody has drawn an icon for gets the page's own. */
const ICONS: Record<string, IconType> = {
  notion: NotebookText,
  storage: HardDrive,
  runner: Timer,
  models: Coins,
  openrouter: Bot,
  git: GitBranch,
  validation: BadgeCheck,
  types: Shapes,
  schedules: CalendarClock,
  live: Activity,
  replies: MessageSquareReply,
  prompts: MessageSquareText,
  notify: Bell,
  web: Globe,
  update: RefreshCw,
  projects: FolderGit2,
  github: GitPullRequest,
  status: Columns3,
  properties: TableProperties,
  pages: FileStack,
}

/** The line under a section's name: the file's own words, code spans and all. */
function Blurb({ text }: { text: string }) {
  const t = useT()
  return (
    <p className="text-muted-foreground mb-5 max-w-prose text-xs leading-relaxed">
      <Rich text={t(text)} />
    </p>
  )
}

/* -- one sub-page ---------------------------------------------------------- */

/* The sections whose advanced fields somebody unfolded, for as long as the page
 * is open: coming back to a section shows it the way it was left. */
const UNFOLDED = new Set<string>()

/** Whether a section has an advanced field waiting to be saved. */
function advancedTyped(sectionKey: string): boolean {
  const section = sectionOf(sectionKey)
  const draft = draftOf(sectionKey)
  if (!section || !draft) return false
  const typed = Object.keys(written(section, draft))
  return section.fields.some((field) => field.advanced && typed.includes(field.name))
}

function SectionPage({ sectionKey }: { sectionKey: string }) {
  const revision = useSettingsRevision()
  const [note, setNote] = React.useState<SaveNote | null>(null)
  // Unfolded already when something typed in a folded field is waiting: a
  // change you cannot see is a change you save without knowing.
  const [unfolded, setUnfolded] = React.useState(
    () => UNFOLDED.has(sectionKey) || advancedTyped(sectionKey)
  )
  const section = sectionOf(sectionKey)

  React.useEffect(() => {
    // A problem stays until it is read; a confirmation has been read by then.
    if (!note || note.bad) return
    const timer = window.setTimeout(() => setNote(null), 8000)
    return () => window.clearTimeout(timer)
  }, [note])

  if (!section) return null
  const advanced = section.fields.filter((field) => field.advanced).length

  const fold = () => {
    if (unfolded) UNFOLDED.delete(sectionKey)
    else UNFOLDED.add(sectionKey)
    setUnfolded(!unfolded)
  }

  return (
    // The advanced fields are in the form either way; this attribute is what
    // hides them. See `ADVANCED` in `settings-bits`.
    <div className="group/settings min-w-0" data-advanced={unfolded ? "unfolded" : "folded"}>
      <Blurb text={section.blurb} />
      {/* The console's own language, at the top of the section that is about
          this console. It is the browser's rather than the file's, so it is
          not a field of the form under it — but it is a setting, and this is
          where somebody looking for a setting looks. */}
      {sectionKey === "web" ? <LanguagePicker /> : null}
      {note ? (
        <Alert variant={note.bad ? "destructive" : "success"} className="mb-4">
          <AlertDescription>
            <Rich text={note.text} />
          </AlertDescription>
        </Alert>
      ) : null}
      {/* Keyed by the revision: a save reads the file again, and the fields of
          every section are redrawn from what it now says. */}
      {/* The switch is drawn in the section's save bar, which sticks to the
          bottom of the screen: anywhere after the form it sat under the bar. */}
      <FoldContext.Provider value={{ advanced, unfolded, fold }}>
        <SectionForm key={revision} section={section} onSaved={setNote} />
      </FoldContext.Provider>
    </div>
  )
}

/* The sections that are a list rather than a list of keys — `[projects]` and
 * `[github]`. Each is a resource of its own, drawn here as a resource is drawn
 * — the package's table, its own dialogs — under the sentence that says what
 * the mapping is for. */
function pairsPage(sectionKey: string, table: PairTable): React.FC {
  return function PairsPage() {
    const section = sectionOf(sectionKey)
    return (
      <div className="min-w-0">
        {section ? <Blurb text={section.blurb} /> : null}
        <ViewResourceContextProvider
          resource={pairResources[table]}
          resourceAction={ActionList.list}
        />
      </div>
    )
  }
}

/* One component per section rather than one built as the tabs are drawn: a
 * component born in a render is a component React remounts on the next one. */
const PAGES = new Map<string, React.FC>()

function pageFor(section: SettingSection): React.FC {
  const known = PAGES.get(section.key)
  if (known) return known
  // A `pairs` the console has no resource for is drawn as any other section:
  // no fields described, so nothing but the sentence — which is a good deal
  // better than a tab that throws.
  const table = section.pairs in pairResources ? (section.pairs as PairTable) : ""
  const page = table
    ? pairsPage(section.key, table)
    : () => <SectionPage sectionKey={section.key} />
  PAGES.set(section.key, page)
  return page
}

/* The tabs, as the description last read says them.
 *
 * Read as they are drawn rather than fixed when the resource is declared: the
 * sections arrive with the configuration, and the page is drawn from what the
 * server says the file holds — never from a list kept here.
 */
function tabs(): SubViewResourceInterface[] {
  return (currentSettings()?.sections ?? []).map((section) => ({
    slug: section.key,
    // Drawn by the package, which translates it as it draws.
    name: section.title,
    icon: ICONS[section.key] ?? Settings2,
    viewComponent: pageFor(section),
  }))
}

/* -- the page itself ------------------------------------------------------- */

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
 *
 * Above the tabs because it is no one section's: the retention is two keys of
 * "Running tickets", but what fills the disk is every ticket. A run tidies once
 * a day on its own — the button is for the day you would rather not wait. */
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

  if (!disk) return null

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
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" data-testid="disk">
      <span>
        <span className="font-medium">{t("Disk space: {{total}}", { total: bytes(disk.total) })}</span>
        <span className="text-muted-foreground">
          {" — "}
          {t("worktrees {{worktrees}} · logs {{logs}} · scratch {{scratch}}", {
            worktrees: bytes(disk.sizes.worktrees),
            logs: bytes(disk.sizes.logs),
            scratch: bytes(disk.sizes.scratch),
          })}
        </span>
      </span>
      <span className="text-muted-foreground">{rule}</span>
      <Button size="xs" variant="outline" onClick={() => void clean()} disabled={cleaning}>
        <Trash2 />
        {cleaning ? t("Cleaning up…") : t("Clean up")}
      </Button>
      {said ? (
        <span className={said.bad ? "text-destructive" : "text-muted-foreground"}>{said.text}</span>
      ) : null}
    </div>
  )
}

/* What sits above the tabs: where you are, what the page is for, which file it
 * is writing, and whatever `doctor` would refuse to start over. */
function SettingsHead() {
  const { fetchData } = useCurrentViewResourceContext()
  const t = useT()
  useSettingsRevision()
  const drawn = currentSettings()

  const latest = React.useRef(fetchData)
  latest.current = fetchData
  React.useEffect(() => {
    // Another tab saved, or `ponos config` did. Read it again — unless
    // a section is in the middle of an edit, which is not something to take
    // away from you.
    const listener = () => {
      if (!somethingIsEdited()) void latest.current()
    }
    window.addEventListener("ponos:settings", listener)
    return () => window.removeEventListener("ponos:settings", listener)
  }, [])

  if (!drawn)
    return <p className="text-muted-foreground text-sm">{t("Reading the configuration…")}</p>

  return (
    <>
      <PageHead
        title={t("Configure the runner.")}
        blurb={t(
          "A blank field uses the runner’s own default, shown greyed inside it; under each field, its key in config.toml. Your tokens stay on this machine: they are never sent to this page."
        )}
        action={<span className="text-muted-foreground font-mono text-xs break-all">{drawn.path}</span>}
      />
      <DiskLine />
      {drawn.problem ? (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{drawn.problem}</AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

/* The layout's header, in place of the package's: nothing. The page says what it
 * is in `SettingsHead`, and the bar above it already says where you are. */
const NoHeader = () => null

export const settings = createViewResource<SettingsItem>(SETTINGS, {
  name: "Settings",
  scope: SCOPE,
  path: "/api/settings",
  icon: Settings2,
  canRead: true,
  canList: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,

  getCollection: async () => {
    throw new Error("there is one configuration; it is not listed")
  },
  getItem: async () => {
    const drawn = await api.settings()
    // Published before it is returned: the tabs are built from the store, and
    // they are drawn the moment this resolves.
    publishSettings(drawn)
    return {
      data: { ...drawn, id: THE_FILE, name: "config.toml", "@id": "/api/settings", "@type": SETTINGS },
    }
  },
  createItem: async () => {
    throw new Error("the configuration is not created from the console")
  },
  updateItem: async () => {
    throw new Error("a section saves itself; see settings-bits")
  },
  removeItem: async () => {
    throw new Error("the configuration is not deleted from the console")
  },

  views: {
    [ActionList.read]: {
      name: "Settings",
      viewComponent: SettingsHead,
      // No header from the layout: it said the page twice over `SettingsHead`
      // — a way back, "Settings", "#config" — and its way back led to a list
      // the one file does not have.
      components: { navigation: NoHeader },
      // The page's whole width rather than the layout's column: a column of
      // tabs beside two columns of fields left each field the width of a word.
      fullWidth: true,
      // The object is what the package reads the tabs off, so the getter on it
      // survives the copy `createViewResource` makes of the view itself.
      subViewResource: {
        // Twenty sections read as a column: a bar would push most of them off
        // the screen, and the one you are on with them.
        orientation: "vertical",
        get list() {
          return tabs()
        },
      },
    },
  },
})

/** Where the settings are — or one section of them. */
export const settingsHref = (section?: string) =>
  generateLink({
    scope: SCOPE,
    resourceId: SETTINGS,
    resourceAction: ActionList.read,
    id: THE_FILE,
    subResource: section,
  })
