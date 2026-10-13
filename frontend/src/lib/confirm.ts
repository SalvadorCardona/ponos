/* What a key does inside a confirmation window, decided without a DOM.
 *
 * Escape closes — the dialog primitive already does it — so the one decision
 * left to us is Enter. It confirms, wherever the focus is, except where Enter
 * already means something: on a button (it presses that button, native), and in
 * a field that takes several lines, where it is a new line and the confirmation
 * moves to Ctrl+Enter (⌘+Enter on a Mac). A line field keeps no Enter of its
 * own, so Enter there confirms, as it does in a form.
 *
 * Plain data in, plain data out, and nothing imported: `node --test` reads this
 * file as it stands, the way it reads `hotkeys.ts`.
 */

/** What `enterConfirms` reads of a keydown. */
export interface EnterPress {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  /** The key is held down: the browser sends one keydown after another. */
  repeat?: boolean
  /** An input method (an accent, an ideogram) is still composing. */
  isComposing?: boolean
}

/** What `enterConfirms` reads of the element the key was pressed in. */
export interface EnterTarget {
  tagName?: string
  isContentEditable?: boolean
}

/** Whether a field lets Enter write a new line. */
export function takesLines(target: EnterTarget | null | undefined): boolean {
  if (!target) return false
  return Boolean(target.isContentEditable) || (target.tagName ?? "").toLowerCase() === "textarea"
}

/* A held key is never a confirmation: the first press has already asked, and a
 * second one would ask again before the window has had the time to close. */
export function enterConfirms(press: EnterPress, target: EnterTarget | null | undefined): boolean {
  if (press.key !== "Enter" || press.repeat || press.isComposing || press.altKey) return false
  const tag = (target?.tagName ?? "").toLowerCase()
  if (tag === "button" || tag === "a") return false
  const mod = press.ctrlKey || press.metaKey
  if (takesLines(target)) return mod
  return !press.shiftKey
}

/** The Enter badge of the main button, and what a field of several lines asks instead. */
export function enterLabel(multiline: boolean, mac: boolean): string {
  if (!multiline) return "↵"
  return mac ? "⌘↵" : "Ctrl+↵"
}
