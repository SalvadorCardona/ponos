import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { ActionList } from "react-data-form"
import { Link, ResourceViewButton, useCurrentViewResourceContext } from "react-resource-view"

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/lib/i18n"
import {
  KindBadge,
  NewTicket,
  Repository,
  RowMenu,
  TicketTally,
  Where,
  idOf,
  isAPage,
  pick,
  projectHref,
  readProject,
  usePicked,
  useProjects,
  type ProjectItem,
} from "@/resources/projects"

import { ContextBlock } from "./context-block"
import { Eyebrow, Fact, Facts } from "./frame"
import { ProjectBrief } from "./project-brief"
import { ProjectThumb } from "./project-picture"
import { Chip } from "./ticket-bits"

/* What sits beside the list of projects.
 *
 * The global context first — always, folded to a few lines, because it is what
 * every ticket is told and the one thing worth seeing without asking — then the
 * project picked in the list, with what the page of a project holds that a row
 * has no room for: where its code is, the brief it adds to the global context,
 * and its actions. The page of the project stays a link away for its tickets,
 * ideas and settings.
 *
 * Wide, it is a column next to the list (see `index.css`). On a phone the list
 * comes first and a picked project opens over it, full screen, in a sheet.
 */

const WIDE = "(min-width: 64rem)"

/** Whether the screen is wide enough for the panel to sit beside the list. */
function useWide(): boolean {
  return React.useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(WIDE)
      query.addEventListener("change", listener)
      return () => query.removeEventListener("change", listener)
    },
    () => window.matchMedia(WIDE).matches
  )
}

export function ProjectAside() {
  const read = useProjects()
  const chosen = usePicked()
  const wide = useWide()
  const t = useT()
  const found = read?.projects.find((project) => idOf(project) === chosen)
  return (
    <aside data-projects-aside className="flex min-w-0 flex-col gap-4 [&>[data-slot=context-block]]:mb-0">
      <ContextBlock />
      {found && wide ? <ProjectDetail key={chosen} id={chosen} /> : null}
      {found && !wide ? (
        <Sheet open onOpenChange={(opened) => !opened && pick("")}>
          <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-4 pt-12 sm:max-w-none">
            <SheetTitle className="sr-only">{found.name}</SheetTitle>
            <SheetDescription className="sr-only">{t("Project")}</SheetDescription>
            <ProjectDetail key={chosen} id={chosen} />
          </SheetContent>
        </Sheet>
      ) : null}
    </aside>
  )
}

/** One project: the row the list read, then its page where it has one, for the brief. */
function ProjectDetail({ id }: { id: string }) {
  const t = useT()
  const read = useProjects()
  const { resource } = useCurrentViewResourceContext()
  const [full, setFull] = React.useState<ProjectItem | null>(null)
  React.useEffect(() => {
    let current = true
    readProject(id)
      .then((one) => current && setFull(one))
      .catch(() => current && setFull(null))
    return () => {
      current = false
    }
  }, [id, read])
  if (!full)
    return (
      <div data-project-panel className="bg-card flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  const page = isAPage(full.id)
  return (
    <section data-project-panel className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <ProjectThumb project={full} className="size-11" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h3 className="w-full truncate text-lg leading-tight font-semibold" title={full.name}>
            {full.name}
          </h3>
          <span className="flex flex-wrap items-center gap-1.5">
            <KindBadge project={full} />
            {full.source === "config" ? (
              <Chip className="rounded-full px-1.5 py-0 text-[0.65rem]">{t("from the configuration")}</Chip>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NewTicket project={full} />
        {page ? (
          <span className="[&_button]:w-auto">
            <ResourceViewButton action={ActionList.update} resource={resource} id={full.id} data={full} />
          </span>
        ) : null}
        <Link
          to={projectHref(full.id)}
          data-project-open
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
        >
          {t("Open the project's page")}
          <ArrowUpRight className="size-3.5" />
        </Link>
        <span className="ml-auto">
          <RowMenu project={full} onDeleted={() => pick("")} />
        </span>
      </div>

      <TicketTally project={full} />

      <Facts>
        <Fact label={t("repository")}>
          <Repository declared={full.repository} />
        </Fact>
        <Fact label={t("local folder")}>
          <Where path={full.where} kind={full.kind} />
        </Fact>
      </Facts>

      {page ? (
        <ProjectBrief project={full} />
      ) : (
        <div>
          <Eyebrow>{t("the brief")}</Eyebrow>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {t("This project is a line in config.toml and has no page: the board has never heard of it, so there is nothing here to write a brief on.")}
          </p>
        </div>
      )}
    </section>
  )
}
