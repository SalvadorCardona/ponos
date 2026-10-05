import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import type { InputControllerComponentInterface, ValueOptionInterface } from "react-data-form"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/* A select you can type into: shadcn's combobox, a popover over cmdk.
 *
 * The package's select is Radix's, which answers a key with the first option
 * that starts with it and nothing more — fine for three priorities, not for a
 * board's worth of projects. The options are still the field's own
 * (`getValueOptions`, loaded by the form as for its select), and so is the
 * value written back: only the way of picking one changed.
 *
 * Reached with Tab, the field opens on Enter, Space or the down arrow, and a
 * letter typed on it opens the list already filtered by that letter — so the
 * whole of it is done without the mouse. The arrows walk the list, Enter takes
 * the highlighted option, Escape closes it and leaves the dialog open.
 */
export const ComboboxInputController: InputControllerComponentInterface = ({
  formInput,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchField = React.useRef<HTMLInputElement>(null)
  const options: ValueOptionInterface[] = formInput.valueOptions ?? []
  const said = (option: ValueOptionInterface) =>
    typeof option.label === "string" ? t(option.label) : String(option.value ?? "")
  const chosen = options.find((option) => option.value === formInput.value)

  const show = (seed = "") => {
    setSearch(seed)
    setOpen(true)
  }
  const pick = (option: ValueOptionInterface) => {
    setOpen(false)
    if (option.value !== formInput.value) onChange({ ...formInput, value: option.value })
  }

  return (
    // Modal, or the dialog the form is drawn in keeps the wheel from
    // scrolling a long list.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={formInput.id}
          name={formInput.name}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          onKeyDown={(event) => {
            if (open || event.ctrlKey || event.metaKey || event.altKey) return
            if (event.key === "ArrowDown") {
              event.preventDefault()
              show()
            } else if (event.key.length === 1 && event.key !== " ") {
              event.preventDefault()
              show(event.key)
            }
          }}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
            !chosen && "text-muted-foreground"
          )}
        >
          <span className="truncate">{chosen ? said(chosen) : t(formInput.placeholder ?? "Select...")}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
        // The dialog under it would take Escape as its own and close too.
        onEscapeKeyDown={(event) => event.stopPropagation()}
        // The letter that opened the list is the start of the search, not a
        // selection the next letter would replace.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const field = searchField.current
          field?.focus()
          field?.setSelectionRange(field.value.length, field.value.length)
        }}
      >
        <Command>
          <CommandInput
            ref={searchField}
            placeholder={t("Search...")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("Nothing matches.")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  // cmdk filters on the value: the words shown, not the page's id.
                  value={said(option)}
                  onSelect={() => pick(option)}
                >
                  <span className="truncate">{said(option)}</span>
                  <Check
                    className={cn(
                      "text-primary ml-auto",
                      option.value === formInput.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
