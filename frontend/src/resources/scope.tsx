import { Ellipsis } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  createAdminLayout,
  type MenuItemInterface,
  type ResolvedScope,
  type ScopeConfig,
  type ScopeInterface,
} from "react-resource-view"

import { MenuEntry, Mark, TopBarEnd, onPhone, type ConsoleMenuItem } from "@/components/console/shell"
import { t } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"

import { IDEAS, ideas, ideasHref, scopedIdeas } from "./ideas"
import { pairResources } from "./pairs"
import { PROJECTS, projects, projectsHref } from "./projects"
import { SCHEDULES, schedules, schedulesHref } from "./schedules"
import { SESSIONS, sessions, sessionsHref } from "./sessions"
import { SETTINGS, settings, settingsHref } from "./settings"
import { TICKETS, boardHref, projectTickets, tickets } from "./tickets"

/* The console, as one scope of react-resource-view.
 *
 * A scope is what the package's admin layout is built from: its resources, the
 * menu down the left, the frame every page is drawn in, and the page an
 * address that names nothing opens on. So this is the whole of the console's
 * shape in one declaration — the pages themselves are the resources.
 *
 * The names and the links are getters. A name is read from the dictionary as
 * the menu is drawn, so the language can change after this is declared; the
 * board's link carries the layout it was last worked in, which changes every
 * time somebody picks the table. react-resource-view 1.0 copies the menu as it
 * loads the scope, which reads each getter once — see `keepTheMenuLive`.
 */

const entry = (
  resource: string,
  icon: ConsoleMenuItem["icon"],
  name: string,
  href: () => string,
  badge?: ConsoleMenuItem["badge"]
): ConsoleMenuItem => ({
  resource,
  icon,
  badge,
  component: MenuEntry,
  get name() {
    return t(name)
  },
  get href() {
    return href()
  },
})

/* The bar along the bottom of a phone.
 *
 * The package draws one button per top-level entry, side by side, and lets the
 * row scroll when they do not fit: six entries made a bar 540px wide on a
 * 390px screen, with Statistics cut in two and Settings past the edge, and
 * nothing to say the bar went on. So on a phone the three pages you go to
 * every day stay in the bar, and the rest go behind a fourth entry, More,
 * which the package opens as a drawer — its own way with an entry that has
 * entries under it. Beside a phone the menu is a column with room for all
 * five, and More is not in it.
 *
 * `hidden` is read every time the menu is drawn, and the layout draws it again
 * the moment the width crosses the line between a sidebar and a bottom bar. */
const ON_THE_BAR = new Set([TICKETS, PROJECTS, SCHEDULES])

const onTheBar = (item: ConsoleMenuItem): ConsoleMenuItem =>
  ON_THE_BAR.has(item.resource)
    ? item
    : Object.defineProperty(item, "hidden", { get: onPhone, enumerable: true })

const more = (items: ConsoleMenuItem[]): MenuItemInterface => ({
  icon: Ellipsis,
  items,
  get name() {
    return t("More")
  },
  get hidden() {
    return !onPhone()
  },
})

const entries = () => [
  entry(TICKETS, tickets.icon, "Dashboard", boardHref, "board"),
  entry(PROJECTS, projects.icon, "Projects", projectsHref),
  // No count, here as under Projects: the only way to know is to ask the
  // board, and this menu is redrawn every time the board moves.
  entry(SCHEDULES, schedules.icon, "Schedules", schedulesHref),
  entry(IDEAS, ideas.icon, "Ideas", ideasHref),
  entry(SESSIONS, sessions.icon, "Sessions", sessionsHref),
  entry(SETTINGS, settings.icon, "Settings", () => settingsHref()),
]

const MENU: MenuItemInterface[] = [
  ...entries().map(onTheBar),
  // The drawer's entries are a copy of their own: the ones above hide on a
  // phone, and the package leaves a hidden entry out of a drawer too.
  more(entries().filter((item) => !ON_THE_BAR.has(item.resource))),
]

/** What the menu calls a resource's page, in the language of the moment. */
export const menuName = (resource: string): string | undefined =>
  (MENU as Partial<ConsoleMenuItem>[]).find((item) => item.resource === resource)?.name

/* The menu the layout draws is a copy: react-resource-view 1.0 resolves a
 * scope as it loads it, once, and spreads every entry into a new object — so
 * a getter is read there, and the menu would say its names in the language
 * the console opened in, link the board in the layout it opened on, and keep
 * the bar of the width it opened at. The getters are put back on the copy,
 * entry by entry: the copy is in the menu's order. */
const live = new WeakSet<object>()

export function keepTheMenuLive(scope: ResolvedScope | undefined) {
  if (!scope?.menu || live.has(scope)) return
  live.add(scope)
  const restore = (copies: MenuItemInterface[], originals: MenuItemInterface[]) =>
    copies.forEach((copy, index) => {
      const original = originals[index]
      if (!original) return
      for (const [key, said] of Object.entries(Object.getOwnPropertyDescriptors(original)))
        if (said.get) Object.defineProperty(copy, key, said)
      if (copy.items && original.items) restore(copy.items, original.items)
    })
  restore(scope.menu, MENU)
}

export const consoleScope: ScopeInterface = {
  name: SCOPE,
  label: "Ponos",
  // Every resource of the console, the lists drawn inside another page
  // included: a scope is what a resource's links are written under.
  resources: [
    tickets,
    projects,
    schedules,
    ideas,
    sessions,
    settings,
    projectTickets,
    scopedIdeas,
    ...Object.values(pairResources),
  ],
  decoratorComponent: createAdminLayout({ logo: <Mark />, topBarEnd: <TopBarEnd /> }),
  menu: MENU,
  // An address that names nothing is the board.
  defaultViewResourceContextParams: {
    scope: SCOPE,
    resourceId: TICKETS,
    resourceAction: ActionList.list,
  },
}

/** What `ScopeProvider` loads the scope from: there is one, and it is already here. */
export const scopes: ScopeConfig = { [SCOPE]: async () => consoleScope }
