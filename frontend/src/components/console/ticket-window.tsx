import * as React from "react"
import { ActionList } from "react-data-form"
import { ViewResourceContextProvider, useCurrentViewResourceContext } from "react-resource-view"

import { titleOf, useBoard } from "@/lib/board-store"
import { useT } from "@/lib/i18n"
import { ticketHref } from "@/resources/tickets"

import { RecordWindow } from "./record-window"

/* A ticket opened from the board, in a window over it.
 *
 * Opening a ticket used to leave the board: the page replaced it, and the way
 * back put you at the top of the cards — or of the table — whatever you were
 * reading. The window keeps the board where it was, under it, and the page is
 * one button away; its address is still the page's, for a link shared, the
 * palette, a notification.
 *
 * react-resource-view has a window of its own (`behavior.openIn: "popup"`),
 * and it is not this one. Its title is the view's name and nothing else goes
 * in its header, so neither the ticket's id nor a way to its page fits there.
 * And it is held by the button that opens it: a card is drawn again in the
 * column a ticket moves to, and a row of the table whenever its data changes,
 * so the stream would close a running ticket's window under the person
 * watching it. This one is held once, for the whole list, by `BoardTop`; a
 * card or a row only says which ticket to open.
 */

let windowed: string | null = null
let asked: string | null = null
const listeners = new Set<() => void>()

function show(id: string | null, tab: string | null = null) {
  if (windowed === id && asked === tab) return
  windowed = id
  asked = tab
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The ticket open in the window, if one is. */
export const useTicketWindow = () => React.useSyncExternalStore(subscribe, () => windowed)

/** The tab the window was asked to open on, when it holds this ticket — Unblock, from a card's button. */
export const useTicketWindowTab = (id: string) =>
  React.useSyncExternalStore(subscribe, () => (windowed === id ? asked : null))

/** Opens a ticket in the window, on one of its tabs: what a card's Unblock does. */
export const openInTheWindow = (id: string, tab: string) => show(id, tab)

/**
 * What a link to a ticket does on the board: a plain click opens the window,
 * and the link stays a link — a middle click or Ctrl+click still opens the page
 * in a tab of its own.
 */
export const opensInTheWindow = (id: string) => (event: React.MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  show(id)
}

/* The window itself, drawn by the list. The ticket inside is the `read` view,
 * as on its page — its `top` included, which is what rereads it when the
 * stream moves the board. The id stays drawn while the window fades out. */
export function TicketWindow() {
  const id = useTicketWindow()
  const { resource } = useCurrentViewResourceContext()
  const board = useBoard()
  const t = useT()
  const last = React.useRef(id)
  if (id) last.current = id
  const shown = last.current
  const ticket = shown ? board.tickets.find((item) => item.id === shown) : undefined
  const title = ticket ? titleOf(ticket) : ""

  // The board left for another page: the window does not come back with it.
  React.useEffect(() => () => show(null), [])

  return (
    <RecordWindow
      open={Boolean(id)}
      onClose={() => show(null)}
      eyebrow={ticket ? `#${ticket.short}` : undefined}
      title={title}
      fallbackTitle={t("Ticket")}
      href={shown ? ticketHref(shown) : undefined}
    >
      {shown ? (
        <ViewResourceContextProvider
          key={shown}
          resource={resource}
          resourceAction={ActionList.read}
          id={shown}
        />
      ) : null}
    </RecordWindow>
  )
}
