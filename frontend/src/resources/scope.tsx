import { ActionList } from "react-data-form"
import { createAdminLayout, type ScopeConfig, type ScopeInterface } from "react-resource-view"

import { MenuEntry, Mark, TopBarEnd, type ConsoleMenuItem } from "@/components/console/shell"
import { t } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"

import { CONTEXT, context, contextHref } from "./context"
import { PROJECTS, projects, projectsHref } from "./projects"
import { SCHEDULES, schedules, schedulesHref } from "./schedules"
import { SETTINGS, settings, settingsHref } from "./settings"
import { TICKETS, boardHref, tickets } from "./tickets"

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
 * time somebody picks the table.
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

export const consoleScope: ScopeInterface = {
  name: SCOPE,
  label: "ticket-runner",
  resources: [tickets, projects, schedules, context, settings],
  decoratorComponent: createAdminLayout({ logo: <Mark />, topBarEnd: <TopBarEnd /> }),
  menu: [
    entry(TICKETS, tickets.icon, "Board", boardHref, "board"),
    entry(PROJECTS, projects.icon, "Projects", projectsHref),
    // No count, here as under Projects: the only way to know is to ask the
    // board, and this menu is redrawn every time the board moves.
    entry(SCHEDULES, schedules.icon, "Schedules", schedulesHref),
    entry(CONTEXT, context.icon, "Context", contextHref),
    entry(SETTINGS, settings.icon, "Settings", () => settingsHref()),
  ],
  // An address that names nothing is the board.
  defaultViewResourceContextParams: {
    scope: SCOPE,
    resourceId: TICKETS,
    resourceAction: ActionList.list,
  },
}

/** What `ScopeProvider` loads the scope from: there is one, and it is already here. */
export const scopes: ScopeConfig = { [SCOPE]: async () => consoleScope }
