import * as React from "react"
import { CheckIcon, ChevronRightIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react"

import { useT } from "@/lib/i18n"
import { named, outline, type Outlined, type StepState } from "@/lib/thinking"
import type { Step } from "@/lib/types"
import { cn } from "@/lib/utils"

/* What a session is doing, one tool call to a line.
 *
 * A block of its own rather than part of the transcript: it scrolls inside
 * itself, so a run that reads forty files does not push the answer above it off
 * the screen — and when the run ends the block stays, dimmed, as the record of
 * how the answer was arrived at.
 *
 * A line is the step's name and how it went; its detail — the command as it was
 * typed, what the tool answered when it failed — is one click down, and is not
 * drawn until then, so a run of two hundred steps weighs two hundred lines. An
 * errored step opens by itself; what a reader opened or closed after that is
 * theirs, kept by the step's place in the run and so held as new steps arrive.
 */
export function Steps({
  steps,
  done = false,
  className,
}: {
  steps: Step[]
  done?: boolean
  className?: string
}) {
  const [chosen, setChosen] = React.useState<Record<number, boolean>>({})
  const items = outline(steps, done)
  if (!items.length) return null
  return (
    <ul
      className={cn(
        "scroll-thin bg-muted/40 max-h-64 overflow-y-auto rounded-lg border px-1.5 py-1.5 text-xs leading-relaxed",
        done && "opacity-80",
        className
      )}
    >
      {items.map((item) => {
        const open = chosen[item.index] ?? item.state === "error"
        return (
          <StepRow
            key={item.index}
            item={item}
            open={open}
            onToggle={() => setChosen((was) => ({ ...was, [item.index]: !open }))}
          />
        )
      })}
    </ul>
  )
}

const MARK: Record<StepState, { icon: typeof CheckIcon; color: string }> = {
  running: { icon: LoaderCircleIcon, color: "text-tr-amber motion-safe:animate-spin" },
  ok: { icon: CheckIcon, color: "text-tr-green" },
  error: { icon: TriangleAlertIcon, color: "text-tr-red" },
}

function StepRow({ item, open, onToggle }: { item: Outlined<Step>; open: boolean; onToggle: () => void }) {
  const t = useT()
  const body = React.useId()
  const line = named(item.step)
  const name = t(line.key, line.params)
  const { icon: Icon, color } = MARK[item.state]
  const status = { running: t("going on"), ok: t("done"), error: t("failed") }[item.state]
  return (
    <li data-slot="step" data-state={item.state}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={body}
        title={name}
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left outline-none focus-visible:ring-2"
      >
        <ChevronRightIcon className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", color)} />
        <span className="sr-only">{status}</span>
        <span className={cn("truncate", item.state === "error" && "text-tr-red")}>{name}</span>
      </button>
      {open ? (
        <div id={body} className="space-y-1.5 pt-0.5 pr-1.5 pb-1.5 pl-[2.125rem]">
          <Output label={item.step.label === "Error" ? t("Error") : t("Called with")} text={item.step.detail} />
          {item.error ? <Output label={t("Error")} text={item.error} failed /> : null}
        </div>
      ) : null}
    </li>
  )
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
