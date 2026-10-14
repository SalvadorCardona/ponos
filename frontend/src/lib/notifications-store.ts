import * as React from "react"

import type { Bell } from "./types"

/* The bell, as the stream last said it.
 *
 * Kept apart from the console's own state for the reason the board is: it is
 * read by one small piece of the header, and a context that carried it would
 * draw the whole console again every time a session asked for you.
 */

const EMPTY: Bell = { items: [], unread: 0 }

let bell: Bell = EMPTY
const listeners = new Set<() => void>()

/** What the stream just said — or what the server answered to a click. */
export function publishBell(fresh: Bell) {
  bell = fresh
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export const useBell = (): Bell => React.useSyncExternalStore(subscribe, () => bell)
