import * as React from "react"
import {
  BookOpen,
  CalendarClock,
  FolderGit2,
  LayoutGrid,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings2,
} from "lucide-react"
import { ActionList } from "react-data-form"
import { generateLinkByResource, useNavigate } from "react-resource-view"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useConsole } from "@/hooks/use-console"
import { hotkeyLabel, useHotkeys } from "@/hooks/use-hotkeys"
import { titleOf, useBoard } from "@/lib/board-store"
import { useT } from "@/lib/i18n"
import { contextHref } from "@/resources/context"
import { idOf, projectHref, projectsHref, projectsOnce, useProjects } from "@/resources/projects"
import { schedulesHref } from "@/resources/schedules"
import { settingsHref } from "@/resources/settings"
import { boardHref, ticketHref, tickets } from "@/resources/tickets"

import { toggleTalk } from "./talk-drawer"

/* Ctrl+K: everywhere the console can take you, typed rather than clicked.
 *
 * What it lists is what the console already has — its pages, the projects, the
 * tickets on the board — and the few things done from anywhere: a new ticket,
 * the conversation, a resynchronisation. Nothing in it is a page of its own;
 * an entry is a link the menu or a card already offers, found by its name.
 *
 * The pages are said again here rather than read off the scope's menu, icons
 * and all: the scope imports the bar this palette's button sits in, and
 * reading it from here would be a circle.
 */

const OPENED = "ponos:palette"

/** Open the palette, from anywhere on the page — the button in the bar. */
export const openPalette = () => window.dispatchEvent(new Event(OPENED))

const PAGES = [
  { name: "Dashboard", icon: LayoutGrid, href: boardHref },
  { name: "Projects", icon: FolderGit2, href: projectsHref },
  { name: "Schedules", icon: CalendarClock, href: schedulesHref },
  { name: "Context", icon: BookOpen, href: contextHref },
  { name: "Settings", icon: Settings2, href: () => settingsHref() },
]

export function CommandPalette() {
  const t = useT()
  const navigate = useNavigate()
  const board = useBoard()
  const listed = useProjects()
  const { refresh } = useConsole()
  const [open, setOpen] = React.useState(false)
  // What had the focus before the palette opened, and gets it back: the
  // dialog has no trigger to hand it to.
  const before = React.useRef<HTMLElement | null>(null)
  // What an entry asked for, done once the palette has let go of the focus —
  // so the drawer it opens takes the focus rather than losing it to the page.
  const pending = React.useRef<(() => void) | null>(null)

  const change = React.useCallback((next: boolean) => {
    if (next) {
      before.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      pending.current = null
    }
    setOpen(next)
  }, [])

  React.useEffect(() => {
    const listener = () => change(true)
    window.addEventListener(OPENED, listener)
    return () => window.removeEventListener(OPENED, listener)
  }, [change])

  useHotkeys({ palette: () => change(!open) })

  // The projects are read by their own page; one opened straight on the board
  // has not read them yet.
  React.useEffect(() => {
    if (open) void projectsOnce().catch(() => undefined)
  }, [open])

  const run = (action: () => void) => {
    pending.current = action
    setOpen(false)
  }
  const go = (href: string) => run(() => void navigate({ to: href }))

  const drawerKey = hotkeyLabel("console")

  return (
    <CommandDialog
      open={open}
      onOpenChange={change}
      title={t("Command palette")}
      description={t("Find a page, a project or a ticket, or run an action.")}
      closeLabel={t("Close")}
      className="top-[20%] translate-y-0 sm:max-w-xl"
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        const back = before.current
        before.current = null
        if (back?.isConnected) back.focus()
        const action = pending.current
        pending.current = null
        action?.()
      }}
    >
      <CommandInput placeholder={t("Type a page, a project, a ticket…")} />
      <CommandList className="max-h-[min(60vh,420px)]">
        <CommandEmpty>{t("Nothing matches.")}</CommandEmpty>

        <CommandGroup heading={t("Actions")}>
          <CommandItem
            value={t("Open or close the console")}
            keywords={["console", "chat", "discussion"]}
            onSelect={() => run(toggleTalk)}
          >
            <MessageCircle />
            {t("Open or close the console")}
            <CommandShortcut>{drawerKey.label}</CommandShortcut>
          </CommandItem>
          <CommandItem
            value={t("New ticket")}
            keywords={["create", "ticket"]}
            onSelect={() =>
              go(generateLinkByResource({ resource: tickets, resourceAction: ActionList.create }))
            }
          >
            <Plus />
            {t("New ticket")}
          </CommandItem>
          <CommandItem
            value={t("Resynchronise now")}
            keywords={["refresh", "sync"]}
            onSelect={() => run(refresh)}
          >
            <RefreshCw />
            {t("Resynchronise now")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("Pages")}>
          {PAGES.map(({ name, icon: Icon, href }) => (
            <CommandItem
              key={name}
              value={t(name)}
              keywords={[name, "page"]}
              onSelect={() => go(href())}
            >
              <Icon />
              {t(name)}
            </CommandItem>
          ))}
        </CommandGroup>

        {listed?.projects.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("Projects")}>
              {listed.projects.map((project) => (
                <CommandItem
                  key={idOf(project)}
                  value={`${project.name} ${idOf(project)}`}
                  keywords={["project"]}
                  onSelect={() => go(projectHref(idOf(project)))}
                >
                  <FolderGit2 />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {board.tickets.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("Tickets")}>
              {board.tickets.map((ticket) => (
                <CommandItem
                  key={ticket.id}
                  value={`${titleOf(ticket)} ${ticket.short} ${ticket.id}`}
                  keywords={["ticket", ticket.project]}
                  onSelect={() => go(ticketHref(ticket.id))}
                >
                  <LayoutGrid />
                  <span className="truncate">{titleOf(ticket)}</span>
                  <CommandShortcut className="tracking-normal">#{ticket.short}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
