import * as React from "react"
import { useLocation, useRouter } from "@tanstack/react-router"
import { ActionList } from "react-data-form"
import { Link, ResourceViewButton, useCurrentViewResourceContext, useNavigate } from "react-resource-view"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { counted, useT } from "@/lib/i18n"
import { useRoute } from "@/lib/router"
import {
  Repository,
  Where,
  isAPage,
  projectsHref,
  useTicketCount,
  whyNotRead,
  type ProjectItem,
} from "@/resources/projects"
import { settingsHref } from "@/resources/settings"

import { Eyebrow, Fact, Facts } from "./frame"
import { IdeasButton } from "./ideas-deck"
import { ProjectBrief } from "./project-brief"
import { ProjectMenu } from "./project-delete"
import { IdeaList } from "./ideas-list"
import { ProjectCover } from "./project-picture"
import { ProjectTickets } from "./project-tickets"
import { Robot } from "./robot"
import { StatisticsBand } from "./statistics-band"
import { Away, Chip, reachable } from "./ticket-bits"

/* One project, as a page.
 *
 * The `read` view of the projects resource: the page's cover and icon, what
 * the card said, and then the thing a card has no room for — the brief. Which is the reason to open a
 * project at all: it is not a description of the project, it is what every
 * ticket of that project is told before it is told the ticket.
 *
 * What sits above it — the way back, the name, the edit button — is the
 * layout's header, told what a project adds to it: see `ProjectTitle` and
 * `ProjectActions` below.
 */

