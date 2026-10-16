import * as React from "react"
import { Pause } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useT } from "@/lib/i18n"
import { type Said, type WorkTime, brief, clock, worked } from "@/lib/worktime"

/* How long Ponos worked on a ticket, as the page and the card say it.
 *
 * The count is the server's (`worktime.py`): the runs of the ticket, the clock
 * stopped while it waited on a question, a block or credit, and not running in
 * review. What this does is only to keep it going while a session works — from
 * the reading it was handed, not from a clock of its own — and to say why it
 * stopped. A ticket no run was ever made for says « — »: nothing is not zero. */

/** A span said in the language the page is in. */
function useSaid() {
  const t = useT()
  return (said: Said) => t(said.key, said.params)
}

/** The current second, ticking only while `on`: a stopped clock does not wake the page. */
function useNow(on: boolean): number {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!on) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [on])
  return now
}

/** The Brief's cell: the time worked, live while a session works, ⏸ with the reason when it waits. */
export function TicketTime({ time }: { time?: WorkTime | null }) {
  const t = useT()
  const said = useSaid()
  const read = React.useMemo(() => (time ? Date.now() : 0), [time])
  const now = useNow(Boolean(time?.running))
  const [hover, setHover] = React.useState(false)
  const [pinned, setPinned] = React.useState(false)
  if (!time) return <span className="text-muted-foreground">—</span>

  const reasons = {
    question: t("On hold: waiting for your answer"),
    blocked: t("On hold: the ticket is blocked"),
    credit: t("On hold: waiting for credit"),
  }
  const why = time.pause ? reasons[time.pause] : ""
  return (
    <Popover open={hover || pinned} onOpenChange={(open) => !open && setPinned(false)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="ticket-time"
          title={why || undefined}
          className="inline-flex max-w-full items-center gap-1 tabular-nums"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => setPinned((on) => !on)}
        >
          {why ? <Pause aria-label={why} className="text-muted-foreground size-3.5 shrink-0" /> : null}
          <span className="truncate">{said(clock(worked(time, read, now)))}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 text-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
          <dt className="text-muted-foreground">{t("Working time")}</dt>
          <dd>{said(clock(worked(time, read, now)))}</dd>
          <dt className="text-muted-foreground">{t("Time on hold")}</dt>
          <dd>{said(clock(time.paused))}</dd>
          <dt className="text-muted-foreground">{t("Sessions")}</dt>
          <dd>{time.sessions}</dd>
        </dl>
        {why ? <p className="text-muted-foreground mt-2 text-xs">{why}</p> : null}
      </PopoverContent>
    </Popover>
  )
}

/** Whether a card has a time to wear: none for a ticket with no run, nor for one that worked seconds. */
export const hasCardTime = (time?: WorkTime | null): time is WorkTime =>
  Boolean(time && (time.work >= 30 || time.running))

/** The time worked, on a card: quiet, whole minutes. */
export function CardTime({ time }: { time?: WorkTime | null }) {
  const said = useSaid()
  if (!hasCardTime(time)) return null
  return (
    <span className="text-muted-foreground tabular-nums" data-slot="ticket-card-time">
      {said(brief(time.work))}
    </span>
  )
}
