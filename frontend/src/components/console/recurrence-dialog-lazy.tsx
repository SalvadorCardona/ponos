import * as React from "react"
import type { InputControllerComponentInterface } from "react-data-form"

/* The schedule's form is opened now and then: kept out of the first load,
 * which has a budget (tests/run.py, `the_console_is_downloaded_once_and_compressed`).
 * `resources/schedules` declares the form with these, and `recurrence-dialog`
 * — what draws it — arrives when the window is first opened. */

type Part = React.FC<any>

const lazily = <Name extends string>(name: Name): Part => {
  const Loaded = React.lazy(() =>
    import("@/components/console/recurrence-dialog").then((module) => ({
      default: module[name as keyof typeof module] as Part,
    }))
  )
  return (props) => (
    <React.Suspense fallback={null}>
      <Loaded {...props} />
    </React.Suspense>
  )
}

export const RecurrenceFields = lazily("RecurrenceFields")
export const RecurrenceFoot = lazily("RecurrenceFoot")
export const SegmentsInputController = lazily("SegmentsInputController") as InputControllerComponentInterface
export const DayInputController = lazily("DayInputController") as InputControllerComponentInterface
export const TimeInputController = lazily("TimeInputController") as InputControllerComponentInterface
