/* What Ponos is doing, in a few words, while the workspace answers.
 *
 * The steps of a turn are a log — `Bash · grep -rn …`, `Error · Exit code 1
 * Traceback …` — and a log in the middle of a conversation is noise to anybody
 * who did not write the tool that printed it. So the conversation shows one
 * line instead, said like a person would say it ("reading api.py…"), and the
 * log waits behind a toggle for whoever wants it.
 *
 * The line is read off the last step and nothing else: it is what is happening
 * *now*, not a summary. What it returns is the English sentence and its
 * parameters, translated where it is drawn — this module imports nothing, so
 * that `node --test` reads it as it stands, like `composer.ts`.
 */

export interface StepLike {
  label: string
  detail: string
  said?: boolean
}

export interface Doing {
  /** The sentence, in English: it is also the key it is translated by. */
  key: string
  params?: Record<string, string>
}

/** How long a file name may be before it is cut: the line is one line. */
const NAME = 32

/** The last component of a path, short enough for the line it goes in. */
export function shortName(path: string): string {
  const name = path.trim().replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? ""
  return name.length <= NAME ? name : `${name.slice(0, NAME - 1)}…`
}

const TESTS = /^(?:\S*\/)?(?:pytest|jest|vitest|playwright|go test|cargo test|npm (?:run )?test|python3? (?:-m pytest|\S*tests?\b))/

export function doing(steps: readonly StepLike[]): Doing {
  const last = steps[steps.length - 1]
  if (!last || last.said) return { key: "thinking…" }
  const detail = last.detail.trim()
  switch (last.label) {
    case "Read":
      return detail ? { key: "reading {{name}}…", params: { name: shortName(detail) } } : { key: "reading a file…" }
    case "Edit":
      return detail ? { key: "editing {{name}}…", params: { name: shortName(detail) } } : { key: "editing a file…" }
    case "Write":
      return detail ? { key: "writing {{name}}…", params: { name: shortName(detail) } } : { key: "writing a file…" }
    case "Search":
      return { key: "searching the code…" }
    case "Web":
      return { key: "looking it up on the web…" }
    case "Sub-agent":
      return { key: "handing part of it to a helper…" }
    case "Plan":
      return { key: "planning the work…" }
    case "Error":
      return { key: "fixing an error…" }
    case "Bash":
    case "Command":
      if (/^ponos\b/.test(detail)) return { key: "looking at the board…" }
      if (/^git\b/.test(detail)) return { key: "looking at the history…" }
      if (TESTS.test(detail)) return { key: "running the tests…" }
      return { key: "running a command…" }
    default:
      return { key: "working…" }
  }
}

/** What the folded steps say about themselves: how many, and how many went wrong. */
export function tally(steps: readonly StepLike[]): { steps: number; errors: number } {
  let count = 0
  let errors = 0
  for (const step of steps) {
    if (step.said) continue
    count += 1
    if (step.label === "Error") errors += 1
  }
  return { steps: count, errors }
}

/** Commands that run the tests, wherever in the line they stand. */
const RUNS_TESTS =
  /\b(?:pytest|jest|vitest|playwright|go test|cargo test|npm (?:run )?test\b|tests\/(?:run|functional)\.py)/
/** A word standing where a command would: first, or after `;`, `&&`, `|`, `(` — not in the middle of a path. */
const command = (word: string) => new RegExp(`(?:^|[;&|(]\\s*)(?:timeout \\d+ )?${word}`)
const BOARD = command("ponos\\s+schedules?\\b")
const PONOS = command("ponos\\b")
const LOOKS = /\b(?:ls|cat|head|tail|grep|rg|find|sed|wc|tree|stat|file)\s/
const INSTALLS = /\b(?:npm|pnpm|yarn|pip3?|apt(?:-get)?|brew)\s+(?:ci|install|add)\b/
const BUILDS = /\b(?:npm|pnpm|yarn)\s+run\s+(?:build|lint)\b|\btsc\b/

/** A shell command, said for somebody who has never opened a terminal. */
function describe(detail: string): Doing {
  if (/\bgit\s+(?:commit|push)\b/.test(detail)) return { key: "I save and send the changes" }
  if (RUNS_TESTS.test(detail)) return { key: "I check that everything works" }
  if (BOARD.test(detail)) return { key: "I look at the scheduled tasks" }
  if (PONOS.test(detail)) return { key: "I look at the board" }
  if (/\bgit\b/.test(detail)) return { key: "I look at the project’s history" }
  if (INSTALLS.test(detail)) return { key: "I install what the project needs" }
  if (BUILDS.test(detail)) return { key: "I check that the project builds" }
  if (LOOKS.test(detail)) return { key: "I look through the project’s files" }
  return { key: "I work on the project" }
}

/** The title of a step, in the first person and in words anybody follows: "I read the project’s code".
 *
 * Read off the tool and, for a command, the kind of command it is — never the
 * command, nor a path, nor a tool's own name: those are the card's body, one
 * click down. What it does not recognise is "I work on the project", which is
 * true of everything. It is the line a step is listed by and, while it runs,
 * the one under the avatar.
 */
export function named(step: StepLike): Doing {
  switch (step.label) {
    case "Read":
      return { key: "I read the project’s code" }
    case "Edit":
      return { key: "I edit the project’s files" }
    case "Write":
      return { key: "I write a file" }
    case "Search":
      return { key: "I search the project’s code" }
    case "Web":
      return { key: "I look for information on the web" }
    case "Sub-agent":
      return { key: "I hand part of the work to a helper" }
    case "Plan":
      return { key: "I plan the work" }
    case "Error":
      return { key: "Something went wrong" }
    case "Bash":
    case "Command":
      return describe(step.detail)
    default:
      return { key: "I work on the project" }
  }
}

export type StepState = "running" | "ok" | "error"

export interface Outlined<T extends StepLike> {
  /** Where the step stands among all the steps, the agent's sentences included: a key that holds as steps arrive. */
  index: number
  step: T
  state: StepState
  /** What the tool answered when it failed — the error that came right after it. */
  error?: string
}

/** The steps as a list of things done, each with how it went.
 *
 * What the agent said is not a step. An error is not one either when it comes
 * right after a tool call: it is that call's outcome, and is folded into it.
 * The last step of a turn that is still running is the one under way.
 */
export function outline<T extends StepLike>(steps: readonly T[], done: boolean): Outlined<T>[] {
  const items: Outlined<T>[] = []
  steps.forEach((step, index) => {
    if (step.said) return
    const before = items[items.length - 1]
    if (step.label === "Error" && before && before.index === index - 1 && before.state !== "error") {
      before.state = "error"
      before.error = step.detail
      return
    }
    items.push({ index, step, state: step.label === "Error" ? "error" : "ok" })
  })
  const last = items[items.length - 1]
  if (!done && last && last.state === "ok" && last.index === steps.length - 1) last.state = "running"
  return items
}
