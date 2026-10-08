import * as React from "react"
import {
  ArrowRight,
  Bell,
  Bot,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Copy,
  GitPullRequest,
  KeyRound,
  ListChecks,
  NotebookText,
  RefreshCw,
  Route,
  Terminal,
} from "lucide-react"

import { Rich } from "@/components/console/text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, why, type Provisioned } from "@/lib/api"
import { useT } from "@/lib/i18n"
import {
  accessProblem,
  nextStep,
  rows,
  stepFrom,
  stepsFor,
  type Health,
  type Provider,
  type Row,
  type SetupState,
  type StepKey,
  type Summary,
} from "@/lib/setup"
import { cn } from "@/lib/utils"

/* The first connection, in steps.
 *
 * Drawn instead of the console when the server marks the page `data-setup`
 * (see `main.tsx`): on a console nobody has claimed, to anybody — the bundle is
 * no secret, and what it asks first is the code, the email and the password —
 * and on `/setup` to somebody already in, which is where a console claimed from
 * the environment lands until it has a board.
 *
 * One write per step, each through the endpoint that checks it: a key is tried
 * against its provider before it is written, a board is built the way `ponos
 * init` builds it. Every step after the account can be left for later — the
 * summary at the end says what is missing, and the Settings page says it again.
 */

const ICONS: Record<StepKey, React.ComponentType<{ className?: string }>> = {
  access: KeyRound,
  provider: Bot,
  notion: NotebookText,
  github: GitPullRequest,
  channels: Bell,
  summary: ListChecks,
}

const TITLES: Record<StepKey, string> = {
  access: "Access",
  provider: "Claude provider",
  notion: "Notion",
  github: "GitHub",
  channels: "Channels",
  summary: "Summary",
}

/** The address carries the step, so a reload — or a link — lands on it. */
function askedStep(): string | null {
  return new URLSearchParams(window.location.search).get("step")
}

function remember(step: StepKey) {
  // `/setup`, whatever the page was opened as: an unclaimed console draws this
  // at any address, and once it is claimed only `/setup` still does.
  const url = new URL("/setup", window.location.href)
  url.searchParams.set("step", step)
  window.history.replaceState(null, "", url)
}

