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
