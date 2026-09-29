import * as React from "react"
import { Maximize2, MessageCircle, Minimize2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useConsole } from "@/hooks/use-console"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

import { ConsolePane } from "./console-pane"
import { TicketTalk } from "./ticket-talk"

/* The discussion, behind a bubble.
 *
 * It used to be a column: half the screen given to a conversation whether or
 * not there was one, an entry in the menu to reach it on a phone, and a switch
 * in the bar to fold it away — three places to learn for one thing to open. A
 * bubble in the bottom corner is the gesture everybody already knows, and the
 * page keeps its full width until you ask for the conversation.
 *
 * What it opens is what you are looking at: on a ticket, that ticket's
 * discussion; anywhere else, the workspace's own. Same rule as the column it
 * replaces, and the same two panes — only the way in changed.
 */

/* Opened from elsewhere: a section of the settings runs `> doctor` and the
 * answer arrives in the transcript, which is no use behind a closed drawer. An
 * event rather than a value in the console's context, for the same reason the
 * settings are reread on one: whoever asks does not have to be near whoever
 * answers. */
const OPENED = "ticket-runner:talk"

/** Open the drawer, from anywhere on the page. */
export const openTalk = () => window.dispatchEvent(new Event(OPENED))

/* How wide the drawer is.
 *
 * It opened at 32rem, the width of a form, and a conversation is not a form: an
 * answer with a table or a block of code in it wrapped every other line. Half
 * the screen by default, between a width that still reads and one past which a
 * line of prose is too long to follow — and whatever you last dragged it to,
 * kept in `localStorage` like the theme, because a width you chose once is the
 * width you want the next time. On a phone none of this applies: the drawer is
 * the whole screen, as it always was. */
const WIDTH_KEY = "ticket-runner-talk-width"
const NARROWEST = 360
/** The board keeps this much of itself visible beside a dragged drawer. */
const MARGIN = 48
/** How far an arrow key moves the edge. */
const STEP = 32

function keptWidth(): number | null {
  try {
    const kept = Number(localStorage.getItem(WIDTH_KEY))
    return Number.isFinite(kept) && kept >= NARROWEST ? kept : null
  } catch {
    // Storage switched off: the drawer opens at its default width every time.
    return null
  }
}

function keepWidth(width: number | null) {
  try {
    if (width === null) localStorage.removeItem(WIDTH_KEY)
    else localStorage.setItem(WIDTH_KEY, String(Math.round(width)))
  } catch {
    // The width holds for as long as the tab is open, which is the whole cost.
  }
}

const within = (width: number) =>
  Math.max(NARROWEST, Math.min(width, window.innerWidth - MARGIN))

/** Alt+Shift+F: a key a textarea does nothing with, and no browser takes for itself. */
const isFullKey = (event: React.KeyboardEvent) =>
  event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "KeyF"

