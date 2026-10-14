import * as React from "react"
import { Maximize2, XIcon } from "lucide-react"
import { Link } from "react-resource-view"

import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@/lib/i18n"

/* The window a record is opened in over its list: the ticket's over the board,
 * a schedule's over the schedules. One shell, so the two are the same size, on a
 * phone the same whole screen, and have the same two buttons in their header —
 * the record's own page, and the cross. What is inside is the caller's. */
export function RecordWindow({
  open,
  onClose,
  eyebrow,
  title,
  fallbackTitle,
  href,
  actions,
  children,
}: {
  open: boolean
  onClose: () => void
  /** The small line over the title: a ticket's short id. */
  eyebrow?: string
  title: string
  /** What the title says while the record is not known (yet). */
  fallbackTitle: string
  /** The record's full page; no button without one. */
  href?: string
  /** What the record can be made to do, drawn before its page button. */
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent
        data-ticket-window
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 p-0 sm:max-w-3xl"
      >
        <DialogHeader className="flex-row items-start gap-2 border-b px-5 py-3 text-left sm:text-left">
          <div className="min-w-0 flex-1">
            {eyebrow ? <p className="text-muted-foreground font-mono text-xs">{eyebrow}</p> : null}
            <DialogTitle
              className="line-clamp-2 text-base leading-snug break-words"
              title={title}
            >
              {title || fallbackTitle}
            </DialogTitle>
          </div>
          {actions}
          {href ? (
            <Link
              to={href}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              title={t("Open the full page")}
              aria-label={t("Open the full page")}
            >
              <Maximize2 />
            </Link>
          ) : null}
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" title={t("Close")} aria-label={t("Close")}>
              <XIcon />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
