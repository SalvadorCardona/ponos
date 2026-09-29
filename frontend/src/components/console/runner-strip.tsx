import { Activity, Gauge, Timer } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useConsole, useStatus } from "@/hooks/use-console"
import { t as translate, useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

import { Rich } from "./text"

/* The runner's three numbers, in one line over the board.
 *
 * How many sessions are writing, how often the timer comes round, what has been
 * handled and what it cost. They had a page of their own, as three big tiles
 * over the sessions — and the sessions now live on their tickets, so the numbers
 * came to the board, where those tickets are, as a strip rather than tiles: a
 * board is for reading cards, and a row of figures over it is read in one
 * glance or not at all.
 *
 * Above them, whatever is stopping the whole thing: a timer that is on above a
 * board that stands still has only one other honest reading, and it is "this
 * thing is broken". Everything is read off the state the console already has.
 */

/* What the timer's state is called, in words. `systemctl is-enabled` answers
 * in its own vocabulary — `not-found`, `masked`, `static` — and "timer
 * not-found" is a log line, not a sentence. */
const TIMER: Record<string, string> = {
  disabled: "timer switched off — ticket-runner enable",
  "not-found": "timer not installed — ticket-runner enable",
  "not installed": "timer not installed — ticket-runner enable",
  masked: "timer masked in systemd",
  stalled: "timer on, with no next run",
  "no systemd": "no systemd on this machine",
  unknown: "timer state unknown",
}

function timerNote(state: string | undefined): string {
  if (!state) return "—"
  const said = TIMER[state]
  return said ? translate(said) : translate("timer {{state}}", { state })
}

/** An interval, as somebody would say it out loud. */
function every(seconds: number): string {
  if (!seconds) return "—"
  return seconds < 120 ? `${seconds}s` : `${Math.round(seconds / 60)} min`
}

function Figure({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Activity
  label: string
  value: string
  note: string
  tone?: string
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <Icon className="text-muted-foreground size-3.5 shrink-0 self-center" aria-hidden />
      <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-muted-foreground truncate font-mono text-[0.7rem]">· {note}</span>
    </div>
  )
}

export function RunnerStrip() {
  const { runner, board } = useConsole()
  const { running: sessions } = useStatus()
  const t = useT()
  const running = board.tickets.filter((item) => item.column === "running").length
  const on = runner?.timer === "enabled"

  return (
    <div className="mb-4 flex flex-col gap-3">
      {runner?.credits ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t(
              "Out of credit until {{at}}. The subscription's window is spent: tickets stay where they are, and the first run after that takes them again.",
              { at: runner.credits_at }
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {runner && !runner.claude ? (
        <Alert variant="destructive">
          <AlertDescription>
            <Rich text={t("`claude` was not found on this machine: no session can start.")} />
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="bg-card flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border px-3.5 py-2 text-sm">
        <Figure
          icon={Activity}
          label={t("sessions")}
          value={String(sessions.length)}
          note={
            running
              ? t("{{count}} ticket(s) in progress", { count: String(running) })
              : t("nothing in progress")
          }
          tone={sessions.length ? "text-tr-green" : undefined}
        />
        <Figure
          icon={Timer}
          label={t("timer")}
          value={on ? every(runner?.interval_seconds ?? 0) : t("off")}
          note={on ? t("between two runs") : timerNote(runner?.timer)}
          tone={on ? undefined : "text-tr-amber"}
        />
        <Figure
          icon={Gauge}
          label={t("handled")}
          value={String(runner?.handled ?? 0)}
          note={t("${{amount}} spent so far", { amount: String(runner?.spend ?? 0) })}
        />
      </div>
    </div>
  )
}
