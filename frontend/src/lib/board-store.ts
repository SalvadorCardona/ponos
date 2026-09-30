import * as React from "react"

import { api } from "./api"
import type { Board, ColumnKey, Ticket } from "./types"

/* The board, as the stream last said it.
 *
 * react-resource-view asks a resource for its rows through `getCollection`,
 * and the natural thing to give it would be a request to `/api/board`. That
 * would ask Notion again every time the list redraws — while the stream is
 * already carrying the very same board every few seconds, to every open tab.
 * So the rows come from here: the stream writes, the resource reads, and a
 * redraw costs nothing.
 */

let board: Board | null = null
const listeners = new Set<() => void>()
const waiting: ((board: Board) => void)[] = []

const tell = () => listeners.forEach((listener) => listener())

/** What the stream just said. */
export function publishBoard(fresh: Board) {
  board = fresh
  for (const resolve of waiting.splice(0)) resolve(fresh)
  tell()
}

/** A ticket as the console already knows it will be, before Notion confirms.
 *
 * A card dropped in a column has to land there now; the board event that
 * follows the write says the same thing a few seconds later. */
export function patchTicket(id: string, patch: Partial<Ticket>) {
  if (!board) return
  board = {
    ...board,
    tickets: board.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)),
  }
  tell()
}

/** A ticket just written, drawn before the board is reread. */
export function addTicket(ticket: Ticket) {
  if (!board || board.tickets.some((item) => item.id === ticket.id)) return
  board = { ...board, tickets: [...board.tickets, ticket] }
  tell()
}

export const currentBoard = (): Board | null => board

/* A card moved to another column: drawn there now, marked as waiting to be
 * sent, and put back where it was if the console refuses the move. The one way
 * a ticket changes column from the console — the buttons on a card and a card
 * dropped on the board both come through here, so neither can leave a card
 * standing in a column Notion never heard about.
 *
 * The console queues the write rather than making it while this waits: Notion
 * may be slow, or say 429. So "accepted" is not "in Notion" — the card says
 * "waiting" until the board the stream sends next says otherwise, and that
 * board says it failed, too, when it did. Says whether it moved anything. */
export async function moveTicket(id: string, column: ColumnKey): Promise<boolean> {
  const before = board?.tickets.find((ticket) => ticket.id === id)
  if (before && before.column === column) return false
  if (before) patchTicket(id, { column, sync: "pending", sync_error: "" })
  try {
    await api.setStatus(id, column, before?.status)
  } catch (error) {
    if (before)
      patchTicket(id, {
        column: before.column,
        status: before.status,
        sync: before.sync,
        sync_error: before.sync_error,
      })
    throw error
  }
  return true
}

/** The board, as soon as there is one. */
export function boardOnce(): Promise<Board> {
  if (board) return Promise.resolve(board)
  return new Promise((resolve) => waiting.push(resolve))
}

export function subscribeBoard(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* How many tickets point at each project, by its name as a card carries it.
 *
 * Counted here rather than asked of the server: `/api/projects` used to read
 * the whole tickets database again to say it, while every ticket was already
 * in this store. Counted once per board the stream sends, however many cards
 * ask. */
let counted: { from: Board; counts: Map<string, number> } | null = null

function countsOf(from: Board): Map<string, number> {
  if (counted?.from !== from) {
    const counts = new Map<string, number>()
    for (const ticket of from.tickets)
      if (ticket.project) counts.set(ticket.project, (counts.get(ticket.project) ?? 0) + 1)
    counted = { from, counts }
  }
  return counted.counts
}

/** The tickets of each project, by name — `null` until the first board arrives. */
export function useTicketCounts(): Map<string, number> | null {
  const held = React.useSyncExternalStore(subscribeBoard, () => board)
  return held ? countsOf(held) : null
}

const EMPTY: Board = { tickets: [], columns: [] }

export function useBoard(): Board {
  return React.useSyncExternalStore(subscribeBoard, () => board ?? EMPTY)
}
