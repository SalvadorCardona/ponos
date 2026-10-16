import { titleOf, useBoard } from "@/lib/board-store"

import { recordWindow } from "./record-window"

/* A ticket opened from the board, in a window over it.
 *
 * Opening a ticket used to leave the board: the page replaced it, and the way
 * back put you at the top of the cards — or of the table — whatever you were
 * reading. The window keeps the board where it was, under it, and the page is
 * one button away; the page's address is still the one a link shared, the
 * palette and a notification lead to.
 *
 * It is the `open` of the tickets' `read` view (see `tickets.tsx`): a card or a
 * row only links to the ticket, and react-resource-view writes it into the
 * address under the list and draws it in this. Its header says what the board
 * knows of the ticket — its short id, its whole title — before the ticket
 * itself is read.
 *
 * Not importing the tickets, which declare it: the declaration reads this as
 * it is built.
 */
export const ticketWindow = recordWindow({
  type: "ticket-window",
  fallbackTitle: "Ticket",
  useHead: function useTicketHead(id) {
    const ticket = useBoard().tickets.find((item) => item.id === id)
    return { eyebrow: ticket ? `#${ticket.short}` : undefined, title: ticket ? titleOf(ticket) : "" }
  },
})
