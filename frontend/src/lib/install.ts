/* When the console offers to be installed, and how.
 *
 * Kept free of the DOM, and of imports, so that `node --test` reads it as it is.
 *
 * Chrome and Edge, on desktop and Android, hand the page a `beforeinstallprompt`
 * event once the app qualifies, and installing is calling `prompt()` on it. Safari
 * on iOS has no such event and no way to install from a page: the only road is
 * its own Share menu, so all the page can do is say so. And an app that is
 * already running as an app — launched from the home screen, `display-mode:
 * standalone` — has nothing to offer.
 */
export type InstallOffer = "prompt" | "share" | "none"

export function installOffer(state: { standalone: boolean; promptReady: boolean; ios: boolean }): InstallOffer {
  if (state.standalone) return "none"
  if (state.promptReady) return "prompt"
  return state.ios ? "share" : "none"
}

/** An iPhone or an iPad, whose Safari reports itself as a Mac once it asks for the desktop site. */
export function isIos(userAgent: string, platform: string, touchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return platform === "MacIntel" && touchPoints > 1
}
