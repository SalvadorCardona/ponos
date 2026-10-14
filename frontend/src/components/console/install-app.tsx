import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useT } from "@/lib/i18n"
import { applyUpdate, install, useInstallOffer, useUpdateWaiting } from "@/lib/service-worker"

/* Ponos as an app: a quiet icon in the bar, drawn only where it can do
 * something — see `lib/install.ts` for when that is. Where the browser offers
 * to install, a click does it; on iOS there is nothing to call, so the click
 * says where the button is instead.
 */
export function InstallApp() {
  const offer = useInstallOffer()
  const t = useT()
  if (offer === "none") return null

  const button = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("Install the app")}
      onClick={offer === "prompt" ? () => void install() : undefined}
    >
      <Download />
    </Button>
  )

  if (offer === "prompt") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{t("Install the app")}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Popover>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent align="end" className="text-sm">
        <p className="font-medium">{t("Install the app")}</p>
        <p className="text-muted-foreground mt-1">{t("Share → Add to Home Screen")}</p>
      </PopoverContent>
    </Popover>
  )
}

/* A new version of the console is installed and waiting: a toast that stays
 * until it is answered, because the window that is open is on the old one. */
export function UpdateNotice() {
  const waiting = useUpdateWaiting()
  const t = useT()
  React.useEffect(() => {
    if (!waiting) return
    const id = toast(t("New version available"), {
      id: "app-update",
      duration: Infinity,
      action: { label: t("Reload"), onClick: applyUpdate },
    })
    return () => void toast.dismiss(id)
  }, [waiting, t])
  return null
}
