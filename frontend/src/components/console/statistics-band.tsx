import * as React from "react"
import { format, subDays } from "date-fns"
import { ChevronRight } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, why } from "@/lib/api"
import { currentBoard } from "@/lib/board-store"
import { currentLanguage, useT } from "@/lib/i18n"
import { money, number } from "@/lib/numbers"
import type { Statistics, StatisticsDay } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Eyebrow, Panel } from "./frame"
import { LineChart } from "./line-chart"
import { Robot } from "./robot"

/* What the runner got through, over a period — at the top of the dashboard.
 *
 * It was a page of its own, and a page nobody opened: the figures are read
 * with the board under them or not at all. So they came to the board as a band
 * that keeps to a glance — four numbers, two short curves, the projects — and
 * folds away into one line for whoever came for the cards. The figures are the
 * server's (`web/statistics.py`, which also says how a closing is dated); this
 * band asks for a period and draws.
 *
 * "Open" on a card is the last point of its curve — the evening of the last
 * day — so a period that ends today says what the board says, not a sum over
 * the week nobody could check against it.
 */

type Range = "24h" | "7d" | "30d" | "all" | "custom"

const RANGES: { key: Range; label: string }[] = [
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
]

const ISO = "yyyy-MM-dd"

// What `web/statistics.py` still draws: a period of 731 days or more is refused.
const LONGEST = 730

/* The days before today a range reaches back. The server counts in days, not
 * hours, so the last 24 hours are yesterday and today: a ticket closed last
 * night is in them, which today alone would have left out. */
const BACK: Record<Exclude<Range, "all" | "custom">, number> = { "24h": 1, "7d": 6, "30d": 29 }

/** The day the oldest ticket on the board was created, as far back as the server goes. */
function oldest(today: Date): Date {
  const limit = subDays(today, LONGEST)
  const created = (currentBoard()?.tickets ?? [])
    .map((ticket) => new Date(ticket.created).getTime())
    .filter((time) => !Number.isNaN(time))
  const first = created.length ? new Date(Math.min(...created)) : limit
  return first < limit ? limit : first
}

/** The first and last day of a range that ends today. */
function span(range: Exclude<Range, "custom">, today: Date): { from: string; to: string } {
  const first = range === "all" ? oldest(today) : subDays(today, BACK[range])
  return { from: format(first, ISO), to: format(today, ISO) }
}

/* The period picked, outside the band: a trip to a ticket and back should not
 * put the dashboard back on its week. */
let kept: { range: Range; from: string; to: string } | null = null

/* Whether the band is folded, as the last person at this browser left it. Open
 * by default: the figures are why the dashboard is more than the board. */
const FOLDED_KEY = "ponos-dashboard-statistics"

function useFolded() {
  const [folded, setFolded] = React.useState(() => {
    try {
      return localStorage.getItem(FOLDED_KEY) === "folded"
    } catch {
      return false
    }
  })
  const change = React.useCallback((next: boolean) => {
    setFolded(next)
    try {
      localStorage.setItem(FOLDED_KEY, next ? "folded" : "open")
    } catch {
      // Storage off: the choice lasts as long as the tab, which is still one.
    }
  }, [])
  return [folded, change] as const
}

const locale = () => (currentLanguage() === "fr" ? "fr-FR" : "en-GB")
const date = (day: string) => new Date(`${day}T00:00:00`)
const short = (point: StatisticsDay) =>
  date(point.day).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit" })
const long = (point: StatisticsDay) =>
  date(point.day).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "long" })
const dollars = (value: number) => money(value, value >= 100 ? 0 : 2)

// The curves' height: a glance over the board, not a page of their own.
const CHART = 104

