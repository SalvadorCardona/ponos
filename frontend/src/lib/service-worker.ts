import * as React from "react"

import { installOffer, isIos, type InstallOffer } from "./install"

/* The console as an installed app: its worker, its update, its install button.
 *
 * Three small stores in one place, because they all hang off the same two
 * browser objects — the worker's registration and `beforeinstallprompt` — and
 * the page reads them the same way (`useSyncExternalStore`).
 *
 * Registered in a build only: the dev server serves modules, not hashed
 * files, and a worker holding one of them would outlive the edit.
 */

interface InstallPrompt extends Event {
  prompt(): Promise<unknown>
}

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let prompt: InstallPrompt | null = null
let waiting: ServiceWorker | null = null
let applying = false

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS says it here and nowhere else.
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Called once, before the first render. */
export function startServiceWorker() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault() // the browser's own mini-bar: the button is ours
    prompt = event as InstallPrompt
    changed()
  })
  window.addEventListener("appinstalled", () => {
    prompt = null
    changed()
  })

  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return

  /* A new worker that installed while another one controls the page is a new
   * version: it waits there until the page says so. The first ever install has
   * no controller, and nothing to ask about. */
  const watch = (worker: ServiceWorker | null) =>
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        waiting = worker
        changed()
      }
    })

  navigator.serviceWorker.register("/sw.js").then((registration) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      waiting = registration.waiting
      changed()
    }
    watch(registration.installing)
    registration.addEventListener("updatefound", () => watch(registration.installing))
    // An installed app is rarely launched again: ask for a new version when it
    // comes back into view, and once an hour while it stays open.
    const check = () => void registration.update().catch(() => {})
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check())
    setInterval(check, 60 * 60 * 1000)
  })

  // Only what the page asked for reloads it: the first worker ever installed
  // takes control too, and a console that blinked on its first visit would be
  // a console that lost what its user had just typed.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (applying) location.reload()
  })
}

/** Whether a new version is installed and waiting for the page to take it. */
export function useUpdateWaiting(): boolean {
  return React.useSyncExternalStore(subscribe, () => waiting !== null)
}

/** Take the waiting version: the page reloads on the new one. */
export function applyUpdate() {
  applying = true
  waiting?.postMessage("skip-waiting")
}

/** What the install button should do, if anything. */
export function useInstallOffer(): InstallOffer {
  return React.useSyncExternalStore(subscribe, () =>
    installOffer({
      standalone: standalone(),
      promptReady: prompt !== null,
      ios: isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    })
  )
}

export async function install() {
  const asked = prompt
  if (!asked) return
  prompt = null // an event is good for one prompt
  changed()
  await asked.prompt()
}
