import * as React from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

import { Robot } from "./robot"

/* The button that opens Ponos's pile of ideas, on the dashboard and on a
 * project's page. The pile itself is fetched the first time it is opened
 * rather than with the console (see `ideas-dialog.tsx`): it weighs enough to
 * push the first load past its budget (see
 * `the_console_is_downloaded_once_and_compressed`), and a board you only work
 * on never opens it.
 */

const IdeasDialog = React.lazy(() => import("./ideas-dialog").then((module) => ({ default: module.IdeasDialog })))

/** The dashboard's look for a button that starts something with Ponos: the one
 * every page shares, so that none of them has a style of its own. */
export const ponosActionLook =
  "border-primary/30 text-primary bg-card hover:bg-accent hover:text-primary dark:border-primary/30 dark:bg-primary/10 dark:hover:bg-primary/20 h-8 gap-1.5"

export function IdeasButton({
  project = "",
  name = "",
  onClose,
  inline = false,
  className,
}: {
  /** The project's page; none for the workspace. */
  project?: string
  /** And its name, for the cards. */
  name?: string
  /** Once the deck is closed: what it decided may change a list drawn behind it. */
  onClose?: () => void
  /** Drawn at the end of the runner's strip: a quiet button the strip's height,
   * with the mascot small — and, in a strip narrower than 66rem (the nearest
   * `@container`), the mascot alone, its words in a tooltip, so that the
   * strip keeps its line. */
  inline?: boolean
  className?: string
}) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  // Ponos "thinks" while the button is hovered or focused. Under
  // prefers-reduced-motion it keeps its resting pose: the mascot freezes its
  // own animations, but a pose that changes is still a movement.
  const [eager, setEager] = React.useState(false)
  const wake = (on: boolean) =>
    setEager(on && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  // The tooltip says what the words would, and only when they are not shown.
  const words = React.useRef<HTMLSpanElement>(null)
  const [tip, setTip] = React.useState(false)
  const label = project ? t("Find me ideas for this project") : t("Ponos, find me ideas")
  const button = (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "group/ideas",
        ponosActionLook,
        inline ? "pr-1.5 pl-1 @min-[66rem]:pr-3" : "pr-3 pl-1",
        className
      )}
      data-slot={project ? "project-ideas-button" : "ideas-button"}
      onClick={() => setOpen(true)}
      onPointerEnter={() => wake(true)}
      onPointerLeave={() => wake(false)}
      onFocus={() => wake(true)}
      onBlur={() => wake(false)}
    >
      <span className="relative inline-flex shrink-0">
        <Robot state={eager ? "thinking" : "idle"} size={24} />
        <Sparkles
          aria-hidden="true"
          className="absolute -top-0.5 -right-1 size-3 opacity-0 group-hover/ideas:opacity-100 group-focus-visible/ideas:opacity-100 motion-safe:group-hover/ideas:animate-pulse motion-safe:group-focus-visible/ideas:animate-pulse"
        />
      </span>
      <span ref={words} className={cn(inline && "sr-only @min-[66rem]:not-sr-only")}>
        {label}
      </span>
    </Button>
  )
  return (
    <>
      {inline ? (
        <Tooltip
          open={tip}
          onOpenChange={(on) =>
            setTip(on && !!words.current && getComputedStyle(words.current).position === "absolute")
          }
        >
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {open ? (
        <React.Suspense fallback={null}>
          <IdeasDialog
            project={project}
            name={name}
            onClose={() => {
              setOpen(false)
              onClose?.()
            }}
          />
        </React.Suspense>
      ) : null}
    </>
  )
}