export function StatisticsBand() {
  const t = useT()
  const [folded, setFolded] = useFolded()
  const [period, setPeriod] = React.useState(
    () => kept ?? { range: "7d" as Range, ...span("7d", new Date()) }
  )
  const [figures, setFigures] = React.useState<Statistics | null>(null)
  const [problem, setProblem] = React.useState("")
  const asked = React.useRef(0)

  const valid = Boolean(period.from && period.to && period.from <= period.to)

  React.useEffect(() => {
    kept = period
    if (!valid) return
    // Only the answer to the last question asked is drawn: clicking through
    // three ranges must not end on the first one's figures.
    const mine = ++asked.current
    api
      .statistics(period.from, period.to)
      .then((fresh) => {
        if (mine !== asked.current) return
        setFigures(fresh)
        setProblem("")
      })
      .catch((error) => {
        if (mine === asked.current) setProblem(why(error))
      })
  }, [period, valid])

  const choose = (range: Range) =>
    setPeriod((known) =>
      range === "custom" ? { ...known, range } : { range, ...span(range, new Date()) }
    )

  const today = format(new Date(), ISO)

  return (
    <Collapsible
      open={!folded}
      onOpenChange={(open) => setFolded(!open)}
      className="mb-4 flex min-w-0 flex-col gap-3"
      aria-label={t("Statistics")}
      data-slot="statistics-band"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-1.5 rounded-md outline-none focus-visible:ring-2">
          <ChevronRight
            className={cn("size-3.5 shrink-0 transition-transform", !folded && "rotate-90")}
            aria-hidden
          />
          <Eyebrow className="text-inherit">{t("Statistics")}</Eyebrow>
          {folded && figures ? (
            <span className="truncate font-mono text-[0.7rem] tabular-nums">
              ·{" "}
              {t("{{open}} open · {{closed}} closed · {{created}} created · {{cost}} spent", {
                open: number(figures.totals.open),
                closed: number(figures.totals.closed),
                created: number(figures.totals.created),
                cost: dollars(figures.totals.cost),
              })}
            </span>
          ) : null}
        </CollapsibleTrigger>
        <div className="flex flex-wrap items-center gap-2">
          {period.range === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input
                type="date"
                aria-label={t("From")}
                className="h-8 w-auto"
                value={period.from}
                max={period.to || today}
                onChange={(event) => setPeriod((known) => ({ ...known, from: event.target.value }))}
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="date"
                aria-label={t("To")}
                className="h-8 w-auto"
                value={period.to}
                min={period.from}
                max={today}
                onChange={(event) => setPeriod((known) => ({ ...known, to: event.target.value }))}
              />
            </div>
          ) : null}
          <Tabs value={period.range} onValueChange={(value) => choose(value as Range)}>
            <TabsList className="h-8">
              {RANGES.map((range) => (
                <TabsTrigger key={range.key} value={range.key} className="text-xs">
                  {t(range.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <CollapsibleContent className="flex min-w-0 flex-col gap-3">
        {problem ? (
          <p className="text-tr-amber border-tr-amber/30 bg-tr-amber/10 rounded-xl border px-4 py-2.5 text-sm">
            {problem}
          </p>
        ) : null}

        {!figures ? (
          problem ? null : (
            <p className="text-muted-foreground flex items-center gap-3 text-sm">
              <Robot state="thinking" size={32} />
              {t("Counting the tickets…")}
            </p>
          )
        ) : (
          <Figures figures={figures} />
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function Figures({ figures }: { figures: Statistics }) {
  const t = useT()
  const { totals, days } = figures
  const cards = [
    { label: "Open", value: number(totals.open), note: t("on the evening of the last day") },
    {
      label: "Closed",
      value: number(totals.closed),
      note: t("moved to done in the period"),
      // How the closings were dated, for whoever wonders: the page said it at
      // its foot, the band says it under the pointer rather than in a line more.
      more: t(
        "A closing is dated by the runner's history when the runner closed the ticket ({{history}}), by the page's last edit in Notion otherwise ({{edited}}).",
        { history: String(figures.dated.history), edited: String(figures.dated.edited) }
      ),
    },
    { label: "Created", value: number(totals.created), note: t("added to the board in the period") },
    { label: "Spent", value: dollars(totals.cost), note: t("by the runner's sessions in the period") },
  ]
  const projects = figures.projects.slice(0, 5)
  const widest = Math.max(1, ...projects.map((item) => item.count))
  const nothing = !totals.created && !totals.closed && !totals.open

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <section
            key={card.label}
            className="bg-card min-w-0 rounded-xl border px-3.5 py-2.5"
            title={card.more ?? card.note}
          >
            <Eyebrow>{t(card.label)}</Eyebrow>
            <p className="mt-1 text-2xl leading-none font-bold tracking-[-0.03em] tabular-nums">
              {card.value}
            </p>
            <p className="text-muted-foreground mt-1 truncate text-[0.7rem]">{card.note}</p>
          </section>
        ))}
      </div>

      {nothing ? (
        <p className="text-muted-foreground text-sm">{t("No ticket on the board over this period.")}</p>
      ) : (
        <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Panel eyebrow={t("Created and closed")} className="min-w-0" bodyClassName="pb-3">
            <LineChart
              points={days}
              label={t("Tickets created and closed per day")}
              day={short}
              longDay={long}
              height={CHART}
              series={[
                { key: "created", label: t("Created"), color: "var(--series-1)", value: (point) => point.created },
                { key: "closed", label: t("Closed"), color: "var(--series-2)", value: (point) => point.closed },
              ]}
            />
          </Panel>

          <Panel eyebrow={t("Open tickets")} className="min-w-0" bodyClassName="pb-3">
            <LineChart
              points={days}
              label={t("Tickets still open, evening after evening")}
              day={short}
              longDay={long}
              height={CHART}
              area
              series={[
                { key: "open", label: t("Open"), color: "var(--series-1)", value: (point) => point.open },
              ]}
            />
          </Panel>

          <Panel
            eyebrow={t("Created, by project")}
            className="min-w-0 md:col-span-2 xl:col-span-1"
            bodyClassName="pb-3"
          >
            <Bars
              rows={projects.map((item) => ({
                label: item.name || t("No project"),
                count: item.count,
              }))}
              most={widest}
            />
          </Panel>
        </div>
      )}
    </>
  )
}

/** A count per name, as bars of one colour: how many, not which. */
function Bars({ rows, most }: { rows: { label: string; count: number }[]; most: number }) {
  const t = useT()
  if (!rows.length)
    return <p className="text-muted-foreground text-sm">{t("No ticket created in the period.")}</p>
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={row.label}>
            {row.label}
          </span>
          <span className="bg-muted h-2 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(row.count / most) * 100}%`, background: "var(--series-1)" }}
            />
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums">{number(row.count)}</span>
        </li>
      ))}
    </ul>
  )
}