export function TalkDrawer() {
  const { ticket } = useConsole()
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [width, setWidth] = React.useState<number | null>(keptWidth)
  const [full, setFull] = React.useState(false)
  // The width a drag started from, and where the pointer was: the edge follows
  // the pointer by the distance it moved, not to wherever it happens to be.
  const drag = React.useRef<{ x: number; width: number } | null>(null)
  const content = React.useRef<HTMLDivElement>(null)

  const resize = (next: number) => {
    const bounded = within(next)
    setWidth(bounded)
    keepWidth(bounded)
  }

  React.useEffect(() => {
    const listener = () => setOpen(true)
    window.addEventListener(OPENED, listener)
    return () => window.removeEventListener(OPENED, listener)
  }, [])

  const label = ticket ? t("the discussion") : t("the console")
  const fullLabel = full ? t("Leave full screen") : t("Full screen")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            {/* Hidden while the drawer is over it: the sheet's own close is
                where a reader looks for it, and a bubble under the overlay is
                a button that answers nothing. Raised on a phone, where the
                admin layout's navigation runs along the bottom edge. */}
            <Button
              size="icon-lg"
              aria-label={t("open {{pane}}", { pane: label })}
              className="fixed right-4 bottom-24 z-40 md:bottom-4 size-12 rounded-full shadow-lg data-[state=open]:hidden"
            >
              <MessageCircle className="size-5" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">{t("open {{pane}}", { pane: label })}</TooltipContent>
      </Tooltip>

      <SheetContent
        ref={content}
        side="right"
        className={cn(
          "w-full gap-0",
          full
            ? "sm:w-screen sm:max-w-none"
            : "sm:w-[var(--talk-width,clamp(32rem,50vw,900px))] sm:max-w-[calc(100vw-3rem)]"
        )}
        style={width ? ({ "--talk-width": `${width}px` } as React.CSSProperties) : undefined}
        closeLabel={t("Close")}
        onKeyDown={(event) => {
          if (!isFullKey(event)) return
          event.preventDefault()
          setFull((current) => !current)
        }}
        // Opened to say something: the cursor goes where the words go, not to
        // the cross in the corner that the dialog would otherwise pick.
        onOpenAutoFocus={(event) => {
          const field = event.currentTarget instanceof HTMLElement
            ? event.currentTarget.querySelector("textarea")
            : null
          if (!field || field.disabled) return
          event.preventDefault()
          field.focus()
        }}
      >
        {/* The pane under it opens with its own heading — which ticket, or
            which machine you are talking to — so the sheet's is for the
            readers who are told the page rather than shown it. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {ticket
              ? t("Everything said on the ticket, oldest first. What you type is a comment on it.")
              : t("A sentence talks to your workspace; a line that starts with > runs a command.")}
          </SheetDescription>
        </SheetHeader>
        {/* The edge the drawer is pulled by. A separator, in the ARIA sense,
            so the arrow keys move it for whoever does not drag; a double click
            puts it back where it opens by default. Gone in full screen, where
            there is no edge left to pull, and on a phone, where the drawer is
            the screen. */}
        {full ? null : (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("Resize the drawer")}
            aria-valuemin={NARROWEST}
            aria-valuenow={Math.round(width ?? content.current?.offsetWidth ?? 0)}
            tabIndex={0}
            className="hover:bg-primary/40 focus-visible:bg-primary/60 active:bg-primary/60 absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none transition-colors outline-none sm:block"
            onPointerDown={(event) => {
              if (event.button !== 0 || !content.current) return
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = { x: event.clientX, width: content.current.offsetWidth }
            }}
            onPointerMove={(event) => {
              if (!drag.current) return
              // Pulled left, wider: the drawer hangs from the right edge.
              setWidth(within(drag.current.width + drag.current.x - event.clientX))
            }}
            onPointerUp={(event) => {
              if (!drag.current) return
              drag.current = null
              event.currentTarget.releasePointerCapture(event.pointerId)
              if (content.current) keepWidth(content.current.offsetWidth)
            }}
            onDoubleClick={() => {
              setWidth(null)
              keepWidth(null)
            }}
            onKeyDown={(event) => {
              const current = content.current?.offsetWidth ?? 0
              if (event.key === "ArrowLeft") resize(current + STEP)
              else if (event.key === "ArrowRight") resize(current - STEP)
              else return
              event.preventDefault()
            }}
          />
        )}
        {/* Beside the sheet's own cross, which the panes leave room for. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${fullLabel} (Alt+Shift+F)`}
              aria-pressed={full}
              className="absolute top-2 right-10 z-10 hidden opacity-70 hover:opacity-100 sm:inline-flex"
              onClick={() => setFull((current) => !current)}
            >
              {full ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{`${fullLabel} · Alt+Shift+F`}</TooltipContent>
        </Tooltip>
        {ticket ? <TicketTalk /> : <ConsolePane />}
      </SheetContent>
    </Sheet>
  )
}
