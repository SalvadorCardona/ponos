import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  getCollectionTotal,
  useCurrentViewResourceContext,
  useListViewContext,
} from "react-resource-view"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/* The pages of a list, in the console's words.
 *
 * react-resource-view draws its own, and writes most of it as it stands —
 * "Showing 1 to 30 sur 475 results", half English and half French whatever the
 * console is in, with four dots between the pages. The package lets a view
 * bring its own (`components.pagination`), so this is the same pagination —
 * the same page size, the same `page` filter, the same pages shown — with every
 * word going through the dictionary. */

type Gap = "before" | "after"

/** The pages a button is drawn for: the first, the last, and the ones around the current one. */
function visible(current: number, total: number): (number | Gap)[] {
  if (total <= 4) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | Gap)[] = [1]
  if (current > 2) pages.push("before")
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++)
    pages.push(page)
  if (current < total - 1) pages.push("after")
  pages.push(total)
  return pages
}

export function Pagination() {
  const t = useT()
  const list = useListViewContext()
  const { resource, view } = useCurrentViewResourceContext()
  if (!list.originalData) return null

  const perPage = view.itemsPerPage ?? 30
  const current = Number(list.filterContext.filter["page"] ?? 1)
  const items = getCollectionTotal(list.originalData, resource) ?? 0
  const total = Math.ceil(items / perPage)
  if (items === 0 || total <= 1) return null

  const go = (page: number) => list.filterContext.updateFilter({ page })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-4">
      <nav aria-label={t("Pagination")} className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("Previous page")}
          disabled={current === 1}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft />
        </Button>
        {visible(current, total).map((page) =>
          typeof page === "number" ? (
            <Button
              key={page}
              variant={page === current ? "secondary" : "ghost"}
              size="icon-sm"
              aria-current={page === current ? "page" : undefined}
              className={cn("tabular-nums", page === current && "font-semibold")}
              onClick={() => go(page)}
            >
              {page}
            </Button>
          ) : (
            <span key={page} aria-hidden className="text-muted-foreground px-1">
              …
            </span>
          )
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("Next page")}
          disabled={current === total}
          onClick={() => go(current + 1)}
        >
          <ChevronRight />
        </Button>
      </nav>
      <p className="text-muted-foreground text-sm tabular-nums">
        {t("Showing {{from}} to {{to}} of {{total}} results", {
          from: String((current - 1) * perPage + 1),
          to: String(Math.min(current * perPage, items)),
          total: String(items),
        })}
      </p>
    </div>
  )
}
