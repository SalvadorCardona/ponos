import { Lightbulb } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
} from "react-resource-view"

import { IdeasPane } from "@/components/console/ideas-pane"
import { SCOPE } from "@/lib/resource-view"

/* The ideas, as a page of the admin layout.
 *
 * Like the context, one pane rather than a collection the package would draw:
 * the ideas are filtered and decided one by one, and `/api/ideas/all` is read by
 * the pane itself. The resource is there for the address and the menu.
 */

export const IDEAS = "ideas"

export const ideas = createViewResource(IDEAS, {
  name: "Ideas",
  scope: SCOPE,
  path: "/api/ideas",
  icon: Lightbulb,
  canList: true,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  getCollection: async () =>
    ({ data: createResourceCollection({ id: "/api/ideas", items: [] }) }) as never,
  views: {
    [ActionList.list]: { name: "Ideas", viewComponent: IdeasPane },
  },
})

/** Where the ideas are listed. */
export const ideasHref = () =>
  generateLinkByResource({ resource: ideas, resourceAction: ActionList.list })
