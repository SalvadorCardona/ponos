import * as React from "react"

import { cn } from "@/lib/utils"

/* A line over days, and nothing a chart library would add.
 *
 * The console draws three curves, on one page, over at most a few hundred
 * points: a dependency the size of the rest of the bundle for that is a
 * dependency this project would have to keep up with for ever. So it is an SVG,
 * drawn in the pixels it is given rather than stretched from a viewBox — a
 * stretched stroke is thick on a wide screen and hairline on a phone, and a
 * stretched label is unreadable on both.
 *
 * What it keeps from the charts people are used to reading: one axis starting
 * at zero, a few quiet rules, a legend as soon as there are two lines, and a
 * crosshair that says every value of the day under the pointer. The same
 * numbers are in a table a screen reader reads instead of the picture.
 */

export interface Series<T> {
  key: string
  label: string
  /** A CSS colour — one of the `--series-*` variables. */
  color: string
  value: (point: T) => number
}

const HEIGHT = 200
const MARGIN = { top: 12, right: 12, bottom: 24, left: 40 }

/** A step for the rules that lands on a round number: 1, 2, 5, 10, 20… */
function niceStep(rough: number, whole: boolean): number {
  if (rough <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough)
  const found = step ?? 10 * power
  return whole ? Math.max(1, Math.ceil(found)) : found
}

export function LineChart<T>({
  points,
  series,
  label,
  day,
  longDay,
  format = (value) => String(value),
  whole = true,
  area = false,
  className,
}: {
  points: T[]
  series: Series<T>[]
  /** What the chart shows, for whoever cannot see it. */
  label: string
  /** The short date under the axis. */
  day: (point: T) => string
  /** The date in the tooltip and the table. */
  longDay: (point: T) => string
  format?: (value: number) => string
  /** Counts, whose rules are never at 2.5. */
  whole?: boolean
  /** A shaded area under a lone line: a stock, rather than a rate. */
  area?: boolean
  className?: string
}) {
  const frame = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)
  const [hovered, setHovered] = React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const inner = Math.max(0, width - MARGIN.left - MARGIN.right)
  const tall = HEIGHT - MARGIN.top - MARGIN.bottom
  const highest = Math.max(0, ...points.flatMap((point) => series.map((line) => line.value(point))))
  const step = niceStep(highest / 4, whole)
  const top = Math.max(step, Math.ceil(highest / step) * step)
  const rules: number[] = []
  for (let value = 0; value <= top + step / 2; value += step) rules.push(value)

  const x = (index: number) =>
    MARGIN.left + (points.length > 1 ? (index * inner) / (points.length - 1) : inner / 2)
  const y = (value: number) => MARGIN.top + tall - (value / top) * tall

  // One date every eighty pixels or so, always the first and the last.
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(inner / 80))))
  const ticks = points
    .map((_, index) => index)
    .filter((index) => index % every === 0 && points.length - 1 - index >= every / 2)
  if (points.length) ticks.push(points.length - 1)

  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!points.length || inner <= 0) return
    const left = event.currentTarget.getBoundingClientRect().left
    const ratio = (event.clientX - left - MARGIN.left) / inner
    const index = Math.round(ratio * (points.length - 1))
    setHovered(Math.min(points.length - 1, Math.max(0, index)))
  }

  const at = hovered !== null ? points[hovered] : undefined

  return (
    <div className={cn("min-w-0", className)}>
      {series.length > 1 ? (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-hidden>
          {series.map((line) => (
            <li key={line.key} className="text-muted-foreground inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full" style={{ background: line.color }} />
              {line.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div ref={frame} className="relative w-full" style={{ height: HEIGHT }}>
        {width > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={label}
            className="block touch-pan-y select-none"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHovered(null)}
          >
            {rules.map((value) => (
              <g key={value}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="stroke-border"
                  strokeDasharray={value === 0 ? undefined : "2 4"}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(value)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground font-mono text-[0.65rem]"
                >
                  {format(value)}
                </text>
              </g>
            ))}

            {ticks.map((index) => (
              <text
                key={index}
                x={x(index)}
                y={HEIGHT - 6}
                textAnchor={
                  points.length > 1 && index === 0
                    ? "start"
                    : index === points.length - 1 && points.length > 1
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground font-mono text-[0.65rem]"
              >
                {day(points[index])}
              </text>
            ))}

            {series.map((line) => {
              const path = points
                .map((point, index) => `${index ? "L" : "M"}${x(index)},${y(line.value(point))}`)
                .join("")
              return (
                <g key={line.key}>
                  {area && series.length === 1 && points.length ? (
                    <path
                      d={`${path}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                      fill={line.color}
                      opacity={0.12}
                    />
                  ) : null}
                  <path
                    d={path}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              )
            })}

            {hovered !== null && at ? (
              <g>
                <line
                  x1={x(hovered)}
                  x2={x(hovered)}
                  y1={MARGIN.top}
                  y2={MARGIN.top + tall}
                  className="stroke-muted-foreground"
                  strokeOpacity={0.5}
                />
                {series.map((line) => (
                  <circle
                    key={line.key}
                    cx={x(hovered)}
                    cy={y(line.value(at))}
                    r={4}
                    fill={line.color}
                    className="stroke-card"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        ) : null}

        {hovered !== null && at ? (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-1 z-10 min-w-32 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style={
              x(hovered) > width / 2
                ? { right: width - x(hovered) + 10 }
                : { left: x(hovered) + 10 }
            }
          >
            <p className="text-muted-foreground mb-1 font-medium">{longDay(at)}</p>
            {series.map((line) => (
              <p key={line.key} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: line.color }} />
                  {line.label}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {format(line.value(at))}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {series.map((line) => (
              <th key={line.key} scope="col">
                {line.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => (
            <tr key={index}>
              <th scope="row">{longDay(point)}</th>
              {series.map((line) => (
                <td key={line.key}>{format(line.value(point))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
