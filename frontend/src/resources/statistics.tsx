import { ChartLine } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
} from "react-resource-view"

import { StatisticsPane } from "@/components/console/statistics-pane"
import { SCOPE } from "@/lib/resource-view"

/* The statistics, as a page of the admin layout.
 *
 * Built the way the context is: nothing to list, open or write, so the
 * resource is there for its address and its place in the menu, and its view is
 * a pane that reads `/api/statistics` itself — once per period asked for.
 */

export const STATISTICS = "statistics"

export const statistics = createViewResource(STATISTICS, {
  name: "Statistics",
  scope: SCOPE,
  path: "/api/statistics",
  icon: ChartLine,
  canList: true,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  getCollection: async () =>
    ({ data: createResourceCollection({ id: "/api/statistics", items: [] }) }) as never,
  views: {
    [ActionList.list]: { name: "Statistics", viewComponent: StatisticsPane },
  },
})

/** Where the statistics are read. */
export const statisticsHref = () =>
  generateLinkByResource({ resource: statistics, resourceAction: ActionList.list })
