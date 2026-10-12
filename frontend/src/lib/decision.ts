/* What the Unblock and Decide panels decide, without a DOM to decide it in.
 *
 * The server says what a card offers (`decisions.py`): a key, the column it
 * moves the ticket to, and what it needs before it can be done. What a button
 * is called, whether a click is enough or opens a field first, and whether
 * what was typed is enough to send — that is here, plain data in and out, so
 * that `node --test` holds it to what it says. Imports nothing, like
 * `composer.ts`.
 *
 * The sentences are English, and are the keys `t()` translates: see `french.ts`.
 */

/** The shape of one offer, as much of it as this file reads. */
export interface Offer {
  key: string
  column: string
  needs: "" | "text" | "note" | "model" | "titles"
  text: string
  number: number
}

/** What each kind of stop is called, in front of why — see `question.CATEGORIES`. */
export const CATEGORIES: Record<string, string> = {
  question: "A decision to make",
  access: "Missing access",
  manual: "Something to do by hand",
  credits: "Out of credit",
  ci: "Failing checks",
  conflict: "Conflict",
  split: "Too big for one ticket",
  other: "Stuck",
}

/** The button for each offer. An option is called by its own words instead. */
export const LABELS: Record<string, string> = {
  yes: "Yes, go ahead",
  answer: "Answer the question",
  "done-retry": "It's done, run it again",
  retry: "Run it again",
  model: "Run it again on another model",
  instruct: "Run it again with an instruction",
  split: "Split into sub-tickets",
  abandon: "Abandon — move to done",
  other: "Other: write an instruction",
  validate: "Validate",
  rework: "Send back with an instruction",
  "fix-ci": "Fix the CI",
  "add-tests": "Add the missing tests",
  screenshots: "Take the screenshots",
  rebase: "Rebase onto the base branch",
  caveat: "Send back on this point",
  reject: "Reject",
}

/** What the field under an offer is asking for, when it opens one. */
export const PROMPTS: Record<Offer["needs"], string> = {
  "": "",
  text: "The instruction the next session reads",
  note: "A note, if you want one",
  model: "The model it runs on next",
  titles: "One sub-ticket a line",
}

/** The category's name, for one the server sent — or "Stuck" for one it did not know. */
export const categoryOf = (key: string | undefined): string =>
  CATEGORIES[key ?? ""] ?? CATEGORIES.other

/** The button an offer is drawn as: the option's words, or its key's sentence. */
export const labelOf = (offer: Offer): string =>
  offer.key === "option" ? offer.text : (LABELS[offer.key] ?? offer.key)

/** Whether a click does it at once, rather than opening a field to fill first. */
export const immediate = (offer: Offer): boolean => offer.needs === ""

/** What the field opens with: the instruction ready to edit, the sub-tickets proposed. */
export const prefilled = (offer: Offer): string =>
  offer.needs === "text" || offer.needs === "titles" ? offer.text : ""

/** The sub-tickets a field names: one a line, blank lines dropped. */
export const titlesIn = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

/** Whether what was typed is enough to do it. */
export function sendable(offer: Offer, text: string, model = ""): boolean {
  if (offer.needs === "text") return text.trim() !== ""
  if (offer.needs === "model") return model.trim() !== ""
  if (offer.needs === "titles") return titlesIn(text).length > 0
  return true
}

/** Whether an offer files the ticket away: drawn quieter, in the colour of a way out. */
export const away = (offer: Offer): boolean => offer.key === "abandon" || offer.key === "reject"

/** How a button looks: the way forward stands out, the rest are outlines. */
export function tone(offer: Offer, index: number): "default" | "outline" {
  return index === 0 && offer.key !== "other" && !away(offer) ? "default" : "outline"
}

/** What a card's call to action says, in the column it is in. */
export const actionOf = (column: string): string | null =>
  column === "blocked" ? "Unblock" : column === "review" ? "Decide" : null

/** The words a pull request's checks are summed up in. */
export const CHECKS: Record<string, string> = {
  passed: "Checks pass",
  failed: "Checks fail",
  pending: "Checks running",
  none: "No checks",
  unknown: "Checks unknown",
}
