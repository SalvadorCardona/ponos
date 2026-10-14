/* Scores written behind the page, as the stream tells of them.
 *
 * An idea written by hand is scored once the form has closed, and the ideas
 * from before scores a batch at a time: nothing the page did, so nothing the
 * page waits on. The stream says when a batch is done, and the lists of ideas
 * read themselves again — here rather than in `use-console`, which would
 * otherwise import the resource declarations, as the board has `board-store`.
 */

const listeners = new Set<() => void>()

/** Some ideas were scored, or started being: every list drawn reads again. */
export function ideasScored() {
  listeners.forEach((listener) => listener())
}

export function onIdeasScored(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
