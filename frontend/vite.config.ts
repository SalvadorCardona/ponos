import { copyFileSync } from "node:fs"
import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, searchForWorkspaceRoot, type Plugin } from "vite"

/* The console is served by Python, not by Node.
 *
 * `ticket-runner serve` is `http.server` and the standard library, and that is
 * not going to change: a tool whose whole claim is "no dependency to install"
 * cannot ask for a Node runtime on the machine it runs on. So this build writes
 * straight into the package — `src/ticket_runner/web/static` — and what it
 * writes is committed. Node is a thing *contributors* need; installing
 * ticket-runner still needs python3 and git and nothing else.
 *
 * Everything is served under `/static/`, which is the one route the server
 * hands files from, so that is the base every asset URL is written against.
 *
 * The robot is not the console's own: it is `docs/mascot/`, the file the
 * landing page loads from a <script> tag, bundled here as it is — `@mascot` is
 * that directory, and the favicon in `index.html` is read from it too. One
 * drawing for both, and no copy to fall behind.
 */
const MASCOT = path.resolve(import.meta.dirname, "../docs/mascot")

/* The tokens go the other way: the console owns them, and the landing page
 * links a copy — `docs/` is published as it stands, with no build of its own
 * to import anything through. So every build writes that copy, and a copy
 * that no longer matches the source fails `tests/run.py`.
 */
function publishTokens(): Plugin {
  return {
    name: "publish-tokens",
    apply: "build",
    closeBundle() {
      copyFileSync(
        path.resolve(import.meta.dirname, "src/tokens.css"),
        path.resolve(import.meta.dirname, "../docs/tokens.css")
      )
    },
  }
}

export default defineConfig({
  base: "/static/",
  plugins: [react(), tailwindcss(), publishTokens()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src"), "@mascot": MASCOT },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "../src/ticket_runner/web/static"),
    emptyOutDir: true,
    // Every name carries a hash of what it holds, so the server can tell a
    // browser to keep `assets/` for a year: a build that changes a file
    // changes its name, and `index.html` — the one file never cached — is what
    // points at the new one. An update is seen on the next load, nothing to
    // clear; a second load downloads nothing but that page.
    rollupOptions: {
      output: {
        entryFileNames: "assets/console-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/console-[hash].[ext]",
        // The libraries every page needs, apart from the console's own code:
        // one file of 800 kB became three, and a change to the console no
        // longer rewrites the part of the bundle that did not change. Only
        // what the first page loads anyway — the lazy Markdown editor stays
        // lazy, which a catch-all `node_modules` group would undo.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            {
              name: "ui",
              test: /node_modules[\\/](@radix-ui|@floating-ui|lucide-react|sonner|date-fns|react-day-picker)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    // The mascot sits outside this project, and the dev server serves nothing
    // outside it unless told to.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), MASCOT] },
    // `npm run dev` gives hot reload against a console you started yourself:
    //   ticket-runner serve      (127.0.0.1:8787, prints its token)
    //   npm run dev -- --open
    // The token rides on the cookie the real console set, so open the console
    // once on its own port first.
    proxy: {
      "/api": {
        target: process.env.TICKET_RUNNER_ORIGIN || "http://127.0.0.1:8787",
        changeOrigin: false,
      },
    },
  },
})
