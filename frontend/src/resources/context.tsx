import { BookOpen } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  createResourceCollection,
  createViewResource,
  generateLinkByResource,
} from "react-resource-view"

import { ContextPane } from "@/components/console/context-pane"
import { SCOPE } from "@/lib/resource-view"

/* The standing context, as a page of the admin layout.
 *
 * One text, not a collection: there is no second context to list and nothing
 * to create or delete, and the package's forms would draw it as a field in a
 * card when it is the whole page. So it is a resource for its address and its
 * place in the menu, and its view is the pane that already edits it — which
 * reads and writes `/api/context` itself.
 */

export const CONTEXT = "context"

export const context = createViewResource(CONTEXT, {
  name: "Context",
  scope: SCOPE,
  path: "/api/context",
  icon: BookOpen,
  canList: true,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  getCollection: async () =>
    ({ data: createResourceCollection({ id: "/api/context", items: [] }) }) as never,
  views: {
    [ActionList.list]: { name: "Context", viewComponent: ContextPane },
  },
})

/** Where the standing context is edited. */
export const contextHref = () =>
  generateLinkByResource({ resource: context, resourceAction: ActionList.list })
