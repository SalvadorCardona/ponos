import * as React from "react"
import { ExternalLink, GitPullRequest, RefreshCw, Unplug } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/console/confirm-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { GithubApp, GithubManifest } from "@/lib/types"

/* The settings' GitHub page: the app Ponos works GitHub through, in one click.
 *
 * The click creates a GitHub App from a manifest — a form posted to GitHub by
 * this page, so that it is the person, signed in to GitHub in this browser, who
 * says yes. GitHub then leads to the choice of repositories and back here, with
 * `?github=install` in the address. No key ever reaches this page: the server
 * keeps them, and answers with names (see `web/github.py`).
 */

/** Hand the browser to GitHub with the manifest, the way a form would. */
function submitManifest(drawn: GithubManifest) {
  const form = document.createElement("form")
  form.method = "post"
  form.action = drawn.action
  form.style.display = "none"
  const field = document.createElement("input")
  field.type = "hidden"
  field.name = "manifest"
  field.value = drawn.manifest
  form.append(field)
  document.body.append(form)
  form.submit()
}

/** The button, and the organisation it may be for. Also the setup's GitHub step. */
export function ConnectGithub({ again = false }: { again?: boolean }) {
  const t = useT()
  const [organisation, setOrganisation] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const connect = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      submitManifest(await api.connectGithub(organisation.trim()))
    } catch (error) {
      setBusy(false)
      toast.error(t("GitHub could not be reached"), {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void connect(event)} data-testid="github-connect">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="github-organisation">{t("Organisation (optional)")}</Label>
        <Input
          id="github-organisation"
          value={organisation}
          onChange={(event) => setOrganisation(event.target.value)}
          placeholder={t("Empty: your personal account")}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <Button type="submit" disabled={busy}>
          <GitPullRequest />
          {again ? t("Connect another account") : t("Connect GitHub")}
        </Button>
      </div>
    </form>
  )
}

/** One app: where it is installed, what it reaches, and the two ways out. */
function Connected({ app, onGone }: { app: GithubApp; onGone: () => void }) {
  const t = useT()
  const [forgotten, setForgotten] = React.useState("")

  const disconnect = async () => {
    try {
      const done = await api.disconnectGithub(app.slug)
      setForgotten(done.settings_url || app.url)
    } catch (error) {
      toast.error(t("The app could not be disconnected"), {
        description: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  if (forgotten)
    return (
      <Alert data-testid="github-forgotten">
        <AlertDescription className="flex flex-col gap-2">
          <span>
            {t("{{app}} is disconnected: its keys are deleted from this machine. The app itself still exists on GitHub — delete it there:", {
              app: app.name || app.slug,
            })}
          </span>
          <a href={forgotten} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {forgotten}
          </a>
          <span>
            <Button size="sm" variant="outline" onClick={onGone}>
              {t("Done")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    )

  return (
    <Card data-card="github-app" data-app={app.slug} className="gap-0 py-0">
      <CardHeader className="gap-1 px-5 pt-5 pb-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          {app.name || app.slug}
          <Badge variant="outline" className="text-tr-green border-tr-green/30">
            {t("Connected")}
          </Badge>
        </CardTitle>
        <CardDescription className="text-[13px]">
          {app.installations.length
            ? t("Connected as {{app}} on {{accounts}}.", {
                app: `${app.slug}[bot]`,
                accounts: app.installations.map((one) => one.account).join(", "),
              })
            : t("The app exists, but it is installed nowhere yet: choose its repositories.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5 text-sm sm:px-6">
        {app.error ? (
          <Alert variant="destructive">
            <AlertDescription>{app.error}</AlertDescription>
          </Alert>
        ) : null}
        {app.installations.map((installation) => (
          <div key={installation.id} className="flex flex-col gap-1.5" data-installation={installation.account}>
            <p className="font-medium">
              {installation.selection === "all"
                ? t("Every repository of {{account}}", { account: installation.account })
                : t("Repositories of {{account}}", { account: installation.account })}
            </p>
            {installation.error ? (
              <p className="text-destructive">{installation.error}</p>
            ) : installation.repositories.length ? (
              <ul className="text-muted-foreground font-mono text-xs" data-testid="github-repositories">
                {installation.repositories.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("No repository yet.")}</p>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={app.install_url}>
              <ExternalLink />
              {t("Add repositories")}
            </a>
          </Button>
          <ConfirmDialog
            title={t("Disconnect {{app}}?", { app: app.name || app.slug })}
            description={t("Its keys are deleted from this machine, and tickets go back to gh for its repositories. The app stays on GitHub until you delete it there.")}
            confirm={t("Disconnect")}
            destructive
            onConfirm={disconnect}
            trigger={
              <Button size="sm" variant="ghost">
                <Unplug />
                {t("Disconnect")}
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function GithubPage() {
  const t = useT()
  const [apps, setApps] = React.useState<GithubApp[] | null>(null)
  const [failed, setFailed] = React.useState("")
  const [asking, setAsking] = React.useState(false)
  // What GitHub's way back says, read once: the page is where the trip ends.
  const [arrived] = React.useState(() => new URLSearchParams(window.location.search).get("github"))

  const load = React.useCallback(async () => {
    setAsking(true)
    setFailed("")
    try {
      setApps((await api.githubApps()).apps)
    } catch (error) {
      setFailed(error instanceof Error ? error.message : String(error))
    } finally {
      setAsking(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex max-w-[720px] min-w-0 flex-col gap-5" data-page="github">
      {arrived && apps?.some((app) => app.installations.length) ? (
        <Alert variant="success" data-testid="github-arrived">
          <AlertDescription>{t("GitHub connected")}</AlertDescription>
        </Alert>
      ) : null}
      <Card data-card="github-what" className="gap-0 py-0">
        <CardHeader className="gap-1 px-5 pt-5 pb-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{t("Connect GitHub")}</CardTitle>
            <Button size="xs" variant="outline" onClick={() => void load()} disabled={asking}>
              <RefreshCw className={asking ? "animate-spin" : undefined} />
              {asking ? t("Checking…") : t("Check again")}
            </Button>
          </div>
          <CardDescription className="text-[13px]">
            {t("One click creates a GitHub App for this console, then GitHub asks which repositories it may reach. Tickets then clone, push and open their pull requests as the app — no gh auth login, no token to paste.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 pb-5 text-sm leading-relaxed sm:px-6">
          {apps && !apps.length ? (
            <p className="text-muted-foreground" data-testid="github-state" data-state="none">
              {t("Not connected: tickets use gh, as signed in on this machine.")}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {t("Your browser has to reach this console for GitHub to bring you back: this machine’s address is enough. For an organisation, give its name — you need to be one of its owners.")}
          </p>
          <ConnectGithub again={Boolean(apps?.length)} />
        </CardContent>
      </Card>
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>{failed}</AlertDescription>
        </Alert>
      ) : null}
      {apps === null && !failed ? <p className="text-muted-foreground text-sm">{t("Asking GitHub…")}</p> : null}
      {apps?.map((app) => <Connected key={app.slug} app={app} onGone={() => void load()} />)}
    </div>
  )
}
