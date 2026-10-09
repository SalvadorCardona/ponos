import { useT } from "@/lib/i18n"

import { PageHead } from "./frame"
import { IdeaList } from "./ideas-list"

/* Every idea Ponos proposed, as a page of the menu.
 *
 * The swipe sorts ten ideas in a minute and the project's tab lists one
 * project's; this is all of them, each saying whom it is for. The list is the
 * same one — see `ideas-list.tsx` — so the gestures are the same everywhere.
 */

export function IdeasPane() {
  const t = useT()
  return (
    <div data-slot="ideas-page">
      <PageHead
        title={t("Ideas")}
        blurb={t("What Ponos proposed, kept or thrown away, for the workspace and for each project.")}
      />
      <IdeaList everywhere />
    </div>
  )
}
