import * as React from "react"
import { Moon, RefreshCw, Search, Sun } from "lucide-react"
import { Link, type MenuItemInterface } from "react-resource-view"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useConsole, useStatus, useSync } from "@/hooks/use-console"
import { hotkeyLabel } from "@/hooks/use-hotkeys"
import { useRunnerMood } from "@/hooks/use-mood"
import { useTheme } from "@/hooks/use-theme"
import { counted, useT } from "@/lib/i18n"
import { useRoute } from "@/lib/router"
import { cn } from "@/lib/utils"
import { TICKETS } from "@/resources/tickets"

import { openPalette } from "./command-palette"
import { Robot } from "./robot"
import { VersionBadge } from "./version-badge"

/* What the console puts into react-resource-view's admin layout.
 *
 * The layout brings the frame — the sidebar built from the scope's menu, the
 * bar over the page, the bottom navigation on a phone, the page's heading —
 * and leaves two places for the application: a logo, and the end of the bar.
 * Everything here goes into one of those two, or into a menu entry.
 */

/** The mark and the name, in the sidebar's corner — and in the bar, on a phone. */
export function Mark() {
  const mood = useRunnerMood()
  return (
    <div className="flex h-8 items-center gap-2">
      {/* Ponos, the console's mark and the runner's face, wears the runner's
          mood — the only face that does, now the bar's end no longer carries
          one. Hovered, it says whose face it is. */}
      <span className="flex shrink-0" title="Ponos">
        <Robot state={mood.state} size={24} />
      </span>
      <span className="truncate text-sm font-semibold">Ponos</span>
    </div>
  )
}

/* -- the menu ------------------------------------------------------------- */

/* An entry of the menu: a name, and a number where something is waiting there.
 *
 * Seven entries of two lines each used to be a page to read rather than a menu
 * to use — a sentence under every name saying how many tickets were ready,
 * whether the timer was on. What is worth knowing at a glance is a count, and a
 * count fits beside a name.
 *
 * The package's own entry draws a name and an icon and nothing beside them, and
 * lights itself when the address *starts with* its link — so the board's entry
 * went dark the moment a ticket was opened from it, and the projects' when a
 * project was. The package's answer to both is the `component` an entry may
 * bring; this is that component, drawn in the package's own shape.
 */
export interface ConsoleMenuItem extends MenuItemInterface {
  /** The resource the entry opens: it stays lit on every address of that resource. */
  resource: string
  /** A number worth showing beside the name — the tickets on the board. */
  badge?: "board"
}

/* Where the package's layout trades its sidebar for a bar along the bottom —
 * its own query, word for word, so the menu and the layout never disagree on
 * which of the two is on screen. */
const PHONE = "(max-width: 767px)"

/** Whether the screen is a phone's, as the admin layout decides it. */
export const onPhone = () => window.matchMedia(PHONE).matches

/** The resource the address names; an address that names none is the board. */
export function useCurrentResourceId(): string {
  const { params } = useRoute()
  return String(params.resourceId ?? TICKETS)
}

export function MenuEntry({ menuItem }: { menuItem: MenuItemInterface }) {
  const item = menuItem as ConsoleMenuItem
  const { board } = useConsole()
  const current = useCurrentResourceId()
  const active = current === item.resource
  const Icon = item.icon
  const count = item.badge === "board" ? board.tickets.length : 0

  return (
    <Link
      to={item.href || "/"}
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-left text-sm font-medium outline-hidden transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/30 focus-visible:ring-2",
        "data-active:bg-primary data-active:text-primary-foreground [&_svg]:size-4 [&_svg]:shrink-0"
      )}
    >
      {Icon ? <Icon /> : null}
      <span className="truncate">{item.name}</span>
      {count ? (
        <span className="ml-auto font-mono text-[0.7rem] tabular-nums opacity-80">{count}</span>
      ) : null}
    </Link>
  )
}

/* -- the end of the bar --------------------------------------------------- */

/* When the board last agreed with Notion, and whether anything does not.
 *
 * Green is "read a moment ago, and nothing is out of step". Amber is anything
 * worth a look: a move still waiting for Notion, one Notion refused or one it
 * had been changed under, an écart the last full read found, or a read that
 * failed. What exactly is under the pointer; the button beside it is the one
 * that does something about it. */
function useSyncSummary() {
  const synced = useSync()
  const t = useT()
  // Redrawn on a clock of its own: "12 s ago" that never moves is a lie.
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    const timer = window.setInterval(() => tick((count) => count + 1), 5000)
    return () => window.clearInterval(timer)
  }, [])
  if (!synced?.synced_at) return null

  const seconds = Math.max(0, Math.round((Date.now() - new Date(synced.synced_at).getTime()) / 1000))
  const age =
    seconds < 60
      ? t("{{count}} s ago", { count: String(seconds) })
      : t("{{count}} min ago", { count: String(Math.round(seconds / 60)) })
  const troubled =
    Boolean(synced.error) || synced.drift + synced.pending + synced.failed + synced.conflicts > 0
  const clock = (at: string) => (at ? new Date(at).toLocaleTimeString() : "—")
  const said = [
    t("last read of Notion: {{at}}", { at: clock(synced.synced_at) }),
    t("whole board compared: {{at}}", { at: clock(synced.reconciled_at) }),
    synced.drift ? counted(synced.drift, "{{count}} gap found and corrected", "{{count}} gaps found and corrected") : "",
    synced.pending ? counted(synced.pending, "{{count}} move waiting for Notion", "{{count}} moves waiting for Notion") : "",
    synced.failed ? counted(synced.failed, "{{count}} move Notion refused", "{{count}} moves Notion refused") : "",
    synced.conflicts
      ? counted(synced.conflicts, "{{count}} ticket changed in Notion meanwhile", "{{count}} tickets changed in Notion meanwhile")
      : "",
    synced.error ? t("the last read failed: {{why}}", { why: synced.error }) : "",
  ].filter(Boolean)
  return { age, troubled, said }
}