export function SetupApp() {
  const t = useT()
  const [state, setState] = React.useState<SetupState | null>(null)
  const [failed, setFailed] = React.useState("")
  const [step, setStep] = React.useState<StepKey>("access")

  const load = React.useCallback(async () => {
    try {
      const read = await api.setupState()
      if (!read) {
        // Neither unclaimed nor signed in: the door is the server's to draw.
        window.location.assign("/")
        return
      }
      setState(read)
      setStep((current) => (read.claimed && current === "access" ? stepFrom(read, null) : current))
    } catch (error) {
      setFailed(why(error))
    }
  }, [])

  React.useEffect(() => {
    void api.setupState().then(
      (read) => {
        if (!read) {
          window.location.assign("/")
          return
        }
        setState(read)
        setStep(stepFrom(read, askedStep()))
      },
      (error) => setFailed(why(error))
    )
  }, [])

  React.useEffect(() => {
    document.title = `${t("First connection")} · Ponos`
  }, [t])

  const go = (next: StepKey) => {
    remember(next)
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  if (failed)
    return (
      <Shell>
        <Alert variant="destructive">
          <AlertDescription>{failed}</AlertDescription>
        </Alert>
      </Shell>
    )
  if (!state)
    return (
      <Shell>
        <p className="text-muted-foreground text-sm">{t("Reading the configuration…")}</p>
      </Shell>
    )

  const steps = stepsFor(state)
  const forward = () => go(nextStep(state, step))

  return (
    <Shell>
      <Stepper steps={steps} current={step} reachable={state.claimed} onStep={go} />
      <div data-testid={`setup-${step}`}>
        {step === "access" ? (
          <AccessStep
            state={state}
            onClaimed={async () => {
              await load()
              go(stepFrom({ claimed: true }, null))
            }}
          />
        ) : step === "provider" ? (
          <ProviderStep container={state.container} onNext={forward} />
        ) : step === "notion" ? (
          <NotionStep storage={state.storage} onNext={forward} />
        ) : step === "github" ? (
          <GithubStep container={state.container} onNext={forward} />
        ) : step === "channels" ? (
          <ChannelsStep container={state.container} onNext={forward} />
        ) : (
          <SummaryStep onStep={go} />
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useT()
  return (
    <main className="bg-background text-foreground min-h-svh px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">Ponos</p>
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.03em] sm:text-[1.75rem]">
            {t("First connection")}
          </h1>
        </header>
        {children}
      </div>
    </main>
  )
}

function Stepper({
  steps,
  current,
  reachable,
  onStep,
}: {
  steps: StepKey[]
  current: StepKey
  reachable: boolean
  onStep: (step: StepKey) => void
}) {
  const t = useT()
  const at = steps.indexOf(current)
  return (
    <ol className="mb-6 flex flex-wrap gap-1.5" aria-label={t("Steps")}>
      {steps.map((step, index) => {
        const Icon = ICONS[step]
        const here = step === current
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!reachable}
              aria-current={here ? "step" : undefined}
              onClick={() => (here ? undefined : onStep(step))}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                here
                  ? "bg-primary text-primary-foreground border-primary"
                  : index < at
                    ? "text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted",
                "disabled:cursor-default"
              )}
            >
              <span className="tabular-nums">{index + 1}</span>
              <Icon className="size-3.5" />
              {t(TITLES[step])}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function StepCard({
  title,
  blurb,
  children,
  footer,
}: {
  title: string
  blurb: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="leading-relaxed">
          <Rich text={blurb} />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
      {footer ? <div className="flex flex-wrap justify-end gap-2 px-6">{footer}</div> : null}
    </Card>
  )
}

function Field({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} autoComplete="off" spellCheck={false} {...props} />
      {hint ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          <Rich text={hint} />
        </p>
      ) : null}
    </div>
  )
}

/** A sentence that went well or did not, said where the gesture was made. */
function Said({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null
  return (
    <Alert variant={ok ? "success" : "destructive"} role="status">
      {ok ? <CircleCheck /> : <CircleAlert />}
      <AlertDescription>
        <Rich text={text} />
      </AlertDescription>
    </Alert>
  )
}

/** A command to type somewhere else, with the button that copies it. */
function Command({ text }: { text: string }) {
  const t = useT()
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="bg-muted flex items-center gap-2 rounded-lg border px-3 py-2">
      <Terminal className="text-muted-foreground size-4 shrink-0" />
      <code className="min-w-0 flex-1 font-mono text-sm break-all">{text}</code>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => setCopied(true))
        }}
        aria-label={t("Copy")}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

/** What a step that built something did, one line each. */
function Report({ done }: { done: Provisioned | null }) {
  if (!done) return null
  return (
    <>
      {done.steps.length ? (
        <ul className="text-muted-foreground list-disc pl-5 text-xs leading-relaxed">
          {done.steps.map(([verb, what], index) => (
            <li key={index}>
              <span className="text-tr-green font-medium">{verb}</span> {what}
            </li>
          ))}
        </ul>
      ) : null}
      {done.problem ? <Said ok={false} text={done.problem} /> : null}
    </>
  )
}

/* -- 1. access -------------------------------------------------------------- */

function AccessStep({ state, onClaimed }: { state: SetupState; onClaimed: () => Promise<void> }) {
  const t = useT()
  const [typed, setTyped] = React.useState({ code: "", email: "", password: "", confirm: "" })
  const [problem, setProblem] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const set = (key: keyof typeof typed) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setTyped({ ...typed, [key]: event.target.value })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const refused = accessProblem(typed, state.code)
    if (refused) {
      setProblem(t(refused))
      return
    }
    setBusy(true)
    setProblem("")
    try {
      await api.claim(typed)
      await onClaimed()
    } catch (error) {
      setProblem(why(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <StepCard
        title={t("Who opens this console")}
        blurb={t(
          "Nobody has claimed this console yet. The email and the password typed here are what it asks for from now on — and what closes this page behind you."
        )}
        footer={
          <Button type="submit" disabled={busy || (state.code && !state.code_drawn)}>
            {busy ? t("Claiming…") : t("Claim the console")}
            <ArrowRight />
          </Button>
        }
      >
        {state.code ? (
          state.code_drawn ? (
            <Field
              id="code"
              label={t("Installation code")}
              hint={t(
                "Printed by the console when it started — in a container, its logs (`docker compose logs ponos`, or the Logs tab in Dokploy). It is asked because this page is reached from outside the machine."
              )}
              value={typed.code}
              onChange={set("code")}
              placeholder="XXXX-XXXX"
              autoFocus
            />
          ) : (
            <Said
              ok={false}
              text={t(
                "This console is reached from outside its machine and was started without an installation code: restart it, and read the code in its logs."
              )}
            />
          )
        ) : null}
        <Field
          id="email"
          label={t("Email")}
          type="email"
          autoComplete="username"
          value={typed.email}
          onChange={set("email")}
          autoFocus={!state.code}
        />
        <Field
          id="password"
          label={t("Password")}
          type="password"
          autoComplete="new-password"
          value={typed.password}
          onChange={set("password")}
          hint={t(
            "8 characters at the least: behind this console sits a runner that runs code on its machine."
          )}
        />
        <Field
          id="confirm"
          label={t("The same password again")}
          type="password"
          autoComplete="new-password"
          value={typed.confirm}
          onChange={set("confirm")}
        />
        <Said ok={false} text={problem} />
      </StepCard>
    </form>
  )
}

/* -- 2. the provider -------------------------------------------------------- */

const CHOICES: { key: Provider; title: string; lines: string[] }[] = [
  {
    key: "cli",
    title: "Claude Code CLI",
    lines: [
      "Your Claude subscription, signed in with `claude auth login`.",
      "The only one that keeps Claude in Chrome and waits for credits when the window runs out.",
      "In a container, the command is typed once in its terminal.",
    ],
  },
  {
    key: "api_key",
    title: "Anthropic API key",
    lines: [
      "A key from console.anthropic.com, billed by the token.",
      "Nothing to sign in, nothing to wait for — and no Claude in Chrome.",
    ],
  },
  {
    key: "openrouter",
    title: "OpenRouter",
    lines: [
      "One key for every provider, billed by OpenRouter.",
      "Models are then named as OpenRouter slugs (`anthropic/claude-sonnet-4.5`, `openai/gpt-5`).",
      "No Claude in Chrome, nothing to wait for.",
    ],
  },
]

function ProviderStep({ container, onNext }: { container: boolean; onNext: () => void }) {
  const t = useT()
  const [chosen, setChosen] = React.useState<Provider | null>(null)
  const [key, setKey] = React.useState("")
  const [routed, setRouted] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [said, setSaid] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [command, setCommand] = React.useState("")

  React.useEffect(() => {
    // What the file already says, so coming back to the step shows it chosen.
    void api.summary().then(
      (summary) => {
        if (summary.provider.stated) setChosen(summary.provider.provider)
        setRouted(summary.provider.provider !== "openrouter" || summary.provider.route_sessions)
      },
      () => undefined
    )
  }, [])

  const save = async (provider: Provider) => {
    setBusy(true)
    setSaid(null)
    try {
      const answer = await api.saveProvider({
        provider,
        key: key.trim(),
        route_sessions: provider === "openrouter" ? routed : undefined,
      })
      setCommand(answer.command ?? "")
      setSaid({
        ok: answer.ok,
        text: answer.ok
          ? t("Written to the configuration: {{said}}", { said: answer.said })
          : answer.said,
      })
      if (answer.ok) setKey("")
    } catch (error) {
      setSaid({ ok: false, text: why(error) })
    } finally {
      setBusy(false)
    }
  }

  const checkLogin = async () => {
    setBusy(true)
    try {
      const answer = await api.claudeLogin()
      setCommand(answer.command)
      setSaid({
        ok: answer.ok,
        text: answer.ok ? t("Claude Code is signed in as {{who}}.", { who: answer.said }) : answer.said,
      })
    } catch (error) {
      setSaid({ ok: false, text: why(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard
      title={t("Who answers the sessions")}
      blurb={t(
        "The choice that matters most: it decides who bills the work, which models a ticket can name, and whether a ticket can use the browser. It can be changed later in the settings."
      )}
      footer={
        <Button type="button" variant="outline" onClick={onNext}>
          {t("Continue")}
          <ArrowRight />
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("Claude provider")}>
        {CHOICES.map((choice) => (
          <button
            key={choice.key}
            type="button"
            role="radio"
            aria-checked={chosen === choice.key}
            data-testid={`provider-${choice.key}`}
            onClick={() => {
              setChosen(choice.key)
              setSaid(null)
              setKey("")
            }}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              chosen === choice.key
                ? "border-primary ring-primary/30 bg-primary/5 ring-2"
                : "hover:bg-muted/60"
            )}
          >
            <span className="flex items-center justify-between gap-2 font-semibold">
              {t(choice.title)}
              {chosen === choice.key ? <CircleCheck className="text-primary size-4" /> : null}
            </span>
            <ul className="text-muted-foreground flex flex-col gap-1 text-xs leading-relaxed">
              {choice.lines.map((line) => (
                <li key={line}>
                  <Rich text={t(line)} />
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {chosen === "cli" ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm leading-relaxed">
            <Rich
              text={
                container
                  ? t(
                      "Open a terminal in the container — Dokploy's Terminal tab on the service, or `docker compose exec ponos bash` — and sign in there. The sign-in is kept in the `~/.claude` volume."
                    )
                  : t("In a terminal on this machine, sign Claude Code in:")
              }
            />
          </p>
          <Command text={command || "claude auth login"} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void save("cli")}>
              {t("Use the CLI")}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void checkLogin()}>
              <RefreshCw />
              {t("Check the sign-in")}
            </Button>
          </div>
        </div>
      ) : chosen === "api_key" || chosen === "openrouter" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void save(chosen)
          }}
        >
          <Field
            id="provider-key"
            label={chosen === "api_key" ? t("Anthropic API key") : t("OpenRouter key")}
            type="password"
            placeholder={chosen === "api_key" ? "sk-ant-…" : "sk-or-…"}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            hint={t(
              "Left empty, the key already in the configuration — or in the container's environment — is the one checked."
            )}
          />
          {chosen === "openrouter" ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={routed}
                onCheckedChange={(value) => setRouted(value === true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{t("Run the sessions on OpenRouter")}</span>
                <span className="text-muted-foreground block text-xs leading-relaxed">
                  {t(
                    "Off, the key is only handed to the sessions, and they keep running on the CLI's sign-in."
                  )}
                </span>
              </span>
            </label>
          ) : null}
          <div>
            <Button type="submit" disabled={busy}>
              {busy ? t("Checking…") : t("Check and save")}
            </Button>
          </div>
        </form>
      ) : null}

      {said ? <Said ok={said.ok} text={said.text} /> : null}
    </StepCard>
  )
}

/* -- 3. notion -------------------------------------------------------------- */

function NotionStep({ storage, onNext }: { storage: string; onNext: () => void }) {
  const t = useT()
  const [board, setBoard] = React.useState<Summary["board"] | null>(null)
  const [token, setToken] = React.useState("")
  const [page, setPage] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState<Provisioned | null>(null)
  const [problem, setProblem] = React.useState("")

  React.useEffect(() => {
    void api.summary().then(
      (summary) => setBoard(summary.board),
      () => undefined
    )
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem("")
    setDone(null)
    try {
      const answer = await api.saveNotion({ token: token.trim(), page: page.trim() })
      setDone(answer)
      setBoard(answer.board)
      if (!answer.problem) {
        setToken("")
        setPage("")
      }
    } catch (error) {
      setProblem(why(error))
    } finally {
      setBusy(false)
    }
  }

  const footer = (
    <Button type="button" variant="outline" onClick={onNext}>
      {t("Continue")}
      <ArrowRight />
    </Button>
  )

  if (storage === "markdown")
    return (
      <StepCard
        title={t("The board")}
        blurb={t("This console keeps its board in Markdown files: there is nothing to connect.")}
        footer={footer}
      >
        {board?.path ? <Command text={board.path} /> : null}
      </StepCard>
    )

  const found = board?.state === "ok"
  return (
    <form onSubmit={(event) => void save(event)}>
      <StepCard
        title={t("The board, in Notion")}
        blurb={t(
          "Create an internal integration on `notion.so/my-integrations`, share one page with it — the `···` menu → Connections — and paste the two here. The board, its databases and their columns are built under that page, as `ponos init` would."
        )}
        footer={footer}
      >
        {board ? (
          <Said
            ok={found}
            text={
              found
                ? t("A board is already connected: {{count}} ticket(s) on it.", {
                    count: String(board.tickets ?? 0),
                  })
                : board.said || t("No board yet.")
            }
          />
        ) : null}
        <Field
          id="notion-token"
          label={t("Integration token")}
          type="password"
          placeholder="ntn_…"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <Field
          id="notion-page"
          label={t("Link of the page you shared")}
          placeholder="https://www.notion.so/…"
          value={page}
          onChange={(event) => setPage(event.target.value)}
          hint={
            found
              ? t("Only to build a second board: the one above stays where it is otherwise.")
              : t("Left empty, only the token is written — `ponos init <page>` builds the board later.")
          }
        />
        <div>
          <Button type="submit" disabled={busy || (!token.trim() && !page.trim())}>
            {busy ? t("Building the board…") : found ? t("Save") : t("Connect and build the board")}
          </Button>
        </div>
        <Report done={done} />
        <Said ok={false} text={problem} />
      </StepCard>
    </form>
  )
}

/* -- 4. github -------------------------------------------------------------- */

function GithubStep({ container, onNext }: { container: boolean; onNext: () => void }) {
  const t = useT()
  const [github, setGithub] = React.useState<Summary["github"] | null>(null)
  const [busy, setBusy] = React.useState(false)

  const check = React.useCallback(async () => {
    setBusy(true)
    try {
      setGithub(await api.github())
    } catch (error) {
      setGithub({ state: "error", account: "", via: "", said: why(error), command: "" })
    } finally {
      setBusy(false)
    }
  }, [])

  React.useEffect(() => {
    void check()
  }, [check])

  return (
    <StepCard
      title={t("GitHub, for the pull requests")}
      blurb={t(
        "A code ticket comes back as a pull request, opened with `gh`. It is signed in with `gh auth login`, or given a token in `GH_TOKEN` — the way a container usually is."
      )}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void check()}>
            <RefreshCw />
            {t("Check again")}
          </Button>
          <Button type="button" variant="outline" onClick={onNext}>
            {t("Continue")}
            <ArrowRight />
          </Button>
        </>
      }
    >
      {github ? (
        github.account ? (
          <Said
            ok
            text={
              github.via === "GH_TOKEN"
                ? t("Pull requests are opened as {{account}}, with the token in `GH_TOKEN`.", {
                    account: github.account,
                  })
                : t("Pull requests are opened as {{account}}.", { account: github.account })
            }
          />
        ) : (
          <>
            <Said ok={false} text={github.said || t("gh is not signed in.")} />
            <p className="text-muted-foreground text-sm leading-relaxed">
              <Rich
                text={
                  container
                    ? t(
                        "Set `GH_TOKEN` in the service's environment and redeploy — or sign in from its terminal:"
                      )
                    : t("In a terminal on this machine:")
                }
              />
            </p>
            <Command text={github.command || "gh auth login"} />
          </>
        )
      ) : (
        <p className="text-muted-foreground text-sm">{t("Asking gh…")}</p>
      )}
    </StepCard>
  )
}

/* -- 5. channels ------------------------------------------------------------ */

function ChannelsStep({ container, onNext }: { container: boolean; onNext: () => void }) {
  const t = useT()
  const [typed, setTyped] = React.useState({
    telegram_token: "",
    telegram_chat: "",
    slack_token: "",
    slack_channel: "",
  })
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState<
    (Provisioned & { channels: { name: string; ok: boolean; said: string }[] }) | null
  >(null)
  const [problem, setProblem] = React.useState("")
  const set = (key: keyof typeof typed) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setTyped({ ...typed, [key]: event.target.value })

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem("")
    try {
      const answer = await api.saveChannels(typed)
      setDone(answer)
      if (!answer.problem)
        setTyped({ telegram_token: "", telegram_chat: "", slack_token: "", slack_channel: "" })
    } catch (error) {
      setProblem(why(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void save(event)}>
      <StepCard
        title={t("Being told, and answering")}
        blurb={
          container
            ? t(
                "Optional — but on a server, the only way to hear about a blocked ticket: no desktop notification reaches you from a container. A question asked there is answered in the chat, and the answer lands on the ticket."
              )
            : t(
                "Optional. A blocked ticket asks its question there, and what you answer lands on the ticket."
              )
        }
        footer={
          <Button type="button" variant="outline" onClick={onNext}>
            {t("Continue")}
            <ArrowRight />
          </Button>
        }
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">Telegram</legend>
          <Field
            id="telegram-token"
            label={t("Bot token")}
            type="password"
            value={typed.telegram_token}
            onChange={set("telegram_token")}
            hint={t(
              "@BotFather → `/newbot`, then say anything to your new bot: the chat id is read back from it."
            )}
          />
          <Field
            id="telegram-chat"
            label={t("Chat id")}
            value={typed.telegram_chat}
            onChange={set("telegram_chat")}
            hint={t("Found on its own — leave it empty unless you know it.")}
          />
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">Slack</legend>
          <Field
            id="slack-token"
            label={t("Slack bot token")}
            type="password"
            placeholder="xoxb-…"
            value={typed.slack_token}
            onChange={set("slack_token")}
          />
          <Field
            id="slack-channel"
            label={t("Slack channel ID")}
            value={typed.slack_channel}
            onChange={set("slack_channel")}
            hint={t("Then `/invite @your-bot` in the channel — the step everyone forgets.")}
          />
        </fieldset>
        <div>
          <Button type="submit" disabled={busy || !Object.values(typed).some((value) => value.trim())}>
            {busy ? t("Checking…") : t("Save and check")}
          </Button>
        </div>
        <Report done={done} />
        {done?.channels.map((channel) => (
          <Said key={channel.name} ok={channel.ok} text={`${channel.name} — ${channel.said}`} />
        ))}
        <Said ok={false} text={problem} />
      </StepCard>
    </form>
  )
}

/* -- 6. the summary --------------------------------------------------------- */

function SummaryStep({ onStep }: { onStep: (step: StepKey) => void }) {
  const t = useT()
  return (
    <StepCard
      title={t("What this console runs on")}
      blurb={t(
        "One line per thing that has to work. A line that is missing can be fixed from its step now, or later from the settings — this summary is at the top of them."
      )}
      footer={
        <Button asChild>
          <a href="/?view=console/tickets/list">
            {t("Open the console")}
            <ArrowRight />
          </a>
        </Button>
      }
    >
      <SetupSummary
        change={(row) =>
          row.step === "summary" ? (
            <a href={`/?view=console/settings/read/config/${row.section}`}>{t("Settings")}</a>
          ) : (
            <button type="button" onClick={() => onStep(row.step)}>
              {t(TITLES[row.step])}
            </button>
          )
        }
      />
    </StepCard>
  )
}

/* -- the summary, wherever it is drawn -------------------------------------- */

const STATES: Record<Health, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  ok: { label: "OK", icon: CircleCheck, tone: "text-tr-green border-tr-green/40" },
  missing: { label: "Missing", icon: CircleDashed, tone: "text-tr-amber border-tr-amber/40" },
  error: { label: "Error", icon: CircleAlert, tone: "text-destructive border-destructive/40" },
}

const ROW_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  provider: Bot,
  model: Route,
  board: NotebookText,
  github: GitPullRequest,
  projects: ListChecks,
  channels: Bell,
  environment: Terminal,
}

/** The installation at a glance, as a record: one line per field, its state, and where it changes. */
export function SetupSummary({ change }: { change: (row: Row) => React.ReactNode }) {
  const t = useT()
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [failed, setFailed] = React.useState("")

  React.useEffect(() => {
    let live = true
    api.summary().then(
      (read) => live && setSummary(read),
      (error) => live && setFailed(why(error))
    )
    return () => {
      live = false
    }
  }, [])

  if (failed) return <Said ok={false} text={failed} />
  if (!summary) return <p className="text-muted-foreground text-sm">{t("Checking…")}</p>

  return (
    <dl className="divide-border flex flex-col divide-y rounded-xl border" data-testid="summary-rows">
      {rows(summary).map((row) => {
        const state = STATES[row.state]
        const Icon = ROW_ICONS[row.key] ?? ListChecks
        const StateIcon = state.icon
        return (
          <div
            key={row.key}
            data-row={row.key}
            data-state={row.state}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[auto_11rem_1fr_auto]"
          >
            <Icon className="text-muted-foreground mt-0.5 size-4" />
            <dt className="text-sm font-medium">{t(row.label)}</dt>
            <dd className="col-start-2 min-w-0 text-sm sm:col-start-3 sm:row-start-1">
              <span className="break-words">{t(row.value, row.params)}</span>
              {row.said ? (
                <span className="text-muted-foreground block text-xs break-words">{row.said}</span>
              ) : null}
            </dd>
            <div className="col-start-3 row-span-2 row-start-1 flex flex-col items-end gap-1 sm:col-start-4 sm:row-span-1">
              <Badge variant="outline" className={state.tone}>
                <StateIcon />
                {t(state.label)}
              </Badge>
              <span className="text-xs underline-offset-2 [&>a]:underline [&>button]:cursor-pointer [&>button]:underline">
                {change(row)}
              </span>
            </div>
          </div>
        )
      })}
    </dl>
  )
}
