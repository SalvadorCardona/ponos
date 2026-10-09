import * as React from "react"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { counted, useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/* Deleting a project, from the list and from its page.
 *
 * One dialog for both, and no way around it: the menu only opens the dialog,
 * and the button in it stays off until the project's name has been typed —
 * the server asks for the name too, so the gesture cannot be done without.
 * It says what is about to happen in the order it happens: the project leaves
 * the console and the runner for good, its page goes to the Notion trash, its
 * tickets are stopped (or trashed, if asked), and what is on the machine is not
 * touched. */

/** What the dialog needs to know of a project. */
export interface Deletable {
  id: string
  name: string
}

export function DeleteProjectDialog({
  project,
  tickets,
  open,
  onOpenChange,
  onDeleted,
}: {
  project: Deletable
  /** How many tickets point at it, `null` while the board has not arrived. */
  tickets: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const t = useT()
  const [typed, setTyped] = React.useState("")
  const [trash, setTrash] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [refused, setRefused] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setTyped("")
    setTrash(false)
    setRefused("")
  }, [open])

  const matches = typed.trim() === project.name
  const confirm = async () => {
    if (!matches || busy) return
    setBusy(true)
    setRefused("")
    try {
      const done = await api.deleteProject(project.id, { confirm: typed.trim(), trash_tickets: trash })
      onOpenChange(false)
      toast.success(t("Project “{{name}}” deleted", { name: done.name }), {
        description: done.url
          ? t("Its page is in the Notion trash for 30 days.")
          : t("Its page was put aside in the board's trash folder."),
        duration: 15_000,
        action: done.url
          ? { label: t("Undo in Notion"), onClick: () => window.open(done.url, "_blank", "noreferrer") }
          : undefined,
      })
      onDeleted()
    } catch (error) {
      setRefused(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent data-delete-project>
        <DialogHeader>
          <DialogTitle>{t("Delete “{{name}}”?", { name: project.name })}</DialogTitle>
          <DialogDescription>
            {tickets === null
              ? t("Ponos will stop following this project.")
              : tickets === 0
                ? t("Ponos will stop following this project. No ticket points at it.")
                : counted(
                    tickets,
                    "Ponos will stop following this project. {{count}} ticket points at it.",
                    "Ponos will stop following this project. {{count}} tickets point at it."
                  )}
          </DialogDescription>
        </DialogHeader>

        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
          <li>{t("It disappears from the console and is no longer synchronised: the runner takes none of its tickets, and no more tokens are spent on it.")}</li>
          <li>{t("Its page goes to the Notion trash, where it can be restored for 30 days.")}</li>
          <li>
            {trash
              ? t("Its tickets go to the Notion trash too.")
              : t("Its tickets stay on the board; those that are ready or in progress are blocked, with a comment saying why.")}
          </li>
          <li>{t("The GitHub repository and the folder on this machine are never deleted. Its throwaway worktrees are cleaned up.")}</li>
          <li>{t("Its ideas are deleted; what it cost stays in the statistics.")}</li>
        </ul>

        {tickets ? (
          <Label className="items-start gap-2.5 text-sm font-normal">
            <Checkbox checked={trash} onCheckedChange={(next) => setTrash(next === true)} className="mt-0.5" />
            <span>
              {counted(
                tickets,
                "Also move its {{count}} ticket to the Notion trash",
                "Also move its {{count}} tickets to the Notion trash"
              )}
            </span>
          </Label>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="delete-project-name" className="text-sm font-normal">
            {t("Type the project's name to confirm:")} <strong className="font-semibold">{project.name}</strong>
          </Label>
          <Input
            id="delete-project-name"
            value={typed}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(typed) && !matches}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void confirm()
            }}
          />
        </div>

        {refused ? (
          <p role="alert" className="text-destructive text-sm">
            {refused}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" disabled={!matches || busy} onClick={() => void confirm()}>
            <Trash2 />
            {busy ? t("Deleting…") : t("Delete the project")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The “…” menu of a project, whose one entry opens the dialog above. */
export function ProjectMenu({
  project,
  tickets,
  onDeleted,
  className,
}: {
  project: Deletable
  tickets: number | null
  onDeleted: () => void
  className?: string
}) {
  const t = useT()
  const [asking, setAsking] = React.useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            data-project-menu
            className={cn("text-muted-foreground", className)}
            aria-label={t("More actions on “{{name}}”", { name: project.name })}
            title={t("More actions")}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setAsking(true)}>
            <Trash2 />
            {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteProjectDialog
        project={project}
        tickets={tickets}
        open={asking}
        onOpenChange={setAsking}
        onDeleted={onDeleted}
      />
    </>
  )
}
