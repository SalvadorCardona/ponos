import * as React from "react"
import { ActionList } from "react-data-form"
import { ViewResourceContextProvider, useCurrentViewResourceContext } from "react-resource-view"

import { useT } from "@/lib/i18n"

import { RecordWindow } from "./record-window"

/* A schedule opened from the list, in the window a ticket opens in over the
 * board (`RecordWindow`) — and for the same reason as its own store rather than
 * the package's drawer: that one lives in the button that opens it, and is gone
 * as soon as the list draws that row again. The schedule inside is the `update`
 * view, as on its page. */

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

const useScheduleWindow = () => React.useSyncExternalStore(subscribe, () => windowed)

/** What a schedule's name does in the list: a plain click opens the window, a middle click still opens the page. */
export const opensScheduleInTheWindow = (id: string) => (event: React.MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  show(id)
}

/** The window itself, drawn once by the list. `titleOf` and `hrefOf` are the list's: this module does not import it. */
export function ScheduleWindow({
  titleOf,
  hrefOf,
  actionsOf,
}: {
  titleOf: (id: string) => string
  hrefOf: (id: string) => string
  /** What sits in the header beside the page button: the list's, for the same reason. */
  actionsOf?: (id: string) => React.ReactNode
}) {
  const id = useScheduleWindow()
  const { resource } = useCurrentViewResourceContext()
  const t = useT()
  const last = React.useRef(id)
  if (id) last.current = id
  const shown = last.current

  // The list left for another page: the window does not come back with it.
  React.useEffect(() => () => show(null), [])

  return (
    <RecordWindow
      open={Boolean(id)}
      onClose={() => show(null)}
      title={shown ? titleOf(shown) : ""}
      fallbackTitle={t("Schedule")}
      href={shown ? hrefOf(shown) : undefined}
      actions={shown && actionsOf ? actionsOf(shown) : undefined}
    >
      {shown ? (
        <ViewResourceContextProvider
          key={shown}
          resource={resource}
          resourceAction={ActionList.update}
          id={shown}
        />
      ) : null}
    </RecordWindow>
  )
}
