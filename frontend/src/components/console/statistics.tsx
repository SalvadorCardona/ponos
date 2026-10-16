import * as React from "react"

/* The dashboard's statistics are fetched the first time they are drawn rather
 * than with the console: their charts weigh enough to push the first load past
 * its budget (see `the_console_is_downloaded_once_and_compressed`), and a board
 * you only work on never needs them.
 */

const Band = React.lazy(() => import("./statistics-band").then((module) => ({ default: module.StatisticsBand })))

export function StatisticsBand(props: { project?: string }) {
  return (
    <React.Suspense fallback={null}>
      <Band {...props} />
    </React.Suspense>
  )
}
