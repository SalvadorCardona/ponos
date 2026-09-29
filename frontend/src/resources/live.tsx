import { Activity } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
} from "react-resource-view"

import { LivePane } from "@/components/console/live-pane"
import { SCOPE } from "@/lib/resource-view"

/* The running sessions, as a page of the admin layout.
 *
 * Not a list of records: what it shows arrives on the event stream a step at a
 * time, and nothing the package knows how to draw — a table, cards, a split —
 * is a log that grows while you read it. So it is a resource for the one thing
 * a resource gives, an address and a place in the menu, and its list is a view
 * of its own. The collection is empty on purpose: the pane reads the stream,
 * not a request.
 */

export const LIVE = "live"

export const live = createViewResource(LIVE, {
  name: "Live",
  scope: SCOPE,
  path: "/api/state",
  icon: Activity,
  canList: true,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  getCollection: async () =>
    ({ data: createResourceCollection({ id: "/api/state", items: [] }) }) as never,
  views: {
    [ActionList.list]: { name: "Live", viewComponent: LivePane },
  },
})

/** Where the live sessions are. */
export const liveHref = () =>
  generateLinkByResource({ resource: live, resourceAction: ActionList.list })
