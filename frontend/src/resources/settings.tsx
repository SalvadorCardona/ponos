import * as React from "react"
import {
  Bell,
  Cpu,
  FolderGit2,
  Inbox,
  ListChecks,
  Play,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { ActionList } from "react-data-form"
import {
  ViewResourceContextProvider,
  createViewResource,
  generateLink,
  useCurrentViewResourceContext,
  useNavigate,
  type IconType,
  type SubViewResourceInterface,
} from "react-resource-view"

import { PageHead } from "@/components/console/frame"
import { LanguagePicker } from "@/components/console/language-picker"
import { SetupSummary } from "@/components/console/setup"
import {
  GroupForm,
  cardId,
  inputName,
  type SaveNote,
} from "@/components/console/settings-bits"
import { Rich } from "@/components/console/text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useConsole } from "@/hooks/use-console"
import { api } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"
import { search } from "@/lib/settings-search"
import {
  ask,
  asked,
  currentSettings,
  groupOf,
  publishSettings,
  sectionOf,
  sectionsIn,
  showKeys,
  somethingIsEdited,
  takeAsked,
  useAsked,
  useKeysShown,
  useSettingsRevision,
} from "@/lib/settings-store"
import type { Disk, SettingGroup, SettingSection, Settings } from "@/lib/types"

import { pairResources, type PairTable } from "./pairs"

/* The configuration, declared once for react-resource-view.
 *
 * `config.toml` is one thing, so it is one record: the page is the `read` view
 * of a resource with a single item, and each of its six groups is a sub-page
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
}

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
          <SetupSummary change={(row) => <a href={settingsHref(row.section)}>{t("Change")}</a>} />
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
const extra = (section: SettingSection) => (section.key === "languages" ? <LanguagePicker /> : null)

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
      <GroupForm
        key={revision}
        group={group}
        extra={extra}
        pairs={pairs}
        note={note}
        onSaved={setNote}
      />
    </div>
  )
}

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
 * Read as they are drawn rather than fixed when the resource is declared: the
 * groups arrive with the configuration, and the page is drawn from what the
 * server says the file holds — never from a list kept here.
 */
function tabs(): SubViewResourceInterface[] {
  return (currentSettings()?.groups ?? []).map((group) => ({
    slug: group.key,
    // Drawn by the package, which translates both as it draws.
    name: group.title,
    description: group.blurb,
    icon: ICONS[group.key] ?? Settings2,
    viewComponent: pageFor(group),
  }))
}

/* -- the head of the page ---------------------------------------------------- */

/** One answer of the search: a field, or a card that is a list of rows. */
interface Found {
  name: string
  words: string[]
  target: string
  group: string
  label: string
  where: string
}

/* A search over every field of every page, by what it is called, what it does
 * or its key — in the console's language and in the file's. A click opens the
 * page it is on, unfolds what hides it, and brings it into view. */
function SettingsSearch() {
  const t = useT()
  useSettingsRevision()
  const navigate = useNavigate()
  const { setViewResource } = useCurrentViewResourceContext()
  const [typed, setTyped] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const box = React.useRef<HTMLDivElement>(null)
  const drawn = currentSettings()

  const items = React.useMemo<Found[]>(() => {
    if (!drawn) return []
    return drawn.sections.flatMap((section) => {
      const where = `${t(groupOf(section.group)?.title ?? "")} › ${t(section.title)}`
      if (section.pairs)
        return [
          {
            name: section.pairs,
            words: [t(section.title), t(section.blurb), section.title],
            target: section.key,
            group: section.group,
            label: t(section.title),
            where,
          },
        ]
      return section.fields.map((field) => ({
        name: field.variable ? `${field.name} ${field.variable}` : field.name,
        words: [t(field.label), t(field.help), field.label, field.help],
        target: field.name,
        group: section.group,
        label: t(field.label),
        where,
      }))
    })
  }, [drawn, t])

  const found = search(items, typed)

  const go = (item: Found) => {
    setTyped("")
    setOpen(false)
    ask(item.target)
    setViewResource((current) => ({ ...current, subResource: item.group }))
    void navigate({ to: settingsHref(item.group), replace: true, resetScroll: false })
  }

  return (
    <div
      ref={box}
      className="relative w-full sm:w-80"
      onBlur={(event) => {
        if (!box.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        aria-label={t("Search the settings")}
        placeholder={t("Search the settings")}
        className="pl-9"
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && found[0]) go(found[0])
          if (event.key === "Escape") {
            setTyped("")
            setOpen(false)
          }
        }}
      />
      {open && typed.trim().length >= 2 ? (
        <div
          role="listbox"
          aria-label={t("Settings found")}
          className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-md border p-1 shadow-md"
        >
          {found.length ? (
            found.map((item) => (
              <button
                key={item.target}
                type="button"
                role="option"
                aria-selected={false}
                className="hover:bg-muted focus-visible:bg-muted flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left outline-none"
                onClick={() => go(item)}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground text-xs">{item.where}</span>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">{t("No setting by that name.")}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** The switch that shows `config.toml`'s keys under every field. */
function KeysSwitch() {
  const t = useT()
  const shown = useKeysShown()
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
      <Switch checked={shown} onCheckedChange={showKeys} />
      {t("Show keys")}
    </label>
  )
}

/* What sits above the tabs: where you are, how to find a setting, and whatever
 * `doctor` would refuse to start over. */
function SettingsHead() {
  const { fetchData, subResource, setViewResource } = useCurrentViewResourceContext()
  const navigate = useNavigate()
  const t = useT()
  useSettingsRevision()
  const drawn = currentSettings()

  const latest = React.useRef(fetchData)
  latest.current = fetchData
  React.useEffect(() => {
    // Another tab saved, or `ponos config` did. Read it again — unless a page
    // is in the middle of an edit, which is not something to take away from you.
    const listener = () => {
      if (!somethingIsEdited()) void latest.current()
    }
    window.addEventListener("ponos:settings", listener)
    return () => window.removeEventListener("ponos:settings", listener)
  }, [])

  React.useEffect(() => {
    // Leaving the page with something typed and not saved: the browser asks.
    const warn = (event: BeforeUnloadEvent) => {
      if (somethingIsEdited()) event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  React.useEffect(() => {
    // An address that names a card rather than a page — a link written before
    // there were pages, or one that means "the notifications" wherever they
    // are: the page it is on, scrolled to it.
    if (!drawn || !subResource || groupOf(subResource)) return
    const section = sectionOf(subResource)
    if (!section) return
    if (asked() !== section.key) ask(section.key)
    setViewResource((current) => ({ ...current, subResource: section.group }))
    void navigate({ to: settingsHref(section.group), replace: true })
  }, [drawn, subResource, navigate, setViewResource])

  if (!drawn)
    return <p className="text-muted-foreground text-sm">{t("Reading the configuration…")}</p>

  return (
    <>
      <PageHead
        title={t("Configure the runner.")}
        action={
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
            <SettingsSearch />
            <KeysSwitch />
          </div>
        }
      />
      {drawn.problem ? (
        <Alert variant="destructive" className="mb-4">
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
    throw new Error("a page saves itself; see settings-bits")
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
      // The page's whole width rather than the layout's column: the column of
      // tabs and the column of fields side by side.
      fullWidth: true,
      // The object is what the package reads the tabs off, so the getter on it
      // survives the copy `createViewResource` makes of the view itself.
      subViewResource: {
        // Six pages read as a short column beside the fields; on a phone the
        // package lays them out as a row that scrolls.
        orientation: "vertical",
        get list() {
          return tabs()
        },
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
