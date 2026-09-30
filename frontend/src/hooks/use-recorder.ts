import * as React from "react"

/* The microphone, as a message bar uses it: ask once, record, stop or throw away.
 *
 * `MediaRecorder` writes what the browser likes best — WebM/Opus in Chrome and
 * Firefox, MP4 in Safari — and the server names the format from the type the
 * blob carries, so nothing here picks one.
 *
 * The wave is sampled on a timer and not on animation frames: a tab the browser
 * considers hidden runs no `requestAnimationFrame`, and a recorder whose meter
 * froze would look like a recorder that stopped hearing you.
 *
 * Whether the page may use the microphone at all is said *before* anybody
 * presses the button — `access` — so that the button can be greyed out with a
 * reason instead of failing the moment it is used.
 */

/** How many bars the wave keeps, and how often it moves. */
const BARS = 64
const SAMPLE_MS = 80

export type Access = "unknown" | "granted" | "denied" | "unsupported"

export type Recording = "idle" | "asking" | "recording"

export function useRecorder() {
  const [state, setState] = React.useState<Recording>("idle")
  const [access, setAccess] = React.useState<Access>(() =>
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
      ? "unknown"
      : "unsupported"
  )
  const [seconds, setSeconds] = React.useState(0)
  const [levels, setLevels] = React.useState<number[]>(() => Array(BARS).fill(0))

  const recorder = React.useRef<MediaRecorder | null>(null)
  const chunks = React.useRef<Blob[]>([])
  const stream = React.useRef<MediaStream | null>(null)
  const audio = React.useRef<AudioContext | null>(null)
  const ticker = React.useRef<number | null>(null)
  const finished = React.useRef<((blob: Blob | null) => void) | null>(null)

  // Asked of the browser without prompting: a microphone blocked for this site
  // greys the button out before it is ever pressed.
  React.useEffect(() => {
    if (access === "unsupported" || !navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    const read = () => {
      if (!status) return
      setAccess(status.state === "denied" ? "denied" : status.state === "granted" ? "granted" : "unknown")
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((answer) => {
        status = answer
        read()
        answer.addEventListener("change", read)
      })
      .catch(() => {
        // Firefox did not know the name for a long time: the prompt will say.
      })
    return () => status?.removeEventListener("change", read)
  }, [access])

  const release = React.useCallback(() => {
    if (ticker.current !== null) window.clearInterval(ticker.current)
    ticker.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    void audio.current?.close().catch(() => {})
    audio.current = null
    recorder.current = null
    setLevels(Array(BARS).fill(0))
  }, [])

  React.useEffect(() => release, [release])

  /** Starts recording; throws, with the browser's reason, when it cannot. */
  const start = React.useCallback(async () => {
    if (recorder.current) return
    setState("asking")
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      setState("idle")
      if (error instanceof DOMException && error.name === "NotAllowedError") setAccess("denied")
      throw error
    }
    setAccess("granted")
    stream.current = media
    chunks.current = []
    const made = new MediaRecorder(media)
    made.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data)
    }
    made.onstop = () => {
      const blob = chunks.current.length
        ? new Blob(chunks.current, { type: made.mimeType || "audio/webm" })
        : null
      release()
      setState("idle")
      finished.current?.(blob)
      finished.current = null
    }
    recorder.current = made

    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      context.createMediaStreamSource(media).connect(analyser)
      audio.current = context
      const samples = new Uint8Array(analyser.fftSize)
      const began = Date.now()
      ticker.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples)
        let peak = 0
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128))
        setLevels((current) => [...current.slice(1), Math.min(1, peak / 64)])
        setSeconds((Date.now() - began) / 1000)
      }, SAMPLE_MS)
    } catch {
      // No meter is not no recording: the clock alone still says it is on.
      const began = Date.now()
      ticker.current = window.setInterval(() => setSeconds((Date.now() - began) / 1000), 250)
    }

    setSeconds(0)
    made.start(250)
    setState("recording")
  }, [release])

  /** Stops and hands back what was said — or nothing, if nothing was. */
  const stop = React.useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const current = recorder.current
        if (!current || current.state === "inactive") return resolve(null)
        finished.current = resolve
        current.stop()
      }),
    []
  )

  /** Stops and forgets. */
  const cancel = React.useCallback(() => {
    const current = recorder.current
    finished.current = null
    if (current && current.state !== "inactive") current.stop()
    else {
      release()
      setState("idle")
    }
  }, [release])

  return { state, access, seconds, levels, start, stop, cancel }
}
