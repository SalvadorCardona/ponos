import * as React from "react"
import { CheckIcon, ChevronRightIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react"

import { counted, useT } from "@/lib/i18n"
import { named, outline, type Outlined, type StepState } from "@/lib/thinking"
import type { Step } from "@/lib/types"
import { cn } from "@/lib/utils"

/* What a session is doing, as a timeline: one card to a tool call.
 *
 * Always in the conversation, drawn as they arrive: a reader who is not a
 * developer still sees that Ponos is working, in sentences that say what for
 * ("I check that everything works"). The tool's own words — the command as it
 * was typed, what it answered when it failed — are the card's body, one click
 * down and not drawn until then, so a run of two hundred steps weighs two
 * hundred headers. Cards start closed; a reader opens the ones they want, or
 * all of them, and what they chose is kept by the step's place in the run, so
 * it holds as new steps arrive.
 *
 * The list scrolls inside itself, so a run that reads forty files does not push
 * the answer off the screen; while the run goes on it follows the newest card,
 * unless the reader has scrolled up to look at an older one.
 */
export function Steps({
  steps,
  done = false,
  summary,
  errors = 0,
  className,
}: {
  steps: Step[]
  done?: boolean
  /** The turn's figures, drawn above the timeline. */
  summary?: string
  errors?: number
  className?: string
}) {
  const t = useT()
  const [chosen, setChosen] = React.useState<Record<number, boolean>>({})
  const items = outline(steps, done)
  const list = React.useRef<HTMLOListElement>(null)
  const following = React.useRef(true)
  React.useLayoutEffect(() => {
    const el = list.current
    if (el && !done && following.current) el.scrollTop = el.scrollHeight
  }, [steps.length, done])
  if (!items.length) return null
  const everything = items.every((item) => chosen[item.index])
  const errorsLine = counted(errors, "{{count}} step went wrong", "{{count}} steps went wrong")
  return (
    <div data-slot="steps" data-done={done || undefined} className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-muted-foreground flex min-w-0 items-center justify-between gap-2 font-mono text-[0.7rem]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{summary}</span>
          {errors ? (
            <span className="text-tr-red inline-flex shrink-0 items-center gap-1" title={errorsLine}>
              <span aria-hidden="true" className="bg-tr-red size-1.5 rounded-full" />
              <span className="sr-only">{errorsLine}</span>
              <span aria-hidden="true">{errors}</span>
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => setChosen(Object.fromEntries(items.map((item) => [item.index, !everything])))}
          className="hover:text-foreground focus-visible:ring-ring/50 shrink-0 rounded-md px-1 py-0.5 underline underline-offset-2 outline-none focus-visible:ring-2"
        >
          {everything ? t("Collapse all") : t("Expand all")}
        </button>
      </div>
      <ol
        ref={list}
        onScroll={(event) => {
          const el = event.currentTarget
          following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
        }}
        className="scroll-thin max-h-80 overflow-y-auto pr-1 text-xs leading-relaxed"
      >
        {items.map((item, at) => {
          const open = chosen[item.index] ?? false
          return (
            <StepCard
              key={item.index}
              item={item}
              open={open}
              last={at === items.length - 1}
              onToggle={() => setChosen((was) => ({ ...was, [item.index]: !open }))}
            />
          )
        })}
      </ol>
    </div>
  )
}

const MARK: Record<StepState, { icon: typeof CheckIcon; color: string }> = {
  running: { icon: LoaderCircleIcon, color: "text-tr-amber motion-safe:animate-spin" },
  ok: { icon: CheckIcon, color: "text-tr-green" },
  error: { icon: TriangleAlertIcon, color: "text-tr-red" },
}

function StepCard({
  item,
  open,
  last,
  onToggle,
}: {
  item: Outlined<Step>
  open: boolean
  last: boolean
  onToggle: () => void
}) {
  const t = useT()
  const body = React.useId()
  const line = named(item.step)
  const name = t(line.key, line.params)
  const { icon: Icon, color } = MARK[item.state]
  const status = { running: t("going on"), ok: t("done"), error: t("failed") }[item.state]
  return (
    <li data-slot="step" data-state={item.state} className="relative flex gap-2 pb-1.5">
      {/* The timeline: the mark of the step on a line that runs to the next one. */}
      <div className="relative flex w-5 shrink-0 justify-center pt-2">
        {last ? null : <span aria-hidden="true" className="bg-border absolute top-5 -bottom-3 w-px" />}
        <span className="bg-background relative z-10 flex size-5 items-center justify-center rounded-full border">
          <Icon aria-hidden="true" className={cn("size-3", color)} />
        </span>
      </div>
      <div
        className={cn(
          "bg-card min-w-0 flex-1 rounded-lg border",
          item.state === "error" && "border-tr-red/40",
          item.state === "running" && "border-tr-amber/40"
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={body}
          onClick={onToggle}
          className="hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-2"
        >
          <span className="sr-only">{status}</span>
          <span className={cn("min-w-0 flex-1 text-sm", item.state === "error" && "text-tr-red")}>{name}</span>
          <ChevronRightIcon
            aria-hidden="true"
            className={cn("text-muted-foreground size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          />
        </button>
        {open ? (
          <div id={body} className="space-y-1.5 border-t px-2 py-1.5">
            <Output label={detailLabel(item.step, t)} text={item.step.detail} />
            {item.error ? <Output label={t("Error")} text={item.error} failed /> : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** What the card's body is: the tool that was called, and with what. */
function detailLabel(step: Step, t: ReturnType<typeof useT>): string {
  return step.label === "Error" ? t("Error") : `${t("Called with")} · ${step.label}`
}

/** More than this, and a block of output is cut with a "See more". */
const SHORT = 300

function Output({ label, text, failed = false }: { label: string; text: string; failed?: boolean }) {
  const t = useT()
  const [all, setAll] = React.useState(false)
  if (!text) return null
  const long = text.length > SHORT
  return (
    <div>
      <p className="text-muted-foreground mb-0.5 text-[0.65rem] tracking-wide uppercase">{label}</p>
      <pre
        className={cn(
          "bg-background/60 scroll-thin max-h-48 overflow-auto rounded-md border px-2 py-1 font-mono text-[0.7rem] break-words whitespace-pre-wrap",
          failed && "border-tr-red/40 text-tr-red"
        )}
      >
        {long && !all ? `${text.slice(0, SHORT).trimEnd()}…` : text}
      </pre>
      {long && !all ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="text-muted-foreground hover:text-foreground mt-0.5 rounded-sm text-[0.7rem] underline underline-offset-2"
        >
          {t("See more")}
        </button>
      ) : null}
    </div>
  )
}
