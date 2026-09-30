import * as React from "react"
import { RouterProvider } from "@tanstack/react-router"
import { ActionList } from "react-data-form"
import {
  Navigate,
  ScopeProvider,
  ViewResourceContextProvider,
  findResource,
  useResolvedViewParams,
  useScopeContext,
  type ViewResourceContextParams,
} from "react-resource-view"

import { TalkDrawer } from "@/components/console/talk-drawer"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsoleProvider, useConsole } from "@/hooks/use-console"
import { RunnerMoodProvider } from "@/hooks/use-mood"
import { useBoard } from "@/lib/board-store"
import { useLanguage, useT } from "@/lib/i18n"
import { SCOPE } from "@/lib/resource-view"
import { consoleRouter, useRoute } from "@/lib/router"
import { consoleScope, scopes } from "@/resources/scope"
import { TICKETS, boardHref } from "@/resources/tickets"

/* The shape of the page.
 *
 * react-resource-view's admin layout: a menu down the left built from the
 * scope, a bar over the page, a bottom navigation on a phone. Every page is a
 * resource of that scope — the board, a ticket, the context, the projects, the
 * schedules, the settings — so what the address names is handed to the
 * package, which draws the matching view inside the layout the scope declares.
 *
 * One thing stays outside it: the conversation, a drawer opened by the bubble
 * in the bottom corner at every width. The page keeps its width until you ask
 * for it, and a trip through the menu does not close it.
 */

const ACTIONS = new Set<string>(Object.values(ActionList))

/** The page the address names, drawn in the scope's layout. */
function Page({ params }: { params: ViewResourceContextParams }) {
  const language = useLanguage()
  const scope = useScopeContext()?.scope
  const action =
    params.resourceAction && ACTIONS.has(params.resourceAction)
      ? params.resourceAction
      : ActionList.list
  const resourceId = params.resourceId ?? TICKETS
  const resource = findResource({ scope: SCOPE, resourceId })
  const resolved = useResolvedViewParams({ ...params, resource, resourceAction: action })
  // An address naming a page this console does not have lands on the board,
  // rather than on an error thrown from inside the package — the live page's
  // `/?view=console/live/list` among them, now that sessions are read on their
  // tickets.
  if (!resource) return <Navigate to={boardHref()} replace />
  return (
    // The language is part of the key: what the package draws — the view's
    // name, a column header, the words on a form — it reads from the
    // dictionary as it builds, not as it renders. The resource, the action and
    // the id are in it too, because the context resolves them once.
    <ViewResourceContextProvider
      key={`${language}:${resourceId}:${action}:${String(resolved.id ?? "")}`}
      decoratorComponent={scope?.decoratorComponent}
      {...resolved}
    />
  )
}

/** What the tab says: where you are, so seven tabs of "Ponos" are not a row to open one by one. */
function useTitle(params: ViewResourceContextParams, ticketShort?: string) {
  const t = useT()
  const resourceId = String(params.resourceId ?? TICKETS)
  const here =
    resourceId === TICKETS && params.resourceAction === ActionList.read && params.id
      ? `#${ticketShort ?? String(params.id).slice(-8)}`
      : (consoleScope.menu?.find((item) => (item as { resource?: string }).resource === resourceId)
          ?.name ?? t("Board"))
  React.useEffect(() => {
    document.title = here ? `${here} · Ponos` : "Ponos"
  }, [here])
}

function Console() {
  const { params, moved } = useRoute()
  const board = useBoard()
  const { ticket, openTicket, closeTicket } = useConsole()

  // The address says which ticket is open; the board says what it is, so the
  // discussion loads while the page is still being read.
  const ticketId =
    (params.resourceId ?? TICKETS) === TICKETS &&
    params.resourceAction === ActionList.read &&
    params.id
      ? String(params.id)
      : null
  React.useEffect(() => {
    if (!ticketId) {
      closeTicket()
      return
    }
    const known = board.tickets.find((item) => item.id === ticketId)
    if (known) openTicket(known)
  }, [ticketId, board, openTicket, closeTicket])

  useTitle(params, ticket?.short)

  if (moved) return <Navigate to={moved} replace />

  return (
    <>
      <React.Suspense fallback={null}>
        <ScopeProvider scopeName={SCOPE} configScope={scopes}>
          <Page params={params} />
        </ScopeProvider>
      </React.Suspense>

      {/* Over everything, at every width: the conversation is never a page you
          navigate to and lose your place for. */}
      <TalkDrawer />
    </>
  )
}

const router = consoleRouter(Console)

export default function App() {
  return (
    <TooltipProvider>
      <ConsoleProvider>
        <RunnerMoodProvider>
          <RouterProvider router={router} />
          <Toaster />
        </RunnerMoodProvider>
      </ConsoleProvider>
    </TooltipProvider>
  )
}
