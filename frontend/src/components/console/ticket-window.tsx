import * as React from "react"
import { Maximize2, XIcon } from "lucide-react"
import { ActionList } from "react-data-form"
import { Link, ViewResourceContextProvider, useCurrentViewResourceContext } from "react-resource-view"

import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { titleOf, useBoard } from "@/lib/board-store"
import { useT } from "@/lib/i18n"
import { ticketHref } from "@/resources/tickets"

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
const listeners = new Set<() => void>()

function show(id: string | null) {
  if (windowed === id) return
  windowed = id
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
    <Dialog open={Boolean(id)} onOpenChange={(open) => (open ? undefined : show(null))}>
      <DialogContent
        data-ticket-window
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 p-0 sm:max-w-3xl"
      >
        <DialogHeader className="flex-row items-start gap-2 border-b px-5 py-3 text-left sm:text-left">
          <div className="min-w-0 flex-1">
            {ticket ? (
              <p className="text-muted-foreground font-mono text-xs">#{ticket.short}</p>
            ) : null}
            <DialogTitle
              className="line-clamp-2 text-base leading-snug break-words"
              title={title}
            >
              {title || t("Ticket")}
            </DialogTitle>
          </div>
          {shown ? (
            <Link
              to={ticketHref(shown)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              title={t("Open the full page")}
              aria-label={t("Open the full page")}
            >
              <Maximize2 />
            </Link>
          ) : null}
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" title={t("Close")} aria-label={t("Close")}>
              <XIcon />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {shown ? (
            <ViewResourceContextProvider
              key={shown}
              resource={resource}
              resourceAction={ActionList.read}
              id={shown}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
