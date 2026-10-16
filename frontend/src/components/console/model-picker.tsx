import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Link } from "react-resource-view"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api, why } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { ChatModels } from "@/lib/types"
import { cn } from "@/lib/utils"

import { closeTalk } from "@/lib/talk"

/* The model a session runs on, chosen from the session itself.
 *
 * Two lists, and the second is only there when OpenRouter has a key: the Claude
 * models Claude Code names by family, and every model OpenRouter sells, searched
 * by name. The models the sessions last ran on come first, so the five you use
 * are not a scroll through four hundred. Without a key the picker says so and
 * leads to the setting, rather than hiding a list the person may not know exists.
 *
 * The choice belongs to the session and takes effect on the next message — the
 * one being answered keeps the model it started on. */

/** A model as the picker writes it: Claude's family capitalised, a slug as it is. */
export const modelName = (id: string, known?: ChatModels): string =>
  known?.claude.find((item) => item.id === id)?.name ??
  known?.openrouter.models.find((item) => item.id === id)?.name ??
  id

export function ModelPicker({
  model,
  className,
  onChosen,
  settingsTo,
}: {
  /** What the next turn runs on, as the server resolved it. */
  model: string
  className?: string
  onChosen?: () => void
  /** Where the OpenRouter key is set, for the line that leads there. */
  settingsTo: string
}) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [models, setModels] = React.useState<ChatModels | null>(null)
  const [reading, setReading] = React.useState(false)

  // Read when the list is opened, not before: the catalogue is a request to
  // OpenRouter, and most pages are never going to show it.
  React.useEffect(() => {
    if (!open) return
    setReading(true)
    api
      .chatModels()
      .then(setModels)
      .catch((error) => toast.error(why(error)))
      .finally(() => setReading(false))
  }, [open, t])

  const pick = async (id: string) => {
    setOpen(false)
    if (id === model) return
    try {
      await api.setChatModel(id)
      onChosen?.()
    } catch (error) {
      toast.error(why(error))
    }
  }

  const recent = models?.recent ?? []
  const label = model ? modelName(model, models ?? undefined) : t("Default model")
  const claude = models?.claude ?? []
  const router = models?.openrouter

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={t("Model of this session")}
          data-model-picker
          className={cn("text-muted-foreground max-w-48 gap-1 px-2 font-mono text-xs", className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-model-list>
        <Command>
          <CommandInput placeholder={t("Search a model…")} />
          <CommandList>
            <CommandEmpty>{reading ? t("Reading the models…") : t("No such model")}</CommandEmpty>
            {recent.length ? (
              <CommandGroup heading={t("Recently used")}>
                {recent.map((id) => (
                  <Choice key={`recent:${id}`} id={id} name={modelName(id, models ?? undefined)} model={model} pick={pick} />
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Claude">
              <CommandItem value="default" onSelect={() => void pick("")}>
                <Check className="size-4 opacity-0" />
                {t("Default model")}
              </CommandItem>
              {claude.map((item) => (
                <Choice key={item.id} id={item.id} name={item.name} model={model} pick={pick} />
              ))}
            </CommandGroup>
            {router?.configured && router.models.length ? (
              <CommandGroup heading="OpenRouter">
                {router.models.map((item) => (
                  <Choice key={item.id} id={item.id} name={item.name} model={model} pick={pick} />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
          {router && !router.configured ? (
            <p className="text-muted-foreground border-t px-3 py-2 text-xs leading-relaxed">
              {t("Only the Claude models, until OpenRouter is configured.")}{" "}
              <Link
                to={settingsTo}
                className="text-foreground underline underline-offset-2"
                onClick={() => {
                  setOpen(false)
                  closeTalk()
                }}
              >
                {t("Set up OpenRouter")}
              </Link>
            </p>
          ) : null}
          {router?.error ? (
            <p role="alert" className="text-destructive border-t px-3 py-2 text-xs">
              {router.error}
            </p>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Choice({
  id,
  name,
  model,
  pick,
}: {
  id: string
  name: string
  model: string
  pick: (id: string) => void
}) {
  return (
    <CommandItem value={`${id} ${name}`} onSelect={() => pick(id)}>
      <Check className={cn("size-4", model === id ? "opacity-100" : "opacity-0")} />
      <span className="truncate">{name}</span>
      {name !== id ? (
        <span className="text-muted-foreground ml-auto truncate pl-2 font-mono text-[0.65rem]">{id}</span>
      ) : null}
    </CommandItem>
  )
}
