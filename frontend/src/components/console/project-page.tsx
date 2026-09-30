import { ActionList } from "react-data-form"
import { Link, ResourceViewButton, useCurrentViewResourceContext } from "react-resource-view"

import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/lib/i18n"
import { isAPage, useTicketCount, whyNotRead, type ProjectItem } from "@/resources/projects"
import { settingsHref } from "@/resources/settings"

import { Eyebrow, Fact, Facts } from "./frame"
import { Markdown } from "./markdown"
import { ProjectCover } from "./project-picture"
import { Robot } from "./robot"
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
              <span className="font-mono text-xs" title={project.repository || undefined}>
                {project.repository || "—"}
              </span>
            </Fact>
            <Fact label={t("on this machine")}>
              <span className="font-mono text-xs" title={project.where || undefined}>
                {project.where || t("wherever the clone is")}
              </span>
            </Fact>
          </Facts>

          {page ? (
            <div className="mt-6">
              <Eyebrow>{t("the brief")}</Eyebrow>
              <div className="mt-2">
                {project.content ? (
                  <Markdown text={project.content} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t(
                      "Nothing is written on this page, so its tickets are told about the workspace and nothing about the project."
                    )}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground mt-6 max-w-prose text-sm leading-relaxed">
              {t(
                "This project is a line in config.toml and has no page: the board has never heard of it, so there is nothing here to write a brief on."
              )}{" "}
              <Link to={settingsHref("projects")} className="underline underline-offset-2">
                {t("Change its path in the settings.")}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
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
  const t = useT()
  const count = useTicketCount(project?.name ?? "")
  if (!project) return null
  /** Where the project is really written, when that is somewhere a browser can go. */
  const away = reachable(project.url) ? project.url : ""
  return (
    <>
      {away ? <Away label="Notion" href={away} /> : null}
      {count === null ? (
        <Skeleton className="h-5 w-16 rounded-full" />
      ) : count ? (
        <Chip>{t("{{count}} ticket(s)", { count: String(count) })}</Chip>
      ) : null}
      {isAPage(project.id) ? (
        <ResourceViewButton
          action={ActionList.update}
          resource={context.resource}
          id={project.id}
          data={project}
        />
      ) : null}
    </>
  )
}
