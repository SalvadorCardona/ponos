/* What a swipe decides, without a DOM to decide it in.
 *
 * Whether a drag was long enough to count, how far the card leans, how strong
 * its stamp reads, which key means which side: plain numbers in, plain answers
 * out, so that `node --test` can hold them to what they say. The component that
 * draws the cards imports nothing from here but this, and this imports nothing.
 */

export type Side = "keep" | "discard"

/** A card dragged past this share of its own width is let go of. */
export const DISTANCE = 0.3
/** Or a flick faster than this (px per ms), provided it went somewhere. */
export const SPEED = 0.5
/** "Somewhere": a flick shorter than this share of the width is a twitch. */
export const FLICK = 0.08
/** The most a card leans, in degrees. */
export const TILT = 18

/** The side a gesture ends on, or null when the card should come back to the centre. */
export function verdict(dx: number, width: number, speed = 0): Side | null {
  if (width <= 0) return null
  const share = Math.abs(dx) / width
  if (share >= DISTANCE || (Math.abs(speed) >= SPEED && share >= FLICK && Math.sign(speed) === Math.sign(dx)))
    return dx > 0 ? "keep" : "discard"
  return null
}

/** How far the card leans for a drag of `dx`: with the finger, and never past TILT. */
export function lean(dx: number, width: number): number {
  if (width <= 0) return 0
  return Math.max(-TILT, Math.min(TILT, (dx / width) * TILT * 2))
}

/** The stamp a drag is heading for, and how plainly it reads (0 to 1, full at the verdict's distance). */
export function stamp(dx: number, width: number): { side: Side | null; strength: number } {
  if (width <= 0 || dx === 0) return { side: null, strength: 0 }
  return {
    side: dx > 0 ? "keep" : "discard",
    strength: Math.min(1, Math.abs(dx) / (width * DISTANCE)),
  }
}

/** The side a key stands for, if it stands for one. */
export function sideOfKey(key: string): Side | null {
  if (key === "ArrowRight") return "keep"
  if (key === "ArrowLeft") return "discard"
  return null
}

/** Where a card that is let go of ends up, as a horizontal offset: past the screen's edge. */
export function exitOffset(side: Side, width: number, screen: number): number {
  const far = Math.max(width, screen) * 1.2
  return side === "keep" ? far : -far
}