function SyncLine() {
  const summary = useSyncSummary()
  const t = useT()
  if (!summary) return null
  const { age, troubled, said } = summary

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex items-center gap-1.5 px-2 font-mono text-[0.7rem]",
            troubled ? "text-tr-amber" : "text-muted-foreground"
          )}
        >
          <span
            className={cn("size-1.5 shrink-0 rounded-full", troubled ? "bg-tr-amber" : "bg-tr-green")}
          />
          <span>{t("synced {{age}}", { age })}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {said.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

/** What the stream's dot says, in words. */
function useConnectionWord(): string {
  const { connection } = useStatus()
  const t = useT()
  return connection === "live"
    ? t("live")
    : connection === "connecting"
      ? t("connecting…")
      : t("reconnecting…")
}

/* The same three things on a phone, said once.
 *
 * The bar of a phone has room for the mark and three buttons, and the stream,
 * the version and the last read had shrunk to two green dots and nothing —
 * their words hidden for want of room, their tooltips out of reach of a
 * finger. So they become one: a dot and one short word, green when the stream
 * is live and nothing is out of step, amber otherwise; and a tap on it opens
 * what the three said on a wider screen. A tooltip rather than a menu, because
 * there is nothing in it to press — only told on a tap rather than a hover. */
function PhoneStatus() {
  const { connection } = useStatus()
  const { runner } = useConsole()
  const sync = useSyncSummary()
  const word = useConnectionWord()
  const t = useT()
  const [open, setOpen] = React.useState(false)
  // Whether it was open when the finger came down: the tooltip closes itself
  // on that press, before the click that is meant to toggle it.
  const wasOpen = React.useRef(false)
  const live = connection === "live"
  const troubled = Boolean(sync?.troubled)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t("State of the console")}
          aria-expanded={open}
          // The tooltip opens on a hover and closes on a press: a finger has
          // no hover, so the press is what opens and closes it.
          onPointerDown={() => {
            wasOpen.current = open
          }}
          onClick={(event) => {
            event.preventDefault()
            setOpen(!wasOpen.current)
          }}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-2 font-mono text-[0.7rem] outline-hidden",
            "focus-visible:ring-ring/30 focus-visible:ring-2",
            !live || troubled ? "text-tr-amber" : "text-tr-green"
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              !live ? "bg-tr-amber animate-pulse" : troubled ? "bg-tr-amber" : "bg-tr-green"
            )}
          />
          {word}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="max-w-[calc(100vw-2rem)]">
        <div>{t("event stream: {{state}}", { state: word })}</div>
        {sync ? <div>{t("synced {{age}}", { age: sync.age })}</div> : null}
        {sync?.said.map((line) => (
          <div key={line} className="text-muted-foreground">
            {line}
          </div>
        ))}
        {runner ? <div className="mt-1 font-mono">v{runner.version}</div> : null}
      </TooltipContent>
    </Tooltip>
  )
}

/* The machine's own state, and the two gestures that are about the console
 * rather than about a page: reread the board, change the light.
 *
 * They sat at the foot of the menu. The package's sidebar keeps its foot for
 * itself, and its bar keeps its right end for exactly this — so the stream's
 * dot, the version and the day a newer one is waiting are said there, once,
 * over every page.
 */
export function TopBarEnd() {
  const { refresh } = useConsole()
  const { connection } = useStatus()
  const word = useConnectionWord()
  const { theme, toggle } = useTheme()
  const t = useT()
  const palette = hotkeyLabel("palette")

  return (
    <>
      {/* Beside a menu, each said on its own; on a phone, once. */}
      <div className="hidden items-center md:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "flex items-center gap-1.5 px-2 font-mono text-[0.7rem]",
                connection === "live" ? "text-tr-green" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  connection === "live" ? "bg-tr-green" : "bg-tr-amber animate-pulse"
                )}
              />
              <span>{word}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("event stream")}</TooltipContent>
        </Tooltip>

        {/* The number this console is running — and, the day a newer one is
            waiting, the button that installs it. */}
        <VersionBadge />

        <SyncLine />
      </div>
      <div className="flex items-center md:hidden">
        <PhoneStatus />
        {/* An update waiting is a button, and a button stays where a finger
            can reach it; the version alone is in the pill. */}
        <VersionBadge offerOnly />
      </div>

      {/* The palette's way in for a mouse, and where its shortcut is learnt. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openPalette}
            aria-label={t("Search")}
            aria-keyshortcuts={palette.aria}
          >
            <Search />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{`${t("search a page, a project, a ticket")} · ${palette.label}`}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={refresh} aria-label={t("Resynchronise now")}>
            <RefreshCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t("resynchronise now: the whole board read again, the refused moves sent again")}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            aria-label={theme === "dark" ? t("Light") : t("Dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{theme === "dark" ? t("go light") : t("go dark")}</TooltipContent>
      </Tooltip>
    </>
  )
}
