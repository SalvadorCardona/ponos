import * as React from "react"
import { MessagesSquare } from "lucide-react"
import { ActionList } from "react-data-form"
import { createViewResource, generateLink } from "react-resource-view"

import { SCOPE } from "@/lib/resource-view"

/* The conversations, as a page of the menu.
 *
 * Declared like the settings: one page, the `read` view of a record that is
 * not a record — the list of sessions is drawn by the page itself, from its
 * own endpoint, with its search — so the package has nothing to list and the
 * list address leads to the page (see `App`). */

export const SESSIONS = "sessions"

/* A page opened now and then, kept out of the first load, which has a budget. */
const SessionsPage = React.lazy(() =>
  import("@/components/console/sessions-page").then((module) => ({ default: module.SessionsPage }))
)

const LazySessions = () => (
  <React.Suspense fallback={null}>
    <SessionsPage />
  </React.Suspense>
)

/** The page is the one record. */
const THE_LIST = "all"

interface SessionsItem {
  "@id": string
  "@type": string
  id: string
  name: string
}

/* The layout's header, in place of the package's: the page says what it is. */
const NoHeader = () => null

/* A session is started, renamed and deleted from the page, never as a record. */
const refused = async (): Promise<never> => {
  throw new Error("the sessions are managed from their page")
}

export const sessions = createViewResource<SessionsItem>(SESSIONS, {
  name: "Sessions",
  scope: SCOPE,
  path: "/api/chat/sessions",
  icon: MessagesSquare,
  canRead: true,
  canList: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,

  getItem: async () => ({
    data: { id: THE_LIST, name: "Sessions", "@id": "/api/chat/sessions", "@type": SESSIONS },
  }),
  getCollection: refused,
  createItem: refused,
  updateItem: refused,
  removeItem: refused,

  views: {
    [ActionList.read]: {
      name: "Sessions",
      viewComponent: LazySessions,
      components: { navigation: NoHeader },
      fullWidth: true,
    },
  },
})

/** Where the sessions are. */
export const sessionsHref = () =>
  generateLink({
    scope: SCOPE,
    resourceId: SESSIONS,
    resourceAction: ActionList.read,
    id: THE_LIST,
  })
