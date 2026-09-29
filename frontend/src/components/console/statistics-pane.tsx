import * as React from "react"
import { addDays, format, subDays, subMonths } from "date-fns"
import { ChartLine } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, why } from "@/lib/api"
import { currentLanguage, useT } from "@/lib/i18n"
import type { Statistics, StatisticsDay } from "@/lib/types"
import { columnName } from "@/resources/tickets"

import { EmptyState } from "./empty-state"
import { Eyebrow, PageHead, Panel } from "./frame"
import { LineChart } from "./line-chart"
import { Robot } from "./robot"

/* What the runner got through, over a period.
 *
 * Three questions, in the order somebody asks them: how many are open, how many
 * came in, how many went out — the cards answer them for the period, the
 * curves day by day. The figures are the server's (`web/statistics.py`, which
 * also says how a closing is dated); this page asks for a period and draws.
 *
 * "Open" on a card is the last point of its curve — the evening of the last
 * day — so a period that ends today says what the board says, not a sum over
 * the month nobody could check against it.
 */

type Range = "7d" | "1m" | "3m" | "custom"

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
  { key: "custom", label: "Custom" },
]

const ISO = "yyyy-MM-dd"

/** The first and last day of a range that ends today. */
function span(range: Exclude<Range, "custom">, today: Date): { from: string; to: string } {
  const first =
    range === "7d"
      ? subDays(today, 6)
      : addDays(subMonths(today, range === "1m" ? 1 : 3), 1)
  return { from: format(first, ISO), to: format(today, ISO) }
}

/* The period picked, outside the pane: a trip to a ticket and back should not
 * put the page back on its month. */
let kept: { range: Range; from: string; to: string } | null = null

const locale = () => (currentLanguage() === "fr" ? "fr-FR" : "en-GB")
const date = (day: string) => new Date(`${day}T00:00:00`)
const short = (point: StatisticsDay) =>
  date(point.day).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit" })
const long = (point: StatisticsDay) =>
  date(point.day).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "long" })
const dollars = (value: number) => `$${value.toFixed(value >= 100 ? 0 : 2)}`

export function StatisticsPane() {
  const t = useT()
  const [period, setPeriod] = React.useState(
    () => kept ?? { range: "1m" as Range, ...span("1m", new Date()) }
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
    <div className="flex min-w-0 flex-col">
      <PageHead
        title={t("What came in, what went out.")}
        blurb={t(
          "Tickets created, closed and still open, day after day. Open means any column but done — blocked and failed included."
        )}
      >
        <Tabs value={period.range} onValueChange={(value) => choose(value as Range)}>
          <TabsList>
            {RANGES.map((range) => (
              <TabsTrigger key={range.key} value={range.key}>
                {t(range.label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {period.range === "custom" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input
              type="date"
              aria-label={t("From")}
              className="w-auto"
              value={period.from}
              max={period.to || today}
              onChange={(event) => setPeriod((known) => ({ ...known, from: event.target.value }))}
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              aria-label={t("To")}
              className="w-auto"
              value={period.to}
              min={period.from}
              max={today}
              onChange={(event) => setPeriod((known) => ({ ...known, to: event.target.value }))}
            />
          </div>
        ) : null}
      </PageHead>

      {problem ? (
        <p className="text-tr-amber border-tr-amber/30 bg-tr-amber/10 mb-4 rounded-xl border px-4 py-3 text-sm">
          {problem}
        </p>
      ) : null}

      {!figures ? (
        problem ? null : (
          <p className="text-muted-foreground flex items-center gap-3 text-sm">
            <Robot state="thinking" size={40} />
            {t("Counting the tickets…")}
          </p>
        )
      ) : (
        <Figures figures={figures} />
      )}
    </div>
  )
}

function Figures({ figures }: { figures: Statistics }) {
  const t = useT()
  const { totals, days } = figures
  const cards = [
    { label: "Open", value: String(totals.open), note: t("on the evening of the last day") },
    { label: "Closed", value: String(totals.closed), note: t("moved to done in the period") },
    { label: "Created", value: String(totals.created), note: t("added to the board in the period") },
    { label: "Spent", value: dollars(totals.cost), note: t("by the runner's sessions in the period") },
  ]
  const busiest = Math.max(1, ...figures.statuses.map((item) => item.count))
  const widest = Math.max(1, ...figures.projects.map((item) => item.count))
  const nothing = !totals.created && !totals.closed && !totals.open

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <section key={card.label} className="bg-card min-w-0 rounded-xl border px-4 py-3.5">
            <Eyebrow>{t(card.label)}</Eyebrow>
            <p className="mt-1 text-3xl leading-none font-bold tracking-[-0.03em] tabular-nums">
              {card.value}
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs">{card.note}</p>
          </section>
        ))}
      </div>

      {nothing ? (
        <EmptyState icon={ChartLine}>{t("No ticket on the board over this period.")}</EmptyState>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <Panel eyebrow={t("Per day")} title={t("Created and closed")} className="min-w-0 xl:col-span-2">
            <LineChart
              points={days}
              label={t("Tickets created and closed per day")}
              day={short}
              longDay={long}
              series={[
                { key: "created", label: t("Created"), color: "var(--series-1)", value: (point) => point.created },
                { key: "closed", label: t("Closed"), color: "var(--series-2)", value: (point) => point.closed },
              ]}
            />
          </Panel>

          <Panel eyebrow={t("Every evening")} title={t("Open tickets")} className="min-w-0">
            <LineChart
              points={days}
              label={t("Tickets still open, evening after evening")}
              day={short}
              longDay={long}
              area
              series={[
                { key: "open", label: t("Open"), color: "var(--series-1)", value: (point) => point.open },
              ]}
            />
          </Panel>

          <Panel eyebrow={t("Running total")} title={t("Spent")} className="min-w-0">
            <LineChart
              points={days}
              label={t("Spent since the start of the period")}
              day={short}
              longDay={long}
              whole={false}
              format={dollars}
              area
              series={[
                { key: "cost", label: t("Spent"), color: "var(--series-1)", value: (point) => point.cost },
              ]}
            />
          </Panel>

          <Panel eyebrow={t("Created in the period")} title={t("By status")} className="min-w-0">
            <Bars
              rows={figures.statuses.map((item) => ({
                label: columnName(item.key) || t("No status"),
                count: item.count,
              }))}
              most={busiest}
            />
          </Panel>

          <Panel eyebrow={t("Created in the period")} title={t("By project")} className="min-w-0">
            <Bars
              rows={figures.projects.map((item) => ({
                label: item.name || t("No project"),
                count: item.count,
              }))}
              most={widest}
            />
          </Panel>
        </div>
      )}

      <p className="text-muted-foreground text-xs leading-relaxed">
        {t(
          "A closing is dated by the runner's history when the runner closed the ticket ({{history}}), by the page's last edit in Notion otherwise ({{edited}}).",
          { history: String(figures.dated.history), edited: String(figures.dated.edited) }
        )}
      </p>
    </div>
  )
}

/** A count per name, as bars of one colour: how many, not which. */
function Bars({ rows, most }: { rows: { label: string; count: number }[]; most: number }) {
  const t = useT()
  if (!rows.length)
    return <p className="text-muted-foreground text-sm">{t("No ticket created in the period.")}</p>
  return (
    <ul className="flex flex-col gap-2">
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
          <span className="font-mono text-xs font-semibold tabular-nums">{row.count}</span>
        </li>
      ))}
    </ul>
  )
}