export function ProjectPage() {
  const context = useCurrentViewResourceContext()
  const project = context.data as ProjectItem | undefined
  const t = useT()
  const page = project ? isAPage(project.id) : false

  return (
    <div className="min-w-0">
      {!project ? (
        context.error ? (
          <div className="flex flex-col gap-1.5">
            <Robot state="error" size={56} className="mb-2" />
            <p className="text-destructive text-sm">{t("This project could not be read.")}</p>
            {/* And what the server answered, as it answered it: "no such route"
                and "no project with id …" are two different afternoons, and the
                sentence above alone tells neither. */}
            {whyNotRead() ? (
              <p className="text-muted-foreground font-mono text-xs">{whyNotRead()}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Robot state="thinking" size={56} className="mb-2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-2 h-20 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        )
      ) : (
        <>
          {/* A project with a page has its pictures; one the configuration
              alone names has neither page nor pictures to show. */}
          {page ? <ProjectCover project={project} editable /> : null}

          {project.source === "config" || project.configured ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {project.source === "config" ? <Chip>{t("from the configuration")}</Chip> : null}
              {project.configured && project.source === "board" ? (
                <Chip>{t("path set in the configuration")}</Chip>
              ) : null}
            </div>
          ) : null}

          <Facts className="mt-4 first:mt-0">
            <Fact label={t("repository")}>
              <Repository declared={project.repository} />
            </Fact>
            <Fact label={t("on this machine")}>
              <Where path={project.where} kind={project.kind} />
            </Fact>
          </Facts>

          <StatisticsBand project={project.name} />

          <ProjectTabs project={project}>
            {page ? (
              <ProjectBrief project={project} />
            ) : (
              <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
                {t(
                  "This project is a line in config.toml and has no page: the board has never heard of it, so there is nothing here to write a brief on."
                )}{" "}
                <Link to={settingsHref("projects")} className="underline underline-offset-2">
                  {t("Change its path in the settings.")}
                </Link>
              </p>
            )}
          </ProjectTabs>
        </>
      )}
    </div>
  )
}

/* The tabs of a project: its tickets, its ideas, and its brief.
 *
 * The tickets come first, because a project is opened more often to see what is
 * being done on it than to reread what every ticket is told; the ideas next, as
 * what could be done on it — every one of them, thrown away included. A project
 * the configuration alone names has no page for an idea to point at, and no
 * ideas tab. The one picked is written in the address (`&tab=brief`), so a
 * reload or a pasted link comes back to it; the tickets are the tab of an
 * address that says nothing, and of one that says something else. The facts and
 * the statistics stay above the tabs.
 */
const TABS = ["tickets", "ideas", "brief"] as const
type Tab = (typeof TABS)[number]

function ProjectTabs({ project, children }: { project: ProjectItem; children: React.ReactNode }) {
  const t = useT()
  const { pathname, searchStr } = useLocation()
  const router = useRouter()
  const { params } = useRoute()
  const mine = params.resourceAction === ActionList.read && String(params.id ?? "") === project.id
  const named = new URLSearchParams(searchStr).get("tab")
  const ideas = isAPage(project.id)
  const tab: Tab =
    mine && TABS.includes(named as Tab) && (named !== "ideas" || ideas) ? (named as Tab) : "tickets"
  const pick = (value: string) => {
    if (!mine) return
    const rest = searchStr
      .replace(/^\?/, "")
      .split("&")
      .filter((part) => part && !part.startsWith("tab="))
    router.history.replace(`${pathname}?${[...rest, `tab=${value}`].join("&")}`)
  }
  return (
    <Tabs value={tab} onValueChange={pick} className="mt-6 gap-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="tickets" data-slot="project-tickets-tab">
          {t("Tickets")}
        </TabsTrigger>
        {ideas ? (
          <TabsTrigger value="ideas" data-slot="project-ideas-tab">
            {t("Ideas")}
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="brief" data-slot="project-brief-tab">
          {t("Brief")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tickets">
        <ProjectTickets project={project} />
      </TabsContent>
      {ideas ? (
        <TabsContent value="ideas">
          <IdeaList project={project.id.replace(/-/g, "")} name={project.name} find />
        </TabsContent>
      ) : null}
      <TabsContent value="brief">{children}</TabsContent>
    </Tabs>
  )
}

/* The top of the page is the layout's: the way back, the title, the line under
 * it and the actions, drawn by react-resource-view the way it draws them on
 * every page of the console. The page drew its own on top of it — two ways
 * back, two titles, two edit buttons — so what only a project has is handed to
 * that header instead: the kind of work above the name, and on the right the
 * page in Notion, how many tickets point at it, and the edit button.
 */

/** The name, under the kind of work it is. */
export function ProjectTitle() {
  const project = useCurrentViewResourceContext().data as ProjectItem | undefined
  const t = useT()
  return (
    <div className="min-w-0">
      {project ? <Eyebrow>{project.work}</Eyebrow> : null}
      <h2 className="truncate text-2xl font-semibold tracking-tight">
        {project ? project.name : t("Project")}
      </h2>
    </div>
  )
}

/**
 * What the header offers besides the way back.
 *
 * The edit button is the package's own, as the header would have drawn it:
 * the same form, the same drawer and the same toast as everywhere else. A
 * project the configuration alone names has no page to write to, so it gets
 * none — the page says where it is changed instead.
 */
export function ProjectActions() {
  const context = useCurrentViewResourceContext()
  const project = context.data as ProjectItem | undefined
  useT()
  const count = useTicketCount(project?.name ?? "")
  const navigate = useNavigate()
  if (!project) return null
  /** Where the project is really written, when that is somewhere a browser can go. */
  const away = reachable(project.url) ? project.url : ""
  return (
    <>
      {away ? <Away label="Notion" href={away} /> : null}
      {isAPage(project.id) ? <IdeasButton project={project.id} name={project.name} /> : null}
      {count === null ? (
        <Skeleton className="h-5 w-16 rounded-full" />
      ) : count ? (
        <Chip>{counted(count, "{{count}} ticket", "{{count}} tickets")}</Chip>
      ) : null}
      {isAPage(project.id) ? (
        <>
          <ResourceViewButton
            action={ActionList.update}
            resource={context.resource}
            id={project.id}
            data={project}
          />
          <ProjectMenu
            project={project}
            tickets={count}
            onDeleted={() => void navigate({ to: projectsHref() })}
          />
        </>
      ) : null}
    </>
  )
}
