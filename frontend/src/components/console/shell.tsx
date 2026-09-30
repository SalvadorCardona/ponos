import { ArrowUp, Moon, RefreshCw, Sun } from "lucide-react"
import { Link, type MenuItemInterface } from "react-resource-view"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useConsole, useStatus } from "@/hooks/use-console"
import { useRunnerMood } from "@/hooks/use-mood"
import { useTheme } from "@/hooks/use-theme"
import { useT } from "@/lib/i18n"
import { useRoute } from "@/lib/router"
import { cn } from "@/lib/utils"
import { TICKETS } from "@/resources/tickets"

import { Robot } from "./robot"

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
      {/* The console's mark is the runner's face, and it wears the runner's
          mood: the very one the bar's robot wears, read once for both, so the
          two faces a hand's width apart always say the same thing. */}
      <Robot state={mood.state} size={24} className="shrink-0" />
      <span className="truncate text-sm font-semibold">ticket-runner</span>
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

/* The robot answers the only question somebody looks up to ask, "is it doing
 * anything?" — one face, not five pills. The sentence it stands for is not
 * drawn beside it, at any width: it crowded the bar. It is kept where it is
 * asked for — under the pointer, and read out to a screen reader each time
 * the mood changes. */
function RunnerMood() {
  const mood = useRunnerMood()
  const t = useT()
  const said = t(mood.said, mood.params)
  return (
    <div
      className="text-muted-foreground flex shrink-0 items-center gap-2 px-2 font-mono text-[0.7rem]"
      title={said}
    >
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
      <Robot state={mood.state} size={28} className="-my-1" />
    </div>
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
  const { refresh, runner } = useConsole()
  const { connection } = useStatus()
  const { theme, toggle } = useTheme()
  const t = useT()

  return (
    <>
      <RunnerMood />

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
            <span className="hidden sm:inline">
              {connection === "live"
                ? t("live")
                : connection === "connecting"
                  ? t("connecting…")
                  : t("reconnecting…")}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("event stream")}</TooltipContent>
      </Tooltip>

      {/* The number this console is running, and — the one day it matters —
          that a newer one is waiting. */}
      {runner ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "flex items-center gap-1 px-2 font-mono text-[0.7rem]",
                runner.update ? "text-tr-amber" : "text-muted-foreground"
              )}
            >
              {runner.update ? <ArrowUp className="size-3 shrink-0" /> : null}
              <span className={runner.update ? undefined : "hidden sm:inline"}>
                v{runner.version}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {runner.update
              ? t("v{{version}} — {{waiting}} is waiting, run: ticket-runner update", {
                  version: runner.version,
                  waiting: runner.update,
                })
              : t("the version this console runs")}
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={refresh} aria-label={t("Refresh")}>
            <RefreshCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("reread the board now")}</TooltipContent>
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
