import { ActionList } from "react-data-form"
import { ViewResourceContextProvider } from "react-resource-view"

import { layoutOf } from "@/lib/resource-view"
import { TICKETS, projectTickets } from "@/resources/tickets"
import type { ProjectItem } from "@/resources/projects"

/* The first tab of a project: its tickets, as the dashboard draws them.
 *
 * The list is the dashboard's own, declared once (see `projectTickets`) and
 * kept to the tickets that name this project — a ticket carries its project's
 * name, which is also how the cards count them. It opens on the layout the
 * dashboard was last worked in, and remembers the one picked here for it.
 *
 * A ticket made here is made *for* the project: the page's id is the default
 * of the form's project field, so the "New ticket" button the list draws is
 * the dashboard's, prefilled.
 */

export function ProjectTickets({ project }: { project: ProjectItem }) {
  // The id of a project the configuration alone names is a name, not a page: a
  // ticket cannot point at it, so the list has nothing to create.
  const canCreate = Boolean(project.id) && project.source !== "config"
  return (
    <ViewResourceContextProvider
      // The filter is read once, as the context is born: a rename is a new list.
      key={`${project.id}:${project.name}`}
      resource={projectTickets}
      resourceAction={ActionList.list}
      filter={{ project: project.name }}
      defaultData={{ project: project.id }}
      viewVariantId={layoutOf(TICKETS)}
      limit={canCreate ? undefined : { getLimit: () => ({ current: 1, max: 1 }) }}
    />
  )
}
